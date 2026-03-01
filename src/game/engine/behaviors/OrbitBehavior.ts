import { Behavior } from './Behavior';
import { Vector2 } from '../Vector2';

/**
 * Moves the object in a circle around a fixed world-space center.
 *
 * The current angle is derived from absolute audio time (`currentTime - spawnTime`)
 * rather than accumulated dt, so the orbit stays perfectly on the beat grid
 * without drift.
 *
 * @param center        World-space orbit centre.
 * @param radius        Orbit radius in px.
 * @param angularSpeed  Angular speed in rad/s (default π rad/s ≈ one revolution per 2 s).
 * @param initialAngle  Starting angle in radians.
 * @param bpm           BPM of the song — reserved for beat-aligned speed expressions.
 * @param spawnTime     Audio timestamp (seconds) when the object was spawned.
 */
export class OrbitBehavior extends Behavior {
    constructor(
        private center: Vector2,
        private radius: number,
        private angularSpeed: number = Math.PI, // rad/s
        private initialAngle = 0,
        private bpm = 120,
        private spawnTime = 0,
    ) {
        super();
    }

    tick(dt: number, currentTime: number): void {
        // Derive angle from absolute audio time so there is no accumulated dt drift.
        const elapsed = currentTime - this.spawnTime;
        const angle = this.initialAngle + this.angularSpeed * elapsed;

        this.object.position = new Vector2(
            this.center.x + Math.cos(angle) * this.radius,
            this.center.y + Math.sin(angle) * this.radius,
        );
    }
}
