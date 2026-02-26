import { Vector2 } from '../Vector2';

// ---------------------------------------------------------------------------
// Base
// ---------------------------------------------------------------------------

export abstract class Collider {
    abstract intersects(selfPos: Vector2, other: Collider, otherPos: Vector2): boolean;
}

// ---------------------------------------------------------------------------
// Circle collider
// ---------------------------------------------------------------------------

export class CircleCollider extends Collider {
    constructor(public radius: number, public offset: Vector2 = Vector2.zero()) {
        super();
    }

    intersects(selfPos: Vector2, other: Collider, otherPos: Vector2): boolean {
        const a = selfPos.add(this.offset);
        if (other instanceof CircleCollider) {
            return a.distanceTo(otherPos.add(other.offset)) < this.radius + other.radius;
        }
        if (other instanceof AABBCollider) {
            return other.intersects(otherPos, this, selfPos);
        }
        return false;
    }
}

// ---------------------------------------------------------------------------
// Axis-Aligned Bounding Box collider
// ---------------------------------------------------------------------------

export class AABBCollider extends Collider {
    constructor(
        public halfW: number,
        public halfH: number,
        public offset: Vector2 = Vector2.zero(),
    ) {
        super();
    }

    intersects(selfPos: Vector2, other: Collider, otherPos: Vector2): boolean {
        const a = selfPos.add(this.offset);
        if (other instanceof CircleCollider) {
            const b = otherPos.add(other.offset);
            const cx = Math.max(a.x - this.halfW, Math.min(b.x, a.x + this.halfW));
            const cy = Math.max(a.y - this.halfH, Math.min(b.y, a.y + this.halfH));
            const dx = b.x - cx;
            const dy = b.y - cy;
            return dx * dx + dy * dy < other.radius * other.radius;
        }
        if (other instanceof AABBCollider) {
            const b = otherPos.add(other.offset);
            return (
                Math.abs(a.x - b.x) < this.halfW + other.halfW &&
                Math.abs(a.y - b.y) < this.halfH + other.halfH
            );
        }
        return false;
    }
}

// ---------------------------------------------------------------------------
// Utility: check two colliders at their object positions
// ---------------------------------------------------------------------------

export function collidersOverlap(
    a: Collider, aPos: Vector2,
    b: Collider, bPos: Vector2,
): boolean {
    return a.intersects(aPos, b, bPos);
}
