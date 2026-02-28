import React, { RefObject } from 'react';
import { motion } from 'framer-motion';
import { CANVAS_H, CANVAS_W } from '../constants';
import { HoverPos } from '../types';

interface BuildModeCanvasStageProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  hoverPos: HoverPos | null;
  isDraggingObjects: boolean;
  isPlacementMode: boolean;
  isDraggingSelection: boolean;
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onMouseLeave: () => void;
}

export const BuildModeCanvasStage: React.FC<BuildModeCanvasStageProps> = ({
  canvasRef,
  hoverPos,
  isDraggingObjects,
  isPlacementMode,
  isDraggingSelection,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
}) => {
  return (
    <div className="flex-1 flex items-center justify-center bg-[#060609] p-4 relative overflow-hidden">
      <motion.canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="rounded-xl border border-[#1a1a2e] shadow-2xl max-w-full max-h-full"
        style={{
          cursor: isDraggingObjects
            ? 'grabbing'
            : isPlacementMode
              ? 'copy'
              : isDraggingSelection
                ? 'crosshair'
                : 'default',
        }}
      />

      {hoverPos && (
        <div className="absolute bottom-6 left-6 px-2 py-1 rounded bg-[#000000aa] text-xs font-mono text-[#888]">
          {Math.round(hoverPos.gx)}, {Math.round(hoverPos.gy)}
        </div>
      )}
    </div>
  );
};
