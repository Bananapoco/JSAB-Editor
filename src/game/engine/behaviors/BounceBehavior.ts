import { Behavior } from './Behavior';
import { Vector2 } from '../Vector2';

/**
 * Bounces the object off the world boundary (0,0)–(maxX, maxY).
 *
 * Speed is expressed in **pixels per beat** so the visual feel scales
 * consistently with BPM — the same rule as BombBehavior's `growthBeats`.
 * The direction (and therefore the initial velocity components) is computed
 * once at construction time from `speed` and `directionDeg`.
 *
 * @param speed        Movement speed in px/beat.
 * @param directionDeg Initial direction in degrees (0 = right, 90 = down).
 * @param maxX         Right boundary in game units (default 1366).
 * @param maxY         Bottom boundary in game units (default 768).
 * @param radius       Object radius used for wall collision (default 20).
 * @param bpm          BPM of the song — converts px/beat → px/s.
 * @param spawnTime    Audio timestamp (seconds) when the object was spawned.
 */
export class BounceBehavior extends Behavior {
    private velocity: Vector2;

    constructor(
        speed: number,
        directionDeg: number = 45,
        private maxX = 1366,
        private maxY = 768,
        private radius = 20,
        private bpm = 120,
        private spawnTime = 0,
    ) {
        super();
        const effectiveBpm = this.bpm > 0 ? this.bpm : 120;
        const pxPerSec = speed * effectiveBpm / 60;
        const rad = (directionDeg * Math.PI) / 180;
        this.velocity = new Vector2(Math.cos(rad) * pxPerSec, Math.sin(rad) * pxPerSec);
    }

    tick(dt: number): void {
        const p = this.object.position;
        let nx = p.x + this.velocity.x * dt;
        let ny = p.y + this.velocity.y * dt;

        if (nx - this.radius < 0) { nx = this.radius; this.velocity.x = Math.abs(this.velocity.x); }
        else if (nx + this.radius > this.maxX) { nx = this.maxX - this.radius; this.velocity.x = -Math.abs(this.velocity.x); }

        if (ny - this.radius < 0) { ny = this.radius; this.velocity.y = Math.abs(this.velocity.y); }
        else if (ny + this.radius > this.maxY) { ny = this.maxY - this.radius; this.velocity.y = -Math.abs(this.velocity.y); }

        this.object.position = new Vector2(nx, ny);
    }
}
