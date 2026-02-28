import { CompositeObject } from './CompositeObject';
import { CircleShape } from './shapes/CircleShape';
import { RectShape } from './shapes/RectShape';
import { PolygonShape } from './shapes/PolygonShape';
import { DrawOptions } from './shapes/PrimitiveShape';
import { Vector2 } from './Vector2';
import { Behavior } from './behaviors/Behavior';
import { RotateBehavior } from './behaviors/RotateBehavior';
import { PulseBehavior } from './behaviors/PulseBehavior';
import { OrbitBehavior } from './behaviors/OrbitBehavior';
import { LinearMoveBehavior } from './behaviors/LinearMoveBehavior';
import { HomingBehavior } from './behaviors/HomingBehavior';
import { DieAfterBehavior } from './behaviors/DieAfterBehavior';
import { BounceBehavior } from './behaviors/BounceBehavior';
import { CircleCollider, AABBCollider } from './colliders/Collider';

// ---------------------------------------------------------------------------
// JSON schema types
// ---------------------------------------------------------------------------

export interface ShapeDef {
    kind: 'circle' | 'rect' | 'polygon';
    radius?: number;
    width?: number;
    height?: number;
    /** Number of sides for a regular polygon. */
    sides?: number;
    /** Custom polygon points as [x, y] pairs (for kind='polygon' without sides). */
    points?: [number, number][];
    fillColor?: string;
    strokeColor?: string;
    strokeWidth?: number;
    glowColor?: string;
    glowRadius?: number;
    alpha?: number;
}

export interface ChildDef {
    shape?: ShapeDef;
    children?: ChildDef[];
    offsetX?: number;
    offsetY?: number;
    /** Local rotation in degrees. */
    localRotation?: number;
    localScale?: number;
}

export type BehaviorKind =
    | 'rotate'
    | 'pulse'
    | 'orbit'
    | 'linearMove'
    | 'homing'
    | 'dieAfter'
    | 'bounce'
    | 'spinning'; // alias for rotate, kept for AI back-compat

export interface BehaviorDef {
    kind: BehaviorKind;
    /** rotate / spinning: rad/s (default π ≈ 180°/s) */
    speed?: number;
    /** pulse: min scale */
    minScale?: number;
    /** pulse: max scale */
    maxScale?: number;
    /** pulse: period in seconds */
    period?: number;
    /** orbit: world-space center X */
    centerX?: number;
    /** orbit: world-space center Y */
    centerY?: number;
    /** orbit / bounce: radius or bounding radius */
    radius?: number;
    /** orbit: angular speed in rad/s */
    angularSpeed?: number;
    /** orbit: starting angle in radians */
    initialAngle?: number;
    /** linearMove: X velocity in px/s */
    velocityX?: number;
    /** linearMove: Y velocity in px/s */
    velocityY?: number;
    /** homing: pursuit speed in px/s */
    homingSpeed?: number;
    /** dieAfter: lifetime in seconds */
    lifetime?: number;
    /** bounce: X velocity in px/s */
    vx?: number;
    /** bounce: Y velocity in px/s */
    vy?: number;
}

