import { LevelEvent } from '../../game/types';
import { CustomShapeDef } from '../shape-composer/types';

export type Tool = 'projectile_throw' | 'spawn_obstacle' | 'screen_shake' | 'pulse' | 'boss_move';

/** Primary movement behaviors – mutually exclusive (only one controls position at a time). */
export type MovementBehavior = 'static' | 'bouncing' | 'sweep' | 'homing' | 'custom';

/**
 * Modifier behaviors – stackable on top of any compatible movement.
 * Conflicts: 'custom' movement disables both modifiers (custom controls rotation + scale itself).
 */
export type ModifierBehavior = 'spinning' | 'bomb';

/** Union of all behavior kinds (kept for legacy compatibility). */
export type BehaviorType = MovementBehavior | ModifierBehavior;

export type ShapeType = 'square' | 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'star';
export type SnapInterval = '1/4' | '1/2' | '1' | '2' | '4';
export type ActivePanel = 'tools' | 'shapes' | 'settings' | 'compose';

export interface BombSettings {
  /** How many beats the bomb grows before exploding */
  growthBeats: number;
  particleCount: number;
}

export interface BehaviorSettings {
  /** Homing pursuit speed in px/beat. */
  homingSpeed?: number;
  spinSpeed?: number;
  /** Bounce movement speed in px/beat. */
  bounceSpeed?: number;
  /** Bounce initial direction in degrees (0 = right, 90 = down). */
  bounceAngle?: number;
  /** Sweep movement speed in px/beat. */
  sweepSpeed?: number;
  /** Sweep direction in degrees (0 = right, 90 = down). */
  sweepAngle?: number;
}

/** A single keyframe in a custom animation path. */
export interface CustomKeyframe {
  /** Normalized time 0–1 within the object's duration. */
  t: number;
  /** World X position (0–1366). */
  x: number;
  /** World Y position (0–768). */
  y: number;
  /** Rotation in degrees. */
  rotation: number;
  /** Scale multiplier (1 = normal). */
  scale: number;
}

/** Easing preset name, or 'custom' for a user-defined cubic-bezier curve. */
export type EasingPreset = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'custom';

/** Custom cubic-bezier control points (same format as CSS cubic-bezier). */
export interface CustomEasingCurve {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Bezier handle pair for the segment between keyframe[i] and keyframe[i+1]. */
export interface CustomSegmentHandle {
  /** If true, this segment uses cubic bezier interpolation. */
  enabled: boolean;
  /** Control point 1 (relative to keyframe[i] position). */
  cp1x: number;
  cp1y: number;
  /** Control point 2 (relative to keyframe[i+1] position). */
  cp2x: number;
  cp2y: number;
  /** Easing preset for this segment's timing (default: 'linear'). */
  easing?: EasingPreset;
  /** Custom cubic-bezier curve when easing === 'custom'. */
  easingCurve?: CustomEasingCurve;
}

export interface CustomAnimationData {
  keyframes: CustomKeyframe[];
  /** handles[i] is for the segment between keyframes[i] and keyframes[i+1]. */
  handles: CustomSegmentHandle[];
}

export interface SelectionRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface HoverPos {
  gx: number;
  gy: number;
}

export interface PlacedEvent extends LevelEvent {
  id: number;
  shape?: ShapeType;
  /** Non-uniform horizontal stretch (1 = unchanged). */
  stretchX?: number;
  /** Non-uniform vertical stretch (1 = unchanged). */
  stretchY?: number;
  customShapeDef?: CustomShapeDef;
  bombSettings?: BombSettings;
  behaviorSettings?: BehaviorSettings;
  customAnimation?: CustomAnimationData;
  /**
   * Stackable modifier behaviors layered on top of the primary movement.
   * When present, `behavior` holds the movement type; modifiers are listed here.
   * Absent on legacy events (where behavior may be 'spinning' or 'bomb' directly).
   */
  behaviorModifiers?: ModifierBehavior[];
}
