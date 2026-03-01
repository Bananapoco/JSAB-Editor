import { LevelData, LevelEvent } from '../types';
import { CompositeObject } from '../engine/CompositeObject';
import { ObjectFactory } from '../engine/ObjectFactory';
import { Vector2 } from '../engine/Vector2';
import { CircleShape } from '../engine/shapes/CircleShape';
import { DieAfterBehavior } from '../engine/behaviors/DieAfterBehavior';
import { ExplosionData } from '../engine/behaviors/BombBehavior';
import { LinearMoveBehavior } from '../engine/behaviors/LinearMoveBehavior';

export function buildEventObjectFromEvent(
  levelData: LevelData,
  event: LevelEvent,
  alpha: number,
): CompositeObject | null {
  const color = levelData.theme.enemyColor || '#FF0099';

  const bpm = levelData.metadata.bpm ?? 120;

  const hasVisibleDef = event.objectDef
    && (event.objectDef.shape || (event.objectDef.children && event.objectDef.children.length > 0));

  let obj: CompositeObject;

  if (hasVisibleDef) {
    obj = ObjectFactory.fromDef({
      ...event.objectDef!,
      spawnTime: event.timestamp,
      bpm,
    });
  } else {
    const size = event.size ?? (event.objectDef?.scale ? event.objectDef.scale * 30 : 30);
    const dur = event.duration ?? 6;
    obj = ObjectFactory.fromLegacyEvent(
      event.type,
      event.objectDef?.x ?? event.x,
      event.objectDef?.y ?? event.y,
      size,
      event.rotation ?? 0,
      dur,
      event.behavior ?? 'static',
      color,
      bpm,
      event.timestamp,
    );

    if (event.objectDef?.behaviors) {
      for (const behaviorDef of event.objectDef.behaviors) {
        obj.addBehavior(ObjectFactory.buildBehavior({ ...behaviorDef, bpm, spawnTime: event.timestamp }));
      }
    }
  }

  obj.setAlpha(alpha);
  obj.isTelegraph = alpha < 1;
  return obj;
}

export function spawnExplosionParticlesForBomb(
  levelData: LevelData | null,
  hazards: CompositeObject[],
  explosion: ExplosionData,
) {
  const color = levelData?.theme.enemyColor || '#FF0099';
  const projectileScale = 0.35; // projectiles are smaller copies of the parent shape

  for (let i = 0; i < explosion.particleCount; i++) {
    // Evenly space directions: 0 = up (north), then clockwise
    const angle = (i / explosion.particleCount) * Math.PI * 2 - Math.PI / 2;
    const vx = Math.cos(angle) * explosion.particleSpeed;
    const vy = Math.sin(angle) * explosion.particleSpeed;

    const projectile = new CompositeObject(
      new Vector2(explosion.position.x, explosion.position.y),
      0,
      projectileScale,
    );

    // Clone the parent's shapes so the projectile looks the same (works for custom shapes too)
    if (explosion.shapeEntries && explosion.shapeEntries.length > 0) {
      for (const entry of explosion.shapeEntries) {
        projectile.addShape(
          entry.shape.clone(),
          entry.dx,
          entry.dy,
          entry.rot,
          entry.scale,
        );
      }
    } else {
      // Fallback: simple circle if no shape data was captured
      projectile.addShape(new CircleShape(15, {
        fillColor: color,
        glowColor: color,
        glowRadius: 8,
        alpha: 1,
      }));
    }

    projectile.addBehavior(new LinearMoveBehavior(new Vector2(vx, vy)));

    // No collider on projectiles — they're purely visual hazards that use
    // the pruneInactive off-screen check to be cleaned up automatically.
    projectile.collider = undefined;
    hazards.push(projectile);
  }
}
