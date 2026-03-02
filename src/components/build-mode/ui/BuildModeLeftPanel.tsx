import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Activity, Bomb, Layers, Music, Palette, Swords, Target, Upload, User } from 'lucide-react';
import { MODIFIER_BEHAVIORS, MOVEMENT_BEHAVIORS, SHAPES } from '../constants';
import {
  ActivePanel, BehaviorType, CustomAnimationData,
  ModifierBehavior, MovementBehavior, PlacedEvent, ShapeType,
} from '../types';
import { CustomShapeDef } from '../../shape-composer/types';
import { CustomAnimationPanel } from './CustomAnimationPanel';
import { THEME, alpha } from '@/styles/theme';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Props ────────────────────────────────────────────────────────────────

interface BuildModeLeftPanelProps {
  activePanel: Exclude<ActivePanel, 'compose'>;
  activeBehavior: BehaviorType;
  activeModifiers: ModifierBehavior[];
  onBehaviorChange: (behavior: BehaviorType) => void;
  onModifierToggle: (modifier: ModifierBehavior) => void;
  bombGrowthBeats: number; bombParticleCount: number; bombParticleSpeed: number;
  onBombGrowthBeatsChange: (v: number) => void;
  onBombParticleCountChange: (v: number) => void;
  onBombParticleSpeedChange: (v: number) => void;
  pulseBeatRate: number; pulseMinScale: number; pulseMaxScale: number;
  onPulseBeatRateChange: (v: number) => void;
  onPulseMinScaleChange: (v: number) => void;
  onPulseMaxScaleChange: (v: number) => void;
  onUpdateSelectedPulseSettings: (u: { beatRate?: number; minScale?: number; maxScale?: number }) => void;
  homingSpeed: number; onHomingSpeedChange: (v: number) => void;
  spinSpeed: number; onSpinSpeedChange: (v: number) => void;
  bounceSpeed: number; bounceAngle: number;
  onBounceSpeedChange: (v: number) => void; onBounceAngleChange: (v: number) => void;
  sweepSpeed: number; sweepAngle: number;
  onSweepSpeedChange: (v: number) => void; onSweepAngleChange: (v: number) => void;
  onUpdateSelectedBehaviorSettings: (u: {
    homingSpeed?: number; spinSpeed?: number;
    bounceSpeed?: number; bounceAngle?: number;
    sweepSpeed?: number; sweepAngle?: number;
  }) => void;
  onUpdateSelectedBombSettings: (u: { growthBeats?: number; particleCount?: number; particleSpeed?: number }) => void;
  activeSize: number; activeDuration: number;
  selectedEvent: PlacedEvent | null; selectedCount: number;
  onActiveSizeChange: (v: number) => void; onActiveDurationChange: (v: number) => void;
  onUpdateSelectedSize: (v: number) => void; onUpdateSelectedDuration: (v: number) => void;
  activeShape: ShapeType; activeCustomShapeId: string | null;
  customShapes: CustomShapeDef[];
  onSelectShape: (s: ShapeType) => void;
  onSelectCustomShape: (id: string) => void;
  onOpenComposer: () => void;
  audioFile: File | null; onAudioFileChange: (f: File) => void;
  bpm: number; onBpmChange: (v: number) => void;
  enemyColor: string; bgColor: string; playerColor: string;
  onEnemyColorChange: (c: string) => void;
  onBgColorChange: (c: string) => void;
  onPlayerColorChange: (c: string) => void;
  bossName: string; onBossNameChange: (v: string) => void;
  customAnimationData: CustomAnimationData;
  onCustomAnimationDataChange: (d: CustomAnimationData) => void;
  selectedCustomKfIndex: number | null;
  onSelectCustomKf: (i: number | null) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function getEffectiveMovement(ev: PlacedEvent): MovementBehavior {
  if (ev.behaviorModifiers !== undefined) return (ev.behavior as MovementBehavior) ?? 'static';
  if (ev.behavior === 'spinning' || ev.behavior === 'bomb') return 'static';
  return (ev.behavior as MovementBehavior) ?? 'static';
}
function getEffectiveModifiers(ev: PlacedEvent): ModifierBehavior[] {
  if (ev.behaviorModifiers !== undefined) return ev.behaviorModifiers;
  const m: ModifierBehavior[] = [];
  if (ev.behavior === 'spinning') m.push('spinning');
  if (ev.behavior === 'bomb') m.push('bomb');
  return m;
}

// ─── Sub-components ───────────────────────────────────────────────────────

const SectionLabel: React.FC<{ children: React.ReactNode; extra?: React.ReactNode }> = ({ children, extra }) => (
  <div className="flex items-center justify-between mb-2.5">
    <span className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: THEME.textDim }}>
      {children}
    </span>
    {extra}
  </div>
);

