import { Behavior } from './Behavior';
import { Vector2 } from '../Vector2';

/**
 * Explosion data stored on the object when a bomb explodes.
 */
export interface ExplosionData {
    position: Vector2;
    particleCount: number;
    particleSpeed: number;
    parentScale: number;
}

/**
 * BombBehavior: Grows an object slowly, then explodes into particles.
 * 
 * Lifecycle:
 * 1. Growth phase: Scale from initialScale to maxScale over growthDuration
 * 2. Explosion: Mark object with explosion data, then die
 * 
 * The Game scene should check for (object as any).explosionData and spawn particles.
 */
export class BombBehavior extends Behavior {
    private elapsed = 0;
    private hasExploded = false;
    
    /**
     * @param growthDuration How long (seconds) the shape grows before exploding
     * @param initialScale Starting scale (default 0.1)
     * @param maxScale Maximum scale at peak growth (default 1.5)
     * @param particleCount Number of particles to spawn on explosion
     * @param particleSpeed Base speed of particles (px/s)
     */
    constructor(
        private growthDuration = 2.0,
        private initialScale = 0.1,
        private maxScale = 1.5,
        private particleCount = 12,
        private particleSpeed = 300,
    ) {
        super();
    }

    tick(dt: number, currentTime: number, playerPos?: Vector2): void {
        this.elapsed += dt;

        if (this.elapsed < this.growthDuration) {
            // Growth phase: ease-out interpolation for smooth scaling
            const t = this.elapsed / this.growthDuration;
            const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
            this.object.scale = this.initialScale + (this.maxScale - this.initialScale) * eased;
        } else if (!this.hasExploded) {
            // Explosion phase
            this.hasExploded = true;
            
            // Store explosion data on the object for the Game scene to pick up
            (this.object as any).explosionData = {
                position: this.object.position.clone(),
                particleCount: this.particleCount,
                particleSpeed: this.particleSpeed,
                parentScale: this.object.scale,
            } as ExplosionData;

            // Destroy the parent object
            this.object.active = false;
        }
    }
}
