import { Behavior } from './Behavior';
import { Vector2 } from '../Vector2';

/**
 * Moves the object at a constant speed in a fixed direction, beat-aligned.
 *
 * Speed is expressed in **pixels per beat** so the visual feel scales
 * consistently with BPM — the same rule as BombBehavior's `growthBeats`.
 *
 * @param speed        Movement speed in px/beat.
 * @param directionDeg Direction of travel in degrees (0 = right, 90 = down).
 * @param bpm          BPM of the song — converts px/beat → px/s.
 * @param spawnTime    Audio timestamp (seconds) when the object was spawned.
 */
export class LinearMoveBehavior extends Behavior {
    constructor(
        private speed: number,
        private directionDeg: number = 0,
        private bpm: number = 120,
        private spawnTime: number = 0,
    ) { super(); }

    tick(dt: number): void {
        const effectiveBpm = this.bpm > 0 ? this.bpm : 120;
        const pxPerSec = this.speed * effectiveBpm / 60;
        const rad = (this.directionDeg * Math.PI) / 180;
        const p = this.object.position;
        this.object.position = new Vector2(
            p.x + Math.cos(rad) * pxPerSec * dt,
            p.y + Math.sin(rad) * pxPerSec * dt,
        );
    }
}
