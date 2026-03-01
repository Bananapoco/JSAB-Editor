import React, { RefObject } from 'react';
import { motion } from 'framer-motion';
import { SNAP_INTERVALS, TOOLS } from '../constants';
import { PlacedEvent, SnapInterval } from '../types';
import { formatTime } from '../utils';

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
}) => {
  return (
    <div
      ref={timelineRef}
      className={`h-28 bg-[#08080c] border-t border-[#1a1a2e] relative overflow-hidden shrink-0 ${
        isScrubbing ? 'cursor-grabbing' : ''
      }`}
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
        onClick={onTimelineClick}
        className="absolute inset-0 bottom-6 z-[5]"
        style={{
          cursor: isScrubbing ? 'grabbing' : (isPlacementMode ? 'copy' : 'default'),
          pointerEvents: isScrubbing ? 'none' : 'auto',
        }}
      />

      {events.map(event => {
        const left = audioDuration > 0 ? (event.timestamp / audioDuration) * 100 : 0;
        const width = audioDuration > 0
          ? Math.max(0.5, ((event.duration ?? 1) / audioDuration) * 100)
          : 0.5;
        const color = (TOOLS as any)[event.type]?.color ?? '#FF0099';
        const isSelected = selectedIds.includes(event.id) || event.id === selectedId;
        const timeDiff = Math.abs(event.timestamp - currentTime);
        const isNearPlayhead = timeDiff < 0.5;

        return (
          <motion.div
            key={event.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: isNearPlayhead ? 1.05 : 1, opacity: 1 }}
            onClick={e => {
              e.stopPropagation();
              onSelectEvent(event.id);
            }}
            className="absolute top-2 h-14 rounded-lg cursor-pointer transition-all z-[6]"
            style={{
              left: `${left}%`,
              width: `${width}%`,
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
        className="absolute top-0 bottom-6 z-20 group"
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
  );
};
