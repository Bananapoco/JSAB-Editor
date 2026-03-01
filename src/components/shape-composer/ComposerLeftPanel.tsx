import React from 'react';
import { motion } from 'framer-motion';
import {
  Trash2,
  RotateCw,
  Maximize2,
  RefreshCw,
  Plus,
  MousePointer2,
  ChevronLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import { PIECE_TYPES } from './constants';
import { ComposerPiece, PieceType } from './types';

interface ComposerLeftPanelProps {
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

export const ComposerLeftPanel: React.FC<ComposerLeftPanelProps> = ({
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
}) => {
  return (
    <div className="w-52 bg-[#0a0a12] border-r border-[#1a1a2e] flex flex-col p-4 gap-5 shrink-0 overflow-y-auto">
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 text-[#555] hover:text-white text-xs transition-all"
      >
        <ChevronLeft size={14} />
        Back to editor
      </button>

      <div>
        <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2 flex items-center gap-1">
          <Plus size={10} /> Add Piece
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="color"
            value={pieceColor}
            onChange={e => onPieceColorChange(e.target.value)}
            className="w-8 h-8 rounded cursor-pointer border-2 border-[#252540]"
          />
          <span className="text-[11px] text-[#666]">Piece color</span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {PIECE_TYPES.map(({ type, icon: Icon, label }) => (
            <motion.button
              key={type}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={() => onPendingTypeChange(pendingType === type ? null : type)}
              title={label}
              className={`aspect-square flex flex-col items-center justify-center gap-1 rounded-xl transition-all text-[10px] ${
                pendingType === type
                  ? 'bg-gradient-to-br from-[#FF0099] to-[#FF6600] text-white shadow-md shadow-[#FF009944]'
                  : 'bg-[#151520] text-[#555] hover:text-white hover:bg-[#252540] border border-[#252540]'
              }`}
            >
              <Icon size={18} />
              <span>{label}</span>
            </motion.button>
          ))}
        </div>

        {pendingType && (
          <p className="text-[10px] text-[#00FFFF] mt-2 text-center animate-pulse">
            Click canvas to place
          </p>
        )}
      </div>

      <div className="w-full h-px bg-[#1a1a2e]" />

      {selectedPiece ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#444]">Selected</span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onDeleteSelected}
              className="p-1.5 rounded bg-[#ff333322] text-[#ff4444] hover:bg-[#ff333344] transition-all"
            >
              <Trash2 size={13} />
            </motion.button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={selectedPiece.color}
              onChange={e => onUpdateSelected({ color: e.target.value })}
              className="w-8 h-8 rounded cursor-pointer border-2 border-[#252540]"
            />
            <span className="text-[11px] text-[#666]">Color</span>
          </div>

          {/* Opacity */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase tracking-widest text-[#444] flex items-center gap-1">
                <Eye size={9} /> Opacity
              </span>
              <span className="text-[10px] font-mono text-[#FF0099]">{selectedPiece.opacity ?? 100}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={selectedPiece.opacity ?? 100}
              onChange={e => onUpdateSelected({ opacity: +e.target.value })}
              className="w-full accent-[#FF0099] cursor-pointer"
            />
            {(selectedPiece.opacity ?? 100) < 100 && (
              <div className="mt-1.5 flex items-start gap-1.5 px-2 py-1.5 rounded-lg bg-[#FF990011] border border-[#FF990033]">
                <EyeOff size={10} className="text-[#FF9900] mt-px shrink-0" />
                <span className="text-[9px] text-[#FF9900] leading-relaxed">
                  No hitbox — transparent pieces are decorative only.
                </span>
              </div>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase tracking-widest text-[#444] flex items-center gap-1">
                <Maximize2 size={9} /> Size
              </span>
              <span className="text-[10px] font-mono text-[#FF0099]">{Math.round(selectedPiece.size)}px</span>
            </div>
            <input
              type="range"
              min={14}
              max={200}
              step={1}
              value={selectedPiece.size}
              onChange={e => onUpdateSelected({ size: +e.target.value })}
              className="w-full accent-[#FF0099] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase tracking-widest text-[#444] flex items-center gap-1">
                <RotateCw size={9} /> Rotation
              </span>
              <span className="text-[10px] font-mono text-[#FF0099]">{Math.round(selectedPiece.rotation)}°</span>
            </div>
            <input
              type="range"
              min={0}
              max={359}
              step={1}
              value={selectedPiece.rotation}
              onChange={e => onUpdateSelected({ rotation: +e.target.value })}
              className="w-full accent-[#FF0099] cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['x', 'y'] as const).map(key => (
              <div key={key}>
                <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1">{key}</div>
                <input
                  type="number"
                  value={Math.round(selectedPiece[key])}
                  onChange={e => onUpdateSelected({ [key]: +e.target.value })}
                  className="w-full px-2 py-1 rounded bg-[#151520] border border-[#252540] text-white text-xs font-mono focus:outline-none focus:border-[#FF0099]"
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center py-4">
          <MousePointer2 size={24} className="text-[#252540]" />
          <p className="text-[10px] text-[#444]">Click a piece<br />to edit it</p>
        </div>
      )}

      <div className="flex-1" />

      {hasPieces && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onClearCanvas}
          className="w-full py-2 rounded-xl bg-[#1a1a2e] hover:bg-[#252540] text-[#666] hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
        >
          <RefreshCw size={13} /> Clear Canvas
        </motion.button>
      )}
    </div>
  );
};
