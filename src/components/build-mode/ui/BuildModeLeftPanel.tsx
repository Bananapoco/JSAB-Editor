import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bomb,
  Layers,
  Maximize2,
  MousePointer2,
  Music,
  Palette,
  Upload,
} from 'lucide-react';
import { BEHAVIORS, SHAPES, TOOLS } from '../constants';
import { ActivePanel, BehaviorType, CustomAnimationData, PlacedEvent, ShapeType, Tool } from '../types';
import { CustomShapeDef } from '../../shape-composer/types';
import { CustomAnimationPanel } from './CustomAnimationPanel';

interface BuildModeLeftPanelProps {
  activePanel: Exclude<ActivePanel, 'compose'>;
  isPlacementMode: boolean;
  activeTool: Tool;
  activeBehavior: BehaviorType;
  onBehaviorChange: (behavior: BehaviorType) => void;
  onSelectTool: (tool: Tool) => void;
  bombGrowthBeats: number;
  bombParticleCount: number;

  onBombGrowthBeatsChange: (value: number) => void;
  onBombParticleCountChange: (value: number) => void;
  homingSpeed: number;
  onHomingSpeedChange: (value: number) => void;
  spinSpeed: number;
  onSpinSpeedChange: (value: number) => void;
  bounceVx: number;
  bounceVy: number;
  onBounceVxChange: (value: number) => void;
  onBounceVyChange: (value: number) => void;
  sweepVx: number;
  sweepVy: number;
  onSweepVxChange: (value: number) => void;
  onSweepVyChange: (value: number) => void;
  onUpdateSelectedBehaviorSettings: (updates: { homingSpeed?: number; spinSpeed?: number; bounceVx?: number; bounceVy?: number; sweepVx?: number; sweepVy?: number }) => void;
  onUpdateSelectedBombSettings: (updates: { growthBeats?: number; particleCount?: number }) => void;
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

export const BuildModeLeftPanel: React.FC<BuildModeLeftPanelProps> = ({
  activePanel,
  isPlacementMode,
  activeTool,
  activeBehavior,
  onBehaviorChange,
  onSelectTool,
  bombGrowthBeats,
  bombParticleCount,
  onBombGrowthBeatsChange,
  onBombParticleCountChange,
  homingSpeed,
  onHomingSpeedChange,
  spinSpeed,
  onSpinSpeedChange,
  bounceVx,
  bounceVy,
  onBounceVxChange,
  onBounceVyChange,
  sweepVx,
  sweepVy,
  onSweepVxChange,
  onSweepVyChange,
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

  const behaviorForSettings = isEditingSelection ? selectedEvent.behavior : activeBehavior;
  const toolForSettings = isEditingSelection ? selectedEvent.type : activeTool;
  const selectedBehaviorSettings = selectedEvent?.behaviorSettings;
  const selectedBombSettings = selectedEvent?.bombSettings;

  const homingSpeedValue = isEditingSelection ? (selectedBehaviorSettings?.homingSpeed ?? homingSpeed) : homingSpeed;
  const spinSpeedValue = isEditingSelection ? (selectedBehaviorSettings?.spinSpeed ?? spinSpeed) : spinSpeed;
  const bounceVxValue = isEditingSelection ? (selectedBehaviorSettings?.bounceVx ?? bounceVx) : bounceVx;
  const bounceVyValue = isEditingSelection ? (selectedBehaviorSettings?.bounceVy ?? bounceVy) : bounceVy;
  const sweepVxValue = isEditingSelection ? (selectedBehaviorSettings?.sweepVx ?? sweepVx) : sweepVx;
  const sweepVyValue = isEditingSelection ? (selectedBehaviorSettings?.sweepVy ?? sweepVy) : sweepVy;

  const bombGrowthBeatsValue = isEditingSelection ? (selectedBombSettings?.growthBeats ?? bombGrowthBeats) : bombGrowthBeats;
  const bombParticleCountValue = isEditingSelection ? (selectedBombSettings?.particleCount ?? bombParticleCount) : bombParticleCount;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activePanel}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
        className="w-52 bg-[#0a0a12] border-r border-[#1a1a2e] p-4 shrink-0 overflow-y-auto"
      >
        {activePanel === 'tools' && (
          <div className="space-y-6">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">Tool</div>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(TOOLS) as [Tool, (typeof TOOLS)[Tool]][]).map(([key, { icon: Icon, color, label }]) => {
                  const isActive = isPlacementMode && activeTool === key;
                  return (
                    <motion.button
                      key={key}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => onSelectTool(key)}
                      className={`p-2 rounded-lg transition-all border text-left ${
                        isActive
                          ? 'text-white border-transparent'
                          : 'bg-[#151520] border-[#252540] text-[#888] hover:text-white hover:bg-[#252540]'
                      }`}
                      style={isActive ? { backgroundColor: `${color}30`, borderColor: color } : undefined}
                    >
                      <div className="flex items-center gap-2">
                        <Icon size={14} style={{ color: isActive ? color : undefined }} />
                        <span className="text-[10px] uppercase tracking-wide">{label}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">Mode</div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#151520] border border-[#252540]">
                {isPlacementMode ? (
                  (() => {
                    const tool = TOOLS[activeTool];
                    const Icon = tool.icon;
                    return (
                      <>
                        <Icon size={18} style={{ color: tool.color }} />
                        <span className="text-sm font-medium">Placing: {tool.label}</span>
                      </>
                    );
                  })()
                ) : (
                  <>
                    <MousePointer2 size={18} style={{ color: '#9ca3af' }} />
                    <span className="text-sm font-medium text-[#bbb]">Select / Move</span>
                  </>
                )}
              </div>
              {isPlacementMode && (
                <p className="text-[10px] text-[#666] mt-2">Press Esc to stop placing</p>
              )}
            </div>

            {(activeTool === 'projectile_throw' || activeTool === 'spawn_obstacle') && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">Behavior</div>
                <div className="grid grid-cols-3 gap-2">
                  {BEHAVIORS.map(({ type, icon: Icon, label }) => (
                    <motion.button
                      key={type}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onBehaviorChange(type)}
                      className={`p-2 rounded-lg transition-all flex flex-col items-center gap-1 ${
                        activeBehavior === type
                          ? 'bg-[#FF0099] text-white'
                          : 'bg-[#151520] text-[#666] hover:text-white hover:bg-[#252540]'
                      }`}
                      title={label}
                    >
                      <Icon size={16} />
                      <span className="text-[9px] leading-none uppercase tracking-wide">{label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {behaviorForSettings === 'custom' && (toolForSettings === 'projectile_throw' || toolForSettings === 'spawn_obstacle') && (
              <CustomAnimationPanel
                data={customAnimationData}
                onChange={onCustomAnimationDataChange}
                selectedKfIndex={selectedCustomKfIndex}
                onSelectKf={onSelectCustomKf}
              />
            )}

            {behaviorForSettings === 'homing' && (toolForSettings === 'projectile_throw' || toolForSettings === 'spawn_obstacle') && (
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">Homing Speed</div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] text-[#666]">Tracking</span>
                  <span className="text-xs font-mono text-[#FF0099]">{Math.round(homingSpeedValue)} px/s</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="900"
                  step="10"
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

            {behaviorForSettings === 'spinning' && (toolForSettings === 'projectile_throw' || toolForSettings === 'spawn_obstacle') && (
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

            {behaviorForSettings === 'bouncing' && (toolForSettings === 'projectile_throw' || toolForSettings === 'spawn_obstacle') && (
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-[#444]">Bounce Velocity</div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-[#666]">X Speed</span>
                    <span className="text-xs font-mono text-[#FF0099]">{Math.round(bounceVxValue)} px/s</span>
                  </div>
                  <input
                    type="range"
                    min="-900"
                    max="900"
                    step="10"
                    value={bounceVxValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedBehaviorSettings({ bounceVx: value });
                      else onBounceVxChange(value);
                    }}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-[#666]">Y Speed</span>
                    <span className="text-xs font-mono text-[#FF0099]">{Math.round(bounceVyValue)} px/s</span>
                  </div>
                  <input
                    type="range"
                    min="-900"
                    max="900"
                    step="10"
                    value={bounceVyValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedBehaviorSettings({ bounceVy: value });
                      else onBounceVyChange(value);
                    }}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {behaviorForSettings === 'sweep' && (toolForSettings === 'projectile_throw' || toolForSettings === 'spawn_obstacle') && (
              <div className="space-y-3">
                <div className="text-[10px] uppercase tracking-widest text-[#444]">Sweep Velocity</div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-[#666]">X Speed</span>
                    <span className="text-xs font-mono text-[#FF0099]">{Math.round(sweepVxValue)} px/s</span>
                  </div>
                  <input
                    type="range"
                    min="-900"
                    max="900"
                    step="10"
                    value={sweepVxValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedBehaviorSettings({ sweepVx: value });
                      else onSweepVxChange(value);
                    }}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] text-[#666]">Y Speed</span>
                    <span className="text-xs font-mono text-[#FF0099]">{Math.round(sweepVyValue)} px/s</span>
                  </div>
                  <input
                    type="range"
                    min="-900"
                    max="900"
                    step="10"
                    value={sweepVyValue}
                    onChange={e => {
                      const value = +e.target.value;
                      if (isEditingSelection) onUpdateSelectedBehaviorSettings({ sweepVy: value });
                      else onSweepVyChange(value);
                    }}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {behaviorForSettings === 'bomb' && (toolForSettings === 'projectile_throw' || toolForSettings === 'spawn_obstacle') && (
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
              </>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#444]">
                  {isEditingSelection ? `Size (${selectedCount} selected)` : 'Size'}
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
                  if (isEditingSelection) {
                    onUpdateSelectedSize(value);
                  } else {
                    onActiveSizeChange(value);
                  }
                }}
                className="w-full accent-[#FF0099] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#444]">
                  {isEditingSelection ? `Duration (${selectedCount} selected)` : 'Duration'}
                </span>
                <span className="text-xs font-mono text-[#FF0099]">{durationValue.toFixed(1)}s</span>
              </div>
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={durationValue}
                onChange={e => {
                  const value = +e.target.value;
                  if (!Number.isFinite(value) || value <= 0) return;
                  if (isEditingSelection) {
                    onUpdateSelectedDuration(value);
                  } else {
                    onActiveDurationChange(value);
                  }
                }}
                className="w-full px-3 py-2 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm focus:outline-none focus:border-[#FF0099]"
              />
            </div>
          </div>
        )}

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
                value={bpm}
                onChange={e => onBpmChange(+e.target.value)}
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
