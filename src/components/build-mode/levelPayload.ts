import type { ChildDef, ObjectDef } from '../../game/engine/ObjectFactory';
import { LevelData } from '../../game/types';
import { PlacedEvent, ShapeType } from './types';
import {
  buildBehaviorDefsForPlacedEvent,
  getBombDurationSeconds,
  hasBombBehavior,
  pieceTypeToShapeDef,
  shapeTypeToShapeDef,
  stretchShapeDef,
} from './utils';

export interface BuildModePayload {
  levelData: LevelData;
  audioUrl: string;
  imageMappings: Record<string, string>;
}

interface CreateLevelPayloadParams {
  events: PlacedEvent[];
  bossName: string;
  bpm: number;
  audioDuration: number;
  enemyColor: string;
  bgColor: string;
  playerColor: string;
  audioFile: File;
}

export function createLevelPayload({
  events,
  bossName,
  bpm,
  audioDuration,
  enemyColor,
  bgColor,
  playerColor,
  audioFile,
}: CreateLevelPayloadParams): BuildModePayload {
  const levelData: LevelData = {
    metadata: { bossName, bpm, duration: audioDuration },
    theme: { enemyColor, backgroundColor: bgColor, playerColor },
    timeline: events
      .map(({ id, shape, stretchX = 1, stretchY = 1, customShapeDef, bombSettings, pulseSettings, behaviorSettings, customAnimation, behaviorModifiers, ...rest }) => {
        const isBomb = hasBombBehavior(rest.behavior, behaviorModifiers);
        const runtimeTimestamp = isBomb
          ? Math.max(0, rest.timestamp - getBombDurationSeconds(bpm, bombSettings))
          : rest.timestamp;

        if (rest.type === 'screen_shake') {
          return {
            ...rest,
            timestamp: runtimeTimestamp,
          };
        }

        const size = rest.size ?? 40;
        const behaviors = buildBehaviorDefsForPlacedEvent(
          rest.type,
          rest.behavior,
          size,
          rest.duration,
          bombSettings,
          behaviorSettings,
          customAnimation,
          behaviorModifiers,
          pulseSettings,
        );

        if (customShapeDef) {
          const sx = Math.max(0.2, Math.abs(stretchX));
          const sy = Math.max(0.2, Math.abs(stretchY));
          const children: ChildDef[] = customShapeDef.pieces.map(piece => ({
            offsetX: piece.x * sx,
            offsetY: piece.y * sy,
            localRotation: piece.rotation,
            shape: stretchShapeDef(
              pieceTypeToShapeDef(piece.type, piece.size, piece.color || enemyColor),
              sx,
              sy,
            ),
          }));

          const objectDef: ObjectDef = {
            x: rest.x,
            y: rest.y,
            rotation: rest.rotation,
            children,
            spawnTime: runtimeTimestamp,
            colliderRadius: customShapeDef.colliderRadius * Math.max(sx, sy),
            behaviors,
          };

          return {
            ...rest,
            timestamp: runtimeTimestamp,
            objectDef,
          };
        }

        const fallbackShape: ShapeType = rest.type === 'projectile_throw' ? 'circle' : 'square';
        const objectDef: ObjectDef = {
          x: rest.x,
          y: rest.y,
          rotation: rest.rotation,
          shape: shapeTypeToShapeDef(shape ?? fallbackShape, size, enemyColor, stretchX, stretchY),
          spawnTime: runtimeTimestamp,
          behaviors,
        };

        return {
          ...rest,
          timestamp: runtimeTimestamp,
          objectDef,
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp),
  };

  return {
    levelData,
    audioUrl: URL.createObjectURL(audioFile),
    imageMappings: {},
  };
}

export function savePayloadToCommunity(payload: BuildModePayload) {
  const saved = JSON.parse(localStorage.getItem('community_levels') || '[]');
  saved.unshift(payload);
  localStorage.setItem('community_levels', JSON.stringify(saved));
}