const Divider = () => <div className="w-full h-px my-4" style={{ background: THEME.border }} />;

const SliderRow: React.FC<{ label: string; value: string; children: React.ReactNode }> = ({ label, value, children }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[10px]" style={{ color: THEME.textMuted }}>{label}</span>
      <span className="text-[10px] font-mono tabular-nums" style={{ color: THEME.accent }}>{value}</span>
    </div>
    {children}
  </div>
);

const Input: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    {...props}
    className={`w-full px-2.5 py-1.5 rounded-md border text-xs font-mono ui-input ${props.className ?? ''}`}
  />
);

// ─── Main ─────────────────────────────────────────────────────────────────

export const BuildModeLeftPanel: React.FC<BuildModeLeftPanelProps> = (p) => {
  const isEditing = p.selectedCount > 0 && p.selectedEvent !== null;
  const sizeVal = isEditing ? Math.round(p.selectedEvent!.size ?? p.activeSize) : p.activeSize;
  const durVal  = isEditing ? (p.selectedEvent!.duration ?? p.activeDuration) : p.activeDuration;
  const [durInput, setDurInput] = React.useState(String(durVal));
  const [bpmInput, setBpmInput] = React.useState(String(p.bpm));

  React.useEffect(() => { setDurInput(String(durVal)); }, [durVal, isEditing, p.selectedCount]);
  React.useEffect(() => { setBpmInput(String(p.bpm)); }, [p.bpm]);

  const movement: MovementBehavior = isEditing
    ? getEffectiveMovement(p.selectedEvent!)
    : (p.activeBehavior as MovementBehavior);
  const modifiers: ModifierBehavior[] = isEditing
    ? getEffectiveModifiers(p.selectedEvent!)
    : p.activeModifiers;

  const bs  = p.selectedEvent?.behaviorSettings;
  const bom = p.selectedEvent?.bombSettings;
  const pul = p.selectedEvent?.pulseSettings;

  const homingSpd  = isEditing ? (bs?.homingSpeed  ?? p.homingSpeed)  : p.homingSpeed;
  const spinSpd    = isEditing ? (bs?.spinSpeed    ?? p.spinSpeed)    : p.spinSpeed;
  const bounceSpd  = isEditing ? (bs?.bounceSpeed  ?? p.bounceSpeed)  : p.bounceSpeed;
  const bounceAng  = isEditing ? (bs?.bounceAngle  ?? p.bounceAngle)  : p.bounceAngle;
  const sweepSpd   = isEditing ? (bs?.sweepSpeed   ?? p.sweepSpeed)   : p.sweepSpeed;
  const sweepAng   = isEditing ? (bs?.sweepAngle   ?? p.sweepAngle)   : p.sweepAngle;
  const bombGrowth = isEditing ? (bom?.growthBeats  ?? p.bombGrowthBeats)   : p.bombGrowthBeats;
  const bombCount  = isEditing ? (bom?.particleCount ?? p.bombParticleCount) : p.bombParticleCount;
  const bombSpd    = isEditing ? (bom?.particleSpeed ?? p.bombParticleSpeed) : p.bombParticleSpeed;
  const pulseRate  = isEditing ? (pul?.beatRate ?? p.pulseBeatRate) : p.pulseBeatRate;
  const pulseMin   = isEditing ? (pul?.minScale ?? p.pulseMinScale) : p.pulseMinScale;
  const pulseMax   = isEditing ? (pul?.maxScale ?? p.pulseMaxScale) : p.pulseMaxScale;

  const isBehaviorTool = isEditing
    ? (p.selectedEvent!.type === 'projectile_throw' || p.selectedEvent!.type === 'spawn_obstacle')
    : true;

  return (
    <TooltipProvider delayDuration={300}>
      <AnimatePresence mode="wait">
        <motion.div
          key={p.activePanel}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -6 }}
          transition={{ duration: 0.15 }}
          className="w-52 flex flex-col shrink-0 overflow-hidden border-r"
          style={{ background: THEME.panel, borderColor: THEME.border }}
        >
          <div className="flex-1 overflow-y-auto p-3">

            {/* ═══ TOOLS ════════════════════════════════════════════════ */}
            {p.activePanel === 'tools' && (
              <div>
                {isBehaviorTool && (
                  <>
                    {/* Movement */}
                    <SectionLabel
                      extra={
                        <span className="text-[8px] font-mono uppercase tracking-wide"
                          style={{ color: alpha(THEME.accent, 0.44) }}>⇧ stack</span>
                      }
                    >
                      Movement
                    </SectionLabel>
                    <div className="grid grid-cols-3 gap-1">
                      {MOVEMENT_BEHAVIORS.map(({ type, icon: Icon, label, description }) => {
                        const on = movement === type;
                        return (
                          <Tooltip key={type}>
                            <TooltipTrigger asChild>
                              <motion.button
                                whileTap={{ scale: 0.88 }}
                                onClick={() => p.onBehaviorChange(type)}
                                className={`aspect-square flex items-center justify-center rounded-md transition-all duration-150 cursor-pointer ${on ? 'ui-cell-active' : 'ui-cell'}`}
                              >
                                <Icon size={22} strokeWidth={on ? 2 : 1.5} />
                              </motion.button>
                            </TooltipTrigger>
                            <TooltipContent side="right">{description}</TooltipContent>
                          </Tooltip>
                        );
                      })}
                    </div>

                    {/* Modifiers */}
                    <div className="pt-3">
                      <SectionLabel>Modifiers</SectionLabel>
                      <div className="grid grid-cols-3 gap-1">
                        {MODIFIER_BEHAVIORS.map(({ type, icon: Icon, label, description, conflicts }) => {
                          const on = modifiers.includes(type);
                          const blocked = conflicts.includes(movement);
                          return (
                            <Tooltip key={type}>
                              <TooltipTrigger asChild>
                                <motion.button
                                  whileTap={blocked ? {} : { scale: 0.88 }}
                                  onClick={() => { if (!blocked) p.onModifierToggle(type); }}
                                  className={`relative aspect-square flex items-center justify-center rounded-md transition-all duration-150 ${
                                    blocked ? 'cursor-not-allowed opacity-20 ui-cell' : `cursor-pointer ${on ? 'ui-cell-active' : 'ui-cell'}`
                                  }`}
                                >
                                  <Icon size={22} strokeWidth={on ? 2 : 1.5} />
                                  {!blocked && (
                                    <span className="absolute top-1 right-1 text-[7px] font-bold leading-none"
                                      style={{ color: on ? THEME.accent : THEME.borderBright }}>
                                      {on ? '✓' : '+'}
                                    </span>
                                  )}
                                </motion.button>
                              </TooltipTrigger>
                              <TooltipContent side="right">
                                {blocked ? `Incompatible with ${movement}` : description}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>

                      {/* Stack pill */}
                      {modifiers.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-2 px-2 py-1.5 rounded-md flex items-center gap-1 flex-wrap"
                          style={{
                            background: alpha(THEME.accent, 0.07),
                            border: `1px solid ${alpha(THEME.accent, 0.2)}`,
                          }}
                        >
                          {movement !== 'static' && (
                            <span className="text-[9px] font-semibold" style={{ color: THEME.accent }}>{movement}</span>
                          )}
                          {movement !== 'static' && modifiers.length > 0 && (
                            <span className="text-[9px]" style={{ color: alpha(THEME.accent, 0.5) }}>+</span>
                          )}
                          {modifiers.map((m, i) => (
                            <React.Fragment key={m}>
                              {i > 0 && <span className="text-[9px]" style={{ color: alpha(THEME.accent, 0.5) }}>+</span>}
                              <span className="text-[9px] font-semibold" style={{ color: THEME.accent }}>{m}</span>
                            </React.Fragment>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </>
                )}

                {/* Custom animation */}
                {movement === 'custom' && isBehaviorTool && (
                  <>
                    <Divider />
                    <CustomAnimationPanel
                      data={p.customAnimationData}
                      onChange={p.onCustomAnimationDataChange}
                      selectedKfIndex={p.selectedCustomKfIndex}
                      onSelectKf={p.onSelectCustomKf}
                    />
                  </>
                )}

                {/* Homing */}
                {movement === 'homing' && isBehaviorTool && (
                  <><Divider />
                    <SliderRow label="Tracking speed" value={`${Math.round(homingSpd)} px/beat`}>
                      <input type="range" min="10" max="400" step="5" value={homingSpd} className="w-full cursor-pointer"
                        onChange={e => { const v = +e.target.value; if (isEditing) p.onUpdateSelectedBehaviorSettings({ homingSpeed: v }); else p.onHomingSpeedChange(v); }} />
                    </SliderRow>
                  </>
                )}

                {/* Bouncing */}
                {movement === 'bouncing' && isBehaviorTool && (
                  <><Divider />
                    <div className="space-y-3">
                      <SliderRow label="Speed" value={`${Math.round(bounceSpd)} px/beat`}>
                        <input type="range" min="10" max="400" step="5" value={bounceSpd} className="w-full cursor-pointer"
                          onChange={e => { const v = +e.target.value; if (isEditing) p.onUpdateSelectedBehaviorSettings({ bounceSpeed: v }); else p.onBounceSpeedChange(v); }} />
                      </SliderRow>
                      <SliderRow label="Direction" value={`${Math.round(bounceAng)}°`}>
                        <input type="range" min="0" max="359" step="1" value={bounceAng} className="w-full cursor-pointer"
                          onChange={e => { const v = +e.target.value; if (isEditing) p.onUpdateSelectedBehaviorSettings({ bounceAngle: v }); else p.onBounceAngleChange(v); }} />
                        <div className="flex justify-between text-[8px] mt-0.5" style={{ color: THEME.textDim }}>
                          <span>→</span><span>↓</span><span>←</span><span>↑</span>
                        </div>
                      </SliderRow>
                    </div>
                  </>
                )}

                {/* Sweep */}
                {movement === 'sweep' && isBehaviorTool && (
                  <><Divider />
                    <div className="space-y-3">
                      <SliderRow label="Speed" value={`${Math.round(sweepSpd)} px/beat`}>
                        <input type="range" min="10" max="400" step="5" value={sweepSpd} className="w-full cursor-pointer"
                          onChange={e => { const v = +e.target.value; if (isEditing) p.onUpdateSelectedBehaviorSettings({ sweepSpeed: v }); else p.onSweepSpeedChange(v); }} />
                      </SliderRow>
                      <SliderRow label="Direction" value={`${Math.round(sweepAng)}°`}>
                        <input type="range" min="0" max="359" step="1" value={sweepAng} className="w-full cursor-pointer"
                          onChange={e => { const v = +e.target.value; if (isEditing) p.onUpdateSelectedBehaviorSettings({ sweepAngle: v }); else p.onSweepAngleChange(v); }} />
                        <div className="flex justify-between text-[8px] mt-0.5" style={{ color: THEME.textDim }}>
                          <span>→</span><span>↓</span><span>←</span><span>↑</span>
                        </div>
                      </SliderRow>
                    </div>
                  </>
                )}

                {/* Spinning modifier */}
                {modifiers.includes('spinning') && isBehaviorTool && (
                  <><Divider />
                    <SliderRow label="Spin rate" value={`${spinSpd.toFixed(1)} rad/s`}>
                      <input type="range" min="0.1" max="12" step="0.1" value={spinSpd} className="w-full cursor-pointer"
                        onChange={e => { const v = +e.target.value; if (isEditing) p.onUpdateSelectedBehaviorSettings({ spinSpeed: v }); else p.onSpinSpeedChange(v); }} />
                    </SliderRow>
                  </>
                )}

                {/* Bomb modifier */}
                {modifiers.includes('bomb') && isBehaviorTool && (
                  <><Divider />
                    <div className="flex items-center gap-1.5 mb-3">
                      <Bomb size={10} style={{ color: THEME.accent }} />
                      <span className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: THEME.accent }}>Bomb</span>
                    </div>
                    <div className="space-y-3">
                      <SliderRow label="Growth" value={`${bombGrowth} beats`}>
                        <input type="range" min="1" max="16" step="1" value={bombGrowth} className="w-full cursor-pointer"
                          onChange={e => { const v = +e.target.value; if (isEditing) p.onUpdateSelectedBombSettings({ growthBeats: v }); else p.onBombGrowthBeatsChange(v); }} />
                      </SliderRow>
                      <SliderRow label="Fragments" value={String(bombCount)}>
                        <input type="range" min="4" max="32" step="1" value={bombCount} className="w-full cursor-pointer"
                          onChange={e => { const v = +e.target.value; if (isEditing) p.onUpdateSelectedBombSettings({ particleCount: v }); else p.onBombParticleCountChange(v); }} />
                      </SliderRow>
                      <SliderRow label="Velocity" value={`${bombSpd} px/s`}>
                        <input type="range" min="50" max="1200" step="25" value={bombSpd} className="w-full cursor-pointer"
                          onChange={e => { const v = +e.target.value; if (isEditing) p.onUpdateSelectedBombSettings({ particleSpeed: v }); else p.onBombParticleSpeedChange(v); }} />
                      </SliderRow>
                    </div>
                  </>
                )}

                {/* Pulse modifier */}
                {modifiers.includes('pulse') && isBehaviorTool && (
                  <><Divider />
                    <div className="flex items-center gap-1.5 mb-3">
                      <Activity size={10} style={{ color: THEME.green }} />
                      <span className="text-[9px] font-semibold uppercase tracking-[0.12em]" style={{ color: THEME.green }}>Pulse</span>
                    </div>
                    <div className="space-y-3">
                      <SliderRow label="Rate"
                        value={pulseRate === 0.25 ? '÷4' : pulseRate === 0.5 ? '÷2' : pulseRate === 1 ? '×1' : `×${pulseRate}`}>
                        <input type="range" min="0.25" max="4" step="0.25" value={pulseRate} className="w-full slider-green cursor-pointer"
                          onChange={e => { const v = +e.target.value; if (isEditing) p.onUpdateSelectedPulseSettings({ beatRate: v }); else p.onPulseBeatRateChange(v); }} />
                      </SliderRow>
                      <SliderRow label="Min scale" value={pulseMin.toFixed(2)}>
                        <input type="range" min="0.1" max="0.99" step="0.05" value={pulseMin} className="w-full slider-green cursor-pointer"
                          onChange={e => { const v = +e.target.value; if (isEditing) p.onUpdateSelectedPulseSettings({ minScale: v }); else p.onPulseMinScaleChange(v); }} />
                      </SliderRow>
                      <SliderRow label="Max scale" value={pulseMax.toFixed(2)}>
                        <input type="range" min="1.01" max="3.0" step="0.05" value={pulseMax} className="w-full slider-green cursor-pointer"
                          onChange={e => { const v = +e.target.value; if (isEditing) p.onUpdateSelectedPulseSettings({ maxScale: v }); else p.onPulseMaxScaleChange(v); }} />
                      </SliderRow>
                    </div>
                  </>
                )}

                {/* Size & Duration */}
                <Divider />
                <div className="space-y-3">
                  <SliderRow label={isEditing ? `Size (${p.selectedCount})` : 'Size'} value={`${sizeVal}px`}>
                    <input type="range" min="4" max="200" value={sizeVal} className="w-full cursor-pointer"
                      onChange={e => { const v = +e.target.value; if (isEditing) p.onUpdateSelectedSize(v); else p.onActiveSizeChange(v); }} />
                  </SliderRow>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px]" style={{ color: THEME.textMuted }}>
                        {isEditing ? `Duration (${p.selectedCount})` : 'Duration'}
                      </span>
                      <span className="text-[10px] font-mono tabular-nums" style={{ color: THEME.accent }}>{durVal.toFixed(1)}s</span>
                    </div>
                    <Input type="number" min="0.1" step="0.1" value={durInput}
                      onChange={e => {
                        setDurInput(e.target.value);
                        const v = Number(e.target.value);
                        if (!e.target.value || !Number.isFinite(v) || v <= 0) return;
                        if (isEditing) p.onUpdateSelectedDuration(v); else p.onActiveDurationChange(v);
                      }}
                      onBlur={() => {
                        if (!Number.isFinite(Number(durInput)) || Number(durInput) <= 0)
                          setDurInput(String(durVal));
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ═══ SHAPES ═══════════════════════════════════════════════ */}
            {p.activePanel === 'shapes' && (
              <div className="pt-1 space-y-4">
                <div>
                  <SectionLabel>Primitives</SectionLabel>
                  <div className="shape-grid">
                    {SHAPES.map(({ type, icon: Icon }) => {
                      const on = p.activeShape === type && p.activeCustomShapeId === null;
                      return (
                        <Tooltip key={type}>
                          <TooltipTrigger asChild>
                            <motion.button
                              whileTap={{ scale: 0.88 }}
                              onClick={() => p.onSelectShape(type)}
                              className={`aspect-square flex items-center justify-center rounded-md cursor-pointer ${on ? 'ui-cell-active' : 'ui-cell'}`}
                            >
                              <Icon size={22} strokeWidth={on ? 2 : 1.5} />
                            </motion.button>
                          </TooltipTrigger>
                          <TooltipContent side="right" className="capitalize">{type}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>

                {p.customShapes.length > 0 && (
                  <div>
                    <Divider />
                    <SectionLabel>
                      <span className="flex items-center gap-1">
                        <Layers size={9} style={{ color: THEME.violet }} /> Custom
                      </span>
                    </SectionLabel>
                    <div className="flex flex-col gap-1.5">
                      {p.customShapes.map(shape => {
                        const on = p.activeCustomShapeId === shape.id;
                        return (
                          <motion.button
                            key={shape.id}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => p.onSelectCustomShape(shape.id)}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer text-left transition-all duration-150"
                            style={{
                              background: on ? alpha(THEME.violet, 0.09) : THEME.surface,
                              borderColor: on ? alpha(THEME.violet, 0.35) : THEME.border,
                              color: on ? THEME.text : THEME.textMuted,
                            }}
                          >
                            {shape.thumbnail
                              ? <img src={shape.thumbnail} alt={shape.name} className="w-8 h-8 rounded-md shrink-0 object-cover" style={{ border: `1px solid ${THEME.borderBright}` }} />
                              : <div className="w-8 h-8 rounded-md flex items-center justify-center shrink-0" style={{ background: THEME.surfaceHover, border: `1px solid ${THEME.border}` }}>
                                  <Layers size={12} style={{ color: THEME.textDim }} />
                                </div>
                            }
                            <span className="text-xs truncate">{shape.name}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  onClick={p.onOpenComposer}
                  className="w-full py-2 rounded-md text-[10px] border cursor-pointer transition-all duration-150 flex items-center justify-center gap-1.5 hover:opacity-80"
                  style={{
                    color: THEME.violet,
                    borderColor: alpha(THEME.violet, 0.25),
                    background: alpha(THEME.violet, 0.05),
                  }}
                >
                  <Layers size={11} /> Open Shape Composer
                </button>
                <p className="text-[9px] text-center" style={{ color: THEME.textDim }}>
                  Pick a shape · click canvas to place
                </p>
              </div>
            )}

            {/* ═══ SETTINGS ═════════════════════════════════════════════ */}
            {p.activePanel === 'settings' && (
              <div className="pt-1 space-y-5">

                {/* Audio */}
                <div>
                  <SectionLabel><span className="flex items-center gap-1"><Music size={9} /> Song</span></SectionLabel>
                  <div
                    className="p-3 rounded-md border-2 border-dashed text-center cursor-pointer ui-dropzone"
                    onClick={() => document.getElementById('audio-input')?.click()}
                  >
                    <input id="audio-input" type="file" accept="audio/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) p.onAudioFileChange(f); }} />
                    <Upload size={18} className="mx-auto mb-1.5" style={{ color: THEME.cyan, opacity: 0.7 }} />
                    <div className="text-[10px] truncate" style={{ color: THEME.cyan, opacity: 0.7 }}>
                      {p.audioFile ? p.audioFile.name.slice(0, 18) : 'Upload MP3'}
                    </div>
                  </div>
                </div>

                {/* BPM */}
                <div>
                  <SectionLabel>BPM</SectionLabel>
                  <Input type="number" value={bpmInput}
                    onChange={e => {
                      setBpmInput(e.target.value);
                      const v = Number(e.target.value);
                      if (!e.target.value || !Number.isFinite(v)) return;
                      p.onBpmChange(v);
                    }}
                    onBlur={() => { if (!Number.isFinite(Number(bpmInput))) setBpmInput(String(p.bpm)); }}
                  />
                </div>

                {/* Colors */}
                <div>
                  <SectionLabel><span className="flex items-center gap-1"><Palette size={9} /> Colors</span></SectionLabel>
                  <div className="space-y-1.5">
                    {([
                      { label: 'Enemy',      icon: Swords, value: p.enemyColor,  set: p.onEnemyColorChange },
                      { label: 'Background', icon: Target, value: p.bgColor,     set: p.onBgColorChange },
                      { label: 'Player',     icon: User,   value: p.playerColor, set: p.onPlayerColorChange },
                    ] as const).map(({ label, icon: Icon, value, set }) => (
                      <div
                        key={label}
                        className="flex items-center gap-2.5 px-2 py-1.5 rounded-md border"
                        style={{ background: THEME.surface, borderColor: THEME.border }}
                      >
                        <label className="relative w-7 h-7 rounded cursor-pointer shrink-0 overflow-hidden" style={{ background: value, border: `1px solid ${THEME.borderBright}` }}>
                          <input type="color" value={value} onChange={e => set(e.target.value)}
                            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                        </label>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Icon size={10} style={{ color: THEME.textMuted }} className="shrink-0" />
                          <span className="text-[10px] truncate" style={{ color: THEME.textMuted }}>{label}</span>
                        </div>
                        <span className="ml-auto text-[9px] font-mono shrink-0" style={{ color: THEME.textDim }}>
                          {value.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Level name */}
                <div>
                  <SectionLabel>Level name</SectionLabel>
                  <Input type="text" value={p.bossName} onChange={e => p.onBossNameChange(e.target.value)} placeholder="My Level" />
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </TooltipProvider>
  );
};
