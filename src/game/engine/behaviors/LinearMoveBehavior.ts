import { Behavior } from './Behavior';
import { Vector2 } from '../Vector2';

/** Moves the object at a constant velocity (px/s in each axis). */
export class LinearMoveBehavior extends Behavior {
    constructor(private velocity: Vector2) { super(); }

    tick(dt: number): void {
        const p = this.object.position;
        this.object.position = new Vector2(
            p.x + this.velocity.x * dt,
            p.y + this.velocity.y * dt,
        );
    }
}
