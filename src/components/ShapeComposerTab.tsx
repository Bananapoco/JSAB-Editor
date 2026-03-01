import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save } from 'lucide-react';
import { ComposerLeftPanel } from './shape-composer/ComposerLeftPanel';
import { COMP_H, COMP_W, CX, CY } from './shape-composer/constants';
import {
  computeColliderRadius,
  drawPieceOnComposer,
  drawPieceShape,
  generateThumbnail,
  hitTestPiece,
} from './shape-composer/drawing';
import {
  ComposerPiece,
  CustomShapeDef,
  PieceType,
  ShapeComposerProps,
} from './shape-composer/types';

export type { PieceType, ComposerPiece, CustomShapeDef } from './shape-composer/types';
export { drawPieceShape } from './shape-composer/drawing';

let pieceIdCounter = 1000;

export const ShapeComposerTab: React.FC<ShapeComposerProps> = ({
  onClose,
  onSave,
  defaultColor,
}) => {
  const [pieces, setPieces] = useState<ComposerPiece[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pendingType, setPendingType] = useState<PieceType | null>(null);
  const [shapeName, setShapeName] = useState('My Shape');
  const [pieceColor, setPieceColor] = useState(defaultColor);
  const [saveMsg, setSaveMsg] = useState('');
  const [canvasCursor, setCanvasCursor] = useState<string>('default');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const piecesRef = useRef<ComposerPiece[]>(pieces);
  piecesRef.current = pieces;
  const copiedPieceRef = useRef<ComposerPiece | null>(null);
  const pasteNudgeRef = useRef(0);

  const dragRef = useRef<{ pieceId: number; lastX: number; lastY: number } | null>(null);
  const rotDragRef = useRef<{ pieceId: number; startAngle: number; startRot: number } | null>(null);
  type ResizeHandle = { sx: -1 | 0 | 1; sy: -1 | 0 | 1 };

  const resizeDragRef = useRef<{
    pieceId: number;
    handle: ResizeHandle;
    startSize: number;
    startScaleX: number;
    startScaleY: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, COMP_W, COMP_H);
    ctx.fillStyle = '#08080e';
    ctx.fillRect(0, 0, COMP_W, COMP_H);

    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for (let gx = 0; gx < COMP_W; gx += 24) {
      for (let gy = 0; gy < COMP_H; gy += 24) {
        ctx.beginPath();
        ctx.arc(gx, gy, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(CX, 0);
    ctx.lineTo(CX, COMP_H);
    ctx.moveTo(0, CY);
    ctx.lineTo(COMP_W, CY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(CX, CY, 3, 0, Math.PI * 2);
    ctx.fill();

    for (const piece of pieces) {
      drawPieceOnComposer(ctx, piece, piece.id === selectedId);
    }
  }, [pieces, selectedId]);

  useEffect(() => {
    if (dragRef.current || rotDragRef.current || resizeDragRef.current) return;
    setCanvasCursor(pendingType ? 'crosshair' : 'default');
  }, [pendingType]);

  const getCanvasXY = (e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = COMP_W / rect.width;
    const scaleY = COMP_H / rect.height;

    return {
      mx: (e.clientX - rect.left) * scaleX,
      my: (e.clientY - rect.top) * scaleY,
    };
  };

  const isOnRotateHandle = (mx: number, my: number): boolean => {
    if (selectedId === null) return false;
    const piece = piecesRef.current.find(p => p.id === selectedId);
    if (!piece) return false;

    const scaleY = piece.scaleY ?? 1;
    const handleDistance = (piece.size / 2 + 8) * Math.abs(scaleY) + 18;
    const rot = (piece.rotation * Math.PI) / 180;
    const hx = CX + piece.x + Math.sin(rot) * handleDistance;
    const hy = CY + piece.y - Math.cos(rot) * handleDistance;
    return Math.sqrt((mx - hx) ** 2 + (my - hy) ** 2) <= 10;
  };

  const getResizeHandleAt = (mx: number, my: number): ResizeHandle | null => {
    if (selectedId === null) return null;
    const piece = piecesRef.current.find(p => p.id === selectedId);
    if (!piece) return null;

    const r = piece.size / 2;
    const pad = 8;
    const sxScale = piece.scaleX ?? 1;
    const syScale = piece.scaleY ?? 1;
    const rot = (piece.rotation * Math.PI) / 180;
    const c = Math.cos(rot);
    const s = Math.sin(rot);

    const handles: ResizeHandle[] = [
      { sx: -1, sy: -1 },
      { sx: 0, sy: -1 },
      { sx: 1, sy: -1 },
      { sx: -1, sy: 0 },
      { sx: 1, sy: 0 },
      { sx: -1, sy: 1 },
      { sx: 0, sy: 1 },
      { sx: 1, sy: 1 },
    ];

    for (const handle of handles) {
      const lx = handle.sx * (r + pad) * sxScale;
      const ly = handle.sy * (r + pad) * syScale;
      const hx = CX + piece.x + lx * c - ly * s;
      const hy = CY + piece.y + lx * s + ly * c;
      const hitRadius = (handle.sx !== 0 && handle.sy !== 0) ? 10 : 9;
      if (Math.hypot(mx - hx, my - hy) <= hitRadius) {
        return handle;
      }
    }

    return null;
  };

  const getResizeCursorForHandle = (handle: ResizeHandle): string => {
    if (handle.sx !== 0 && handle.sy !== 0) {
      return handle.sx === handle.sy ? 'nwse-resize' : 'nesw-resize';
    }
    if (handle.sx === 0) return 'ns-resize';
    return 'ew-resize';
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasXY(e);
    if (!coords) return;
    const { mx, my } = coords;

    const handle = getResizeHandleAt(mx, my);
    if (handle && selectedId !== null) {
      const piece = piecesRef.current.find(p => p.id === selectedId);
      if (!piece) return;

      resizeDragRef.current = {
        pieceId: piece.id,
        handle,
        startSize: piece.size,
        startScaleX: piece.scaleX ?? 1,
        startScaleY: piece.scaleY ?? 1,
      };
      setCanvasCursor(getResizeCursorForHandle(handle));
      return;
    }

    if (isOnRotateHandle(mx, my) && selectedId !== null) {
      const piece = piecesRef.current.find(p => p.id === selectedId);
      if (!piece) return;

      const angle = Math.atan2(my - (CY + piece.y), mx - (CX + piece.x)) * 180 / Math.PI;
      rotDragRef.current = { pieceId: piece.id, startAngle: angle, startRot: piece.rotation };
      setCanvasCursor('grabbing');
      return;
    }

    if (pendingType !== null) {
      const newPiece: ComposerPiece = {
        id: pieceIdCounter++,
        type: pendingType,
        x: mx - CX,
        y: my - CY,
        size: 60,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        color: pieceColor,
      };
      setPieces(prev => [...prev, newPiece]);
      setSelectedId(newPiece.id);
      setPendingType(null);
      setCanvasCursor('default');
      return;
    }

    const topFirstPieces = [...piecesRef.current].reverse();
    for (const piece of topFirstPieces) {
      if (hitTestPiece(piece, mx, my)) {
        setSelectedId(piece.id);
        dragRef.current = { pieceId: piece.id, lastX: mx, lastY: my };
        setCanvasCursor('grabbing');
        return;
      }
    }

    setSelectedId(null);
    setCanvasCursor(pendingType ? 'crosshair' : 'default');
  };

  const handleCanvasHoverMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragRef.current || rotDragRef.current || resizeDragRef.current) return;

    const coords = getCanvasXY(e);
    if (!coords) return;
    const { mx, my } = coords;

    const handle = getResizeHandleAt(mx, my);
    if (handle) {
      setCanvasCursor(getResizeCursorForHandle(handle));
      return;
    }

    if (isOnRotateHandle(mx, my)) {
      setCanvasCursor('grab');
      return;
    }

    if (pendingType !== null) {
      setCanvasCursor('crosshair');
      return;
    }

    const hoveringPiece = [...piecesRef.current].reverse().some(piece => hitTestPiece(piece, mx, my));
    setCanvasCursor(hoveringPiece ? 'grab' : 'default');
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const coords = getCanvasXY(e);
      if (!coords) return;
      const { mx, my } = coords;

      if (resizeDragRef.current) {
        const { pieceId, handle, startScaleX, startScaleY, startSize } = resizeDragRef.current;
        const piece = piecesRef.current.find(p => p.id === pieceId);
        if (!piece) return;

        setCanvasCursor(getResizeCursorForHandle(handle));

        const dx = mx - (CX + piece.x);
        const dy = my - (CY + piece.y);
        const rot = (piece.rotation * Math.PI) / 180;
        const c = Math.cos(-rot);
        const s = Math.sin(-rot);
        const localX = dx * c - dy * s;
        const localY = dx * s + dy * c;
        const pad = 8;

        const baseHalf = Math.max(7, startSize / 2);
        const baseScaleX = Math.max(0.2, Math.abs(startScaleX));
        const baseScaleY = Math.max(0.2, Math.abs(startScaleY));

        if (handle.sx !== 0 && handle.sy !== 0) {
          // Corner handles resize uniformly.
          const currentHalfX = Math.max(7, baseHalf * baseScaleX);
          const currentHalfY = Math.max(7, baseHalf * baseScaleY);
          const targetHalfX = Math.max(7, Math.abs(localX) - pad);
          const targetHalfY = Math.max(7, Math.abs(localY) - pad);
          const factor = Math.max(targetHalfX / currentHalfX, targetHalfY / currentHalfY);
          const nextSize = Math.max(14, Math.min(260, startSize * factor));

          setPieces(prev => prev.map(p => (
            p.id === pieceId ? { ...p, size: nextSize } : p
          )));
          return;
        }

        // Edge handles stretch on one axis only.
        if (handle.sx !== 0) {
          const targetHalfX = Math.max(7, Math.abs(localX) - pad);
          const nextScaleX = Math.max(0.2, Math.min(4, targetHalfX / baseHalf));

          setPieces(prev => prev.map(p => (
            p.id === pieceId ? { ...p, scaleX: nextScaleX } : p
          )));
          return;
        }

        if (handle.sy !== 0) {
          const targetHalfY = Math.max(7, Math.abs(localY) - pad);
          const nextScaleY = Math.max(0.2, Math.min(4, targetHalfY / baseHalf));

          setPieces(prev => prev.map(p => (
            p.id === pieceId ? { ...p, scaleY: nextScaleY } : p
          )));
        }

        return;
      }

      if (rotDragRef.current) {
        const { pieceId, startAngle, startRot } = rotDragRef.current;
        const piece = piecesRef.current.find(p => p.id === pieceId);
        if (!piece) return;

        setCanvasCursor('grabbing');

        const angle = Math.atan2(my - (CY + piece.y), mx - (CX + piece.x)) * 180 / Math.PI;
        const delta = angle - startAngle;
        setPieces(prev => prev.map(p => (
          p.id === pieceId ? { ...p, rotation: (startRot + delta + 360) % 360 } : p
        )));
        return;
      }

      if (dragRef.current) {
        setCanvasCursor('grabbing');
        const { pieceId, lastX, lastY } = dragRef.current;
        const dx = mx - lastX;
        const dy = my - lastY;
        dragRef.current.lastX = mx;
        dragRef.current.lastY = my;

        setPieces(prev => prev.map(piece => (
          piece.id === pieceId ? { ...piece, x: piece.x + dx, y: piece.y + dy } : piece
        )));
      }
    };

    const onUp = () => {
      dragRef.current = null;
      rotDragRef.current = null;
      resizeDragRef.current = null;
      setCanvasCursor('default');
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.code === 'KeyC' && selectedId !== null) {
        const piece = piecesRef.current.find(p => p.id === selectedId);
        if (!piece) return;
        copiedPieceRef.current = JSON.parse(JSON.stringify(piece));
        pasteNudgeRef.current = 0;
        e.preventDefault();
        return;
      }

      if (isMod && e.code === 'KeyV' && copiedPieceRef.current) {
        pasteNudgeRef.current += 1;
        const nudge = 14 * pasteNudgeRef.current;
        const copied = copiedPieceRef.current;
        const newPiece: ComposerPiece = {
          ...JSON.parse(JSON.stringify(copied)),
          id: pieceIdCounter++,
          x: copied.x + nudge,
          y: copied.y + nudge,
        };
        setPieces(prev => [...prev, newPiece]);
        setSelectedId(newPiece.id);
        setPendingType(null);
        e.preventDefault();
        return;
      }

      if ((e.code === 'Delete' || e.code === 'Backspace') && selectedId !== null) {
        setPieces(prev => prev.filter(p => p.id !== selectedId));
        setSelectedId(null);
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        setPendingType(null);
        setSelectedId(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId]);

  const selectedPiece = useMemo(
    () => pieces.find(piece => piece.id === selectedId) ?? null,
    [pieces, selectedId],
  );

  const updateSelected = (updates: Partial<ComposerPiece>) => {
    if (selectedId === null) return;
    setPieces(prev => prev.map(piece => (
      piece.id === selectedId ? { ...piece, ...updates } : piece
    )));
  };

  const deleteSelected = () => {
    if (selectedId === null) return;
    setPieces(prev => prev.filter(piece => piece.id !== selectedId));
    setSelectedId(null);
  };

  const handleSave = () => {
    if (pieces.length === 0) {
      setSaveMsg('Add at least one piece!');
      return;
    }

    const name = shapeName.trim() || 'Untitled';
    const shape: CustomShapeDef = {
      id: `custom_${Date.now()}`,
      name,
      pieces: JSON.parse(JSON.stringify(pieces)),
      colliderRadius: computeColliderRadius(pieces),
      thumbnail: generateThumbnail(pieces),
    };

    onSave(shape);
    setSaveMsg(`✓ "${name}" saved!`);
    setTimeout(() => setSaveMsg(''), 2500);
    setPieces([]);
    setSelectedId(null);
    setShapeName('My Shape');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      className="flex-1 flex overflow-hidden"
      style={{ background: '#08080e' }}
    >
      <ComposerLeftPanel
        onClose={onClose}
        pieceColor={pieceColor}
        onPieceColorChange={setPieceColor}
        pendingType={pendingType}
        onPendingTypeChange={setPendingType}
        selectedPiece={selectedPiece}
        onUpdateSelected={updateSelected}
        onDeleteSelected={deleteSelected}
        onClearCanvas={() => {
          setPieces([]);
          setSelectedId(null);
        }}
        hasPieces={pieces.length > 0}
      />

      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 bg-[#060609]">
        <div className="text-[11px] text-[#333] font-mono tracking-wider">
          SHAPE COMPOSER · {pieces.length} piece{pieces.length !== 1 ? 's' : ''}
          {pieces.length > 0 && (
            <span className="ml-2 text-[#555]">· collider r≈{Math.round(computeColliderRadius(pieces))}px</span>
          )}
        </div>

        <motion.canvas
          ref={canvasRef}
          width={COMP_W}
          height={COMP_H}
          onMouseDown={handleMouseDown}
          onMouseMove={handleCanvasHoverMove}
          onMouseLeave={() => setCanvasCursor(pendingType ? 'crosshair' : 'default')}
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-[#1a1a2e] shadow-2xl max-w-full max-h-full"
          style={{ cursor: canvasCursor }}
        />

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
          Click a shape type on the left → click the canvas to place it
          <br />
          Drag pieces to reposition · Corner drag = resize · Side drag = stretch axis
          <br />
          Press Delete to remove selected · Esc to deselect
        </p>
      </div>

    </motion.div>
  );
};
