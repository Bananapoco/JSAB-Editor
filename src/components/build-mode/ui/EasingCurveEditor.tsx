import React, { useCallback, useRef, useState } from 'react';
import { CustomEasingCurve, EasingPreset } from '../types';

const SIZE = 120;
const PAD = 14;
const INNER = SIZE - PAD * 2;

const PRESETS: { key: EasingPreset; label: string; curve: CustomEasingCurve }[] = [
  { key: 'linear',    label: 'Linear',      curve: { x1: 0,    y1: 0,    x2: 1,    y2: 1    } },
  { key: 'easeIn',    label: 'Ease In',      curve: { x1: 0.42, y1: 0,    x2: 1,    y2: 1    } },
  { key: 'easeOut',   label: 'Ease Out',     curve: { x1: 0,    y1: 0,    x2: 0.58, y2: 1    } },
  { key: 'easeInOut', label: 'Ease In-Out',  curve: { x1: 0.42, y1: 0,    x2: 0.58, y2: 1    } },
];

interface Props {
  easing: EasingPreset;
  easingCurve?: CustomEasingCurve;
  onChange: (easing: EasingPreset, curve?: CustomEasingCurve) => void;
}

/** Convert normalised 0–1 coords to SVG pixel coords (y is flipped). */
function toSvg(nx: number, ny: number): [number, number] {
  return [PAD + nx * INNER, PAD + (1 - ny) * INNER];
}
function fromSvg(sx: number, sy: number): [number, number] {
  return [
    Math.max(0, Math.min(1, (sx - PAD) / INNER)),
    Math.max(0, Math.min(1, 1 - (sy - PAD) / INNER)),
  ];
}

export const EasingCurveEditor: React.FC<Props> = ({ easing, easingCurve, onChange }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<'cp1' | 'cp2' | null>(null);

  // Resolve displayed curve
  const resolvedCurve: CustomEasingCurve =
    easing === 'custom' && easingCurve
      ? easingCurve
      : PRESETS.find(p => p.key === easing)?.curve ?? PRESETS[0].curve;

  const { x1, y1, x2, y2 } = resolvedCurve;

  const [p0x, p0y] = toSvg(0, 0);
  const [p3x, p3y] = toSvg(1, 1);
  const [c1x, c1y] = toSvg(x1, y1);
  const [c2x, c2y] = toSvg(x2, y2);

  const handlePointerDown = useCallback((which: 'cp1' | 'cp2') => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(which);
    (e.target as SVGElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const [nx, ny] = fromSvg(sx, sy);

    const newCurve = { ...resolvedCurve };
    if (dragging === 'cp1') { newCurve.x1 = nx; newCurve.y1 = ny; }
    else { newCurve.x2 = nx; newCurve.y2 = ny; }
    onChange('custom', newCurve);
  }, [dragging, resolvedCurve, onChange]);

  const handlePointerUp = useCallback(() => setDragging(null), []);

  return (
    <div className="space-y-2">
      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1">
        {PRESETS.map(p => (
          <button
            key={p.key}
            onClick={() => onChange(p.key, p.key === 'custom' ? resolvedCurve : undefined)}
            className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all ${
              easing === p.key
                ? 'bg-[#2F80FF33] border-[#2F80FF] text-[#2F80FF]'
                : 'bg-[#151520] border-[#252540] text-[#666] hover:text-white hover:border-[#444]'
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          onClick={() => onChange('custom', resolvedCurve)}
          className={`px-1.5 py-0.5 rounded text-[9px] font-medium border transition-all ${
            easing === 'custom'
              ? 'bg-[#2F80FF33] border-[#2F80FF] text-[#2F80FF]'
              : 'bg-[#151520] border-[#252540] text-[#666] hover:text-white hover:border-[#444]'
          }`}
        >
          Custom
        </button>
      </div>

      {/* Interactive curve canvas */}
      <svg
        ref={svgRef}
        width={SIZE}
        height={SIZE}
        className="block rounded-lg bg-[#0a0a12] border border-[#252540] cursor-crosshair select-none"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {/* Grid */}
        <rect x={PAD} y={PAD} width={INNER} height={INNER} fill="none" stroke="#1a1a2e" strokeWidth={1} />
        <line x1={PAD} y1={PAD + INNER / 2} x2={PAD + INNER} y2={PAD + INNER / 2} stroke="#1a1a2e" strokeWidth={0.5} />
        <line x1={PAD + INNER / 2} y1={PAD} x2={PAD + INNER / 2} y2={PAD + INNER} stroke="#1a1a2e" strokeWidth={0.5} />
        {/* Diagonal reference (linear) */}
        <line x1={p0x} y1={p0y} x2={p3x} y2={p3y} stroke="#252540" strokeWidth={0.5} strokeDasharray="3,3" />

        {/* Handle lines */}
        <line x1={p0x} y1={p0y} x2={c1x} y2={c1y} stroke="#2F80FF66" strokeWidth={1} />
        <line x1={p3x} y1={p3y} x2={c2x} y2={c2y} stroke="#00FFFF66" strokeWidth={1} />

        {/* The curve */}
        <path
          d={`M ${p0x} ${p0y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p3x} ${p3y}`}
          fill="none"
          stroke="#2F80FF"
          strokeWidth={2}
        />

        {/* Endpoints */}
        <circle cx={p0x} cy={p0y} r={3} fill="#555" />
        <circle cx={p3x} cy={p3y} r={3} fill="#555" />

        {/* Draggable control points */}
        <circle
          cx={c1x} cy={c1y} r={5}
          fill={dragging === 'cp1' ? '#2F80FF' : '#2F80FF99'}
          stroke="#2F80FF" strokeWidth={1.5}
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown('cp1')}
        />
        <circle
          cx={c2x} cy={c2y} r={5}
          fill={dragging === 'cp2' ? '#00FFFF' : '#00FFFF99'}
          stroke="#00FFFF" strokeWidth={1.5}
          className="cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown('cp2')}
        />

        {/* Labels */}
        <text x={PAD - 2} y={PAD + INNER + 10} fill="#555" fontSize={7} fontFamily="monospace">0</text>
        <text x={PAD + INNER - 2} y={PAD + INNER + 10} fill="#555" fontSize={7} fontFamily="monospace">1</text>
        <text x={2} y={PAD + 4} fill="#555" fontSize={7} fontFamily="monospace">1</text>
        <text x={2} y={PAD + INNER + 3} fill="#555" fontSize={7} fontFamily="monospace">0</text>
      </svg>

      {/* Values display for custom */}
      {easing === 'custom' && (
        <div className="text-[8px] font-mono text-[#555]">
          cubic-bezier({x1.toFixed(2)}, {y1.toFixed(2)}, {x2.toFixed(2)}, {y2.toFixed(2)})
        </div>
      )}
    </div>
  );
};