export interface ObjectDef {
    x: number;
    y: number;
    /** Rotation in degrees. */
    rotation?: number;
    scale?: number;
    /** A single top-level primitive shape (if no children). */
    shape?: ShapeDef;
    /** Nested child shapes / groups. */
    children?: ChildDef[];
    behaviors?: BehaviorDef[];
    /** Audio time (seconds) when this object spawns. */
    spawnTime: number;
    /** Audio time (seconds) when it is forcibly removed. */
    despawnTime?: number;
    /** Optional collider radius override (default derived from shape). */
    colliderRadius?: number;
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export class ObjectFactory {
    // -----------------------------------------------------------------------
    // Shape builders
    // -----------------------------------------------------------------------

    static buildShape(def: ShapeDef): CircleShape | RectShape | PolygonShape {
        const opts: DrawOptions = {
            fillColor: def.fillColor ?? '#FF0099',
            strokeColor: def.strokeColor,
            strokeWidth: def.strokeWidth ?? 2,
            glowColor: def.glowColor ?? def.fillColor ?? '#FF0099',
            glowRadius: def.glowRadius ?? 15,
            alpha: def.alpha ?? 1,
        };

        switch (def.kind) {
            case 'circle':
                return new CircleShape(def.radius ?? 20, opts);
            case 'rect':
                return new RectShape(def.width ?? 40, def.height ?? 40, opts);
            case 'polygon': {
                if (def.sides && def.sides >= 3) {
                    return PolygonShape.regular(def.sides, def.radius ?? 20, opts);
                }
                const pts = (def.points ?? []).map(([px, py]) => new Vector2(px, py));
                return new PolygonShape(pts, opts);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Children builders (recursive)
    // -----------------------------------------------------------------------

    static buildChildren(defs: ChildDef[], target: CompositeObject): void {
        for (const child of defs) {
            const dx = child.offsetX ?? 0;
            const dy = child.offsetY ?? 0;
            const rot = ((child.localRotation ?? 0) * Math.PI) / 180;
            const scale = child.localScale ?? 1;

            if (child.shape) {
                target.addShape(ObjectFactory.buildShape(child.shape), dx, dy, rot, scale);
            }

            if (child.children && child.children.length > 0) {
                const nested = new CompositeObject(new Vector2(dx, dy), rot, scale);
                ObjectFactory.buildChildren(child.children, nested);
                target.addChild(nested);
            }
        }
    }

    // -----------------------------------------------------------------------
    // Behavior builders
    // -----------------------------------------------------------------------

    static buildBehavior(def: BehaviorDef): Behavior {
        switch (def.kind) {
            case 'rotate':
            case 'spinning':
                return new RotateBehavior(def.speed ?? Math.PI);
            case 'pulse':
                return new PulseBehavior(def.minScale ?? 0.8, def.maxScale ?? 1.2, def.period ?? 1.0);
            case 'orbit':
                return new OrbitBehavior(
                    new Vector2(def.centerX ?? 512, def.centerY ?? 384),
                    def.radius ?? 100,
                    def.angularSpeed ?? Math.PI,
                    def.initialAngle ?? 0,
                );
            case 'linearMove':
                return new LinearMoveBehavior(new Vector2(def.velocityX ?? 0, def.velocityY ?? 0));
            case 'homing':
                return new HomingBehavior(def.homingSpeed ?? 200);
            case 'dieAfter':
                return new DieAfterBehavior(def.lifetime ?? 5);
            case 'bounce':
                return new BounceBehavior(def.vx ?? 150, def.vy ?? 150, 1024, 768, def.radius ?? 20);
        }
    }

    // -----------------------------------------------------------------------
    // Top-level builder
    // -----------------------------------------------------------------------

    static fromDef(def: ObjectDef): CompositeObject {
        const obj = new CompositeObject(
            new Vector2(def.x, def.y),
            ((def.rotation ?? 0) * Math.PI) / 180,
            def.scale ?? 1,
        );

        if (def.shape) {
            obj.addShape(ObjectFactory.buildShape(def.shape));
        }

        if (def.children) {
            ObjectFactory.buildChildren(def.children, obj);
        }

        if (def.behaviors) {
            for (const b of def.behaviors) {
                obj.addBehavior(ObjectFactory.buildBehavior(b));
            }
        }

        // Auto-attach a DieAfterBehavior when despawnTime is known
        if (def.despawnTime != null) {
            const lifetime = def.despawnTime - def.spawnTime;
            if (lifetime > 0) obj.addBehavior(new DieAfterBehavior(lifetime));
        }

        // Attach collider
        const r = def.colliderRadius;
        if (r != null) {
            obj.collider = new CircleCollider(r);
        } else if (def.shape) {
            obj.collider = ObjectFactory.defaultCollider(def.shape);
        }

        return obj;
    }

    /** Derive a sensible collider from a ShapeDef when none is explicit. */
    static defaultCollider(shape: ShapeDef): CircleCollider | AABBCollider {
        if (shape.kind === 'circle') return new CircleCollider(shape.radius ?? 20);
        if (shape.kind === 'rect') return new AABBCollider((shape.width ?? 40) / 2, (shape.height ?? 40) / 2);
        // polygon → approximate with circle
        return new CircleCollider(shape.radius ?? 20);
    }

    // -----------------------------------------------------------------------
    // Convenience: build from the legacy LevelEvent format
    // -----------------------------------------------------------------------

    static fromLegacyEvent(
        eventType: string,
        x: number,
        y: number,
        size: number,
        rotation: number,
        duration: number,
        behavior: string,
        enemyColor: string,
    ): CompositeObject {
        // Choose a shape based on event type
        const isProjectile = eventType === 'projectile_throw';
        const shapeDef: ShapeDef = isProjectile
            ? { kind: 'circle', radius: size / 2, fillColor: enemyColor, glowColor: enemyColor, glowRadius: 12 }
            : { kind: 'rect', width: size, height: size, fillColor: enemyColor, glowColor: enemyColor, glowRadius: 18 };

        const behaviors: BehaviorDef[] = [];
        if (duration > 0) behaviors.push({ kind: 'dieAfter', lifetime: duration });

        switch (behavior) {
            case 'spinning':
                behaviors.push({ kind: 'rotate', speed: Math.PI });
                break;
            case 'homing':
                behaviors.push({ kind: 'homing', homingSpeed: 220 });
                break;
            case 'bouncing':
                behaviors.push({ kind: 'bounce', vx: 160, vy: 140, radius: size / 2 });
                break;
            case 'sweep':
                behaviors.push({ kind: 'linearMove', velocityX: 220, velocityY: 0 });
                break;
            case 'static':
            default:
                break;
        }

        return ObjectFactory.fromDef({
            x, y,
            rotation,
            shape: shapeDef,
            behaviors,
            spawnTime: 0,
            despawnTime: duration > 0 ? duration : undefined,
        });
    }
}
