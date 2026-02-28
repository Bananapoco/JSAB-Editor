import React from 'react';
import { motion } from 'framer-motion';
import {
  Clock,
  Maximize2,
  MousePointer2,
  Rocket,
  RotateCw,
  Square,
  Trash2,
} from 'lucide-react';
import { TOOLS } from '../constants';
import { PlacedEvent } from '../types';

interface BuildModeInspectorPanelProps {
  selectedEvent: PlacedEvent | null;
  eventCount: number;
  onDeleteSelected: () => void;
  onUpdateSelected: (updates: Partial<PlacedEvent>) => void;
  onLaunch: () => void;
}

export const BuildModeInspectorPanel: React.FC<BuildModeInspectorPanelProps> = ({
  selectedEvent,
  eventCount,
  onDeleteSelected,
  onUpdateSelected,
  onLaunch,
}) => {
  return (
    <motion.div
      initial={{ x: 20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ delay: 0.15 }}
      className="w-56 bg-[#0a0a12] border-l border-[#1a1a2e] p-4 shrink-0 overflow-y-auto flex flex-col"
    >
      {selectedEvent ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-[#444]">Selected</span>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={onDeleteSelected}
              className="p-1.5 rounded bg-[#ff333322] text-[#ff4444] hover:bg-[#ff333344] transition-all"
            >
              <Trash2 size={14} />
            </motion.button>
          </div>

          <div
            className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
            style={{
              backgroundColor: `${TOOLS[selectedEvent.type]?.color}22`,
              color: TOOLS[selectedEvent.type]?.color,
            }}
          >
            {(() => {
              const Icon = TOOLS[selectedEvent.type]?.icon || Square;
              return <Icon size={16} />;
            })()}
            {TOOLS[selectedEvent.type]?.label || selectedEvent.type}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1">Time</div>
            <input
              type="number"
              step="0.01"
              value={selectedEvent.timestamp}
              onChange={e => onUpdateSelected({ timestamp: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm font-mono focus:outline-none focus:border-[#FF0099]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['x', 'y'] as const).map(key => (
              <div key={key}>
                <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1">{key}</div>
                <input
                  type="number"
                  value={selectedEvent[key]}
                  onChange={e => onUpdateSelected({ [key]: +e.target.value })}
                  className="w-full px-2 py-1.5 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm font-mono focus:outline-none focus:border-[#FF0099]"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1 flex items-center gap-1">
                <Maximize2 size={10} /> Size
              </div>
              <input
                type="number"
                value={selectedEvent.size ?? 40}
                onChange={e => onUpdateSelected({ size: +e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm font-mono focus:outline-none focus:border-[#FF0099]"
              />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1 flex items-center gap-1">
                <RotateCw size={10} /> Rot
              </div>
              <input
                type="number"
                value={selectedEvent.rotation ?? 0}
                onChange={e => onUpdateSelected({ rotation: +e.target.value })}
                className="w-full px-2 py-1.5 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm font-mono focus:outline-none focus:border-[#FF0099]"
              />
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1 flex items-center gap-1">
              <Clock size={10} /> Duration
            </div>
            <input
              type="number"
              step="0.1"
              value={selectedEvent.duration ?? 2}
              onChange={e => onUpdateSelected({ duration: +e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm font-mono focus:outline-none focus:border-[#FF0099]"
            />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <MousePointer2 size={32} className="text-[#252540] mb-3" />
          <p className="text-xs text-[#444]">
            Click canvas
            <br />
            to add stuff!
          </p>
        </div>
      )}

      <div className="flex-1" />

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onLaunch}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF0099] to-[#FF6600] text-white font-bold text-sm tracking-wide shadow-lg shadow-[#FF009944] hover:shadow-[#FF009966] transition-all flex items-center justify-center gap-2"
      >
        <Rocket size={18} />
        PLAY!
      </motion.button>

      <p className="text-[10px] text-[#333] text-center mt-2">
        {eventCount} event{eventCount !== 1 ? 's' : ''} ready
      </p>
    </motion.div>
  );
};
