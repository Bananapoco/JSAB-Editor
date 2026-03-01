import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Bomb,
  Layers,
  Maximize2,
  Music,
  Palette,
  Upload,
} from 'lucide-react';
import { MODIFIER_BEHAVIORS, MOVEMENT_BEHAVIORS, SHAPES } from '../constants';
import {
  ActivePanel,
  BehaviorType,
  CustomAnimationData,
  ModifierBehavior,
  MovementBehavior,
  PlacedEvent,
  ShapeType,
} from '../types';
import { CustomShapeDef } from '../../shape-composer/types';
import { CustomAnimationPanel } from './CustomAnimationPanel';

interface BuildModeLeftPanelProps {
  activePanel: Exclude<ActivePanel, 'compose'>;
  activeBehavior: BehaviorType;
  activeModifiers: ModifierBehavior[];
  onBehaviorChange: (behavior: BehaviorType) => void;
  onModifierToggle: (modifier: ModifierBehavior) => void;
  bombGrowthBeats: number;
  bombParticleCount: number;
  onBombGrowthBeatsChange: (value: number) => void;
  onBombParticleCountChange: (value: number) => void;
  bombParticleSpeed: number;
  onBombParticleSpeedChange: (value: number) => void;
  pulseBeatRate: number;
  pulseMinScale: number;
  pulseMaxScale: number;
  onPulseBeatRateChange: (value: number) => void;
  onPulseMinScaleChange: (value: number) => void;
  onPulseMaxScaleChange: (value: number) => void;
  onUpdateSelectedPulseSettings: (updates: { beatRate?: number; minScale?: number; maxScale?: number }) => void;
  homingSpeed: number;
  onHomingSpeedChange: (value: number) => void;
  spinSpeed: number;
  onSpinSpeedChange: (value: number) => void;
  bounceSpeed: number;
  bounceAngle: number;
  onBounceSpeedChange: (value: number) => void;
  onBounceAngleChange: (value: number) => void;
  sweepSpeed: number;
  sweepAngle: number;
  onSweepSpeedChange: (value: number) => void;
  onSweepAngleChange: (value: number) => void;
  onUpdateSelectedBehaviorSettings: (updates: {
    homingSpeed?: number;
    spinSpeed?: number;
    bounceSpeed?: number;
    bounceAngle?: number;
    sweepSpeed?: number;
    sweepAngle?: number;
  }) => void;
  onUpdateSelectedBombSettings: (updates: { growthBeats?: number; particleCount?: number; particleSpeed?: number }) => void;
  activeSize: number;
  activeDuration: number;
  selectedEvent: PlacedEvent | null;
  selectedCount: number;
  onActiveSizeChange: (value: number) => void;
  onActiveDurationChange: (value: number) => void;
  onUpdateSelectedSize: (value: number) => void;
  onUpdateSelectedDuration: (value: number) => void;
  activeShape: ShapeType;
  activeCustomShapeId: string | null;
  customShapes: CustomShapeDef[];
  onSelectShape: (shape: ShapeType) => void;
  onSelectCustomShape: (id: string) => void;
  onOpenComposer: () => void;
  audioFile: File | null;
  onAudioFileChange: (file: File) => void;
  bpm: number;
  onBpmChange: (value: number) => void;
  enemyColor: string;
  bgColor: string;
  playerColor: string;
  onEnemyColorChange: (color: string) => void;
  onBgColorChange: (color: string) => void;
  onPlayerColorChange: (color: string) => void;
  bossName: string;
  onBossNameChange: (value: string) => void;
  customAnimationData: CustomAnimationData;
  onCustomAnimationDataChange: (data: CustomAnimationData) => void;
  selectedCustomKfIndex: number | null;
  onSelectCustomKf: (index: number | null) => void;
}

// ---------------------------------------------------------------------------
// Helpers – resolve effective movement / modifiers from a PlacedEvent,
// handling legacy events where behavior was 'spinning' or 'bomb' directly.
// ---------------------------------------------------------------------------

