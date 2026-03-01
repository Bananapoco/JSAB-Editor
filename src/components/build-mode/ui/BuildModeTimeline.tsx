import React, { RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { DEFAULT_ZOOM, SNAP_INTERVALS, TOOLS } from '../constants';
import { PlacedEvent, SnapInterval } from '../types';
import { formatTime, getBombDurationSeconds, hasBombBehavior } from '../utils';

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
  timelineRef,
  isScrubbing,
  bpm,
  audioDuration,
  snapInterval,
  snapEnabled,
  currentTime,
  isPlacementMode,
  events,
  selectedId,
  selectedIds,
  onScrubStart,
  onScrubMove,
  onScrubEnd,
  onTimelineClick,
  onSelectEvent,
  onDeselectEvents,
  onDragEventToTime,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ id: number; startX: number; startTimestamp: number } | null>(null);
  const dragMovedRef = useRef(false);
  const suppressTimelineClickRef = useRef(false);
  const [timelineZoom, setTimelineZoom] = useState(DEFAULT_ZOOM);

  const handleTimelineWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const viewportEl = viewportRef.current;
    if (!viewportEl) return;

    e.preventDefault();

    const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    const nextZoom = Math.max(1, Math.min(8, timelineZoom * zoomFactor));
    if (Math.abs(nextZoom - timelineZoom) < 0.0001) return;

    const rect = viewportEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const contentX = viewportEl.scrollLeft + mouseX;
    const scale = nextZoom / timelineZoom;

    setTimelineZoom(nextZoom);

    window.requestAnimationFrame(() => {
      const vp = viewportRef.current;
      if (!vp) return;
      vp.scrollLeft = Math.max(0, contentX * scale - mouseX);
    });
  }, [timelineZoom]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      const timelineEl = timelineRef.current;
      if (!drag || !timelineEl || audioDuration <= 0) return;

      const deltaX = e.clientX - drag.startX;
      if (Math.abs(deltaX) > 3) dragMovedRef.current = true;

      const deltaRatio = deltaX / timelineEl.clientWidth;
      let next = drag.startTimestamp + deltaRatio * audioDuration;
      next = Math.max(0, Math.min(audioDuration, next));

      if (snapEnabled && bpm > 0) {
        const beatDuration = 60 / bpm;
        const snapConfig = SNAP_INTERVALS.find(interval => interval.value === snapInterval);
        const snapUnit = snapConfig ? beatDuration / snapConfig.divisor : beatDuration;
        next = Math.round(next / snapUnit) * snapUnit;
        next = Math.max(0, Math.min(audioDuration, next));
      }

      onDragEventToTime(drag.id, parseFloat(next.toFixed(3)));
    };

    const onMouseUp = () => {
      if (dragRef.current && dragMovedRef.current) {
        suppressTimelineClickRef.current = true;
        window.setTimeout(() => {
          suppressTimelineClickRef.current = false;
        }, 0);
      }
      dragRef.current = null;
      dragMovedRef.current = false;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [audioDuration, bpm, onDragEventToTime, snapEnabled, snapInterval, timelineRef]);

  return (
    <div
      ref={viewportRef}
      className="h-28 bg-[#08080c] border-t border-[#1a1a2e] overflow-x-auto overflow-y-hidden shrink-0"
      onWheel={handleTimelineWheel}
    >
      <div
        ref={timelineRef}
        className={`h-full relative min-w-full ${isScrubbing ? 'cursor-grabbing' : ''}`}
        style={{ width: `${timelineZoom * 100}%` }}
        onMouseDown={onScrubStart}
        onMouseMove={onScrubMove}
        onMouseUp={onScrubEnd}
        onMouseLeave={onScrubEnd}
      >
      {bpm > 0 && audioDuration > 0 && (() => {
        const beatDuration = 60 / bpm;
        const snapConfig = SNAP_INTERVALS.find(interval => interval.value === snapInterval);
        const snapUnit = snapConfig ? beatDuration / snapConfig.divisor : beatDuration;
        const totalSnaps = Math.floor(audioDuration / snapUnit);

        return Array.from({ length: totalSnaps + 1 }).map((_, i) => {
          const t = i * snapUnit;
          const left = (t / audioDuration) * 100;
          const beatIndex = t / beatDuration;
          const isMeasure = Math.abs(beatIndex % 4) < 0.01;
          const isBeat = Math.abs(beatIndex % 1) < 0.01;

          return (
            <div
              key={i}
              className="absolute top-0 bottom-6"
              style={{
                left: `${left}%`,
                width: isMeasure ? '2px' : '1px',
                backgroundColor: isMeasure
                  ? 'rgba(255,0,153,0.35)'
                  : isBeat
                    ? 'rgba(255,0,153,0.15)'
                    : snapEnabled
                      ? 'rgba(0,255,255,0.08)'
                      : 'rgba(255,0,153,0.04)',
              }}
            />
          );
        });
      })()}

      <div
        onClick={e => {
          if (suppressTimelineClickRef.current) return;
          onDeselectEvents();
          onTimelineClick(e);
        }}
        className="absolute inset-0 bottom-6 z-[5]"
        style={{
          cursor: isScrubbing ? 'grabbing' : (isPlacementMode ? 'copy' : 'default'),
          pointerEvents: isScrubbing ? 'none' : 'auto',
        }}
      />

      {events.map(event => {
        const isBomb = hasBombBehavior(event.behavior, event.behaviorModifiers);
        const bombDuration = isBomb ? getBombDurationSeconds(bpm, event.bombSettings) : 0;
        const startTime = isBomb ? Math.max(0, event.timestamp - bombDuration) : event.timestamp;
        const visualDuration = isBomb ? bombDuration : (event.duration ?? 1);

        const left = audioDuration > 0 ? (startTime / audioDuration) * 100 : 0;
        const width = audioDuration > 0
          ? Math.max(0.5, (Math.max(0.001, visualDuration) / audioDuration) * 100)
          : 0.5;
        const color = (TOOLS as any)[event.type]?.color ?? '#FF0099';
        const isSelected = selectedIds.includes(event.id) || event.id === selectedId;
        const timeDiff = Math.abs(event.timestamp - currentTime);
        const isNearPlayhead = timeDiff < 0.5;
        const sizePriority = Math.max(1, 10000 - Math.round(width * 100));
        const zIndex = (isSelected ? 20000 : 6000) + sizePriority;

        return (
          <motion.div
            key={event.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: isNearPlayhead ? 1.05 : 1, opacity: 1 }}
            onMouseDown={e => {
              e.preventDefault();
              e.stopPropagation();
              dragMovedRef.current = false;
              dragRef.current = {
                id: event.id,
                startX: e.clientX,
                startTimestamp: event.timestamp,
              };
              onSelectEvent(event.id);
            }}
            onClick={e => {
              e.stopPropagation();
              onSelectEvent(event.id);
            }}
            className="absolute top-2 h-14 rounded-lg cursor-ew-resize transition-all"
            style={{
              left: `${left}%`,
              width: `${width}%`,
              zIndex,
              minWidth: 8,
              backgroundColor: isSelected ? `${color}77` : isNearPlayhead ? `${color}55` : `${color}33`,
              border: `2px solid ${isSelected ? '#fff' : color}`,
              boxShadow: isSelected
                ? `0 0 16px ${color}88, inset 0 0 20px ${color}44`
                : isNearPlayhead
                  ? `0 0 12px ${color}66`
                  : 'none',
            }}
          />
        );
      })}

      <div
        className="absolute top-0 bottom-6 z-[30000] group"
        style={{
          left: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%`,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-white shadow-lg shadow-white/60" />

        <div
          className="absolute left-1/2 -translate-x-1/2 -top-3 w-6 h-6 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #FF0099, #FF6600)',
            boxShadow: '0 0 10px rgba(255,0,153,0.7), 0 2px 8px rgba(0,0,0,0.5)',
            border: '2px solid rgba(255,255,255,0.3)',
          }}
        >
          <div className="w-2 h-2 rounded-full bg-white opacity-60" />
        </div>

        {isScrubbing && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-1/2 -translate-x-1/2 -top-8 px-2 py-1 rounded bg-[#FF0099] text-white text-[10px] font-mono whitespace-nowrap"
          >
            {currentTime.toFixed(2)}s
            {snapEnabled && bpm > 0 && (
              <span className="ml-1 opacity-70">(beat {(currentTime / (60 / bpm)).toFixed(1)})</span>
            )}
          </motion.div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-6 border-t border-[#1a1a2e] bg-[#0a0a10] flex items-center px-2">
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
          <div
            key={ratio}
            className="absolute text-[10px] text-[#555] font-mono"
            style={{
              left: `${ratio * 100}%`,
              transform: ratio > 0.9
                ? 'translateX(-100%)'
                : ratio > 0
                  ? 'translateX(-50%)'
                  : 'none',
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
