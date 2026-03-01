/**
 * Computes the interpolated visual state (position, rotation, scale, visibility)
 * of a PlacedEvent at a given point in time, replicating the runtime behavior
 * logic so the editor canvas shows a faithful preview.
 */

import { GAME_W, GAME_H } from './constants';
import { PlacedEvent, CustomKeyframe, CustomSegmentHandle, CustomAnimationData } from './types';
import { getBombDurationSeconds, hasBombBehavior } from './utils';

export interface InterpolatedState {
  /** Whether the shape should be visible at this time. */
  visible: boolean;
  /** World X (0–1366). */
  x: number;
  /** World Y (0–768). */
  y: number;
  /** Rotation in degrees. */
  rotation: number;
  /** Uniform scale multiplier. */
  scale: number;
  /** Opacity 0–1 (used for fade-in/out near edges). */
  opacity: number;
}

// ---------------------------------------------------------------------------
// Easing (mirrored from CustomAnimationBehavior)
// ---------------------------------------------------------------------------

function cubicBezierEasing(x1: number, y1: number, x2: number, y2: number, t: number): number {
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const sampleX = (s: number) => ((1 - 3 * x2 + 3 * x1) * s + (3 * x2 - 6 * x1)) * s * s + 3 * x1 * s;
  const sampleY = (s: number) => ((1 - 3 * y2 + 3 * y1) * s + (3 * y2 - 6 * y1)) * s * s + 3 * y1 * s;
  const sampleDX = (s: number) => (3 * (1 - 3 * x2 + 3 * x1)) * s * s + (2 * (3 * x2 - 6 * x1)) * s + 3 * x1;
  let s = t;
  for (let i = 0; i < 8; i++) {
    const dx = sampleX(s) - t;
    if (Math.abs(dx) < 1e-6) break;
    const d = sampleDX(s);
    if (Math.abs(d) < 1e-6) break;
    s -= dx / d;
  }
  return sampleY(Math.max(0, Math.min(1, s)));
}

const EASING_PRESETS: Record<string, [number, number, number, number]> = {
  linear: [0, 0, 1, 1],
  easeIn: [0.42, 0, 1, 1],
  easeOut: [0, 0, 0.58, 1],
  easeInOut: [0.42, 0, 0.58, 1],
};

