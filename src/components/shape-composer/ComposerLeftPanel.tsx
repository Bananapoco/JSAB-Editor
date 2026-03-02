import React from 'react';
import { motion } from 'framer-motion';
import {
  ChevronLeft, Eye, EyeOff, Maximize2, RefreshCw, RotateCw, Trash2,
} from 'lucide-react';
import { PIECE_TYPES } from './constants';
import { ComposerPiece, PieceType } from './types';
import { THEME, alpha } from '@/styles/theme';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface ComposerLeftPanelProps {
  panelWidth?: number;
  onClose: () => void;
  pieceColor: string;
  onPieceColorChange: (color: string) => void;
  pendingType: PieceType | null;
  onPendingTypeChange: (type: PieceType | null) => void;
  selectedPiece: ComposerPiece | null;
  onUpdateSelected: (updates: Partial<ComposerPiece>) => void;
  onDeleteSelected: () => void;
  onClearCanvas: () => void;
  hasPieces: boolean;
}

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="text-[9px] font-semibold uppercase tracking-[0.12em] mb-2.5" style={{ color: THEME.textDim }}>
    {children}
  </div>
);

const SliderRow: React.FC<{ label: string; value: string; children: React.ReactNode }> = ({ label, value, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[10px]" style={{ color: THEME.textMuted }}>{label}</span>
      <span className="text-[10px] font-mono tabular-nums" style={{ color: THEME.accent }}>{value}</span>
    </div>
    {children}
  </div>
);

export const ComposerLeftPanel: React.FC<ComposerLeftPanelProps> = ({
  panelWidth = 220,
  onClose,
  pieceColor,
  onPieceColorChange,
  pendingType,
  onPendingTypeChange,
  selectedPiece,
  onUpdateSelected,
  onDeleteSelected,
  onClearCanvas,
  hasPieces,
}) => (
  <TooltipProvider delayDuration={300}>
    <div
      className="flex flex-col p-3 gap-4 shrink-0 overflow-y-auto border-r"
      style={{ width: panelWidth, background: THEME.panel, borderColor: THEME.border }}
    >
      {/* Back */}
      <button
        onClick={onClose}
        className="ui-btn flex items-center gap-1.5 text-xs transition-all cursor-pointer w-fit rounded-md px-1 py-0.5"
      >
        <ChevronLeft size={14} />
        Back
      </button>

      {/* Shape picker */}
      <div>
        <SectionLabel>Add piece</SectionLabel>
        <div className="shape-grid">
          {PIECE_TYPES.map(({ type, icon: Icon, label }) => {
            const on = pendingType === type;
            return (
              <Tooltip key={type}>
                <TooltipTrigger asChild>
                  <motion.button
                    whileTap={{ scale: 0.88 }}
                    onClick={() => onPendingTypeChange(on ? null : type)}
                    className={`aspect-square flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer ${on ? 'ui-cell-active' : 'ui-cell'}`}
                  >
                    <Icon size={22} strokeWidth={on ? 2 : 1.5} />
                  </motion.button>
                </TooltipTrigger>
                <TooltipContent side="right" className="capitalize">{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {pendingType && (
          <p className="text-[10px] text-center mt-2" style={{ color: THEME.cyan }}>
            Click canvas to place
          </p>
        )}
      </div>

      <div className="w-full h-px" style={{ background: THEME.border }} />

      {/* Selected piece controls */}
      {selectedPiece && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: THEME.textDim }}>
              Selected
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={onDeleteSelected}
                  className="w-7 h-7 flex items-center justify-center rounded-md cursor-pointer border transition-all duration-150 hover:opacity-80"
                  style={{
                    background: alpha(THEME.danger, 0.08),
                    color: THEME.danger,
                    borderColor: alpha(THEME.danger, 0.2),
                  }}
                >
                  <Trash2 size={13} />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="left">Delete</TooltipContent>
            </Tooltip>
          </div>

          {/* Color */}
          <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-md border"
            style={{ background: THEME.surface, borderColor: THEME.border }}>
            <label className="relative w-7 h-7 rounded cursor-pointer shrink-0 overflow-hidden"
              style={{ background: selectedPiece.color, border: `1px solid ${THEME.borderBright}` }}>
              <input type="color" value={selectedPiece.color}
                onChange={e => onUpdateSelected({ color: e.target.value })}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </label>
            <span className="text-[10px]" style={{ color: THEME.textMuted }}>Color</span>
            <span className="ml-auto text-[9px] font-mono" style={{ color: THEME.textDim }}>
              {selectedPiece.color.toUpperCase()}
            </span>
          </div>

          {/* Opacity */}
          <SliderRow label="Opacity" value={`${selectedPiece.opacity ?? 100}%`}>
            <input type="range" min={0} max={100} step={1}
              value={selectedPiece.opacity ?? 100}
              onChange={e => onUpdateSelected({ opacity: +e.target.value })}
              className="w-full cursor-pointer"
            />
            {(selectedPiece.opacity ?? 100) < 100 && (
              <div className="flex items-start gap-1.5 px-2 py-1.5 rounded-md mt-1"
                style={{ background: alpha(THEME.amber, 0.08), border: `1px solid ${alpha(THEME.amber, 0.2)}` }}>
                <EyeOff size={10} className="mt-px shrink-0" style={{ color: THEME.amber }} />
                <span className="text-[9px] leading-relaxed" style={{ color: THEME.amber }}>
                  No hitbox — transparent pieces are decorative only.
                </span>
              </div>
            )}
          </SliderRow>

          {/* Size */}
          <SliderRow label="Size" value={`${Math.round(selectedPiece.size)}px`}>
            <input type="range" min={14} max={200} step={1}
              value={selectedPiece.size}
              onChange={e => onUpdateSelected({ size: +e.target.value })}
              className="w-full cursor-pointer"
            />
          </SliderRow>

          {/* Rotation */}
          <SliderRow label="Rotation" value={`${Math.round(selectedPiece.rotation)}°`}>
            <input type="range" min={0} max={359} step={1}
              value={selectedPiece.rotation}
              onChange={e => onUpdateSelected({ rotation: +e.target.value })}
              className="w-full cursor-pointer"
            />
          </SliderRow>

          {/* X / Y */}
          <div className="grid grid-cols-2 gap-1.5">
            {(['x', 'y'] as const).map(k => (
              <div key={k}>
                <div className="text-[8px] font-mono uppercase mb-1" style={{ color: THEME.textDim }}>{k}</div>
                <input
                  type="number"
                  value={Math.round(selectedPiece[k])}
                  onChange={e => onUpdateSelected({ [k]: +e.target.value })}
                  className="w-full px-2 py-1.5 rounded-md border text-[11px] font-mono ui-input"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1" />

      {hasPieces && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onClearCanvas}
          className="ui-btn w-full py-2 rounded-md text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-all"
        >
          <RefreshCw size={13} /> Clear Canvas
        </motion.button>
      )}
    </div>
  </TooltipProvider>
);
