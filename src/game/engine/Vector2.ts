export class Vector2 {
    constructor(public x: number = 0, public y: number = 0) {}

    add(v: Vector2): Vector2 { return new Vector2(this.x + v.x, this.y + v.y); }
    sub(v: Vector2): Vector2 { return new Vector2(this.x - v.x, this.y - v.y); }
    scale(s: number): Vector2 { return new Vector2(this.x * s, this.y * s); }
    dot(v: Vector2): number { return this.x * v.x + this.y * v.y; }
    lengthSq(): number { return this.x * this.x + this.y * this.y; }
    length(): number { return Math.sqrt(this.lengthSq()); }

    normalize(): Vector2 {
        const len = this.length();
        return len > 0 ? this.scale(1 / len) : new Vector2(0, 0);
    }

    rotate(angle: number): Vector2 {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(this.x * cos - this.y * sin, this.x * sin + this.y * cos);
    }

    distanceTo(v: Vector2): number { return this.sub(v).length(); }
    clone(): Vector2 { return new Vector2(this.x, this.y); }

    static zero(): Vector2 { return new Vector2(0, 0); }

    static fromAngle(angle: number, length = 1): Vector2 {
        return new Vector2(Math.cos(angle) * length, Math.sin(angle) * length);
    }

    /** Mutate in place — avoids allocation in hot paths */
    setXY(x: number, y: number): this { this.x = x; this.y = y; return this; }
    copyFrom(v: Vector2): this { this.x = v.x; this.y = v.y; return this; }
}
