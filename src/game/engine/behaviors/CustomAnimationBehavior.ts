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
}

function cubicBezier(p0: number, p1: number, p2: number, p3: number, t: number): number {
    const u = 1 - t;
    return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/**
 * Drives an object along a user-defined keyframe path with optional
 * cubic-bezier curve handles between keyframes.
 */
export class CustomAnimationBehavior extends Behavior {
    private keyframes: CustomAnimKeyframe[];
    private handles: CustomAnimSegmentHandle[];
    private elapsed = 0;
    private totalDuration: number;
    private originX = 0;
    private originY = 0;
    private started = false;

    constructor(
        keyframes: CustomAnimKeyframe[],
        handles: CustomAnimSegmentHandle[],
        totalDuration: number,
    ) {
        super();
        // Sort by time just in case
        this.keyframes = [...keyframes].sort((a, b) => a.t - b.t);
        this.handles = handles;
        this.totalDuration = totalDuration > 0 ? totalDuration : 1;
    }

    tick(dt: number, _currentTime: number, _playerPos?: Vector2): void {
        if (!this.object || this.keyframes.length === 0) return;

        if (!this.started) {
            this.originX = this.object.transform.position.x;
            this.originY = this.object.transform.position.y;
            this.started = true;
        }

        this.elapsed += dt;
        const progress = Math.min(this.elapsed / this.totalDuration, 1);

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
        const localT = segmentDuration > 0 ? (progress - a.t) / segmentDuration : 0;

        const handle = this.handles[i];

        let x: number, y: number;
        if (handle && handle.enabled) {
            x = cubicBezier(a.x, a.x + handle.cp1x, b.x + handle.cp2x, b.x, localT);
            y = cubicBezier(a.y, a.y + handle.cp1y, b.y + handle.cp2y, b.y, localT);
        } else {
            x = lerp(a.x, b.x, localT);
            y = lerp(a.y, b.y, localT);
        }

        const rotation = lerp(a.rotation, b.rotation, localT);
        const scale = lerp(a.scale, b.scale, localT);

        return { x, y, rotation, scale };
    }
}
