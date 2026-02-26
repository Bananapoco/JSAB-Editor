import { Behavior } from './Behavior';

/** Continuously rotates the object at a fixed angular speed (rad/s). */
export class RotateBehavior extends Behavior {
    constructor(private speed: number = Math.PI) { super(); }

    tick(dt: number): void {
        this.object.rotation += this.speed * dt;
    }
}
