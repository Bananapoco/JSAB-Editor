import React from 'react';
import {
  ArrowRight,
  Bomb,
  Circle,
  Diamond,
  Hexagon,
  Move,
  MoveRight,
  Pencil,
  RotateCw,
  Rocket,
  Square,
  Star,
  Target,
  Triangle,
  Zap,
} from 'lucide-react';
import { BehaviorType, ModifierBehavior, MovementBehavior, ShapeType, SnapInterval, Tool } from './types';

export const GAME_W = 1366;
export const GAME_H = 768;
export const CANVAS_W = 640;
export const CANVAS_H = Math.round((CANVAS_W * GAME_H) / GAME_W);
export const SCALE = CANVAS_W / GAME_W;
export const SELECTION_CLICK_DEADZONE_PX = 8;

export const SNAP_INTERVALS: { value: SnapInterval; label: string; divisor: number }[] = [
  { value: '1/4', label: '1/4', divisor: 4 },
  { value: '1/2', label: '1/2', divisor: 2 },
  { value: '1', label: '1', divisor: 1 },
  { value: '2', label: '2', divisor: 0.5 },
  { value: '4', label: '4', divisor: 0.25 },
];

export const TOOLS: Record<Tool, { icon: React.FC<any>; color: string; label: string }> = {
  projectile_throw: { icon: Rocket, color: '#FF0099', label: 'Projectile' },
  spawn_obstacle: { icon: Square, color: '#FF6B00', label: 'Obstacle' },
  screen_shake: { icon: Zap, color: '#FFEE00', label: 'Shake' },
  pulse: { icon: Target, color: '#00FF88', label: 'Pulse' },
  boss_move: { icon: Move, color: '#9966FF', label: 'Boss Move' },
};

export const SHAPES: { type: ShapeType; icon: React.FC<any>; label: string }[] = [
  { type: 'square', icon: Square, label: 'Square' },
  { type: 'circle', icon: Circle, label: 'Circle' },
  { type: 'triangle', icon: Triangle, label: 'Triangle' },
  { type: 'diamond', icon: Diamond, label: 'Diamond' },
  { type: 'hexagon', icon: Hexagon, label: 'Hexagon' },
  { type: 'star', icon: Star, label: 'Star' },
];

/** Legacy flat list – kept for any code that still references BEHAVIORS. */
export const BEHAVIORS: { type: BehaviorType; icon: React.FC<any>; label: string }[] = [
  { type: 'homing', icon: Target, label: 'Homing' },
  { type: 'spinning', icon: RotateCw, label: 'Spinning' },
  { type: 'bouncing', icon: ArrowRight, label: 'Bouncing' },
  { type: 'static', icon: Square, label: 'Static' },
  { type: 'sweep', icon: MoveRight, label: 'Sweep' },
  { type: 'bomb', icon: Bomb, label: 'Bomb' },
  { type: 'custom', icon: Pencil, label: 'Custom' },
];

/**
 * Primary movement behaviors – rendered as an exclusive radio-style group.
 * Exactly one is always active.
 */
export const MOVEMENT_BEHAVIORS: { type: MovementBehavior; icon: React.FC<any>; label: string; description: string }[] = [
  { type: 'static',   icon: Square,    label: 'Static',  description: 'Stays in place' },
  { type: 'bouncing', icon: ArrowRight, label: 'Bounce',  description: 'Ricochets off walls' },
  { type: 'sweep',    icon: MoveRight,  label: 'Sweep',   description: 'Moves in a straight line' },
  { type: 'homing',   icon: Target,     label: 'Homing',  description: 'Tracks the player' },
  { type: 'custom',   icon: Pencil,     label: 'Custom',  description: 'Keyframe animation path' },
];

/**
 * Modifier behaviors – rendered as stackable toggles below the movement group.
 * Multiple can be active at once; `conflicts` lists movement types that disable this modifier.
 */
export const MODIFIER_BEHAVIORS: {
  type: ModifierBehavior;
  icon: React.FC<any>;
  label: string;
  description: string;
  conflicts: MovementBehavior[];
}[] = [
  {
    type: 'spinning',
    icon: RotateCw,
    label: 'Spinning',
    description: 'Continuously rotates',
    conflicts: ['custom'], // custom controls rotation itself
  },
  {
    type: 'bomb',
    icon: Bomb,
    label: 'Bomb',
    description: 'Grows then explodes into projectiles',
    conflicts: ['custom'], // custom controls scale itself
  },
];
