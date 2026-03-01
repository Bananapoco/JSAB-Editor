import { RefObject, useEffect } from 'react';
import { CANVAS_H, CANVAS_W, SCALE, TOOLS } from './constants';
import { BehaviorType, CustomAnimationData, HoverPos, PlacedEvent, SelectionRect, ShapeType, Tool } from './types';
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
  activeBehavior: BehaviorType;
  customAnimationData: CustomAnimationData;
  selectedCustomKfIndex: number | null;
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
  activeBehavior,
  customAnimationData,
  selectedCustomKfIndex,
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
      const color = enemyColor;
      const shape = event.shape || 'square';

      ctx.save();
      ctx.globalAlpha = 1;
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

    if (!isPlacementMode) {
      const ids = selectedIds.length > 0
        ? selectedIds
        : (selectedId !== null ? [selectedId] : []);
      if (ids.length === 1) {
        const selectedEvent = events.find(event => event.id === ids[0]);
        if (selectedEvent && !selectedEvent.customShapeDef) {
          const cx = selectedEvent.x * SCALE;
          const cy = selectedEvent.y * SCALE;
          const half = ((selectedEvent.size ?? 40) * SCALE) / 2 + 8;
          const rot = ((selectedEvent.rotation ?? 0) * Math.PI) / 180;
          const c = Math.cos(rot);
          const s = Math.sin(rot);

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rot);
          ctx.strokeStyle = 'rgba(255,255,255,0.55)';
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(-half, -half, half * 2, half * 2);
          ctx.setLineDash([]);
          ctx.restore();

          const handles = [
            [-1, -1],
            [0, -1],
            [1, -1],
            [-1, 0],
            [1, 0],
            [-1, 1],
            [0, 1],
            [1, 1],
          ] as const;

          for (const [sx, sy] of handles) {
            const lx = sx * half;
            const ly = sy * half;
            const hx = cx + lx * c - ly * s;
            const hy = cy + lx * s + ly * c;

            ctx.save();
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#0a0a0f';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.rect(hx - 4, hy - 4, 8, 8);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

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
      ctx.globalAlpha = 1;
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

    // Draw custom animation path for selected event or active custom behavior
    {
      // Gather the animation data to draw: either from selected event or from active editing state
      const ids = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
      const selectedEvt = ids.length === 1 ? events.find(ev => ev.id === ids[0]) : null;
      const animData = selectedEvt?.customAnimation ?? (activeBehavior === 'custom' ? customAnimationData : null);

      if (animData && animData.keyframes.length > 0) {
        const kfs = animData.keyframes;
        const handles = animData.handles;

        ctx.save();

        // Draw segments between keyframes
        for (let i = 0; i < kfs.length - 1; i++) {
          const a = kfs[i];
          const b = kfs[i + 1];
          const handle = handles[i];
          const ax = a.x * SCALE, ay = a.y * SCALE;
          const bx = b.x * SCALE, by = b.y * SCALE;

          ctx.beginPath();
          ctx.strokeStyle = handle?.enabled ? '#00FFFF' : 'rgba(255,255,255,0.3)';
          ctx.lineWidth = handle?.enabled ? 2 : 1.5;
          ctx.setLineDash(handle?.enabled ? [] : [6, 4]);

          if (handle?.enabled) {
            ctx.moveTo(ax, ay);
            ctx.bezierCurveTo(
              ax + handle.cp1x * SCALE,
              ay + handle.cp1y * SCALE,
              bx + handle.cp2x * SCALE,
              by + handle.cp2y * SCALE,
              bx,
              by,
            );
          } else {
            ctx.moveTo(ax, ay);
            ctx.lineTo(bx, by);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Draw control point handles if curve is enabled
          if (handle?.enabled) {
            const cp1x = ax + handle.cp1x * SCALE;
            const cp1y = ay + handle.cp1y * SCALE;
            const cp2x = bx + handle.cp2x * SCALE;
            const cp2y = by + handle.cp2y * SCALE;

            // Lines from keyframe to control point
            ctx.beginPath();
            ctx.strokeStyle = 'rgba(0,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.moveTo(ax, ay);
            ctx.lineTo(cp1x, cp1y);
            ctx.moveTo(bx, by);
            ctx.lineTo(cp2x, cp2y);
            ctx.stroke();

            // Control point dots
            for (const [cpx, cpy] of [[cp1x, cp1y], [cp2x, cp2y]]) {
              ctx.beginPath();
              ctx.fillStyle = '#00FFFF';
              ctx.arc(cpx, cpy, 4, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // Draw keyframe diamonds
        for (let i = 0; i < kfs.length; i++) {
          const kf = kfs[i];
          const kx = kf.x * SCALE;
          const ky = kf.y * SCALE;
          const isSelectedKf = i === selectedCustomKfIndex;
          const sz = isSelectedKf ? 8 : 6;

          ctx.save();
          ctx.translate(kx, ky);
          ctx.rotate(Math.PI / 4);
          ctx.fillStyle = isSelectedKf ? '#FF0099' : '#FFFFFF';
          ctx.strokeStyle = isSelectedKf ? '#FF0099' : 'rgba(255,255,255,0.6)';
          ctx.lineWidth = 2;
          ctx.shadowColor = isSelectedKf ? '#FF0099' : '#FFFFFF';
          ctx.shadowBlur = isSelectedKf ? 10 : 4;
          ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
          ctx.strokeRect(-sz / 2, -sz / 2, sz, sz);
          ctx.shadowBlur = 0;
          ctx.restore();

          // Label
          ctx.save();
          ctx.fillStyle = isSelectedKf ? '#FF0099' : 'rgba(255,255,255,0.6)';
          ctx.font = 'bold 9px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${(kf.t * 100).toFixed(0)}%`, kx, ky - 12);
          ctx.restore();
        }

        ctx.restore();
      }
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
    activeBehavior,
    customAnimationData,
    selectedCustomKfIndex,
  ]);
}
