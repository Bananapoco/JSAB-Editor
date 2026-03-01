import { LevelEvent, LevelEventType } from '../../game/types';
import type { ShapeDef, BehaviorDef } from '../../game/engine/ObjectFactory';
import { drawPieceShape } from '../shape-composer/drawing';
import { CustomShapeDef, PieceType } from '../shape-composer/types';
import { BehaviorSettings, BombSettings, CustomAnimationData, ModifierBehavior, PulseSettings, ShapeType } from './types';

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

export function shapeTypeToShapeDef(
  shape: ShapeType,
  size: number,
  color: string,
  stretchX = 1,
  stretchY = 1,
): ShapeDef {
  const opts = { fillColor: color };
  const sx = Math.max(0.2, Math.abs(stretchX));
  const sy = Math.max(0.2, Math.abs(stretchY));
  const r = size / 2;

  switch (shape) {
    case 'circle': {
      // Engine has circles but no ellipse primitive; approximate ellipse via polygon points.
      const points: [number, number][] = [];
      const segments = 20;
      for (let i = 0; i < segments; i++) {
        const a = (Math.PI * 2 * i) / segments;
        points.push([Math.cos(a) * r * sx, Math.sin(a) * r * sy]);
      }
      return { kind: 'polygon', points, ...opts };
    }
    case 'triangle': {
      const base: [number, number][] = [
        [0, -r],
        [r * 0.866, r * 0.5],
        [-r * 0.866, r * 0.5],
      ];
      return { kind: 'polygon', points: base.map(([x, y]) => [x * sx, y * sy]), ...opts };
    }
    case 'diamond': {
      const base: [number, number][] = [[0, -r], [r, 0], [0, r], [-r, 0]];
      return { kind: 'polygon', points: base.map(([x, y]) => [x * sx, y * sy]), ...opts };
    }
    case 'hexagon': {
      const points: [number, number][] = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 2;
        points.push([Math.cos(a) * r * sx, Math.sin(a) * r * sy]);
      }
      return { kind: 'polygon', points, ...opts };
    }
    case 'star': {
      const points: [number, number][] = [];
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.4;
        points.push([rad * Math.cos(a) * sx, rad * Math.sin(a) * sy]);
      }
      return { kind: 'polygon', points, ...opts };
    }
    case 'square':
    default:
      return { kind: 'rect', width: size * sx, height: size * sy, ...opts };
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

export function stretchShapeDef(shape: ShapeDef, stretchX = 1, stretchY = 1): ShapeDef {
  const sx = Math.max(0.2, Math.abs(stretchX));
  const sy = Math.max(0.2, Math.abs(stretchY));

  if (shape.kind === 'rect') {
    return {
      ...shape,
      width: (shape.width ?? 40) * sx,
      height: (shape.height ?? 40) * sy,
    };
  }

  if (shape.kind === 'circle') {
    const r = shape.radius ?? 20;
    const points: [number, number][] = [];
    const segments = 20;
    for (let i = 0; i < segments; i++) {
      const a = (Math.PI * 2 * i) / segments;
      points.push([Math.cos(a) * r * sx, Math.sin(a) * r * sy]);
    }
    return {
      kind: 'polygon',
      points,
      fillColor: shape.fillColor,
      strokeColor: shape.strokeColor,
      strokeWidth: shape.strokeWidth,
      glowColor: shape.glowColor,
      glowRadius: shape.glowRadius,
      alpha: shape.alpha,
    };
  }

  if (shape.kind === 'polygon') {
    if (shape.points && shape.points.length > 0) {
      return {
        ...shape,
        points: shape.points.map(([x, y]) => [x * sx, y * sy]),
      };
    }

    const sides = shape.sides ?? 6;
    const r = shape.radius ?? 20;
    const points: [number, number][] = [];
    for (let i = 0; i < sides; i++) {
      const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
      points.push([Math.cos(a) * r * sx, Math.sin(a) * r * sy]);
    }
    return {
      ...shape,
      points,
      sides: undefined,
      radius: undefined,
    };
  }

  return shape;
}

