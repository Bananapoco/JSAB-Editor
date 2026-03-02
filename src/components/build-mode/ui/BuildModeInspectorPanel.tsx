import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Maximize2, MousePointer2, Play, RotateCw, Trash2 } from 'lucide-react';
import { TOOLS } from '../constants';
import { PlacedEvent } from '../types';
import { THEME, alpha } from '@/styles/theme';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

interface BuildModeInspectorPanelProps {
  selectedEvent: PlacedEvent | null;
  eventCount: number;
  onDeleteSelected: () => void;
  onUpdateSelected: (updates: Partial<PlacedEvent>) => void;
  onLaunch: () => void;
}

// ─── Field components ─────────────────────────────────────────────────────

const FieldLabel: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <div className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.12em] mb-1" style={{ color: THEME.textDim }}>
    {icon && <span>{icon}</span>}
    {children}
  </div>
);

const NumInput: React.FC<{
  value: string;
  step?: string;
  onChange: (raw: string) => void;
  onBlur: () => void;
}> = ({ value, step, onChange, onBlur }) => (
  <input
    type="number"
    step={step ?? '1'}
    value={value}
    onChange={e => onChange(e.target.value)}
    onBlur={onBlur}
    className="w-full px-2 py-1.5 rounded-md border text-[11px] font-mono ui-input"
  />
);

// ─── Component ────────────────────────────────────────────────────────────

