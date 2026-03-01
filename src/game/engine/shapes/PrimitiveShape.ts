export interface DrawOptions {
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    glowColor?: string;
    glowRadius?: number;
    alpha?: number;
}

export abstract class PrimitiveShape {
    constructor(public options: DrawOptions = {}) {
        this.options = {
            fillColor: '#FF0099',
            glowColor: '#FF0099',
            glowRadius: 15,
            strokeWidth: 2,
            alpha: 1,
            ...options,
        };
    }

    protected applyStyle(ctx: CanvasRenderingContext2D): void {
        ctx.globalAlpha = this.options.alpha ?? 1;
        if (this.options.glowColor && this.options.glowRadius) {
            ctx.shadowColor = this.options.glowColor;
            ctx.shadowBlur = this.options.glowRadius;
        }
    }

    /** Create a deep copy of this shape. */
    abstract clone(): PrimitiveShape;

    /** Draw the shape at the local origin. Override in subclasses. */
    abstract drawLocal(ctx: CanvasRenderingContext2D): void;

    /** Called with any parent transform already applied. */
    draw(ctx: CanvasRenderingContext2D): void {
        ctx.save();
        this.applyStyle(ctx);
        this.drawLocal(ctx);
        ctx.restore();
    }
}
