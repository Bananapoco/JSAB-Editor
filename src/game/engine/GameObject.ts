import { Transform } from './Transform';
import { Vector2 } from './Vector2';
import { Collider } from './colliders/Collider';

// Forward-declared interface to avoid circular imports with Behavior
export interface IBehavior {
    enabled: boolean;
    attach(obj: GameObject): void;
    tick(dt: number, currentTime: number, playerPos?: Vector2): void;
}

export abstract class GameObject {
    public transform: Transform;
    public behaviors: IBehavior[] = [];
    public collider?: Collider;
    public active = true;
    public isTelegraph = false; // true during the pre-spawn warning flash
    readonly id: string = Math.random().toString(36).slice(2, 9);

    constructor(
        position: Vector2 = Vector2.zero(),
        rotation = 0,
        scale = 1,
    ) {
        this.transform = new Transform(position, rotation, scale);
    }

    addBehavior(b: IBehavior): this {
        b.attach(this);
        this.behaviors.push(b);
        return this;
    }

    tick(dt: number, currentTime: number, playerPos?: Vector2): void {
        for (const b of this.behaviors) {
            if (b.enabled) b.tick(dt, currentTime, playerPos);
        }
    }

    abstract draw(ctx: CanvasRenderingContext2D): void;

    get position(): Vector2 { return this.transform.position; }
    set position(v: Vector2) { this.transform.position = v; }
    get rotation(): number { return this.transform.rotation; }
    set rotation(r: number) { this.transform.rotation = r; }
    get scale(): number { return this.transform.scale; }
    set scale(s: number) { this.transform.scale = s; }
}
