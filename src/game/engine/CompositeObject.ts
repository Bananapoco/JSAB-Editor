import { GameObject } from './GameObject';
import { PrimitiveShape } from './shapes/PrimitiveShape';
import { Vector2 } from './Vector2';

interface ShapeEntry {
    shape: PrimitiveShape;
    dx: number;
    dy: number;
    rot: number;    // radians
    scale: number;
}

/**
 * A game object composed of one or more PrimitiveShapes and/or nested
 * CompositeObjects. The parent transform (position / rotation / scale) is
 * pushed onto the canvas stack before children are drawn, so every child
 * coordinate is expressed in the parent's local space.
 */
export class CompositeObject extends GameObject {
    private shapes: ShapeEntry[] = [];
    private children: CompositeObject[] = [];

    /**
     * Add a primitive shape drawn at an optional local offset/rotation/scale.
     */
    addShape(
        shape: PrimitiveShape,
        dx = 0,
        dy = 0,
        rot = 0,
        scale = 1,
    ): this {
        this.shapes.push({ shape, dx, dy, rot, scale });
        return this;
    }

    /**
     * Add a nested CompositeObject as a child. The child's own
     * transform.position is in the parent's local space.
     */
    addChild(child: CompositeObject): this {
        this.children.push(child);
        return this;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (!this.active) return;

        ctx.save();
        this.transform.apply(ctx);

        for (const { shape, dx, dy, rot, scale } of this.shapes) {
            ctx.save();
            ctx.translate(dx, dy);
            ctx.rotate(rot);
            ctx.scale(scale, scale);
            shape.draw(ctx);
            ctx.restore();
        }

        for (const child of this.children) {
            child.draw(ctx);
        }

        ctx.restore();
    }

    tick(dt: number, currentTime: number, playerPos?: Vector2): void {
        super.tick(dt, currentTime, playerPos);
        for (const child of this.children) {
            child.tick(dt, currentTime, playerPos);
        }
    }

    /** Recursively set alpha on all shapes (used for telegraph dimming). */
    setAlpha(alpha: number): this {
        for (const { shape } of this.shapes) {
            shape.options.alpha = alpha;
        }
        for (const child of this.children) {
            child.setAlpha(alpha);
        }
        return this;
    }

    /** Recursively set fill/glow color (used for theme coloring). */
    setColor(fillColor: string, glowColor?: string): this {
        for (const { shape } of this.shapes) {
            shape.options.fillColor = fillColor;
            if (glowColor) shape.options.glowColor = glowColor;
        }
        for (const child of this.children) {
            child.setColor(fillColor, glowColor);
        }
        return this;
    }
}
