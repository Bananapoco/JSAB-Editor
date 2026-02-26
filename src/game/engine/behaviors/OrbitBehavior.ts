import { Behavior } from './Behavior';
import { Vector2 } from '../Vector2';

/** Moves the object in a circle around a fixed world-space center. */
export class OrbitBehavior extends Behavior {
    private angle: number;

    constructor(
        private center: Vector2,
        private radius: number,
        private angularSpeed: number = Math.PI, // rad/s
        initialAngle = 0,
    ) {
        super();
        this.angle = initialAngle;
    }

    tick(dt: number): void {
        this.angle += this.angularSpeed * dt;
        this.object.position = new Vector2(
            this.center.x + Math.cos(this.angle) * this.radius,
            this.center.y + Math.sin(this.angle) * this.radius,
        );
    }
}
