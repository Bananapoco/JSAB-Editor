import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DEFAULT_ZOOM, SNAP_INTERVALS, TOOLS } from '../constants';
import { PlacedEvent, SnapInterval } from '../types';
import { formatTime, getBombDurationSeconds, hasBombBehavior } from '../utils';
import { THEME, alpha } from '@/styles/theme';

interface BuildModeTimelineProps {
  timelineRef: RefObject<HTMLDivElement | null>;
  isScrubbing: boolean;
  bpm: number;
  audioDuration: number;
  snapInterval: SnapInterval;
  snapEnabled: boolean;
  currentTime: number;
  isPlacementMode: boolean;
  events: PlacedEvent[];
  selectedId: number | null;
  selectedIds: number[];
  onScrubStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  onScrubMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onScrubEnd: () => void;
  onTimelineClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onSelectEvent: (id: number) => void;
  onDeselectEvents: () => void;
  onDragEventToTime: (id: number, timestamp: number) => void;
}

export const BuildModeTimeline: React.FC<BuildModeTimelineProps> = ({
  timelineRef, isScrubbing, bpm, audioDuration,
  snapInterval, snapEnabled, currentTime, isPlacementMode,
  events, selectedId, selectedIds,
  onScrubStart, onScrubMove, onScrubEnd,
  onTimelineClick, onSelectEvent, onDeselectEvents, onDragEventToTime,
}) => {
  const viewportRef  = useRef<HTMLDivElement | null>(null);
  const dragRef      = useRef<{ id: number; startX: number; startTimestamp: number } | null>(null);
  const dragMovedRef = useRef(false);
  const suppressRef  = useRef(false);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const vp = viewportRef.current;
    if (!vp) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const next = Math.max(1, Math.min(8, zoom * factor));
    if (Math.abs(next - zoom) < 0.0001) return;
    const rect = vp.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const cx = vp.scrollLeft + mx;
    const scale = next / zoom;
    setZoom(next);
    window.requestAnimationFrame(() => {
      const el = viewportRef.current;
      if (el) el.scrollLeft = Math.max(0, cx * scale - mx);
    });
  }, [zoom]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      const el = timelineRef.current;
      if (!drag || !el || audioDuration <= 0) return;
      const dx = e.clientX - drag.startX;
      if (Math.abs(dx) > 3) dragMovedRef.current = true;
      let next = drag.startTimestamp + (dx / el.clientWidth) * audioDuration;
      next = Math.max(0, Math.min(audioDuration, next));
      if (snapEnabled && bpm > 0) {
        const bd = 60 / bpm;
        const sc = SNAP_INTERVALS.find(i => i.value === snapInterval);
        const su = sc ? bd / sc.divisor : bd;
        next = Math.round(next / su) * su;
        next = Math.max(0, Math.min(audioDuration, next));
      }
      onDragEventToTime(drag.id, parseFloat(next.toFixed(3)));
    };
    const onUp = () => {
      if (dragRef.current && dragMovedRef.current) {
        suppressRef.current = true;
        window.setTimeout(() => { suppressRef.current = false; }, 0);
      }
      dragRef.current = null;
      dragMovedRef.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [audioDuration, bpm, onDragEventToTime, snapEnabled, snapInterval, timelineRef]);

  return (
    <div
      ref={viewportRef}
      className="h-24 overflow-x-auto overflow-y-hidden shrink-0 border-t"
      style={{ background: THEME.base, borderColor: THEME.border }}
      onWheel={handleWheel}
    >
      <div
        ref={timelineRef}
        className={`h-full relative min-w-full ${isScrubbing ? 'cursor-grabbing' : ''}`}
        style={{ width: `${zoom * 100}%` }}
        onMouseDown={onScrubStart}
        onMouseMove={onScrubMove}
        onMouseUp={onScrubEnd}
        onMouseLeave={onScrubEnd}
      >
        {/* Beat grid */}
        {bpm > 0 && audioDuration > 0 && (() => {
          const bd = 60 / bpm;
          const sc = SNAP_INTERVALS.find(i => i.value === snapInterval);
          const su = sc ? bd / sc.divisor : bd;
          const total = Math.floor(audioDuration / su);
          return Array.from({ length: total + 1 }).map((_, idx) => {
            const t = idx * su;
            const left = (t / audioDuration) * 100;
            const bi = t / bd;
            const isMeasure = Math.abs(bi % 4) < 0.01;
            const isBeat    = Math.abs(bi % 1) < 0.01;
            return (
              <div
                key={idx}
                className="absolute top-0 bottom-5"
                style={{
                  left: `${left}%`,
                  width: 1,
                  background: isMeasure
                    ? alpha(THEME.accent, 0.25)
                    : isBeat
                      ? alpha(THEME.accent, 0.1)
                      : snapEnabled
                        ? alpha(THEME.text, 0.04)
                        : 'transparent',
                }}
              />
            );
          });
        })()}

        {/* Click-to-deselect / place area */}
        <div
          onClick={e => { if (suppressRef.current) return; onDeselectEvents(); onTimelineClick(e); }}
          className="absolute inset-0 bottom-5 z-[5]"
          style={{
            cursor: isScrubbing ? 'grabbing' : isPlacementMode ? 'copy' : 'default',
            pointerEvents: isScrubbing ? 'none' : 'auto',
          }}
        />

        {/* Events */}
        {events.map(event => {
          const isBomb = hasBombBehavior(event.behavior, event.behaviorModifiers);
          const bombDur   = isBomb ? getBombDurationSeconds(bpm, event.bombSettings) : 0;
          const startTime = isBomb ? Math.max(0, event.timestamp - bombDur) : event.timestamp;
          const visDur    = isBomb ? bombDur : (event.duration ?? 1);
          const left  = audioDuration > 0 ? (startTime / audioDuration) * 100 : 0;
          const width = audioDuration > 0 ? Math.max(0.5, (Math.max(0.001, visDur) / audioDuration) * 100) : 0.5;
          const color = (TOOLS as any)[event.type]?.color ?? THEME.accent;
          const isSelected = selectedIds.includes(event.id) || event.id === selectedId;
          const isNear     = Math.abs(event.timestamp - currentTime) < 0.5;
          const zIndex     = (isSelected ? 20000 : 6000) + Math.max(1, 10000 - Math.round(width * 100));

          return (
            <motion.div
              key={event.id}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 600, damping: 40 }}
              onMouseDown={e => {
                e.preventDefault(); e.stopPropagation();
                dragMovedRef.current = false;
                dragRef.current = { id: event.id, startX: e.clientX, startTimestamp: event.timestamp };
                onSelectEvent(event.id);
              }}
              onClick={e => { e.stopPropagation(); onSelectEvent(event.id); }}
              className="absolute cursor-ew-resize rounded-sm"
              style={{
                top: 6,
                height: 'calc(100% - 26px)',
                left: `${left}%`,
                width: `${width}%`,
                minWidth: 6,
                zIndex,
                background: isSelected ? alpha(color, 0.35) : isNear ? alpha(color, 0.22) : alpha(color, 0.15),
                borderLeft: `2px solid ${isSelected ? color : alpha(color, 0.6)}`,
                borderTop: `1px solid ${alpha(color, isSelected ? 0.4 : 0.2)}`,
                borderBottom: `1px solid ${alpha(color, isSelected ? 0.4 : 0.2)}`,
                boxShadow: isSelected ? `0 0 10px ${alpha(color, 0.3)}` : 'none',
              }}
            />
          );
        })}

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-5 z-[30000] pointer-events-none"
          style={{ left: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%`, transform: 'translateX(-50%)' }}
        >
          <div className="absolute left-1/2 -translate-x-1/2 w-px h-full" style={{ background: 'rgba(255,255,255,0.65)' }} />
          <div
            className="absolute left-1/2 -translate-x-1/2 top-0"
            style={{
              width: 0, height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '7px solid rgba(255,255,255,0.8)',
            }}
          />
          {isScrubbing && (
            <motion.div
              initial={{ opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-1/2 -translate-x-1/2 -top-7 px-2 py-1 rounded-md whitespace-nowrap"
              style={{ background: THEME.surface, border: `1px solid ${THEME.borderBright}` }}
            >
              <span className="text-[9px] font-mono tabular-nums" style={{ color: THEME.text }}>
                {currentTime.toFixed(2)}s
              </span>
            </motion.div>
          )}
        </div>

        {/* Time ruler */}
        <div
          className="absolute bottom-0 left-0 right-0 h-5 border-t flex items-center"
          style={{ borderColor: THEME.border, background: THEME.panel }}
        >
          {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
            <div
              key={ratio}
              className="absolute text-[8px] font-mono tabular-nums"
              style={{
                color: THEME.textDim,
                left: `${ratio * 100}%`,
                transform: ratio > 0.9
                  ? 'translateX(-100%) translateX(-4px)'
                  : ratio > 0 ? 'translateX(-50%)' : 'translateX(4px)',
              }}
            >
              {formatTime(ratio * audioDuration)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
