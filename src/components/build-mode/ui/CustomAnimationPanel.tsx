import React from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { CustomAnimationData, CustomKeyframe, CustomSegmentHandle } from '../types';
import { EasingCurveEditor } from './EasingCurveEditor';

interface Props {
  data: CustomAnimationData;
  onChange: (data: CustomAnimationData) => void;
  /** Currently selected keyframe index, or null. */
  selectedKfIndex: number | null;
  onSelectKf: (index: number | null) => void;
}

const DEFAULT_HANDLE: CustomSegmentHandle = {
  enabled: false,
  cp1x: 50,
  cp1y: 0,
  cp2x: -50,
  cp2y: 0,
  easing: 'linear',
};

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

  const updateHandle = (segIndex: number, updates: Partial<CustomSegmentHandle>) => {
    if (segIndex < 0 || segIndex >= Math.max(0, keyframes.length - 1)) return;
    const newHandles = [...handles];
    while (newHandles.length <= segIndex) newHandles.push({ ...DEFAULT_HANDLE });
    newHandles[segIndex] = { ...newHandles[segIndex], ...updates };
    onChange({ ...data, handles: newHandles });
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
    const existing = handles[segIndex] ?? DEFAULT_HANDLE;
    updateHandle(segIndex, {
      enabled: !existing.enabled,
      easing: existing.easing ?? 'linear',
    });
  };

  const kf = selectedKfIndex !== null ? keyframes[selectedKfIndex] : null;

  const selectedSegIndex = selectedKfIndex === null
    ? null
    : selectedKfIndex < keyframes.length - 1
      ? selectedKfIndex
      : selectedKfIndex > 0
        ? selectedKfIndex - 1
        : null;

  const selectedSegHandle = selectedSegIndex !== null
    ? (handles[selectedSegIndex] ?? DEFAULT_HANDLE)
    : null;

  return (
    <div className="space-y-3">
      <div className="w-full h-px bg-[#2F80FF33]" />
      <div className="text-[10px] uppercase tracking-widest text-[#2F80FF] font-bold flex items-center gap-1">
        <Pencil size={10} /> Custom Animation
      </div>

      <p className="text-[9px] text-[#666] leading-tight">
        Right-click the canvas to add keyframes along the path. Click the dashed lines between them to enable curve handles.
      </p>

      {/* Keyframe list */}
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {keyframes.map((kfItem, i) => (
          <div key={i} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onSelectKf(selectedKfIndex === i ? null : i)}
                className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded-lg text-[10px] transition-all ${
                  selectedKfIndex === i
                    ? 'bg-[#2F80FF33] border border-[#2F80FF] text-white'
                    : 'bg-[#151520] border border-[#252540] text-[#888] hover:text-white'
                }`}
              >
                <span className="font-mono">KF {i + 1} — t:{(kfItem.t * 100).toFixed(0)}%</span>
              </motion.button>

              <button
                onClick={() => removeKeyframe(i)}
                className="p-1 rounded border border-[#3a1f26] bg-[#2a141a] hover:bg-[#3a1b24] text-[#ff5555]"
                title={`Delete keyframe ${i + 1}`}
              >
                <Trash2 size={10} />
              </button>
            </div>

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
                className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#2F80FF]"
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
                className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#2F80FF]"
              />
            </div>
            <div>
              <label className="text-[9px] text-[#555]">X</label>
              <input
                type="number"
                value={Math.round(kf.x)}
                onChange={e => updateKeyframe(selectedKfIndex, { x: +e.target.value })}
                className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#2F80FF]"
              />
            </div>
            <div>
              <label className="text-[9px] text-[#555]">Y</label>
              <input
                type="number"
                value={Math.round(kf.y)}
                onChange={e => updateKeyframe(selectedKfIndex, { y: +e.target.value })}
                className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#2F80FF]"
              />
            </div>
            <div className="col-span-2">
              <label className="text-[9px] text-[#555]">Rotation °</label>
              <input
                type="number"
                value={kf.rotation}
                onChange={e => updateKeyframe(selectedKfIndex, { rotation: +e.target.value })}
                className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#2F80FF]"
              />
            </div>
          </div>

          {selectedSegIndex !== null && selectedSegHandle && (
            <div className="space-y-2 pt-2 border-t border-[#252540]">
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-widest text-[#666]">Segment {selectedSegIndex + 1} Curve</div>
                <button
                  onClick={() => toggleHandle(selectedSegIndex)}
                  className="text-[9px] px-1.5 py-0.5 rounded border border-[#252540] text-[#aaa] hover:text-white"
                >
                  {selectedSegHandle.enabled ? 'Disable' : 'Enable'}
                </button>
              </div>

              {selectedSegHandle.enabled ? (
                <>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9px] text-[#555]">CP1 X</label>
                      <input
                        type="number"
                        value={Math.round(selectedSegHandle.cp1x)}
                        onChange={e => updateHandle(selectedSegIndex, { cp1x: +e.target.value })}
                        className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#00FFFF]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#555]">CP1 Y</label>
                      <input
                        type="number"
                        value={Math.round(selectedSegHandle.cp1y)}
                        onChange={e => updateHandle(selectedSegIndex, { cp1y: +e.target.value })}
                        className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#00FFFF]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#555]">CP2 X</label>
                      <input
                        type="number"
                        value={Math.round(selectedSegHandle.cp2x)}
                        onChange={e => updateHandle(selectedSegIndex, { cp2x: +e.target.value })}
                        className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#00FFFF]"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-[#555]">CP2 Y</label>
                      <input
                        type="number"
                        value={Math.round(selectedSegHandle.cp2y)}
                        onChange={e => updateHandle(selectedSegIndex, { cp2y: +e.target.value })}
                        className="w-full px-1.5 py-1 rounded bg-[#0a0a12] border border-[#252540] text-white text-[10px] font-mono focus:outline-none focus:border-[#00FFFF]"
                      />
                    </div>
                  </div>

                  <EasingCurveEditor
                    easing={selectedSegHandle.easing ?? 'linear'}
                    easingCurve={selectedSegHandle.easingCurve}
                    onChange={(easing, curve) => {
                      updateHandle(selectedSegIndex, {
                        easing,
                        easingCurve: easing === 'custom' ? curve : undefined,
                      });
                    }}
                  />
                </>
              ) : (
                <div className="text-[9px] text-[#666]">
                  Enable curve for this segment to adjust bezier control points.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
