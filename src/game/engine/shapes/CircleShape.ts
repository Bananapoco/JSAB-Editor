import { PrimitiveShape, DrawOptions } from './PrimitiveShape';

export class CircleShape extends PrimitiveShape {
    constructor(public radius: number, options: DrawOptions = {}) {
        super(options);
    }

    drawLocal(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        if (this.options.fillColor) {
            ctx.fillStyle = this.options.fillColor;
            ctx.fill();
        }
        if (this.options.strokeColor) {
            ctx.strokeStyle = this.options.strokeColor;
            ctx.lineWidth = this.options.strokeWidth ?? 2;
            ctx.stroke();
        }
    }
}
