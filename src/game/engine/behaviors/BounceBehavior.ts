import { Behavior } from './Behavior';
import { Vector2 } from '../Vector2';

/** Bounces the object off the world boundary (0,0)–(maxX, maxY). */
export class BounceBehavior extends Behavior {
    private velocity: Vector2;

    constructor(
        vx: number,
        vy: number,
        private maxX = 1024,
        private maxY = 768,
        private radius = 20,
    ) {
        super();
        this.velocity = new Vector2(vx, vy);
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
