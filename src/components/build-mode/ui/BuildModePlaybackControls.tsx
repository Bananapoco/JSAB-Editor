import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Magnet, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { SNAP_INTERVALS } from '../constants';
import { SnapInterval } from '../types';
import { formatTime } from '../utils';
import { THEME, alpha } from '@/styles/theme';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface BuildModePlaybackControlsProps {
  audioFile: File | null;
  isPlaying: boolean;
  currentTime: number;
  audioDuration: number;
  snapEnabled: boolean;
  snapInterval: SnapInterval;
  showSnapMenu: boolean;
  onTogglePlay: () => void;
  onSkipByBeats: (beats: number) => void;
  onSeekRatio: (ratio: number) => void;
  onToggleSnapMenu: () => void;
  onToggleSnapEnabled: () => void;
  onSelectSnapInterval: (interval: SnapInterval) => void;
}

export const BuildModePlaybackControls: React.FC<BuildModePlaybackControlsProps> = ({
  audioFile, isPlaying, currentTime, audioDuration,
  snapEnabled, snapInterval, showSnapMenu,
  onTogglePlay, onSkipByBeats, onSeekRatio,
  onToggleSnapMenu, onToggleSnapEnabled, onSelectSnapInterval,
}) => {
  const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="h-12 flex items-center gap-2 px-3 shrink-0 border-t"
        style={{ background: THEME.panel, borderColor: THEME.border }}
      >
        {/* Skip back */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onSkipByBeats(-4)} className="ui-btn w-7 h-7 flex items-center justify-center rounded-md cursor-pointer">
              <SkipBack size={13} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Back 4 beats</TooltipContent>
        </Tooltip>

        {/* Play/pause */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={onTogglePlay}
              disabled={!audioFile}
              className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 cursor-pointer"
              style={
                !audioFile
                  ? { background: THEME.surface, color: THEME.textDim, cursor: 'not-allowed', border: `1px solid ${THEME.border}` }
                  : isPlaying
                    ? { background: THEME.accent, color: THEME.text }
                    : {
                        background: alpha(THEME.accent, 0.1),
                        color: THEME.accent,
                        border: `1px solid ${alpha(THEME.accent, 0.3)}`,
                      }
              }
            >
              {isPlaying
                ? <Pause size={14} />
                : <Play size={14} style={{ marginLeft: 1 }} />
              }
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isPlaying ? 'Pause' : 'Play'}{' '}
            <span style={{ color: THEME.textMuted }} className="ml-1">Space</span>
          </TooltipContent>
        </Tooltip>

        {/* Skip forward */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onSkipByBeats(4)} className="ui-btn w-7 h-7 flex items-center justify-center rounded-md cursor-pointer">
              <SkipForward size={13} />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Forward 4 beats</TooltipContent>
        </Tooltip>

        {/* Time */}
        <span className="text-[10px] font-mono tabular-nums whitespace-nowrap select-none min-w-[72px]" style={{ color: THEME.textMuted }}>
          {formatTime(currentTime)} <span style={{ color: THEME.textDim }}>/</span> {formatTime(audioDuration)}
        </span>

        {/* Scrubber */}
        <div
          className="flex-1 flex items-center cursor-pointer relative group"
          style={{ height: 28 }}
          onMouseDown={event => {
            const el = event.currentTarget;
            const seek = (ev: MouseEvent | React.MouseEvent) => {
              const r = el.getBoundingClientRect();
              onSeekRatio(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width)));
            };
            seek(event.nativeEvent);
            const mv = (ev: MouseEvent) => seek(ev);
            const up = () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up); };
            window.addEventListener('mousemove', mv);
            window.addEventListener('mouseup', up);
          }}
        >
          {/* Track */}
          <div
            className="absolute inset-x-0 rounded-full"
            style={{ height: 3, top: '50%', transform: 'translateY(-50%)', background: THEME.surfaceActive }}
          >
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: THEME.accent }} />
          </div>
          {/* Thumb */}
          <div
            className="absolute rounded-full pointer-events-none transition-transform group-hover:scale-125"
            style={{
              width: 11, height: 11,
              left: `${progress}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              background: THEME.accent,
              border: '2px solid rgba(255,255,255,0.3)',
              boxShadow: `0 0 6px ${alpha(THEME.accent, 0.6)}`,
            }}
          />
        </div>

        {/* Snap */}
        <div className="relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onToggleSnapMenu}
                className="flex items-center gap-1.5 px-2.5 h-7 rounded-md border cursor-pointer transition-all duration-150"
                style={
                  snapEnabled
                    ? { background: alpha(THEME.cyan, 0.1), color: THEME.cyan, borderColor: alpha(THEME.cyan, 0.35) }
                    : { background: THEME.surface, color: THEME.textMuted, borderColor: THEME.border }
                }
              >
                <Magnet size={12} />
                <span className="text-[10px] font-bold font-mono">{snapInterval}</span>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="top">Beat snap</TooltipContent>
          </Tooltip>

          <AnimatePresence>
            {showSnapMenu && (
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 rounded-lg p-2.5 shadow-2xl z-50 min-w-[140px]"
                style={{ background: THEME.surface, border: `1px solid ${THEME.borderBright}` }}
              >
                <button
                  onClick={onToggleSnapEnabled}
                  className="w-full px-3 py-1.5 rounded-md text-[10px] font-semibold mb-2.5 cursor-pointer border transition-all duration-150"
                  style={
                    snapEnabled
                      ? { background: alpha(THEME.cyan, 0.1), color: THEME.cyan, borderColor: alpha(THEME.cyan, 0.35) }
                      : { background: THEME.surfaceHover, color: THEME.textMuted, borderColor: THEME.border }
                  }
                >
                  {snapEnabled ? 'Snap: ON' : 'Snap: OFF'}
                </button>
                <div className="flex gap-1">
                  {SNAP_INTERVALS.map(({ value, label }) => {
                    const on = snapInterval === value && snapEnabled;
                    return (
                      <button
                        key={value}
                        onClick={() => onSelectSnapInterval(value)}
                        className="flex-1 h-8 rounded-md text-[10px] font-bold cursor-pointer border transition-all duration-150"
                        style={
                          on
                            ? { background: THEME.accent, color: THEME.text, borderColor: 'transparent' }
                            : { background: THEME.surfaceHover, color: THEME.textMuted, borderColor: THEME.border }
                        }
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="text-[8px] text-center mt-2 uppercase tracking-wider" style={{ color: THEME.textDim }}>beats</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </TooltipProvider>
  );
};
