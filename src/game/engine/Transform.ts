import { Vector2 } from './Vector2';

export class Transform {
    constructor(
        public position: Vector2 = Vector2.zero(),
        public rotation: number = 0,   // radians
        public scale: number = 1,
    ) {}

    clone(): Transform {
        return new Transform(this.position.clone(), this.rotation, this.scale);
    }

    /** Push this transform onto the canvas context matrix stack. */
    apply(ctx: CanvasRenderingContext2D): void {
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
    }
}
