import { RefObject, useEffect } from 'react';
import { CANVAS_H, CANVAS_W, SCALE, TOOLS } from './constants';
import { HoverPos, PlacedEvent, SelectionRect, ShapeType, Tool } from './types';
import { CustomShapeDef } from '../shape-composer/types';
import { drawCompositeShape, drawShape, shiftColor } from './utils';

interface UseBuildModeCanvasRenderParams {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  events: PlacedEvent[];
  selectedId: number | null;
  selectedIds: number[];
  currentTime: number;
  hoverPos: HoverPos | null;
  selectionRect: SelectionRect | null;
  activeTool: Tool;
  isPlacementMode: boolean;
  activeSize: number;
  activeShape: ShapeType;
  bgColor: string;
  enemyColor: string;
  playerColor: string;
  activeCustomShapeId: string | null;
  customShapes: CustomShapeDef[];
}

export function useBuildModeCanvasRender({
  canvasRef,
  events,
  selectedId,
  selectedIds,
  currentTime,
  hoverPos,
  selectionRect,
  activeTool,
  isPlacementMode,
  activeSize,
  activeShape,
  bgColor,
  enemyColor,
  playerColor,
  activeCustomShapeId,
  customShapes,
}: UseBuildModeCanvasRenderParams) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    const gradient = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, shiftColor(bgColor, -10));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x < CANVAS_W; x += 32) {
      for (let y = 0; y < CANVAS_H; y += 32) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    events.forEach(event => {
      const cx = event.x * SCALE;
      const cy = event.y * SCALE;
      const size = (event.size ?? 40) * SCALE;
      const isSelected = selectedIds.includes(event.id) || event.id === selectedId;
      const timeDiff = Math.abs(event.timestamp - currentTime);
      const alpha = isSelected ? 1 : timeDiff < 4 ? 0.9 : 0.4;
      const color = isSelected ? '#FFFFFF' : enemyColor;
      const shape = event.shape || 'square';

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);
      ctx.rotate(((event.rotation ?? 0) * Math.PI) / 180);

      if (event.customShapeDef) {
        drawCompositeShape(ctx, event.customShapeDef, SCALE, isSelected, enemyColor);
      } else {
        drawShape(ctx, shape, size, color, isSelected);
      }

      if (isSelected) {
        ctx.rotate(-((event.rotation ?? 0) * Math.PI) / 180);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        const labelRadius = event.customShapeDef
          ? event.customShapeDef.colliderRadius * SCALE
          : size / 2;
        ctx.fillText(`${event.timestamp.toFixed(1)}s`, 0, -labelRadius - 8);
      }

      ctx.restore();
    });

    if (selectionRect && !isPlacementMode) {
      const x = Math.min(selectionRect.x1, selectionRect.x2) * SCALE;
      const y = Math.min(selectionRect.y1, selectionRect.y2) * SCALE;
      const w = Math.abs(selectionRect.x2 - selectionRect.x1) * SCALE;
      const h = Math.abs(selectionRect.y2 - selectionRect.y1) * SCALE;

      ctx.save();
      ctx.fillStyle = 'rgba(0,255,255,0.14)';
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 1.5;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }

    if (hoverPos && isPlacementMode) {
      const size = activeSize * SCALE;
      const color = TOOLS[activeTool]?.color ?? enemyColor;

      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.translate(hoverPos.gx * SCALE, hoverPos.gy * SCALE);

      const customShape = activeCustomShapeId
        ? customShapes.find(shape => shape.id === activeCustomShapeId)
        : null;

      if (customShape) {
        drawCompositeShape(ctx, customShape, SCALE, false, enemyColor);
      } else {
        drawShape(ctx, activeShape, size, color, false);
      }

      ctx.restore();
    }

    const px = 512 * SCALE;
    const py = 384 * SCALE;
    ctx.save();
    ctx.fillStyle = playerColor;
    ctx.globalAlpha = 0.9;
    ctx.shadowColor = playerColor;
    ctx.shadowBlur = 12;
    ctx.fillRect(px - 10, py - 10, 20, 20);
    ctx.restore();
  }, [
    activeCustomShapeId,
    activeShape,
    activeSize,
    activeTool,
    bgColor,
    canvasRef,
    currentTime,
    customShapes,
    enemyColor,
    events,
    hoverPos,
    isPlacementMode,
    playerColor,
    selectedId,
    selectedIds,
    selectionRect,
  ]);
}
