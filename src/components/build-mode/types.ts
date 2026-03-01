import { LevelEvent } from '../../game/types';
import { CustomShapeDef } from '../shape-composer/types';

export type Tool = 'projectile_throw' | 'spawn_obstacle' | 'screen_shake' | 'pulse' | 'boss_move';
export type BehaviorType = 'homing' | 'spinning' | 'bouncing' | 'static' | 'sweep' | 'bomb' | 'custom';
export type ShapeType = 'square' | 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'star';
export type SnapInterval = '1/4' | '1/2' | '1' | '2' | '4';
export type ActivePanel = 'tools' | 'shapes' | 'settings' | 'compose';

export interface BombSettings {
  growthDuration: number;
  particleCount: number;
  particleSpeed: number;
}

/** A single keyframe in a custom animation path. */
export interface CustomKeyframe {
  /** Normalized time 0–1 within the object's duration. */
  t: number;
  /** World X position (0–1024). */
  x: number;
  /** World Y position (0–768). */
  y: number;
  /** Rotation in degrees. */
  rotation: number;
  /** Scale multiplier (1 = normal). */
  scale: number;
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
  customShapeDef?: CustomShapeDef;
  bombSettings?: BombSettings;
  customAnimation?: CustomAnimationData;
}
