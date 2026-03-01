import { PrimitiveShape, DrawOptions } from './PrimitiveShape';

export class RectShape extends PrimitiveShape {
    constructor(
        public width: number,
        public height: number,
        options: DrawOptions = {},
    ) {
        super(options);
    }

    clone(): RectShape {
        return new RectShape(this.width, this.height, { ...this.options });
    }

    drawLocal(ctx: CanvasRenderingContext2D): void {
        const hw = this.width / 2;
        const hh = this.height / 2;
        ctx.beginPath();
        ctx.rect(-hw, -hh, this.width, this.height);
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
