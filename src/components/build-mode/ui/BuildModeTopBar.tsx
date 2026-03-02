import React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Clock, Play, Redo2, Save, Square, Undo2 } from 'lucide-react';
import { formatTime } from '../utils';
import { THEME, alpha } from '@/styles/theme';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface BuildModeTopBarProps {
  onClose: () => void;
  onSwitchToAI: () => void;
  onSaveProject: () => void;
  onLaunch: () => void;
  saveStatusText?: string;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  eventCount: number;
  audioDuration: number;
}

export const BuildModeTopBar: React.FC<BuildModeTopBarProps> = ({
  onClose,
  onSwitchToAI,
  onSaveProject,
  onLaunch,
  saveStatusText,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  eventCount,
  audioDuration,
}) => (
  <TooltipProvider delayDuration={400}>
    <motion.div
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="h-12 flex items-center px-3 gap-1 border-b shrink-0"
      style={{ background: THEME.panel, borderColor: THEME.border }}
    >
      {/* Back */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onClose} className="ui-btn h-8 w-8 flex items-center justify-center rounded-md cursor-pointer">
            <ChevronLeft size={16} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Back to menu</TooltipContent>
      </Tooltip>

      {/* BUILD badge */}
      <div
        className="h-6 px-2.5 flex items-center rounded-sm ml-1"
        style={{
          background: alpha(THEME.accent, 0.08),
          border: `1px solid ${alpha(THEME.accent, 0.28)}`,
        }}
      >
        <span
          className="text-[10px] font-bold tracking-[0.15em] uppercase"
          style={{ color: THEME.accent }}
        >
          Build
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 mx-2" style={{ background: THEME.border }} />

      {/* Save */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button onClick={onSaveProject} className="ui-btn h-8 w-8 flex items-center justify-center rounded-md cursor-pointer">
            <Save size={15} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Save project <span style={{ color: THEME.textMuted }} className="ml-1">⌘S</span>
        </TooltipContent>
      </Tooltip>

      {/* Play */}
      <Tooltip>
        <TooltipTrigger asChild>
          <motion.button
            onClick={onLaunch}
            whileTap={{ scale: 0.92 }}
            className="h-8 px-3 flex items-center gap-1.5 rounded-md font-semibold text-xs tracking-wide cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: THEME.accent, color: THEME.text }}
          >
            <Play size={13} />
            Play
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Test level <span style={{ color: THEME.textMuted }} className="ml-1">⌘↵</span>
        </TooltipContent>
      </Tooltip>

      {/* Save status */}
      {saveStatusText && (
        <motion.span
          key={saveStatusText}
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-[10px] ml-1 whitespace-nowrap"
          style={{ color: THEME.cyan }}
        >
          {saveStatusText}
        </motion.span>
      )}

      <div className="flex-1" />

      {/* Stats */}
      <div className="flex items-center gap-3 px-3 mr-1">
        <span className="flex items-center gap-1.5 text-[11px] tabular-nums" style={{ color: THEME.textMuted }}>
          <Square size={10} style={{ color: THEME.accent }} />
          {eventCount}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] tabular-nums" style={{ color: THEME.textMuted }}>
          <Clock size={10} />
          {formatTime(audioDuration)}
        </span>
      </div>

      {/* Divider */}
      <div className="w-px h-5 mx-1" style={{ background: THEME.border }} />

      {/* Undo */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="ui-btn h-8 w-8 flex items-center justify-center rounded-md cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <Undo2 size={15} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Undo <span style={{ color: THEME.textMuted }} className="ml-1">⌘Z</span>
        </TooltipContent>
      </Tooltip>

      {/* Redo */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="ui-btn h-8 w-8 flex items-center justify-center rounded-md cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
          >
            <Redo2 size={15} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          Redo <span style={{ color: THEME.textMuted }} className="ml-1">⌘⇧Z</span>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  </TooltipProvider>
);
