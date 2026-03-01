import { LevelEvent, LevelEventType } from '../../game/types';
import type { ShapeDef, BehaviorDef } from '../../game/engine/ObjectFactory';
import { drawPieceShape } from '../shape-composer/drawing';
import { CustomShapeDef, PieceType } from '../shape-composer/types';
import { BehaviorSettings, BombSettings, CustomAnimationData, ShapeType } from './types';

export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeType,
  size: number,
  color: string,
  selected: boolean,
) {
  const r = size / 2;
  ctx.fillStyle = color;

  if (selected) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
  }

  ctx.beginPath();

  switch (shape) {
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
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.4;
        const x = rad * Math.cos(angle);
        const y = rad * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    case 'square':
    default:
      ctx.rect(-r, -r, size, size);
      break;
  }

  ctx.fill();
  if (selected) ctx.stroke();
  ctx.shadowBlur = 0;
}

export function shiftColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000ff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

export function shapeTypeToShapeDef(shape: ShapeType, size: number, color: string): ShapeDef {
  const opts = { fillColor: color };

  switch (shape) {
    case 'circle':
      return { kind: 'circle', radius: size / 2, ...opts };
    case 'triangle':
      return { kind: 'polygon', sides: 3, radius: size / 2, ...opts };
    case 'diamond':
      return { kind: 'polygon', sides: 4, radius: size / 2, ...opts };
    case 'hexagon':
      return { kind: 'polygon', sides: 6, radius: size / 2, ...opts };
    case 'star': {
      const points: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? size / 2 : (size / 2) * 0.4;
        points.push([rad * Math.cos(a), rad * Math.sin(a)]);
      }
      return { kind: 'polygon', points, ...opts };
    }
    case 'square':
    default:
      return { kind: 'rect', width: size, height: size, ...opts };
  }
}

export function pieceTypeToShapeDef(type: PieceType, size: number, color: string): ShapeDef {
  const opts = { fillColor: color };

  switch (type) {
    case 'circle':
      return { kind: 'circle', radius: size / 2, ...opts };
    case 'rect':
      return { kind: 'rect', width: size, height: size, ...opts };
    case 'triangle':
      return { kind: 'polygon', sides: 3, radius: size / 2, ...opts };
    case 'diamond':
      return { kind: 'polygon', sides: 4, radius: size / 2, ...opts };
    case 'hexagon':
      return { kind: 'polygon', sides: 6, radius: size / 2, ...opts };
    case 'star': {
      const points: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? size / 2 : (size / 2) * 0.4;
        points.push([rad * Math.cos(a), rad * Math.sin(a)]);
      }
      return { kind: 'polygon', points, ...opts };
    }
    default:
      return { kind: 'rect', width: size, height: size, ...opts };
  }
}

export function buildBehaviorDefsForPlacedEvent(
  eventType: LevelEventType,
  behavior: LevelEvent['behavior'] | undefined,
  size: number,
  duration?: number,
  bombSettings?: BombSettings,
  behaviorSettings?: BehaviorSettings,
  customAnimation?: CustomAnimationData,
): BehaviorDef[] {
  const defs: BehaviorDef[] = [];

  if (behavior !== 'bomb' && duration && duration > 0) {
    defs.push({ kind: 'dieAfter', lifetime: duration });
  }

  if (eventType === 'pulse') {
    defs.push({ kind: 'pulse', minScale: 0.75, maxScale: 1.25, period: 0.7 });
  }

  if (eventType === 'boss_move') {
    defs.push({ kind: 'bounce', vx: 220, vy: 0, radius: size / 2 });
  }

  const explicitBehavior =
    eventType === 'projectile_throw' || eventType === 'spawn_obstacle'
      ? behavior
      : undefined;

  switch (explicitBehavior) {
    case 'spinning':
      defs.push({ kind: 'rotate', speed: behaviorSettings?.spinSpeed ?? Math.PI });
      break;
    case 'homing':
      defs.push({ kind: 'homing', homingSpeed: behaviorSettings?.homingSpeed ?? 220 });
      break;
    case 'bouncing':
      defs.push({
        kind: 'bounce',
        vx: behaviorSettings?.bounceVx ?? 160,
        vy: behaviorSettings?.bounceVy ?? 140,
        radius: size / 2,
      });
      break;
    case 'sweep':
      defs.push({
        kind: 'linearMove',
        velocityX: behaviorSettings?.sweepVx ?? 220,
        velocityY: behaviorSettings?.sweepVy ?? 0,
      });
      break;
    case 'bomb':
      defs.push({
        kind: 'bomb',
        growthDuration: bombSettings?.growthDuration ?? 2.0,
        initialScale: 0.1,
        maxScale: 1.5,
        particleCount: bombSettings?.particleCount ?? 12,
        particleSpeed: bombSettings?.particleSpeed ?? 300,
      });
      break;
    case 'custom':
      if (customAnimation && customAnimation.keyframes.length >= 1) {
        defs.push({
          kind: 'customAnimation',
          customKeyframes: customAnimation.keyframes,
          customHandles: customAnimation.handles,
          customDuration: duration ?? 2.0,
        });
      }
      break;
    case 'static':
    default:
      break;
  }

  return defs;
}

export function drawCompositeShape(
  ctx: CanvasRenderingContext2D,
  def: CustomShapeDef,
  scale: number,
  selected: boolean,
  fallbackColor: string,
) {
  for (const piece of def.pieces) {
    const col = piece.color || fallbackColor;
    const r = (piece.size / 2) * scale;

    ctx.save();
    ctx.translate(piece.x * scale, piece.y * scale);
    ctx.rotate((piece.rotation * Math.PI) / 180);
    ctx.fillStyle = col;

    if (selected) {
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1.75;
      ctx.shadowColor = col;
      ctx.shadowBlur = 8;
    }

    drawPieceShape(ctx, piece.type, r);
    ctx.fill();
    if (selected) ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  if (selected && def.pieces.length > 0) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, def.colliderRadius * scale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

export function formatTime(t: number): string {
  const minutes = Math.floor(t / 60);
  const seconds = Math.floor(t % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
}
