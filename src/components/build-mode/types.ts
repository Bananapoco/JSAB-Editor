import { LevelEvent } from '../../game/types';
import { CustomShapeDef } from '../shape-composer/types';

export type Tool = 'projectile_throw' | 'spawn_obstacle' | 'screen_shake' | 'pulse' | 'boss_move';
export type BehaviorType = 'homing' | 'spinning' | 'bouncing' | 'static' | 'sweep' | 'bomb';
export type ShapeType = 'square' | 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'star';
export type SnapInterval = '1/4' | '1/2' | '1' | '2' | '4';
export type ActivePanel = 'tools' | 'shapes' | 'settings' | 'compose';

export interface BombSettings {
  growthDuration: number;
  particleCount: number;
  particleSpeed: number;
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
}
