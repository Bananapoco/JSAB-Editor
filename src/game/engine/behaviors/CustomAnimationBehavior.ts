import { Behavior } from './Behavior';
import { Vector2 } from '../Vector2';

export interface CustomAnimKeyframe {
    /** Normalised time 0–1 within the object's lifetime. */
    t: number;
    x: number;
    y: number;
    rotation: number; // degrees
    scale: number;
}

export interface CustomAnimSegmentHandle {
    enabled: boolean;
    cp1x: number;
    cp1y: number;
    cp2x: number;
    cp2y: number;
    easing?: string;
    easingCurve?: { x1: number; y1: number; x2: number; y2: number };
}

// ---------------------------------------------------------------------------
// Easing helpers
// ---------------------------------------------------------------------------

/** Solve cubic-bezier(x1,y1,x2,y2)(t) – same semantics as CSS cubic-bezier.
 *  Given a linear input `t` in [0,1], returns the eased output in [0,1].
 *  Uses Newton-Raphson to invert the X curve, then evaluates Y. */
function cubicBezierEasing(x1: number, y1: number, x2: number, y2: number, t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    // The bezier x(s) = 3(1-s)^2*s*x1 + 3(1-s)*s^2*x2 + s^3
    // We need to find s such that x(s) = t, then return y(s).
    const sampleCurveX = (s: number) => ((1 - 3 * x2 + 3 * x1) * s + (3 * x2 - 6 * x1)) * s * s + 3 * x1 * s;
    const sampleCurveY = (s: number) => ((1 - 3 * y2 + 3 * y1) * s + (3 * y2 - 6 * y1)) * s * s + 3 * y1 * s;
    const sampleCurveDerivX = (s: number) => (3 * (1 - 3 * x2 + 3 * x1)) * s * s + (2 * (3 * x2 - 6 * x1)) * s + 3 * x1;

    // Newton-Raphson
    let s = t;
    for (let i = 0; i < 8; i++) {
        const dx = sampleCurveX(s) - t;
        if (Math.abs(dx) < 1e-6) break;
        const d = sampleCurveDerivX(s);
        if (Math.abs(d) < 1e-6) break;
        s -= dx / d;
    }
    // Clamp
    s = Math.max(0, Math.min(1, s));
    return sampleCurveY(s);
}

const EASING_PRESETS: Record<string, [number, number, number, number]> = {
    linear: [0, 0, 1, 1],
    easeIn: [0.42, 0, 1, 1],
    easeOut: [0, 0, 0.58, 1],
    easeInOut: [0.42, 0, 0.58, 1],
};

function applyEasing(localT: number, handle?: CustomAnimSegmentHandle): number {
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

// ---------------------------------------------------------------------------
// Spatial interpolation helpers
// ---------------------------------------------------------------------------

function cubicBezierPos(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/**
 * Drives an object along a user-defined keyframe path with optional
 * cubic-bezier curve handles between keyframes and per-segment easing.
 *
 * Progress is derived from absolute audio time (`currentTime - spawnTime`)
 * rather than accumulated dt, keeping the animation drift-free and
 * beat-accurate.
 *
 * @param keyframes     Sorted array of keyframes (t is normalised 0–1).
 * @param handles       Per-segment bezier handle data.
 * @param totalDuration Total animation duration in seconds.
 * @param spawnTime     Audio timestamp (seconds) when the object was spawned.
 */
export class CustomAnimationBehavior extends Behavior {
    private keyframes: CustomAnimKeyframe[];
    private handles: CustomAnimSegmentHandle[];
    private totalDuration: number;
    private originX = 0;
    private originY = 0;
    private started = false;

    constructor(
        keyframes: CustomAnimKeyframe[],
        handles: CustomAnimSegmentHandle[],
        totalDuration: number,
        private spawnTime = 0,
    ) {
        super();
        // Sort by time just in case
        this.keyframes = [...keyframes].sort((a, b) => a.t - b.t);
        this.handles = handles;
        this.totalDuration = totalDuration > 0 ? totalDuration : 1;
    }

    tick(dt: number, currentTime: number, _playerPos?: Vector2): void {
        if (!this.object || this.keyframes.length === 0) return;

        if (!this.started) {
            this.originX = this.object.transform.position.x;
            this.originY = this.object.transform.position.y;
            this.started = true;
        }

        // Derive elapsed from absolute audio time — no accumulated dt drift.
        const elapsed = currentTime - this.spawnTime;
        const progress = Math.min(elapsed / this.totalDuration, 1);

        const { x, y, rotation, scale } = this.evaluate(progress);

        this.object.transform.position.x = x;
        this.object.transform.position.y = y;
        this.object.transform.rotation = (rotation * Math.PI) / 180;
        this.object.transform.scale = scale;
    }

    private evaluate(progress: number): { x: number; y: number; rotation: number; scale: number } {
        const kfs = this.keyframes;
        if (kfs.length === 0) return { x: this.originX, y: this.originY, rotation: 0, scale: 1 };
        if (kfs.length === 1) return { x: kfs[0].x, y: kfs[0].y, rotation: kfs[0].rotation, scale: kfs[0].scale };

        // Clamp to first/last keyframe
        if (progress <= kfs[0].t) return { x: kfs[0].x, y: kfs[0].y, rotation: kfs[0].rotation, scale: kfs[0].scale };
        if (progress >= kfs[kfs.length - 1].t) {
            const last = kfs[kfs.length - 1];
            return { x: last.x, y: last.y, rotation: last.rotation, scale: last.scale };
        }

        // Find the two surrounding keyframes
        let i = 0;
        for (; i < kfs.length - 1; i++) {
            if (progress >= kfs[i].t && progress <= kfs[i + 1].t) break;
        }

        const a = kfs[i];
        const b = kfs[i + 1];
        const segmentDuration = b.t - a.t;
        const rawLocalT = segmentDuration > 0 ? (progress - a.t) / segmentDuration : 0;

        const handle = this.handles[i];

        // Apply easing to the local t
        const localT = applyEasing(rawLocalT, handle);

        let x: number, y: number;
        if (handle && handle.enabled) {
            x = cubicBezierPos(a.x, a.x + handle.cp1x, b.x + handle.cp2x, b.x, localT);
            y = cubicBezierPos(a.y, a.y + handle.cp1y, b.y + handle.cp2y, b.y, localT);
        } else {
            x = lerp(a.x, b.x, localT);
            y = lerp(a.y, b.y, localT);
        }

        const rotation = lerp(a.rotation, b.rotation, localT);
        const scale = lerp(a.scale, b.scale, localT);

        return { x, y, rotation, scale };
    }
}
