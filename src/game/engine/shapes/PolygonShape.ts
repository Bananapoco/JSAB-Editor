import { PrimitiveShape, DrawOptions } from './PrimitiveShape';
import { Vector2 } from '../Vector2';

export class PolygonShape extends PrimitiveShape {
    constructor(public points: Vector2[], options: DrawOptions = {}) {
        super(options);
    }

    /** Create a regular n-sided polygon inscribed in a circle of `radius`. */
    static regular(sides: number, radius: number, options: DrawOptions = {}): PolygonShape {
        const pts: Vector2[] = [];
        for (let i = 0; i < sides; i++) {
            const a = (Math.PI * 2 * i) / sides - Math.PI / 2;
            pts.push(new Vector2(Math.cos(a) * radius, Math.sin(a) * radius));
        }
        return new PolygonShape(pts, options);
    }

    clone(): PolygonShape {
        return new PolygonShape(
            this.points.map(p => new Vector2(p.x, p.y)),
            { ...this.options },
        );
    }

    drawLocal(ctx: CanvasRenderingContext2D): void {
        if (this.points.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();
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
