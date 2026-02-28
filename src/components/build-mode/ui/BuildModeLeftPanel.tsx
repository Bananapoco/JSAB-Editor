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
import { ActivePanel, BehaviorType, ShapeType, Tool } from '../types';
import { CustomShapeDef } from '../../shape-composer/types';

interface BuildModeLeftPanelProps {
  activePanel: Exclude<ActivePanel, 'compose'>;
  isPlacementMode: boolean;
  activeTool: Tool;
  activeBehavior: BehaviorType;
  onBehaviorChange: (behavior: BehaviorType) => void;
  bombGrowthDuration: number;
  bombParticleCount: number;
  bombParticleSpeed: number;
  onBombGrowthDurationChange: (value: number) => void;
  onBombParticleCountChange: (value: number) => void;
  onBombParticleSpeedChange: (value: number) => void;
  activeSize: number;
  activeDuration: number;
  onActiveSizeChange: (value: number) => void;
  onActiveDurationChange: (value: number) => void;
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
}

export const BuildModeLeftPanel: React.FC<BuildModeLeftPanelProps> = ({
  activePanel,
  isPlacementMode,
  activeTool,
  activeBehavior,
  onBehaviorChange,
  bombGrowthDuration,
  bombParticleCount,
  bombParticleSpeed,
  onBombGrowthDurationChange,
  onBombParticleCountChange,
  onBombParticleSpeedChange,
  activeSize,
  activeDuration,
  onActiveSizeChange,
  onActiveDurationChange,
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
}) => {
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

            {activeBehavior === 'bomb' && (activeTool === 'projectile_throw' || activeTool === 'spawn_obstacle') && (
              <>
                <div className="w-full h-px bg-[#FF009933]" />
                <div className="text-[10px] uppercase tracking-widest text-[#FF0099] font-bold mb-2 flex items-center gap-1">
                  <Bomb size={10} /> Bomb Settings
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#444]">Growth Speed</span>
                    <span className="text-xs font-mono text-[#FF0099]">{bombGrowthDuration.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.1"
                    value={bombGrowthDuration}
                    onChange={e => onBombGrowthDurationChange(+e.target.value)}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                  <div className="flex justify-between text-[9px] text-[#555] mt-1">
                    <span>Fast</span>
                    <span>Slow</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#444]">Particles</span>
                    <span className="text-xs font-mono text-[#FF0099]">{bombParticleCount}</span>
                  </div>
                  <input
                    type="range"
                    min="4"
                    max="32"
                    step="1"
                    value={bombParticleCount}
                    onChange={e => onBombParticleCountChange(+e.target.value)}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#444]">Explosion Speed</span>
                    <span className="text-xs font-mono text-[#FF0099]">{bombParticleSpeed}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="600"
                    step="10"
                    value={bombParticleSpeed}
                    onChange={e => onBombParticleSpeedChange(+e.target.value)}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                </div>
              </>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#444]">Size</span>
                <span className="text-xs font-mono text-[#FF0099]">{activeSize}px</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                value={activeSize}
                onChange={e => onActiveSizeChange(+e.target.value)}
                className="w-full accent-[#FF0099] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#444]">Duration</span>
                <span className="text-xs font-mono text-[#FF0099]">{activeDuration.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="10"
                step="0.1"
                value={activeDuration}
                onChange={e => onActiveDurationChange(+e.target.value)}
                className="w-full accent-[#FF0099] cursor-pointer"
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
