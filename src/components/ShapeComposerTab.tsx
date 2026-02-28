import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Square, Circle, Triangle, Diamond, Hexagon, Star,
  Trash2, Save, RotateCw, Maximize2, Layers, RefreshCw,
  Plus, MousePointer2, ChevronLeft,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES (exported so BuildModeEditor can import them)
// ═══════════════════════════════════════════════════════════════════════════════

export type PieceType = 'circle' | 'rect' | 'triangle' | 'diamond' | 'hexagon' | 'star';

export interface ComposerPiece {
  id: number;
  type: PieceType;
  /** Pixel offset from composition center */
  x: number;
  y: number;
  size: number;
  rotation: number; // degrees
  color: string;
}

export interface CustomShapeDef {
  id: string;
  name: string;
  pieces: ComposerPiece[];
  /** Auto-computed bounding circle radius */
  colliderRadius: number;
  /** Base-64 PNG thumbnail */
  thumbnail: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANVAS CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const COMP_W = 480;
const COMP_H = 480;
const CX = COMP_W / 2;
const CY = COMP_H / 2;

// ═══════════════════════════════════════════════════════════════════════════════
// PIECE SHAPE ICONS
// ═══════════════════════════════════════════════════════════════════════════════

const PIECE_TYPES: { type: PieceType; icon: React.FC<any>; label: string }[] = [
  { type: 'circle',   icon: Circle,   label: 'Circle'   },
  { type: 'rect',     icon: Square,   label: 'Square'   },
  { type: 'triangle', icon: Triangle, label: 'Triangle' },
  { type: 'diamond',  icon: Diamond,  label: 'Diamond'  },
  { type: 'hexagon',  icon: Hexagon,  label: 'Hexagon'  },
  { type: 'star',     icon: Star,     label: 'Star'     },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DRAWING HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function drawPieceShape(
  ctx: CanvasRenderingContext2D,
  type: PieceType,
  r: number,
) {
  ctx.beginPath();
  switch (type) {
    case 'circle':
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.866, r * 0.5);
      ctx.lineTo(-r * 0.866, r * 0.5);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        const px = r * Math.cos(a), py = r * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.4;
        const px = rad * Math.cos(a), py = rad * Math.sin(a);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    case 'rect':
    default:
      ctx.rect(-r, -r, r * 2, r * 2);
      break;
  }
}

function drawPieceOnComposer(
  ctx: CanvasRenderingContext2D,
  piece: ComposerPiece,
  selected: boolean,
) {
  const r = piece.size / 2;
  ctx.save();
  ctx.translate(CX + piece.x, CY + piece.y);
  ctx.rotate((piece.rotation * Math.PI) / 180);

  ctx.fillStyle   = `${piece.color}55`;
  ctx.strokeStyle = selected ? '#ffffff' : piece.color;
  ctx.lineWidth   = selected ? 2.5 : 1.5;
  if (selected) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 8; }

  drawPieceShape(ctx, piece.type, r);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (selected) {
    // Dashed bounding box
    const pad = 8;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-r - pad, -r - pad, (r + pad) * 2, (r + pad) * 2);
    ctx.setLineDash([]);

    // Corner handles
    const hs = 6;
    for (const hx of [-r - pad, r + pad]) {
      for (const hy of [-r - pad, r + pad]) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(hx - hs / 2, hy - hs / 2, hs, hs);
      }
    }

    // Rotate handle
    const rotHandleY = -r - pad - 18;
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -r - pad);
    ctx.lineTo(0, rotHandleY + 6);
    ctx.stroke();
    ctx.fillStyle = '#00FFFF';
    ctx.beginPath();
    ctx.arc(0, rotHandleY, 6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// Hit-test a piece at canvas position (mx, my)
function hitTestPiece(piece: ComposerPiece, mx: number, my: number): boolean {
  const dx = mx - (CX + piece.x);
  const dy = my - (CY + piece.y);
  return Math.sqrt(dx * dx + dy * dy) <= piece.size / 2 + 6;
}

// ═══════════════════════════════════════════════════════════════════════════════
// COLLIDER + THUMBNAIL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function computeColliderRadius(pieces: ComposerPiece[]): number {
  let maxR = 0;
  for (const p of pieces) {
    const dist = Math.sqrt(p.x * p.x + p.y * p.y) + p.size / 2;
    if (dist > maxR) maxR = dist;
  }
  return Math.max(maxR, 10);
}

