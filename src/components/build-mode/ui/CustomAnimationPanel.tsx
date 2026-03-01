import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, Plus, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { CustomAnimationData, CustomKeyframe, CustomSegmentHandle } from '../types';

interface Props {
  data: CustomAnimationData;
  onChange: (data: CustomAnimationData) => void;
  /** Currently selected keyframe index, or null. */
  selectedKfIndex: number | null;
  onSelectKf: (index: number | null) => void;
}

export const CustomAnimationPanel: React.FC<Props> = ({
  data,
  onChange,
  selectedKfIndex,
  onSelectKf,
}) => {
  const { keyframes, handles } = data;

  const updateKeyframe = (index: number, updates: Partial<CustomKeyframe>) => {
    const newKfs = keyframes.map((kf, i) => (i === index ? { ...kf, ...updates } : kf));
    onChange({ ...data, keyframes: newKfs });
  };

  const removeKeyframe = (index: number) => {
    const newKfs = [...keyframes];
    newKfs.splice(index, 1);
    // Update handles: remove the segment that referenced this keyframe
    const newHandles = [...handles];
    if (index < newHandles.length) {
      newHandles.splice(index, 1);
    } else if (index > 0 && newHandles.length >= index) {
      newHandles.splice(index - 1, 1);
    }
    onChange({ keyframes: newKfs, handles: newHandles });
    if (selectedKfIndex === index) onSelectKf(null);
    else if (selectedKfIndex !== null && selectedKfIndex > index) onSelectKf(selectedKfIndex - 1);
  };

  const toggleHandle = (segIndex: number) => {
    const newHandles = [...handles];
    while (newHandles.length <= segIndex) {
      newHandles.push({ enabled: false, cp1x: 50, cp1y: 0, cp2x: -50, cp2y: 0 });
    }
    newHandles[segIndex] = { ...newHandles[segIndex], enabled: !newHandles[segIndex].enabled };
    onChange({ ...data, handles: newHandles });
  };

  const kf = selectedKfIndex !== null ? keyframes[selectedKfIndex] : null;

  return (
    <div className="space-y-3">
      <div className="w-full h-px bg-[#FF009933]" />
      <div className="text-[10px] uppercase tracking-widest text-[#FF0099] font-bold flex items-center gap-1">
        <Pencil size={10} /> Custom Animation
      </div>

      <p className="text-[9px] text-[#666] leading-tight">
        Right-click the canvas to add keyframes along the path. Click the dashed lines between them to enable curve handles.
      </p>

      {/* Keyframe list */}
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {keyframes.map((kfItem, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onSelectKf(selectedKfIndex === i ? null : i)}
              className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-[10px] transition-all ${
                selectedKfIndex === i
                  ? 'bg-[#FF009933] border border-[#FF0099] text-white'
                  : 'bg-[#151520] border border-[#252540] text-[#888] hover:text-white'
              }`}
            >
              <span className="font-mono">KF {i + 1} — t:{(kfItem.t * 100).toFixed(0)}%</span>
              <button
                onClick={e => { e.stopPropagation(); removeKeyframe(i); }}
                className="p-0.5 rounded hover:bg-[#ff333344] text-[#ff4444]"
              >
                <Trash2 size={10} />
              </button>
            </motion.button>

            {/* Segment handle toggle between this and next keyframe */}
            {i < keyframes.length - 1 && (
              <button
                onClick={() => toggleHandle(i)}
                className="flex items-center gap-1 px-2 py-0.5 text-[9px] text-[#555] hover:text-[#00FFFF] transition-colors"
              >
                {handles[i]?.enabled ? (
                  <ToggleRight size={10} className="text-[#00FFFF]" />
                ) : (
                  <ToggleLeft size={10} />
                )}
                <span>{handles[i]?.enabled ? 'Curve ON' : 'Curve OFF'}</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {keyframes.length === 0 && (
        <div className="text-[10px] text-[#555] text-center py-3 border border-dashed border-[#252540] rounded-lg">
          No keyframes yet.<br />Right-click the canvas to add one.
        </div>
      )}

      {/* Selected keyframe editor */}
      {kf && selectedKfIndex !== null && (
        <div className="space-y-2 p-2 rounded-lg bg-[#151520] border border-[#252540]">
          <div className="text-[10px] uppercase tracking-widest text-[#666]">Keyframe {selectedKfIndex + 1}</div>
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <label className="text-[9px] text-[#555]">Time %</label>
              <input
                type="number"
                min={0}
                max={100}
                value={Math.round(kf.t * 100)}
                onChange={e => updateKeyframe(selectedKfIndex, { t: Math.max(0, Math.min(1, +e.target.value / 100)) })}
                className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#FF0099]"
              />
            </div>
            <div>
              <label className="text-[9px] text-[#555]">Scale</label>
              <input
                type="number"
                step={0.1}
                min={0.1}
                value={kf.scale}
                onChange={e => updateKeyframe(selectedKfIndex, { scale: +e.target.value || 1 })}
                className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#FF0099]"
              />
            </div>
            <div>
              <label className="text-[9px] text-[#555]">X</label>
              <input
                type="number"
                value={Math.round(kf.x)}
                onChange={e => updateKeyframe(selectedKfIndex, { x: +e.target.value })}
                className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#FF0099]"
              />
            </div>
            <div>
              <label className="text-[9px] text-[#555]">Y</label>
              <input
                type="number"
                value={Math.round(kf.y)}
                onChange={e => updateKeyframe(selectedKfIndex, { y: +e.target.value })}
                className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#FF0099]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[9px] text-[#555]">Rotation °</label>
              <input
                type="number"
                value={kf.rotation}
                onChange={e => updateKeyframe(selectedKfIndex, { rotation: +e.target.value })}
                className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#FF0099]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
