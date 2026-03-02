import React, { RefObject } from 'react';
import { motion } from 'framer-motion';
import { CANVAS_H, CANVAS_W } from '../constants';
import { HoverPos } from '../types';
import { THEME, alpha } from '@/styles/theme';

interface BuildModeCanvasStageProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  hoverPos: HoverPos | null;
  isDraggingObjects: boolean;
  isPlacementMode: boolean;
  isDraggingSelection: boolean;
  canvasCursor: string;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseLeave: () => void;
}

export const BuildModeCanvasStage: React.FC<BuildModeCanvasStageProps> = ({
  canvasRef, hoverPos,
  isDraggingObjects, isPlacementMode, isDraggingSelection, canvasCursor,
  onMouseDown, onMouseMove, onMouseUp, onContextMenu, onMouseLeave,
}) => (
  <div
    className="flex-1 flex items-center justify-center p-5 relative overflow-hidden"
    style={{ background: THEME.base }}
  >
    {/* Radial dot grid */}
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `radial-gradient(circle, ${alpha(THEME.border, 0.9)} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
        maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)',
        opacity: 0.5,
      }}
    />

    {/* Canvas */}
    <motion.canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onContextMenu={onContextMenu}
      onMouseLeave={onMouseLeave}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.25, ease: 'easeOut' }}
      className="rounded-lg max-w-full max-h-full relative z-10"
      style={{
        cursor: isDraggingObjects ? 'grabbing' : isPlacementMode ? 'copy' : isDraggingSelection ? 'crosshair' : canvasCursor,
        border: `1px solid ${THEME.border}`,
        boxShadow: `0 0 0 1px ${THEME.surface}, 0 24px 80px rgba(0,0,0,0.8)`,
      }}
    />

    {/* Coord badge */}
    {hoverPos && (
      <div
        className="absolute bottom-7 left-7 px-2 py-1 rounded-md z-20"
        style={{
          background: alpha(THEME.surface, 0.85),
          border: `1px solid ${THEME.border}`,
          backdropFilter: 'blur(4px)',
        }}
      >
        <span className="text-[9px] font-mono tabular-nums" style={{ color: THEME.textMuted }}>
          {Math.round(hoverPos.gx)}, {Math.round(hoverPos.gy)}
        </span>
      </div>
    )}

    </div>
);
