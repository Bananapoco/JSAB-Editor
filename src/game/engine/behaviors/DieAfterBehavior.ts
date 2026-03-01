import { Behavior } from './Behavior';

/**
 * Deactivates the object after `lifetime` seconds.
 *
 * Uses `currentTime - spawnTime` (absolute audio time) instead of accumulating
 * dt, so the lifetime boundary is drift-free and beat-accurate.
 *
 * @param lifetime   How long the object lives in seconds after it spawns.
 * @param spawnTime  Audio timestamp (seconds) when the object was spawned.
 */
export class DieAfterBehavior extends Behavior {
    constructor(
        private lifetime: number,
        private spawnTime = 0,
    ) { super(); }

    tick(dt: number, currentTime: number): void {
        if (currentTime - this.spawnTime >= this.lifetime) {
            this.object.active = false;
        }
    }
}
