import type { ChildDef, ObjectDef } from '../../game/engine/ObjectFactory';
import { LevelData } from '../../game/types';
import { PlacedEvent, ShapeType } from './types';
import {
  buildBehaviorDefsForPlacedEvent,
  pieceTypeToShapeDef,
  shapeTypeToShapeDef,
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
      .map(({ id, shape, customShapeDef, bombSettings, customAnimation, ...rest }) => {
        if (rest.type === 'screen_shake') return rest;

        const size = rest.size ?? 40;
        const behaviors = buildBehaviorDefsForPlacedEvent(
          rest.type,
          rest.behavior,
          size,
          rest.duration,
          bombSettings,
          customAnimation,
        );

        if (customShapeDef) {
          const children: ChildDef[] = customShapeDef.pieces.map(piece => ({
            offsetX: piece.x,
            offsetY: piece.y,
            localRotation: piece.rotation,
            shape: pieceTypeToShapeDef(piece.type, piece.size, piece.color || enemyColor),
          }));

          const objectDef: ObjectDef = {
            x: rest.x,
            y: rest.y,
            rotation: rest.rotation,
            children,
            spawnTime: rest.timestamp,
            colliderRadius: customShapeDef.colliderRadius,
            behaviors,
          };

          return {
            ...rest,
            objectDef,
          };
        }

        const fallbackShape: ShapeType = rest.type === 'projectile_throw' ? 'circle' : 'square';
        const objectDef: ObjectDef = {
          x: rest.x,
          y: rest.y,
          rotation: rest.rotation,
          shape: shapeTypeToShapeDef(shape ?? fallbackShape, size, enemyColor),
          spawnTime: rest.timestamp,
          behaviors,
        };

        return {
          ...rest,
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