function generateThumbnail(pieces: ComposerPiece[]): string {
  const size = 80;
  const tc = document.createElement('canvas');
  tc.width  = size;
  tc.height = size;
  const tx = tc.getContext('2d')!;

  tx.fillStyle = '#0a0a14';
  tx.fillRect(0, 0, size, size);

  if (pieces.length === 0) return tc.toDataURL();

  // Compute bounding box in composition-local coords
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pieces) {
    const r = p.size / 2;
    minX = Math.min(minX, p.x - r);
    maxX = Math.max(maxX, p.x + r);
    minY = Math.min(minY, p.y - r);
    maxY = Math.max(maxY, p.y + r);
  }

  const bw = (maxX - minX) || 1;
  const bh = (maxY - minY) || 1;
  const scale = Math.min((size - 12) / bw, (size - 12) / bh, 1.5);
  const ocx   = size / 2 - ((minX + maxX) / 2) * scale;
  const ocy   = size / 2 - ((minY + maxY) / 2) * scale;

  for (const p of pieces) {
    const r = (p.size / 2) * scale;
    tx.save();
    tx.translate(ocx + p.x * scale, ocy + p.y * scale);
    tx.rotate((p.rotation * Math.PI) / 180);
    tx.fillStyle   = `${p.color}88`;
    tx.strokeStyle = p.color;
    tx.lineWidth   = 1.5;
    drawPieceShape(tx, p.type, r);
    tx.fill();
    tx.stroke();
    tx.restore();
  }

  return tc.toDataURL();
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  onClose: () => void;
  onSave:   (shape: CustomShapeDef) => void;
  onDelete: (id: string) => void;
  existingShapes: CustomShapeDef[];
  defaultColor: string;
}

let _pieceIdCounter = 1000;

