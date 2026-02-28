import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Clock, Sparkles, Square, X } from 'lucide-react';
import { formatTime } from '../utils';

interface BuildModeTopBarProps {
  onClose: () => void;
  onSwitchToAI: () => void;
  eventCount: number;
  audioDuration: number;
}

export const BuildModeTopBar: React.FC<BuildModeTopBarProps> = ({
  onClose,
  onSwitchToAI,
  eventCount,
  audioDuration,
}) => {
  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="h-14 flex items-center px-4 gap-3 border-b border-[#1a1a2e] bg-[#0c0c14] shrink-0"
    >
      <button
        onClick={onSwitchToAI}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a1a2e] hover:bg-[#252540] text-[#888] hover:text-white transition-all"
      >
        <ChevronLeft size={16} />
        <Sparkles size={14} />
      </button>

      <div className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#FF009920] to-[#FF660020] border border-[#FF0099] text-[#FF0099] font-bold text-sm tracking-wide">
        🛠️ BUILD
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-4 text-xs text-[#666]">
        <span className="flex items-center gap-1">
          <Square size={12} className="text-[#FF0099]" />
          {eventCount}
        </span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatTime(audioDuration)}
        </span>
      </div>

      <button
        onClick={onClose}
        className="p-2 rounded-lg hover:bg-[#1a1a2e] text-[#666] hover:text-white transition-all"
      >
        <X size={18} />
      </button>
    </motion.div>
  );
};