export const BuildModeInspectorPanel: React.FC<BuildModeInspectorPanelProps> = ({
  selectedEvent, eventCount, onDeleteSelected, onUpdateSelected, onLaunch,
}) => {
  const [tsInput,  setTsInput]  = React.useState('0');
  const [xInput,   setXInput]   = React.useState('0');
  const [yInput,   setYInput]   = React.useState('0');
  const [szInput,  setSzInput]  = React.useState('40');
  const [rotInput, setRotInput] = React.useState('0');
  const [durInput, setDurInput] = React.useState('2');

  React.useEffect(() => {
    if (!selectedEvent) return;
    setTsInput(String(selectedEvent.timestamp ?? 0));
    setXInput(String(selectedEvent.x ?? 0));
    setYInput(String(selectedEvent.y ?? 0));
    setSzInput(String(selectedEvent.size ?? 40));
    setRotInput(String(selectedEvent.rotation ?? 0));
    setDurInput(String(selectedEvent.duration ?? 2));
  }, [selectedEvent]);

  const meta    = selectedEvent ? (TOOLS as any)[selectedEvent.type] : null;
  const TypeIcon = meta?.icon;

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div
        initial={{ x: 8, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="w-52 flex flex-col shrink-0 overflow-hidden border-l"
        style={{ background: THEME.panel, borderColor: THEME.border }}
      >
        <div className="flex-1 overflow-y-auto p-3">
          {selectedEvent ? (
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold"
                  style={{
                    background: alpha(meta?.color ?? THEME.accent, 0.08),
                    color: meta?.color ?? THEME.accent,
                    border: `1px solid ${alpha(meta?.color ?? THEME.accent, 0.22)}`,
                  }}
                >
                  {TypeIcon && <TypeIcon size={12} />}
                  {meta?.label ?? selectedEvent.type}
                </div>

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
                  <TooltipContent side="left">
                    Delete <span style={{ color: THEME.textMuted }} className="ml-1">Del</span>
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="w-full h-px" style={{ background: THEME.border }} />

              {/* Timestamp */}
              <div>
                <FieldLabel icon={<Clock size={9} />}>Timestamp</FieldLabel>
                <NumInput value={tsInput} step="0.01"
                  onChange={raw => {
                    setTsInput(raw);
                    const v = Number(raw);
                    if (!raw || !Number.isFinite(v)) return;
                    onUpdateSelected({ timestamp: Math.max(0, v) });
                  }}
                  onBlur={() => {
                    const v = Number(tsInput);
                    if (!Number.isFinite(v)) { setTsInput(String(selectedEvent.timestamp ?? 0)); return; }
                    const safe = Math.max(0, v);
                    setTsInput(String(safe));
                    onUpdateSelected({ timestamp: safe });
                  }}
                />
              </div>

              {/* Position */}
              <div>
                <FieldLabel>Position</FieldLabel>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['x', 'y'] as const).map(k => (
                    <div key={k}>
                      <div className="text-[8px] font-mono uppercase mb-1" style={{ color: THEME.textDim }}>{k}</div>
                      <input
                        type="number"
                        value={k === 'x' ? xInput : yInput}
                        onChange={e => {
                          const raw = e.target.value;
                          k === 'x' ? setXInput(raw) : setYInput(raw);
                          const v = Number(raw);
                          if (!raw || !Number.isFinite(v)) return;
                          onUpdateSelected({ [k]: v });
                        }}
                        onBlur={() => {
                          const raw = k === 'x' ? xInput : yInput;
                          const v = Number(raw);
                          if (!Number.isFinite(v)) {
                            k === 'x' ? setXInput(String(selectedEvent.x ?? 0)) : setYInput(String(selectedEvent.y ?? 0));
                            return;
                          }
                          onUpdateSelected({ [k]: v });
                        }}
                        className="w-full px-2 py-1.5 rounded-md border text-[11px] font-mono ui-input"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Size + Rotation */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <FieldLabel icon={<Maximize2 size={8} />}>Size</FieldLabel>
                  <NumInput value={szInput}
                    onChange={raw => {
                      setSzInput(raw);
                      const v = Number(raw);
                      if (!raw || !Number.isFinite(v) || v <= 0) return;
                      onUpdateSelected({ size: v });
                    }}
                    onBlur={() => {
                      const v = Number(szInput);
                      if (!Number.isFinite(v) || v <= 0) { setSzInput(String(selectedEvent.size ?? 40)); return; }
                      onUpdateSelected({ size: v });
                    }}
                  />
                </div>
                <div>
                  <FieldLabel icon={<RotateCw size={8} />}>Rotation</FieldLabel>
                  <NumInput value={rotInput}
                    onChange={raw => {
                      setRotInput(raw);
                      const v = Number(raw);
                      if (!raw || !Number.isFinite(v)) return;
                      onUpdateSelected({ rotation: v });
                    }}
                    onBlur={() => {
                      const v = Number(rotInput);
                      if (!Number.isFinite(v)) { setRotInput(String(selectedEvent.rotation ?? 0)); return; }
                      onUpdateSelected({ rotation: v });
                    }}
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <FieldLabel icon={<Clock size={9} />}>Duration</FieldLabel>
                <NumInput value={durInput} step="0.1"
                  onChange={raw => {
                    setDurInput(raw);
                    const v = Number(raw);
                    if (!raw || !Number.isFinite(v) || v <= 0) return;
                    onUpdateSelected({ duration: v });
                  }}
                  onBlur={() => {
                    const v = Number(durInput);
                    if (!Number.isFinite(v) || v <= 0) { setDurInput(String(selectedEvent.duration ?? 2)); return; }
                    onUpdateSelected({ duration: v });
                  }}
                />
              </div>
            </div>
          ) : (
            /* Empty state */
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-8">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center"
                style={{ background: THEME.surface, border: `1px solid ${THEME.border}` }}
              >
                <MousePointer2 size={22} style={{ color: THEME.borderBright }} />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium" style={{ color: THEME.textDim }}>Nothing selected</p>
                <p className="text-[10px]" style={{ color: alpha(THEME.textDim, 0.7) }}>
                  Click the canvas to add events, or select one to edit
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 space-y-2.5 border-t" style={{ borderColor: THEME.border }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onLaunch}
            className="w-full h-10 rounded-md font-bold text-xs tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-90"
            style={{ background: THEME.accent, color: THEME.text }}
          >
            <Play size={14} />
            PLAY LEVEL
          </motion.button>
          <p className="text-[9px] text-center tabular-nums" style={{ color: THEME.textDim }}>
            {eventCount} event{eventCount !== 1 ? 's' : ''}
          </p>
        </div>
      </motion.div>
    </TooltipProvider>
  );
};
