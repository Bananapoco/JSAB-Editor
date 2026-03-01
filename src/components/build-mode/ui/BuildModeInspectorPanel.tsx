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
  const [timestampInput, setTimestampInput] = React.useState('0');
  const [xInput, setXInput] = React.useState('0');
  const [yInput, setYInput] = React.useState('0');
  const [sizeInput, setSizeInput] = React.useState('40');
  const [rotationInput, setRotationInput] = React.useState('0');
  const [durationInput, setDurationInput] = React.useState('2');

  React.useEffect(() => {
    if (!selectedEvent) return;
    setTimestampInput(String(selectedEvent.timestamp ?? 0));
    setXInput(String(selectedEvent.x ?? 0));
    setYInput(String(selectedEvent.y ?? 0));
    setSizeInput(String(selectedEvent.size ?? 40));
    setRotationInput(String(selectedEvent.rotation ?? 0));
    setDurationInput(String(selectedEvent.duration ?? 2));
  }, [selectedEvent]);

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
              backgroundColor: `${(TOOLS as any)[selectedEvent.type]?.color}22`,
              color: (TOOLS as any)[selectedEvent.type]?.color,
            }}
          >
            {(() => {
              const Icon = (TOOLS as any)[selectedEvent.type]?.icon || Square;
              return <Icon size={16} />;
            })()}
            {(TOOLS as any)[selectedEvent.type]?.label || selectedEvent.type}
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1">Time</div>
            <input
              type="number"
              step="0.01"
              value={timestampInput}
              onChange={e => {
                const raw = e.target.value;
                setTimestampInput(raw);
                if (raw === '') return;
                const value = Number(raw);
                if (!Number.isFinite(value)) return;
                onUpdateSelected({ timestamp: Math.max(0, value) });
              }}
              onBlur={() => {
                const value = Number(timestampInput);
                if (!Number.isFinite(value)) {
                  setTimestampInput(String(selectedEvent.timestamp ?? 0));
                  return;
                }
                const safe = Math.max(0, value);
                setTimestampInput(String(safe));
                onUpdateSelected({ timestamp: safe });
              }}
              className="w-full px-3 py-2 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm font-mono focus:outline-none focus:border-[#FF0099]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(['x', 'y'] as const).map(key => (
              <div key={key}>
                <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1">{key}</div>
                <input
                  type="number"
                  value={key === 'x' ? xInput : yInput}
                  onChange={e => {
                    const raw = e.target.value;
                    if (key === 'x') setXInput(raw);
                    else setYInput(raw);

                    if (raw === '') return;
                    const value = Number(raw);
                    if (!Number.isFinite(value)) return;
                    onUpdateSelected({ [key]: value });
                  }}
                  onBlur={() => {
                    const raw = key === 'x' ? xInput : yInput;
                    const value = Number(raw);
                    if (!Number.isFinite(value)) {
                      if (key === 'x') setXInput(String(selectedEvent.x ?? 0));
                      else setYInput(String(selectedEvent.y ?? 0));
                      return;
                    }
                    if (key === 'x') setXInput(String(value));
                    else setYInput(String(value));
                    onUpdateSelected({ [key]: value });
                  }}
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
                value={sizeInput}
                onChange={e => {
                  const raw = e.target.value;
                  setSizeInput(raw);
                  if (raw === '') return;
                  const value = Number(raw);
                  if (!Number.isFinite(value) || value <= 0) return;
                  onUpdateSelected({ size: value });
                }}
                onBlur={() => {
                  const value = Number(sizeInput);
                  if (!Number.isFinite(value) || value <= 0) {
                    setSizeInput(String(selectedEvent.size ?? 40));
                    return;
                  }
                  setSizeInput(String(value));
                  onUpdateSelected({ size: value });
                }}
                className="w-full px-2 py-1.5 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm font-mono focus:outline-none focus:border-[#FF0099]"
              />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1 flex items-center gap-1">
                <RotateCw size={10} /> Rot
              </div>
              <input
                type="number"
                value={rotationInput}
                onChange={e => {
                  const raw = e.target.value;
                  setRotationInput(raw);
                  if (raw === '') return;
                  const value = Number(raw);
                  if (!Number.isFinite(value)) return;
                  onUpdateSelected({ rotation: value });
                }}
                onBlur={() => {
                  const value = Number(rotationInput);
                  if (!Number.isFinite(value)) {
                    setRotationInput(String(selectedEvent.rotation ?? 0));
                    return;
                  }
                  setRotationInput(String(value));
                  onUpdateSelected({ rotation: value });
                }}
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
              value={durationInput}
              onChange={e => {
                const raw = e.target.value;
                setDurationInput(raw);
                if (raw === '') return;
                const value = Number(raw);
                if (!Number.isFinite(value) || value <= 0) return;
                onUpdateSelected({ duration: value });
              }}
              onBlur={() => {
                const value = Number(durationInput);
                if (!Number.isFinite(value) || value <= 0) {
                  setDurationInput(String(selectedEvent.duration ?? 2));
                  return;
                }
                setDurationInput(String(value));
                onUpdateSelected({ duration: value });
              }}
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
