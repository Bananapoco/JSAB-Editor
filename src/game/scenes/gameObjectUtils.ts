import { LevelData, LevelEvent } from '../types';
import { CompositeObject } from '../engine/CompositeObject';
import { ObjectFactory } from '../engine/ObjectFactory';
import { Vector2 } from '../engine/Vector2';
import { CircleShape } from '../engine/shapes/CircleShape';
import { DieAfterBehavior } from '../engine/behaviors/DieAfterBehavior';
import { ExplosionData } from '../engine/behaviors/BombBehavior';

export function buildEventObjectFromEvent(
  levelData: LevelData,
  event: LevelEvent,
  alpha: number,
): CompositeObject | null {
  const color = levelData.theme.enemyColor || '#FF0099';

  const hasVisibleDef = event.objectDef
    && (event.objectDef.shape || (event.objectDef.children && event.objectDef.children.length > 0));

  let obj: CompositeObject;

  if (hasVisibleDef) {
    obj = ObjectFactory.fromDef({
      ...event.objectDef!,
      spawnTime: event.timestamp,
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
    );

    if (event.objectDef?.behaviors) {
      for (const behaviorDef of event.objectDef.behaviors) {
        obj.addBehavior(ObjectFactory.buildBehavior(behaviorDef));
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
  const particleSize = 15;
  const particleLifetime = 1.5;

  for (let i = 0; i < explosion.particleCount; i++) {
    const angle = (i / explosion.particleCount) * Math.PI * 2;
    const vx = Math.cos(angle) * explosion.particleSpeed;
    const vy = Math.sin(angle) * explosion.particleSpeed;

    const particle = new CompositeObject(
      new Vector2(explosion.position.x, explosion.position.y),
      0,
      0.5,
    );

    particle.addShape(new CircleShape(particleSize, {
      fillColor: color,
      glowColor: color,
      glowRadius: 8,
      alpha: 1,
    }));

    particle.addBehavior(ObjectFactory.buildBehavior({
      kind: 'linearMove',
      velocityX: vx,
      velocityY: vy,
    }));
    particle.addBehavior(new DieAfterBehavior(particleLifetime));
    particle.addBehavior(ObjectFactory.buildBehavior({
      kind: 'rotate',
      speed: Math.PI * 2 * (Math.random() - 0.5),
    }));

    particle.collider = undefined;
    hazards.push(particle);
  }
}