/**
 * Builds the BehaviorDef array for a PlacedEvent.
 *
 * Supports two formats:
 * - **Legacy**: `behavior` is 'spinning' | 'bomb' | 'homing' | 'bouncing' | 'sweep' | 'static' | 'custom'
 *   and `behaviorModifiers` is absent.
 * - **New stacking**: `behavior` is the primary movement type, `behaviorModifiers` is an array of
 *   modifier behaviors ('spinning' | 'bomb') applied on top.
 */
export function buildBehaviorDefsForPlacedEvent(
  eventType: LevelEventType,
  behavior: LevelEvent['behavior'] | undefined,
  size: number,
  duration?: number,
  bombSettings?: BombSettings,
  behaviorSettings?: BehaviorSettings,
  customAnimation?: CustomAnimationData,
  behaviorModifiers?: ModifierBehavior[],
  pulseSettings?: PulseSettings,
): BehaviorDef[] {
  const defs: BehaviorDef[] = [];

  // Determine if a bomb behavior will be present (either as legacy primary or as a modifier).
  const hasBomb = behaviorModifiers
    ? behaviorModifiers.includes('bomb')
    : behavior === 'bomb';

  // Bomb manages its own lifecycle, so omit dieAfter when bomb is present.
  if (!hasBomb && duration && duration > 0) {
    defs.push({ kind: 'dieAfter', lifetime: duration });
  }

  // Backward compatibility: legacy pulse-type events still get the pulse behavior.
  if (eventType === 'pulse') {
    defs.push({ kind: 'pulse', minScale: 0.75, maxScale: 1.25, beatRate: 1.0 });
  }

  if (eventType === 'boss_move') {
    defs.push({ kind: 'bounce', speed: 110, directionDeg: 0, radius: size / 2 });
  }

  const explicitBehavior =
    eventType === 'projectile_throw' || eventType === 'spawn_obstacle'
      ? behavior
      : undefined;

  // ── Movement / primary behavior ──────────────────────────────────────────
  switch (explicitBehavior) {
    case 'homing':
      defs.push({ kind: 'homing', homingSpeed: behaviorSettings?.homingSpeed ?? 110 });
      break;
    case 'bouncing':
      defs.push({
        kind: 'bounce',
        speed: behaviorSettings?.bounceSpeed ?? 100,
        directionDeg: behaviorSettings?.bounceAngle ?? 45,
        radius: size / 2,
      });
      break;
    case 'sweep':
      defs.push({
        kind: 'linearMove',
        speed: behaviorSettings?.sweepSpeed ?? 110,
        directionDeg: behaviorSettings?.sweepAngle ?? 0,
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

    // ── Legacy-only primary behaviors (absent when behaviorModifiers is set) ──
    case 'spinning':
      if (!behaviorModifiers) {
        defs.push({ kind: 'rotate', speed: behaviorSettings?.spinSpeed ?? Math.PI });
      }
      break;
    case 'bomb':
      if (!behaviorModifiers) {
        defs.push({
          kind: 'bomb',
          growthBeats: bombSettings?.growthBeats ?? 4,
          initialScale: 0.1,
          maxScale: 1.5,
          particleCount: bombSettings?.particleCount ?? 12,
          particleSpeed: bombSettings?.particleSpeed ?? 400,
        });
      }
      break;

    case 'static':
    default:
      break;
  }

  // ── Modifier behaviors (new stacking system) ─────────────────────────────
  if (behaviorModifiers) {
    if (behaviorModifiers.includes('spinning')) {
      defs.push({ kind: 'rotate', speed: behaviorSettings?.spinSpeed ?? Math.PI });
    }
    if (behaviorModifiers.includes('bomb')) {
      defs.push({
        kind: 'bomb',
        growthBeats: bombSettings?.growthBeats ?? 4,
        initialScale: 0.1,
        maxScale: 1.5,
        particleCount: bombSettings?.particleCount ?? 12,
        particleSpeed: bombSettings?.particleSpeed ?? 400,
      });
    }
    if (behaviorModifiers.includes('pulse')) {
      defs.push({
        kind: 'pulse',
        minScale: pulseSettings?.minScale ?? 0.75,
        maxScale: pulseSettings?.maxScale ?? 1.25,
        beatRate: pulseSettings?.beatRate ?? 1.0,
      });
    }
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
    const opacity = (piece.opacity ?? 100) / 100;

    ctx.save();
    ctx.globalAlpha = opacity;
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