export const ShapeComposerTab: React.FC<Props> = ({
  onClose, onSave, onDelete, existingShapes, defaultColor,
}) => {
  // ─── Local state ─────────────────────────────────────────────────────────
  const [pieces, setPieces]           = useState<ComposerPiece[]>([]);
  const [selectedId, setSelectedId]   = useState<number | null>(null);
  const [pendingType, setPendingType] = useState<PieceType | null>(null);
  const [shapeName, setShapeName]     = useState('My Shape');
  const [pieceColor, setPieceColor]   = useState(defaultColor);
  const [saveMsg, setSaveMsg]         = useState('');

  const canvasRef   = useRef<HTMLCanvasElement>(null);
  const piecesRef   = useRef(pieces);
  piecesRef.current = pieces;

  // Drag state
  const dragRef = useRef<{ pieceId: number; lastX: number; lastY: number } | null>(null);

  // Rotate-handle drag
  const rotDragRef = useRef<{ pieceId: number; startAngle: number; startRot: number } | null>(null);

  // ─── Canvas drawing ───────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, COMP_W, COMP_H);

    // Background
    ctx.fillStyle = '#08080e';
    ctx.fillRect(0, 0, COMP_W, COMP_H);

    // Grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let gx = 0; gx < COMP_W; gx += 24) {
      for (let gy = 0; gy < COMP_H; gy += 24) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Center crosshair
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(CX, 0);
    ctx.lineTo(CX, COMP_H);
    ctx.moveTo(0, CY);
    ctx.lineTo(COMP_W, CY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Center origin dot
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(CX, CY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Draw pieces (back to front)
    for (const p of pieces) {
      drawPieceOnComposer(ctx, p, p.id === selectedId);
    }
  }, [pieces, selectedId]);

  // ─── Canvas mouse helpers ─────────────────────────────────────────────────
  const getCanvasXY = (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = canvasRef.current!;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = COMP_W / rect.width;
    const scaleY = COMP_H / rect.height;
    return {
      mx: (e.clientX - rect.left) * scaleX,
      my: (e.clientY - rect.top)  * scaleY,
    };
  };

  // Check if click is on the rotate handle of selected piece
  const isOnRotateHandle = (mx: number, my: number): boolean => {
    if (selectedId === null) return false;
    const p = piecesRef.current.find(pp => pp.id === selectedId);
    if (!p) return false;
    const r   = p.size / 2 + 8 + 18;
    const hx  = CX + p.x;
    const hy  = CY + p.y - r;
    return Math.sqrt((mx - hx) ** 2 + (my - hy) ** 2) <= 10;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { mx, my } = getCanvasXY(e);

    // -- Rotate handle? --
    if (isOnRotateHandle(mx, my) && selectedId !== null) {
      const p = piecesRef.current.find(pp => pp.id === selectedId)!;
      const angle = Math.atan2(my - (CY + p.y), mx - (CX + p.x)) * 180 / Math.PI;
      rotDragRef.current = { pieceId: p.id, startAngle: angle, startRot: p.rotation };
      return;
    }

    // -- Pending add? --
    if (pendingType !== null) {
      const newPiece: ComposerPiece = {
        id:       _pieceIdCounter++,
        type:     pendingType,
        x:        mx - CX,
        y:        my - CY,
        size:     60,
        rotation: 0,
        color:    pieceColor,
      };
      setPieces(prev => [...prev, newPiece]);
      setSelectedId(newPiece.id);
      setPendingType(null); // one-shot add
      return;
    }

    // -- Hit test pieces (reverse so topmost wins) --
    const ps = [...piecesRef.current].reverse();
    for (const p of ps) {
      if (hitTestPiece(p, mx, my)) {
        setSelectedId(p.id);
        dragRef.current = { pieceId: p.id, lastX: mx, lastY: my };
        return;
      }
    }

    // -- Click empty → deselect --
    setSelectedId(null);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const { mx, my } = getCanvasXY(e);

      if (rotDragRef.current) {
        const { pieceId, startAngle, startRot } = rotDragRef.current;
        const p = piecesRef.current.find(pp => pp.id === pieceId);
        if (!p) return;
        const angle = Math.atan2(my - (CY + p.y), mx - (CX + p.x)) * 180 / Math.PI;
        const delta = angle - startAngle;
        setPieces(prev => prev.map(pp =>
          pp.id === pieceId ? { ...pp, rotation: (startRot + delta + 360) % 360 } : pp
        ));
        return;
      }

      if (dragRef.current) {
        const { pieceId, lastX, lastY } = dragRef.current;
        const dx = mx - lastX;
        const dy = my - lastY;
        dragRef.current.lastX = mx;
        dragRef.current.lastY = my;
        setPieces(prev => prev.map(p =>
          p.id === pieceId ? { ...p, x: p.x + dx, y: p.y + dy } : p
        ));
      }
    };

    const onUp = () => {
      dragRef.current    = null;
      rotDragRef.current = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedId !== null) {
        setPieces(prev => prev.filter(p => p.id !== selectedId));
        setSelectedId(null);
      }
      if (e.code === 'Escape') {
        setPendingType(null);
        setSelectedId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId]);

  // ─── Selected piece helpers ───────────────────────────────────────────────
  const selectedPiece = pieces.find(p => p.id === selectedId) ?? null;

  const updateSelected = (updates: Partial<ComposerPiece>) => {
    if (selectedId === null) return;
    setPieces(prev => prev.map(p => p.id === selectedId ? { ...p, ...updates } : p));
  };

  const deleteSelected = () => {
    if (selectedId === null) return;
    setPieces(prev => prev.filter(p => p.id !== selectedId));
    setSelectedId(null);
  };

  // ─── Save ─────────────────────────────────────────────────────────────────
  const handleSave = () => {
    if (pieces.length === 0) { setSaveMsg('Add at least one piece!'); return; }
    const name       = shapeName.trim() || 'Untitled';
    const colliderR  = computeColliderRadius(pieces);
    const thumbnail  = generateThumbnail(pieces);
    const shape: CustomShapeDef = {
      id:            `custom_${Date.now()}`,
      name,
      pieces:        JSON.parse(JSON.stringify(pieces)), // deep copy
      colliderRadius: colliderR,
      thumbnail,
    };
    onSave(shape);
    setSaveMsg(`✓ "${name}" saved!`);
    setTimeout(() => setSaveMsg(''), 2500);
    // Optionally clear
    setPieces([]);
    setSelectedId(null);
    setShapeName('My Shape');
  };

  // ─── Canvas cursor ────────────────────────────────────────────────────────
  const canvasCursor = pendingType
    ? 'crosshair'
    : dragRef.current
      ? 'grabbing'
      : 'default';

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex-1 flex overflow-hidden"
      style={{ background: '#08080e' }}
    >
      {/* ── LEFT: Palette + Selected controls ───────────────────────────── */}
      <div className="w-52 bg-[#0a0a12] border-r border-[#1a1a2e] flex flex-col p-4 gap-5 shrink-0 overflow-y-auto">

        {/* Back button */}
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-[#555] hover:text-white text-xs transition-all"
        >
          <ChevronLeft size={14} />
          Back to editor
        </button>

        {/* Section: Add Piece */}
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2 flex items-center gap-1">
            <Plus size={10} /> Add Piece
          </div>

          {/* Color for new piece */}
          <div className="flex items-center gap-2 mb-3">
            <input
              type="color"
              value={pieceColor}
              onChange={e => setPieceColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-2 border-[#252540]"
            />
            <span className="text-[11px] text-[#666]">Piece color</span>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {PIECE_TYPES.map(({ type, icon: Icon, label }) => (
              <motion.button
                key={type}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={() => setPendingType(pendingType === type ? null : type)}
                title={label}
                className={`aspect-square flex flex-col items-center justify-center gap-1 rounded-xl transition-all text-[10px] ${
                  pendingType === type
                    ? 'bg-gradient-to-br from-[#FF0099] to-[#FF6600] text-white shadow-md shadow-[#FF009944]'
                    : 'bg-[#151520] text-[#555] hover:text-white hover:bg-[#252540] border border-[#252540]'
                }`}
              >
                <Icon size={18} />
                <span>{label}</span>
              </motion.button>
            ))}
          </div>

          {pendingType && (
            <p className="text-[10px] text-[#00FFFF] mt-2 text-center animate-pulse">
              Click canvas to place
            </p>
          )}
        </div>

        <div className="w-full h-px bg-[#1a1a2e]" />

        {/* Section: Selected piece */}
        {selectedPiece ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-[#444]">Selected</span>
              <motion.button
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={deleteSelected}
                className="p-1.5 rounded bg-[#ff333322] text-[#ff4444] hover:bg-[#ff333344] transition-all"
              >
                <Trash2 size={13} />
              </motion.button>
            </div>

            {/* Color */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={selectedPiece.color}
                onChange={e => updateSelected({ color: e.target.value })}
                className="w-8 h-8 rounded cursor-pointer border-2 border-[#252540]"
              />
              <span className="text-[11px] text-[#666]">Color</span>
            </div>

            {/* Size */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-widest text-[#444] flex items-center gap-1">
                  <Maximize2 size={9} /> Size
                </span>
                <span className="text-[10px] font-mono text-[#FF0099]">{Math.round(selectedPiece.size)}px</span>
              </div>
              <input
                type="range" min={14} max={200} step={1}
                value={selectedPiece.size}
                onChange={e => updateSelected({ size: +e.target.value })}
                className="w-full accent-[#FF0099] cursor-pointer"
              />
            </div>

            {/* Rotation */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] uppercase tracking-widest text-[#444] flex items-center gap-1">
                  <RotateCw size={9} /> Rotation
                </span>
                <span className="text-[10px] font-mono text-[#FF0099]">{Math.round(selectedPiece.rotation)}°</span>
              </div>
              <input
                type="range" min={0} max={359} step={1}
                value={selectedPiece.rotation}
                onChange={e => updateSelected({ rotation: +e.target.value })}
                className="w-full accent-[#FF0099] cursor-pointer"
              />
            </div>

            {/* Fine position */}
            <div className="grid grid-cols-2 gap-2">
              {(['x', 'y'] as const).map(k => (
                <div key={k}>
                  <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1">{k}</div>
                  <input
                    type="number"
                    value={Math.round(selectedPiece[k])}
                    onChange={e => updateSelected({ [k]: +e.target.value })}
                    className="w-full px-2 py-1 rounded bg-[#151520] border border-[#252540] text-white text-xs font-mono focus:outline-none focus:border-[#FF0099]"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center py-4">
            <MousePointer2 size={24} className="text-[#252540]" />
            <p className="text-[10px] text-[#444]">Click a piece<br/>to edit it</p>
          </div>
        )}

        <div className="flex-1" />

        {/* Clear button */}
        {pieces.length > 0 && (
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => { setPieces([]); setSelectedId(null); }}
            className="w-full py-2 rounded-xl bg-[#1a1a2e] hover:bg-[#252540] text-[#666] hover:text-white text-xs font-medium transition-all flex items-center justify-center gap-1.5"
          >
            <RefreshCw size={13} /> Clear Canvas
          </motion.button>
        )}
      </div>

      {/* ── CENTER: Composition canvas ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 bg-[#060609]">

        <div className="text-[11px] text-[#333] font-mono tracking-wider">
          SHAPE COMPOSER · {pieces.length} piece{pieces.length !== 1 ? 's' : ''}
          {pieces.length > 0 && (
            <span className="ml-2 text-[#555]">
              · collider r≈{Math.round(computeColliderRadius(pieces))}px
            </span>
          )}
        </div>

        <motion.canvas
          ref={canvasRef}
          width={COMP_W}
          height={COMP_H}
          onMouseDown={handleMouseDown}
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-[#1a1a2e] shadow-2xl max-w-full max-h-full"
          style={{ cursor: canvasCursor }}
        />

        {/* Save row */}
        <div className="flex items-center gap-3 w-full max-w-[480px]">
          <input
            type="text"
            value={shapeName}
            onChange={e => setShapeName(e.target.value)}
            placeholder="Shape name…"
            className="flex-1 px-3 py-2.5 rounded-xl bg-[#0c0c18] border border-[#252540] text-white text-sm focus:outline-none focus:border-[#FF0099] placeholder:text-[#333]"
          />
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleSave}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#FF0099] to-[#FF6600] text-white font-bold text-sm shadow-lg shadow-[#FF009933] flex items-center gap-2 whitespace-nowrap"
          >
            <Save size={15} /> Save Shape
          </motion.button>
        </div>

        <AnimatePresence>
          {saveMsg && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-4 py-2 rounded-lg bg-[#00FF8822] text-[#00FF88] text-xs font-medium border border-[#00FF8844]"
            >
              {saveMsg}
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[10px] text-[#2a2a40] text-center leading-relaxed">
          Click a shape type on the left → click the canvas to place it<br/>
          Drag pieces to reposition · Use sliders to resize & rotate<br/>
          Press Delete to remove selected · Esc to deselect
        </p>
      </div>

      {/* ── RIGHT: Saved shapes library ──────────────────────────────────── */}
      <div className="w-52 bg-[#0a0a12] border-l border-[#1a1a2e] flex flex-col p-4 gap-3 shrink-0 overflow-y-auto">
        <div className="text-[10px] uppercase tracking-widest text-[#444] flex items-center gap-1">
          <Layers size={10} /> Saved Shapes
          <span className="ml-auto text-[#333]">{existingShapes.length}</span>
        </div>

        {existingShapes.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
            <Layers size={28} className="text-[#1a1a2e] mb-3" />
            <p className="text-[10px] text-[#333] leading-relaxed">
              No saved shapes yet.<br/>Compose one and hit<br/><span className="text-[#FF0099]">Save Shape!</span>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {existingShapes.map(shape => (
              <motion.div
                key={shape.id}
                layout
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="flex items-center gap-2 p-2 rounded-xl bg-[#0f0f1a] border border-[#1e1e30] hover:border-[#FF0099] transition-all group"
              >
                {/* Thumbnail */}
                <div className="shrink-0 rounded-lg overflow-hidden border border-[#252540]" style={{ width: 44, height: 44 }}>
                  {shape.thumbnail ? (
                    <img src={shape.thumbnail} alt={shape.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-[#1a1a2e] flex items-center justify-center">
                      <Layers size={16} className="text-[#444]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-white truncate">{shape.name}</div>
                  <div className="text-[10px] text-[#444]">{shape.pieces.length}p · r≈{Math.round(shape.colliderRadius)}</div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onDelete(shape.id)}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 text-[#555] hover:text-[#ff4444] transition-all shrink-0"
                >
                  <Trash2 size={12} />
                </motion.button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
