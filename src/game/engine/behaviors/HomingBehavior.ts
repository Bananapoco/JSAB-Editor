import { Behavior } from './Behavior';
import { Vector2 } from '../Vector2';

/**
 * Moves the object toward the player's current position each tick.
 *
 * Speed is expressed in **pixels per beat** so the tracking intensity
 * scales consistently with BPM — the same rule as BombBehavior's `growthBeats`.
 *
 * @param speed     Pursuit speed in px/beat.
 * @param bpm       BPM of the song — converts px/beat → px/s.
 * @param spawnTime Audio timestamp (seconds) when the object was spawned.
 */
export class HomingBehavior extends Behavior {
    constructor(
        private speed: number = 110, // px/beat
        private bpm: number = 120,
        private spawnTime: number = 0,
    ) { super(); }

    tick(dt: number, _currentTime: number, playerPos?: Vector2): void {
        if (!playerPos) return;
        const effectiveBpm = this.bpm > 0 ? this.bpm : 120;
        const pxPerSec = this.speed * effectiveBpm / 60;
        const dir = playerPos.sub(this.object.position).normalize();
        const p = this.object.position;
        this.object.position = new Vector2(
            p.x + dir.x * pxPerSec * dt,
            p.y + dir.y * pxPerSec * dt,
        );
    }
}
