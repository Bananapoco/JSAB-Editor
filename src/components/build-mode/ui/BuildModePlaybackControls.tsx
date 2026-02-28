import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Magnet, Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import { SNAP_INTERVALS } from '../constants';
import { SnapInterval } from '../types';
import { formatTime } from '../utils';

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
  audioFile,
  isPlaying,
  currentTime,
  audioDuration,
  snapEnabled,
  snapInterval,
  showSnapMenu,
  onTogglePlay,
  onSkipByBeats,
  onSeekRatio,
  onToggleSnapMenu,
  onToggleSnapEnabled,
  onSelectSnapInterval,
}) => {
  return (
    <div className="h-14 flex items-center gap-3 px-4 bg-[#0a0a12] border-t border-[#1a1a2e] shrink-0">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onSkipByBeats(-4)}
        className="p-2 rounded-lg bg-[#1a1a2e] text-[#666] hover:text-white hover:bg-[#252540] transition-all"
        title="Skip back 4 beats"
      >
        <SkipBack size={14} />
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onTogglePlay}
        disabled={!audioFile}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
          audioFile
            ? 'bg-gradient-to-r from-[#FF0099] to-[#FF6600] text-white shadow-lg shadow-[#FF009944]'
            : 'bg-[#1a1a2e] text-[#444] cursor-not-allowed'
        }`}
      >
        {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
      </motion.button>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => onSkipByBeats(4)}
        className="p-2 rounded-lg bg-[#1a1a2e] text-[#666] hover:text-white hover:bg-[#252540] transition-all"
        title="Skip forward 4 beats"
      >
        <SkipForward size={14} />
      </motion.button>

      <span className="text-sm font-mono text-[#666] min-w-[80px]">
        {formatTime(currentTime)} / {formatTime(audioDuration)}
      </span>

      <div
        className="flex-1 flex items-center cursor-pointer relative"
        style={{ height: 24 }}
        onMouseDown={event => {
          const el = event.currentTarget;
          const seek = (ev: MouseEvent | React.MouseEvent) => {
            const rect = el.getBoundingClientRect();
            onSeekRatio(Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width)));
          };

          seek(event.nativeEvent);
          const move = (ev: MouseEvent) => seek(ev);
          const up = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
          };

          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', up);
        }}
      >
        <div
          className="absolute inset-x-0 rounded-full bg-[#1a1a2e]"
          style={{ height: 6, top: '50%', transform: 'translateY(-50%)' }}
        >
          <div
            className="h-full bg-gradient-to-r from-[#FF0099] to-[#FF6600] rounded-full"
            style={{ width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%` }}
          />
        </div>

        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 16,
            height: 16,
            left: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            background: 'linear-gradient(135deg, #FF0099, #FF6600)',
            boxShadow: '0 0 8px rgba(255,0,153,0.7), 0 2px 4px rgba(0,0,0,0.5)',
            border: '2px solid rgba(255,255,255,0.4)',
          }}
        />
      </div>

      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onToggleSnapMenu}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
            snapEnabled
              ? 'bg-[#00FFFF22] text-[#00FFFF] border border-[#00FFFF66]'
              : 'bg-[#1a1a2e] text-[#666] border border-transparent'
          }`}
          title="Beat Snap"
        >
          <Magnet size={14} />
          <span className="text-xs font-bold">{snapInterval}</span>
        </motion.button>

        <AnimatePresence>
          {showSnapMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#12121a] border border-[#252540] rounded-xl p-2 shadow-xl z-50"
            >
              <button
                onClick={onToggleSnapEnabled}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium mb-2 transition-all ${
                  snapEnabled ? 'bg-[#00FFFF22] text-[#00FFFF]' : 'bg-[#1a1a2e] text-[#666]'
                }`}
              >
                {snapEnabled ? '🧲 Snap ON' : '🧲 Snap OFF'}
              </button>

              <div className="flex gap-1">
                {SNAP_INTERVALS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => onSelectSnapInterval(value)}
                    className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${
                      snapInterval === value && snapEnabled
                        ? 'bg-[#FF0099] text-white'
                        : 'bg-[#1a1a2e] text-[#666] hover:text-white hover:bg-[#252540]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="text-[9px] text-[#444] text-center mt-2">beats</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