function applyEasing(localT: number, handle?: CustomSegmentHandle): number {
  if (!handle) return localT;
  const preset = handle.easing || 'linear';
  if (preset === 'linear') return localT;
  if (preset === 'custom' && handle.easingCurve) {
    const { x1, y1, x2, y2 } = handle.easingCurve;
    return cubicBezierEasing(x1, y1, x2, y2, localT);
  }
  const p = EASING_PRESETS[preset];
  if (p) return cubicBezierEasing(p[0], p[1], p[2], p[3], localT);
  return localT;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function cubicBezierPos(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

// ---------------------------------------------------------------------------
// Custom animation evaluation
// ---------------------------------------------------------------------------

function evaluateCustomAnimation(
  anim: CustomAnimationData,
  progress: number,
  originX: number,
  originY: number,
): { x: number; y: number; rotation: number; scale: number } {
  const kfs = anim.keyframes;
  if (kfs.length === 0) return { x: originX, y: originY, rotation: 0, scale: 1 };
  if (kfs.length === 1) return { x: kfs[0].x, y: kfs[0].y, rotation: kfs[0].rotation, scale: kfs[0].scale };

  if (progress <= kfs[0].t) return { x: kfs[0].x, y: kfs[0].y, rotation: kfs[0].rotation, scale: kfs[0].scale };
  if (progress >= kfs[kfs.length - 1].t) {
    const last = kfs[kfs.length - 1];
    return { x: last.x, y: last.y, rotation: last.rotation, scale: last.scale };
  }

  let i = 0;
  for (; i < kfs.length - 1; i++) {
    if (progress >= kfs[i].t && progress <= kfs[i + 1].t) break;
  }

  const a = kfs[i];
  const b = kfs[i + 1];
  const segDur = b.t - a.t;
  const rawT = segDur > 0 ? (progress - a.t) / segDur : 0;
  const handle = anim.handles[i];
  const localT = applyEasing(rawT, handle);

  let x: number, y: number;
  if (handle && handle.enabled) {
    x = cubicBezierPos(a.x, a.x + handle.cp1x, b.x + handle.cp2x, b.x, localT);
    y = cubicBezierPos(a.y, a.y + handle.cp1y, b.y + handle.cp2y, b.y, localT);
  } else {
    x = lerp(a.x, b.x, localT);
    y = lerp(a.y, b.y, localT);
  }

  return {
    x,
    y,
    rotation: lerp(a.rotation, b.rotation, localT),
    scale: lerp(a.scale, b.scale, localT),
  };
}

// ---------------------------------------------------------------------------
// Bounce simulation (deterministic from spawn time)
// ---------------------------------------------------------------------------

function simulateBounce(
  originX: number,
  originY: number,
  elapsed: number,
  speed: number,
  angleDeg: number,
  radius: number,
  bpm: number,
): { x: number; y: number } {
  const effectiveBpm = bpm > 0 ? bpm : 120;
  const pxPerSec = speed * effectiveBpm / 60;
  const rad = (angleDeg * Math.PI) / 180;
  let vx = Math.cos(rad) * pxPerSec;
  let vy = Math.sin(rad) * pxPerSec;

  // Simulate in small steps to handle wall bounces accurately
  const stepSize = 1 / 120; // 120 Hz simulation
  let x = originX;
  let y = originY;
  let remaining = elapsed;

  while (remaining > 0) {
    const dt = Math.min(remaining, stepSize);
    x += vx * dt;
    y += vy * dt;

    if (x - radius < 0) { x = radius; vx = Math.abs(vx); }
    else if (x + radius > GAME_W) { x = GAME_W - radius; vx = -Math.abs(vx); }

    if (y - radius < 0) { y = radius; vy = Math.abs(vy); }
    else if (y + radius > GAME_H) { y = GAME_H - radius; vy = -Math.abs(vy); }

    remaining -= dt;
  }

  return { x, y };
}

// ---------------------------------------------------------------------------
// Main interpolation function
// ---------------------------------------------------------------------------

/**
 * Compute the interpolated visual state of a PlacedEvent at `currentTime`.
 */
export function getInterpolatedState(
  event: PlacedEvent,
  currentTime: number,
  bpm: number,
): InterpolatedState {
  const timestamp = event.timestamp;
  const duration = event.duration ?? 0;
  const hasDuration = duration > 0;
  const behavior = event.behavior ?? 'static';
  const modifiers = event.behaviorModifiers ?? [];

  // Bomb timestamps in the editor represent explosion time.
  // Spawn time is back-computed so placement lines up with the explosion beat.
  const hasBomb = hasBombBehavior(event.behavior, event.behaviorModifiers);
  const bombDuration = hasBomb ? getBombDurationSeconds(bpm, event.bombSettings) : 0;
  const bombSpawnTime = hasBomb ? Math.max(0, timestamp - bombDuration) : timestamp;

  // Determine effective lifetime
  let startTime = timestamp;
  let endTime: number;
  if (hasBomb) {
    startTime = bombSpawnTime;
    endTime = timestamp;
  } else if (hasDuration) {
    endTime = timestamp + duration;
  } else {
    // No duration specified — show for a long time (effectively infinite in editor)
    endTime = timestamp + 9999;
  }

  // Visibility: active means the shape is "alive" at this time point.
  // Inactive shapes are still shown but ghosted so the user can always see
  // everything they've placed (like the old behaviour).
  const isActive = currentTime >= startTime && currentTime <= endTime;

  if (!isActive) {
    return {
      visible: true,
      x: event.x,
      y: event.y,
      rotation: event.rotation ?? 0,
      scale: 1,
      opacity: 0.25, // ghosted
    };
  }

  const effectiveBpm = bpm > 0 ? bpm : 120;
  const elapsed = hasBomb ? currentTime - bombSpawnTime : currentTime - timestamp;

  // Start from the event's placed position and rotation
  let x = event.x;
  let y = event.y;
  let rotation = event.rotation ?? 0;
  let scale = 1;
  let opacity = 1;

  const size = event.size ?? 40;
  const radius = size / 2;
  const bs = event.behaviorSettings;

  // ── Primary movement behavior ──────────────────────────────────────────
  switch (behavior) {
    case 'sweep': {
      const speed = bs?.sweepSpeed ?? 110;
      const angleDeg = bs?.sweepAngle ?? 0;
      const pxPerSec = speed * effectiveBpm / 60;
      const rad = (angleDeg * Math.PI) / 180;
      x += Math.cos(rad) * pxPerSec * elapsed;
      y += Math.sin(rad) * pxPerSec * elapsed;
      break;
    }

    case 'bouncing': {
      const speed = bs?.bounceSpeed ?? 100;
      const angleDeg = bs?.bounceAngle ?? 45;
      const pos = simulateBounce(event.x, event.y, elapsed, speed, angleDeg, radius, bpm);
      x = pos.x;
      y = pos.y;
      break;
    }

    case 'homing': {
      // Homing targets the player at center; in the editor we approximate by
      // moving toward center of screen
      const speed = bs?.homingSpeed ?? 110;
      const pxPerSec = speed * effectiveBpm / 60;
      const targetX = GAME_W / 2;
      const targetY = GAME_H / 2;
      const dx = targetX - event.x;
      const dy = targetY - event.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const maxTravel = pxPerSec * elapsed;
        const travel = Math.min(maxTravel, dist);
        x = event.x + (dx / dist) * travel;
        y = event.y + (dy / dist) * travel;
      }
      break;
    }

    case 'custom': {
      if (event.customAnimation && event.customAnimation.keyframes.length > 0) {
        const totalDur = hasDuration ? duration : 2.0;
        const progress = Math.min(elapsed / totalDur, 1);
        const result = evaluateCustomAnimation(event.customAnimation, progress, event.x, event.y);
        x = result.x;
        y = result.y;
        rotation = result.rotation;
        scale = result.scale;
      }
      break;
    }

    // Legacy spinning as primary (no behaviorModifiers)
    case 'spinning': {
      if (!modifiers.length) {
        const spinSpd = bs?.spinSpeed ?? Math.PI;
        rotation += (spinSpd * elapsed * 180) / Math.PI;
      }
      break;
    }

    // Legacy bomb as primary (no behaviorModifiers)
    case 'bomb': {
      if (!modifiers.length) {
        const t = elapsed / Math.max(bombDuration, 0.0001);
        const eased = 1 - Math.pow(1 - Math.min(t, 1), 3);
        const initialScale = 0.1;
        const maxScale = 1.5;
        scale = initialScale + (maxScale - initialScale) * eased;
      }
      break;
    }

    case 'static':
    default:
      break;
  }

  // ── Modifier behaviors (stacked) ──────────────────────────────────────
  if (modifiers.includes('spinning')) {
    const spinSpd = bs?.spinSpeed ?? Math.PI;
    rotation += (spinSpd * elapsed * 180) / Math.PI;
  }

  if (modifiers.includes('bomb')) {
    const t = elapsed / Math.max(bombDuration, 0.0001);
    const eased = 1 - Math.pow(1 - Math.min(t, 1), 3);
    const initialScale = 0.1;
    const maxScale = event.bombSettings?.particleCount ? 1.5 : 1.5;
    scale *= initialScale + (maxScale - initialScale) * eased;
  }

  if (modifiers.includes('pulse')) {
    const ps = event.pulseSettings;
    const minScale = ps?.minScale ?? 0.75;
    const maxScale = ps?.maxScale ?? 1.25;
    const beatRate = ps?.beatRate ?? 1.0;
    const beatDuration = 60 / (effectiveBpm * beatRate);
    const phase = (currentTime % beatDuration) / beatDuration;
    const t = (Math.cos(phase * Math.PI * 2) + 1) / 2;
    scale *= minScale + (maxScale - minScale) * t;
  }

  // No fade in the editor — always fully opaque when active
  opacity = 1;

  return { visible: true, x, y, rotation, scale, opacity };
}
