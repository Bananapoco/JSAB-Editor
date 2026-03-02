import React from 'react';
import { motion } from 'framer-motion';
import { Layers, Trash2 } from 'lucide-react';
import { CustomShapeDef } from './types';

interface ComposerRightPanelProps {
  panelWidth?: number;
  existingShapes: CustomShapeDef[];
  onDelete: (id: string) => void;
}

export const ComposerRightPanel: React.FC<ComposerRightPanelProps> = ({
  panelWidth = 220,
  existingShapes,
  onDelete,
}) => {
  return (
    <div
      className="bg-[#0a0a12] border-l border-[#1a1a2e] flex flex-col p-4 gap-3 shrink-0 overflow-y-auto"
      style={{ width: panelWidth }}
    >
      <div className="text-[10px] uppercase tracking-widest text-[#444] flex items-center gap-1">
        <Layers size={10} /> Saved Shapes
        <span className="ml-auto text-[#333]">{existingShapes.length}</span>
      </div>

      {existingShapes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
          <Layers size={28} className="text-[#1a1a2e] mb-3" />
          <p className="text-[10px] text-[#333] leading-relaxed">
            No saved shapes yet.
            <br />
            Compose one and hit
            <br />
            <span className="text-[#FF0099]">Save Shape!</span>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {existingShapes.map(shape => (
            <motion.div
              key={shape.id}
              layout
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex items-center gap-2 p-2 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-[#FF0099] transition-all group"
            >
              <div className="shrink-0 rounded-lg overflow-hidden border border-[#252540]" style={{ width: 44, height: 44 }}>
                {shape.thumbnail ? (
                  <img src={shape.thumbnail} alt={shape.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#1a1a2e] flex items-center justify-center">
                    <Layers size={16} className="text-[#444]" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-white truncate">{shape.name}</div>
                <div className="text-[10px] text-[#444]">
                  {shape.pieces.length}p · r≈{Math.round(shape.colliderRadius)}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onDelete(shape.id)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 text-[#555] hover:text-[#ff4444] transition-all shrink-0"
              >
                <Trash2 size={12} />
              </motion.button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
