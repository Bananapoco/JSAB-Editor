import { Behavior } from './Behavior';
import { Vector2 } from '../Vector2';
import { PrimitiveShape } from '../shapes/PrimitiveShape';

/**
 * A snapshot of one shape entry from the parent CompositeObject.
 */
export interface ShapeEntrySnapshot {
    shape: PrimitiveShape;
    dx: number;
    dy: number;
    rot: number;
    scale: number;
}

/**
 * Explosion data stored on the object when a bomb explodes.
 */
export interface ExplosionData {
    position: Vector2;
    particleCount: number;
    particleSpeed: number;
    parentScale: number;
    /** Cloned shapes from the parent so projectiles look the same. */
    shapeEntries: ShapeEntrySnapshot[];
}

/**
 * BombBehavior: Grows an object over a number of beats, then explodes into
 * projectiles on the beat.
 *
 * Lifecycle:
 * 1. Growth phase: Scale from initialScale to maxScale over `growthBeats` beats
 * 2. Explosion: At the next beat boundary, mark object with explosion data, then die
 *
 * @param growthBeats   How many beats the shape grows before exploding (default 4)
 * @param initialScale  Starting scale (default 0.1)
 * @param maxScale      Maximum scale at peak growth (default 1.5)
 * @param particleCount Number of projectiles to spawn on explosion
 * @param bpm           Beats per minute — used to convert beats to seconds
 * @param spawnTime     Audio timestamp (seconds) when the object was spawned
 */
export class BombBehavior extends Behavior {
    private hasExploded = false;
    private growthDurationSec: number;

    /** Default projectile speed (px/s) — fast enough to cross the screen. */
    constructor(
        private growthBeats = 4,
        private initialScale = 0.1,
        private maxScale = 1.5,
        private particleCount = 12,
        private bpm = 120,
        private spawnTime = 0,
        private projectileSpeed = 400,
    ) {
        super();
        const effectiveBpm = this.bpm > 0 ? this.bpm : 120;
        this.growthDurationSec = (this.growthBeats * 60) / effectiveBpm;
    }

    tick(dt: number, currentTime: number, playerPos?: Vector2): void {
        const elapsed = currentTime - this.spawnTime;

        if (elapsed < this.growthDurationSec) {
            // Growth phase: ease-out interpolation for smooth scaling
            const t = elapsed / this.growthDurationSec;
            const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
            this.object.scale = this.initialScale + (this.maxScale - this.initialScale) * eased;
        } else if (!this.hasExploded) {
            // Explosion phase — fires exactly when growth beats have elapsed
            this.hasExploded = true;

            // Clone shape entries from the parent CompositeObject
            const composite = this.object as any;
            const entries: ShapeEntrySnapshot[] = [];
            if (typeof composite.getShapeEntries === 'function') {
                for (const e of composite.getShapeEntries()) {
                    entries.push({
                        shape: e.shape.clone(),
                        dx: e.dx,
                        dy: e.dy,
                        rot: e.rot,
                        scale: e.scale,
                    });
                }
            }

            // Store explosion data on the object for the Game scene to pick up
            (this.object as any).explosionData = {
                position: this.object.position.clone(),
                particleCount: this.particleCount,
                particleSpeed: this.projectileSpeed,
                parentScale: this.object.scale,
                shapeEntries: entries,
            } as ExplosionData;

            // Destroy the parent object
            this.object.active = false;
        }
    }
}