function getEffectiveMovement(event: PlacedEvent): MovementBehavior {
  if (event.behaviorModifiers !== undefined) {
    // New format: behavior IS the movement type
    return (event.behavior as MovementBehavior) ?? 'static';
  }
  // Legacy format: spinning/bomb were standalone primaries
  if (event.behavior === 'spinning' || event.behavior === 'bomb') return 'static';
  return (event.behavior as MovementBehavior) ?? 'static';
}

function getEffectiveModifiers(event: PlacedEvent): ModifierBehavior[] {
  if (event.behaviorModifiers !== undefined) return event.behaviorModifiers;
  // Legacy: infer modifiers from behavior field
  const mods: ModifierBehavior[] = [];
  if (event.behavior === 'spinning') mods.push('spinning');
  if (event.behavior === 'bomb') mods.push('bomb');
  return mods;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BuildModeLeftPanel: React.FC<BuildModeLeftPanelProps> = ({
  activePanel,
  activeBehavior,
  activeModifiers,
  onBehaviorChange,
  onModifierToggle,
  bombGrowthBeats,
  bombParticleCount,
  onBombGrowthBeatsChange,
  onBombParticleCountChange,
  bombParticleSpeed,
  onBombParticleSpeedChange,
  pulseBeatRate,
  pulseMinScale,
  pulseMaxScale,
  onPulseBeatRateChange,
  onPulseMinScaleChange,
  onPulseMaxScaleChange,
  onUpdateSelectedPulseSettings,
  homingSpeed,
  onHomingSpeedChange,
  spinSpeed,
  onSpinSpeedChange,
  bounceSpeed,
  bounceAngle,
  onBounceSpeedChange,
  onBounceAngleChange,
  sweepSpeed,
  sweepAngle,
  onSweepSpeedChange,
  onSweepAngleChange,
  onUpdateSelectedBehaviorSettings,
  onUpdateSelectedBombSettings,
  activeSize,
  activeDuration,
  selectedEvent,
  selectedCount,
  onActiveSizeChange,
  onActiveDurationChange,
  onUpdateSelectedSize,
  onUpdateSelectedDuration,
  activeShape,
  activeCustomShapeId,
  customShapes,
  onSelectShape,
  onSelectCustomShape,
  onOpenComposer,
  audioFile,
  onAudioFileChange,
  bpm,
  onBpmChange,
  enemyColor,
  bgColor,
  playerColor,
  onEnemyColorChange,
  onBgColorChange,
  onPlayerColorChange,
  bossName,
  onBossNameChange,
  customAnimationData,
  onCustomAnimationDataChange,
  selectedCustomKfIndex,
  onSelectCustomKf,
}) => {
  const isEditingSelection = selectedCount > 0 && selectedEvent !== null;
  const sizeValue = isEditingSelection ? Math.round(selectedEvent.size ?? activeSize) : activeSize;
  const durationValue = isEditingSelection ? (selectedEvent.duration ?? activeDuration) : activeDuration;
  const [durationInput, setDurationInput] = React.useState(String(durationValue));
  const [bpmInput, setBpmInput] = React.useState(String(bpm));

  React.useEffect(() => {
    setDurationInput(String(durationValue));
  }, [durationValue, isEditingSelection, selectedCount]);

  React.useEffect(() => {
    setBpmInput(String(bpm));
  }, [bpm]);

  // Resolve the "effective" movement and modifiers for settings display.
  // When a selection exists, reflect that event's state; otherwise use the active placement state.
  const movementForSettings: MovementBehavior = isEditingSelection
    ? getEffectiveMovement(selectedEvent)
    : (activeBehavior as MovementBehavior);

  const modifiersForSettings: ModifierBehavior[] = isEditingSelection
    ? getEffectiveModifiers(selectedEvent)
    : activeModifiers;

  const selectedBehaviorSettings = selectedEvent?.behaviorSettings;
  const selectedBombSettings = selectedEvent?.bombSettings;

  const homingSpeedValue  = isEditingSelection ? (selectedBehaviorSettings?.homingSpeed ?? homingSpeed) : homingSpeed;
  const spinSpeedValue    = isEditingSelection ? (selectedBehaviorSettings?.spinSpeed ?? spinSpeed) : spinSpeed;
  const bounceSpeedValue  = isEditingSelection ? (selectedBehaviorSettings?.bounceSpeed ?? bounceSpeed) : bounceSpeed;
  const bounceAngleValue  = isEditingSelection ? (selectedBehaviorSettings?.bounceAngle ?? bounceAngle) : bounceAngle;
  const sweepSpeedValue   = isEditingSelection ? (selectedBehaviorSettings?.sweepSpeed ?? sweepSpeed) : sweepSpeed;
  const sweepAngleValue   = isEditingSelection ? (selectedBehaviorSettings?.sweepAngle ?? sweepAngle) : sweepAngle;
  const bombGrowthBeatsValue    = isEditingSelection ? (selectedBombSettings?.growthBeats    ?? bombGrowthBeats)    : bombGrowthBeats;
  const bombParticleCountValue  = isEditingSelection ? (selectedBombSettings?.particleCount  ?? bombParticleCount)  : bombParticleCount;
  const bombParticleSpeedValue  = isEditingSelection ? (selectedBombSettings?.particleSpeed  ?? bombParticleSpeed)  : bombParticleSpeed;

  const selectedPulseSettings = selectedEvent?.pulseSettings;
  const pulseBeatRateValue = isEditingSelection ? (selectedPulseSettings?.beatRate ?? pulseBeatRate) : pulseBeatRate;
  const pulseMinScaleValue  = isEditingSelection ? (selectedPulseSettings?.minScale ?? pulseMinScale) : pulseMinScale;
  const pulseMaxScaleValue  = isEditingSelection ? (selectedPulseSettings?.maxScale ?? pulseMaxScale) : pulseMaxScale;

  const isBehaviorTool = isEditingSelection
    ? selectedEvent.type === 'projectile_throw' || selectedEvent.type === 'spawn_obstacle'
    : true;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activePanel}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="w-52 bg-[#0a0a12] border-r border-[#1a1a2e] p-4 shrink-0 overflow-y-auto"
      >
        {/* ── TOOLS PANEL ─────────────────────────────────────────────────── */}
        {activePanel === 'tools' && (
          <div className="space-y-6">


            {/* ── Behavior grid ───────────────────────────────────────────── */}
            {isBehaviorTool && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] uppercase tracking-widest text-[#444]">Behavior</div>
                  <div className="text-[9px] text-[#FF009966] tracking-wide">⇧ to stack</div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {/* Movement behaviors */}
                  {MOVEMENT_BEHAVIORS.map(({ type, icon: Icon, label }) => {
                    const isActiveMovement = movementForSettings === type;
                    return (
                      <motion.button
                        key={type}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={e => {
                          if (e.shiftKey) {
                            // Shift+click on a movement behavior → just set it normally
                            // (movement behaviors can't be stacked with each other)
                            onBehaviorChange(type);
                          } else {
                            onBehaviorChange(type);
                          }
                        }}
                        className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1 border ${
                          isActiveMovement
                            ? 'bg-[#FF0099] border-[#FF0099] text-white'
                            : 'bg-[#151520] border-[#252540] text-[#666] hover:text-white hover:bg-[#252540]'
                        }`}
                        title={`${label} (movement)`}
                      >
                        <Icon size={14} />
                        <span className="text-[9px] leading-none uppercase tracking-wide">{label}</span>
                      </motion.button>
                    );
                  })}

                  {/* Modifier behaviors */}
                  {MODIFIER_BEHAVIORS.map(({ type, icon: Icon, label, conflicts }) => {
                    const isActiveModifier = modifiersForSettings.includes(type);
                    const isConflicting = conflicts.includes(movementForSettings);

                    return (
                      <motion.button
                        key={type}
                        whileHover={isConflicting ? {} : { scale: 1.05 }}
                        whileTap={isConflicting ? {} : { scale: 0.95 }}
                        onClick={e => {
                          if (isConflicting) return;
                          // Shift+click OR regular click both toggle the modifier.
                          // Modifiers are stackable — they always toggle regardless of shift.
                          onModifierToggle(type);
                        }}
                        className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1 border relative ${
                          isConflicting
                            ? 'bg-[#0d0d18] border-[#1a1a2e] text-[#333] cursor-not-allowed'
                            : isActiveModifier
                              ? 'border-[#FF0099] text-[#FF0099] bg-[#FF009918]'
                              : 'bg-[#151520] border-[#252540] text-[#666] hover:text-white hover:bg-[#252540]'
                        }`}
                        title={
                          isConflicting
                            ? `${label} is incompatible with ${movementForSettings}`
                            : `${label} modifier — click to ${isActiveModifier ? 'remove' : 'stack'}`
                        }
                      >
                        <Icon size={14} />
                        <span className="text-[9px] leading-none uppercase tracking-wide">{label}</span>
                        {/* Small "+" badge on inactive stackable, "✓" when stacked */}
                        {!isConflicting && (
                          <span
                            className={`absolute top-0.5 right-0.5 text-[8px] leading-none font-bold ${
                              isActiveModifier ? 'text-[#FF0099]' : 'text-[#444]'
                            }`}
                          >
                            {isActiveModifier ? '✓' : '+'}
                          </span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {/* Active stack summary – shows when at least one modifier is on */}
                {modifiersForSettings.length > 0 && (
                  <div className="mt-2 px-2 py-1.5 rounded-lg bg-[#FF009912] border border-[#FF009933]">
                    <div className="text-[9px] text-[#FF0099] font-medium uppercase tracking-wide leading-none">
                      {movementForSettings !== 'static' ? movementForSettings : ''}
                      {movementForSettings !== 'static' && modifiersForSettings.length > 0 ? ' + ' : ''}
                      {modifiersForSettings.join(' + ')}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── Custom animation panel ──────────────────────────────────── */}
            {movementForSettings === 'custom' && isBehaviorTool && (
              <CustomAnimationPanel
                data={customAnimationData}
                onChange={onCustomAnimationDataChange}
                selectedKfIndex={selectedCustomKfIndex}
                onSelectKf={onSelectCustomKf}
              />
            )}

            {/* ── Movement-specific settings ──────────────────────────────── */}
            {movementForSettings === 'homing' && isBehaviorTool && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">Homing Speed</div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-[#666]">Tracking</span>
                  <span className="text-xs font-mono text-[#FF0099]">{Math.round(homingSpeedValue)} px/beat</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="400"
                  step="5"
                  value={homingSpeedValue}
                  onChange={e => {
                    const value = +e.target.value;
                    if (isEditingSelection) onUpdateSelectedBehaviorSettings({ homingSpeed: value });
                    else onHomingSpeedChange(value);
                  }}
                  className="w-full accent-[#FF0099] cursor-pointer"
                />
              </div>
            )}

            {movementForSettings === 'bouncing' && isBehaviorTool && (
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-[#444]">Bounce</div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-[#666]">Speed</span>
                    <span className="text-xs font-mono text-[#FF0099]">{Math.round(bounceSpeedValue)} px/beat</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="400"
                    step="5"
                    value={bounceSpeedValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedBehaviorSettings({ bounceSpeed: value });
                      else onBounceSpeedChange(value);
                    }}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-[#666]">Direction</span>
                    <span className="text-xs font-mono text-[#FF0099]">{Math.round(bounceAngleValue)}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="359"
                    step="1"
                    value={bounceAngleValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedBehaviorSettings({ bounceAngle: value });
                      else onBounceAngleChange(value);
                    }}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#555] mt-1">
                    <span>→ 0°</span>
                    <span>↓ 90°</span>
                    <span>← 180°</span>
                    <span>↑ 270°</span>
                  </div>
                </div>
              </div>
            )}

            {movementForSettings === 'sweep' && isBehaviorTool && (
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-[#444]">Sweep</div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-[#666]">Speed</span>
                    <span className="text-xs font-mono text-[#FF0099]">{Math.round(sweepSpeedValue)} px/beat</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="400"
                    step="5"
                    value={sweepSpeedValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedBehaviorSettings({ sweepSpeed: value });
                      else onSweepSpeedChange(value);
                    }}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-[#666]">Direction</span>
                    <span className="text-xs font-mono text-[#FF0099]">{Math.round(sweepAngleValue)}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="359"
                    step="1"
                    value={sweepAngleValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedBehaviorSettings({ sweepAngle: value });
                      else onSweepAngleChange(value);
                    }}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#555] mt-1">
                    <span>→ 0°</span>
                    <span>↓ 90°</span>
                    <span>← 180°</span>
                    <span>↑ 270°</span>
                  </div>
                </div>
              </div>
            )}

            {/* ── Modifier-specific settings ──────────────────────────────── */}
            {modifiersForSettings.includes('spinning') && isBehaviorTool && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">Spin Speed</div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-[#666]">Rotation</span>
                  <span className="text-xs font-mono text-[#FF0099]">{spinSpeedValue.toFixed(2)} rad/s</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="12"
                  step="0.1"
                  value={spinSpeedValue}
                  onChange={e => {
                    const value = +e.target.value;
                    if (isEditingSelection) onUpdateSelectedBehaviorSettings({ spinSpeed: value });
                    else onSpinSpeedChange(value);
                  }}
                  className="w-full accent-[#FF0099] cursor-pointer"
                />
              </div>
            )}

            {modifiersForSettings.includes('bomb') && isBehaviorTool && (
              <>
                <div className="w-full h-px bg-[#FF009933]" />
                <div className="text-[10px] uppercase tracking-widest text-[#FF0099] font-bold mb-2 flex items-center gap-1">
                  <Bomb size={10} /> Bomb Settings
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#444]">Growth Beats</span>
                    <span className="text-xs font-mono text-[#FF0099]">{bombGrowthBeatsValue}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="16"
                    step="1"
                    value={bombGrowthBeatsValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedBombSettings({ growthBeats: value });
                      else onBombGrowthBeatsChange(value);
                    }}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#555] mt-1">
                    <span>Fast</span>
                    <span>Slow</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#444]">Projectiles</span>
                    <span className="text-xs font-mono text-[#FF0099]">{bombParticleCountValue}</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    step="1"
                    value={bombParticleCountValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedBombSettings({ particleCount: value });
                      else onBombParticleCountChange(value);
                    }}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#444]">Velocity</span>
                    <span className="text-xs font-mono text-[#FF0099]">{bombParticleSpeedValue} px/s</span>
                  </div>
                  <input
                    type="range"
                    min="50"
                    max="1200"
                    step="25"
                    value={bombParticleSpeedValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedBombSettings({ particleSpeed: value });
                      else onBombParticleSpeedChange(value);
                    }}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#555] mt-1">
                    <span>Slow</span>
                    <span>Fast</span>
                  </div>
                </div>
              </>
            )}

            {modifiersForSettings.includes('pulse') && isBehaviorTool && (
              <>
                <div className="w-full h-px bg-[#00FF8833]" />
                <div className="text-[10px] uppercase tracking-widest text-[#00FF88] font-bold mb-2 flex items-center gap-1">
                  <Activity size={10} /> Pulse Settings
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#444]">Beat Rate</span>
                    <span className="text-xs font-mono text-[#00FF88]">
                      {pulseBeatRateValue === 0.25 ? '÷4' : pulseBeatRateValue === 0.5 ? '÷2' : pulseBeatRateValue === 1 ? '×1' : pulseBeatRateValue === 2 ? '×2' : `×${pulseBeatRateValue}`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="4"
                    step="0.25"
                    value={pulseBeatRateValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedPulseSettings({ beatRate: value });
                      else onPulseBeatRateChange(value);
                    }}
                    className="w-full accent-[#00FF88] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#555] mt-1">
                    <span>Slow</span>
                    <span>Fast</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#444]">Min Scale</span>
                    <span className="text-xs font-mono text-[#00FF88]">{pulseMinScaleValue.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.99"
                    step="0.05"
                    value={pulseMinScaleValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedPulseSettings({ minScale: value });
                      else onPulseMinScaleChange(value);
                    }}
                    className="w-full accent-[#00FF88] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#444]">Max Scale</span>
                    <span className="text-xs font-mono text-[#00FF88]">{pulseMaxScaleValue.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="1.01"
                    max="3.0"
                    step="0.05"
                    value={pulseMaxScaleValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedPulseSettings({ maxScale: value });
                      else onPulseMaxScaleChange(value);
                    }}
                    className="w-full accent-[#00FF88] cursor-pointer"
                  />
                </div>
              </>
            )}

            {/* ── Size & Duration ─────────────────────────────────────────── */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#444] flex items-center gap-1">
                  <Maximize2 size={9} />
                  {isEditingSelection ? `Size (${selectedCount})` : 'Size'}
                </span>
                <span className="text-xs font-mono text-[#FF0099]">{sizeValue}px</span>
              </div>
              <input
                type="range"
                min="4"
                max="200"
                value={sizeValue}
                onChange={e => {
                  const value = +e.target.value;
                  if (isEditingSelection) onUpdateSelectedSize(value);
                  else onActiveSizeChange(value);
                }}
                className="w-full accent-[#FF0099] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#444]">
                  {isEditingSelection ? `Duration (${selectedCount})` : 'Duration'}
                </span>
                <span className="text-xs font-mono text-[#FF0099]">{durationValue.toFixed(1)}s</span>
              </div>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={durationInput}
                onChange={e => {
                  const raw = e.target.value;
                  setDurationInput(raw);

                  if (raw === '') return;

                  const value = Number(raw);
                  if (!Number.isFinite(value) || value <= 0) return;

                  if (isEditingSelection) onUpdateSelectedDuration(value);
                  else onActiveDurationChange(value);
                }}
                onBlur={() => {
                  const value = Number(durationInput);
                  if (!Number.isFinite(value) || value <= 0) {
                    setDurationInput(String(durationValue));
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm focus:outline-none focus:border-[#FF0099]"
              />
            </div>
          </div>
        )}

        {/* ── SHAPES PANEL ────────────────────────────────────────────────── */}
        {activePanel === 'shapes' && (
          <div className="space-y-4">
            <div className="text-[10px] uppercase tracking-widest text-[#444]">Primitive Shapes</div>
            <div className="shape-grid">
              {SHAPES.map(({ type, icon: Icon }) => (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onSelectShape(type)}
                  className={`aspect-square p-4 rounded-xl transition-all ${
                    activeShape === type && activeCustomShapeId === null
                      ? 'bg-gradient-to-br from-[#FF0099] to-[#FF6600] text-white shadow-lg shadow-[#FF009944]'
                      : 'bg-[#151520] text-[#666] hover:text-white hover:bg-[#252540] border border-[#252540]'
                  }`}
                >
                  <Icon size={28} className="w-full h-full" />
                </motion.button>
              ))}
            </div>

            {customShapes.length > 0 && (
              <>
                <div className="w-full h-px bg-[#1a1a2e]" />
                <div className="text-[10px] uppercase tracking-widest text-[#9966FF] flex items-center gap-1">
                  <Layers size={10} /> Custom Shapes
                </div>
                <div className="flex flex-col gap-1.5">
                  {customShapes.map(shape => (
                    <motion.button
                      key={shape.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onSelectCustomShape(shape.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl transition-all text-left ${
                        activeCustomShapeId === shape.id
                          ? 'bg-[#9966FF33] border border-[#9966FF] text-white'
                          : 'bg-[#151520] border border-[#252540] text-[#888] hover:text-white hover:bg-[#252540]'
                      }`}
                    >
                      {shape.thumbnail ? (
                        <img
                          src={shape.thumbnail}
                          alt={shape.name}
                          className="w-9 h-9 rounded-lg border border-[#333] shrink-0 object-cover"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-[#1a1a2e] flex items-center justify-center shrink-0">
                          <Layers size={14} className="text-[#555]" />
                        </div>
                      )}
                      <span className="text-xs font-medium truncate">{shape.name}</span>
                    </motion.button>
                  ))}
                </div>
                <button
                  onClick={onOpenComposer}
                  className="w-full py-1.5 rounded-lg text-[10px] text-[#9966FF] border border-[#9966FF44] hover:bg-[#9966FF11] transition-all flex items-center justify-center gap-1"
                >
                  <Layers size={10} /> Open Composer
                </button>
              </>
            )}

            <p className="text-[10px] text-[#444] text-center mt-2">
              Pick a shape then click the canvas to place
            </p>
          </div>
        )}

        {/* ── SETTINGS PANEL ──────────────────────────────────────────────── */}
        {activePanel === 'settings' && (
          <div className="space-y-5">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2 flex items-center gap-1">
                <Music size={12} /> Song
              </div>
              <motion.div
                whileHover={{ scale: 1.02 }}
                onClick={() => document.getElementById('audio-input')?.click()}
                className="p-4 rounded-xl border-2 border-dashed border-[#00FFFF44] bg-[#00FFFF08] hover:bg-[#00FFFF12] cursor-pointer text-center transition-all"
              >
                <input
                  id="audio-input"
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) onAudioFileChange(file);
                  }}
                />
                <Upload size={24} className="mx-auto mb-2 text-[#00FFFF]" />
                <div className="text-xs text-[#00FFFF]">
                  {audioFile ? audioFile.name.slice(0, 16) : 'Drop MP3'}
                </div>
              </motion.div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">BPM</div>
              <input
                type="number"
                value={bpmInput}
                onChange={e => {
                  const raw = e.target.value;
                  setBpmInput(raw);

                  if (raw === '') return;

                  const value = Number(raw);
                  if (!Number.isFinite(value)) return;
                  onBpmChange(value);
                }}
                onBlur={() => {
                  const value = Number(bpmInput);
                  if (!Number.isFinite(value)) {
                    setBpmInput(String(bpm));
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm focus:outline-none focus:border-[#FF0099]"
              />
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2 flex items-center gap-1">
                <Palette size={12} /> Colors
              </div>
              <div className="space-y-2">
                {[
                  { label: '👾 Enemy', value: enemyColor, set: onEnemyColorChange },
                  { label: '🌌 BG', value: bgColor, set: onBgColorChange },
                  { label: '🎮 Player', value: playerColor, set: onPlayerColorChange },
                ].map(({ label, value, set }) => (
                  <div key={label} className="flex items-center gap-2">
                    <input
                      type="color"
                      value={value}
                      onChange={e => set(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-2 border-[#252540]"
                    />
                    <span className="text-xs text-[#888]">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">Level Name</div>
              <input
                type="text"
                value={bossName}
                onChange={e => onBossNameChange(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm focus:outline-none focus:border-[#FF0099]"
                placeholder="My Level"
              />
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
