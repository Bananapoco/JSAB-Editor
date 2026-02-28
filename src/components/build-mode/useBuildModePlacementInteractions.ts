import React, {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
  useCallback,
} from 'react';
import { LevelEventType } from '../../game/types';
import {
  GAME_H,
  GAME_W,
  SCALE,
  SELECTION_CLICK_DEADZONE_PX,
  SNAP_INTERVALS,
} from './constants';
import { CustomShapeDef } from '../shape-composer/types';
import { BehaviorType, HoverPos, PlacedEvent, SelectionRect, ShapeType, SnapInterval, Tool } from './types';

interface UseBuildModePlacementInteractionsParams {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isPlacementMode: boolean;
  isPlacementModeRef: MutableRefObject<boolean>;
  events: PlacedEvent[];
  setEvents: Dispatch<SetStateAction<PlacedEvent[]>>;
  selectedId: number | null;
  selectedIds: number[];
  setSelectedId: Dispatch<SetStateAction<number | null>>;
  setSelectedIds: Dispatch<SetStateAction<number[]>>;
  nextIdRef: MutableRefObject<number>;
  activeToolRef: MutableRefObject<Tool>;
  activeBehaviorRef: MutableRefObject<BehaviorType>;
  activeShapeRef: MutableRefObject<ShapeType>;
  activeSizeRef: MutableRefObject<number>;
  activeDurationRef: MutableRefObject<number>;
  activeCustomShapeIdRef: MutableRefObject<string | null>;
  customShapesRef: MutableRefObject<CustomShapeDef[]>;
  bombGrowthDurationRef: MutableRefObject<number>;
  bombParticleCountRef: MutableRefObject<number>;
  bombParticleSpeedRef: MutableRefObject<number>;
  currentTime: number;
  audioDuration: number;
  bpm: number;
  snapEnabled: boolean;
  snapInterval: SnapInterval;
  setHoverPos: Dispatch<SetStateAction<HoverPos | null>>;
  isDraggingSelection: boolean;
  setIsDraggingSelection: Dispatch<SetStateAction<boolean>>;
  selectionRect: SelectionRect | null;
  setSelectionRect: Dispatch<SetStateAction<SelectionRect | null>>;
  isDraggingObjects: boolean;
  setIsDraggingObjects: Dispatch<SetStateAction<boolean>>;
  dragStateRef: MutableRefObject<{ lastGX: number; lastGY: number } | null>;
}

interface BuildModePlacementHandlers {
  handleCanvasMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleTimelineClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  clearCanvasDragState: () => void;
}

export function useBuildModePlacementInteractions({
  canvasRef,
  isPlacementMode,
  isPlacementModeRef,
  events,
  setEvents,
  selectedId,
  selectedIds,
  setSelectedId,
  setSelectedIds,
  nextIdRef,
  activeToolRef,
  activeBehaviorRef,
  activeShapeRef,
  activeSizeRef,
  activeDurationRef,
  activeCustomShapeIdRef,
  customShapesRef,
  bombGrowthDurationRef,
  bombParticleCountRef,
  bombParticleSpeedRef,
  currentTime,
  audioDuration,
  bpm,
  snapEnabled,
  snapInterval,
  setHoverPos,
  isDraggingSelection,
  setIsDraggingSelection,
  selectionRect,
  setSelectionRect,
  isDraggingObjects,
  setIsDraggingObjects,
  dragStateRef,
}: UseBuildModePlacementInteractionsParams): BuildModePlacementHandlers {
  const snapToGrid = useCallback((time: number): number => {
    if (bpm <= 0) return time;

    const snapConfig = SNAP_INTERVALS.find(interval => interval.value === snapInterval);
    if (!snapConfig) return time;

    const beatDuration = 60 / bpm;
    const snapUnit = beatDuration / snapConfig.divisor;
    return Math.round(time / snapUnit) * snapUnit;
  }, [bpm, snapInterval]);

  const getCanvasPos = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    return {
      cx,
      cy,
      gx: cx / SCALE,
      gy: cy / SCALE,
    };
  }, [canvasRef]);

  const findEventAtCanvasPos = useCallback((cx: number, cy: number): number | null => {
    for (let i = events.length - 1; i >= 0; i--) {
      const event = events[i];
      const ex = event.x * SCALE;
      const ey = event.y * SCALE;
      const radius = event.customShapeDef
        ? event.customShapeDef.colliderRadius * SCALE
        : ((event.size ?? 40) * SCALE) / 2;
      const dx = cx - ex;
      const dy = cy - ey;
      if (dx * dx + dy * dy <= radius * radius) {
        return event.id;
      }
    }

    return null;
  }, [events]);

  const handleCanvasMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    if (!pos) return;

    const hitId = findEventAtCanvasPos(pos.cx, pos.cy);

    if (isPlacementMode) {
      const id = nextIdRef.current++;
      const activeCustomShape = activeCustomShapeIdRef.current
        ? customShapesRef.current.find(shape => shape.id === activeCustomShapeIdRef.current)
        : undefined;

      const newEvent: PlacedEvent = {
        id,
        timestamp: parseFloat(currentTime.toFixed(3)),
        type: activeToolRef.current as LevelEventType,
        x: Math.min(Math.max(Math.round(pos.gx), 0), GAME_W),
        y: Math.min(Math.max(Math.round(pos.gy), 0), GAME_H),
        size: activeSizeRef.current,
        behavior: activeBehaviorRef.current,
        duration: activeDurationRef.current,
        rotation: 0,
        shape: activeShapeRef.current,
        ...(activeCustomShape ? { customShapeDef: activeCustomShape } : {}),
        ...(activeBehaviorRef.current === 'bomb'
          ? {
              bombSettings: {
                growthDuration: bombGrowthDurationRef.current,
                particleCount: bombParticleCountRef.current,
                particleSpeed: bombParticleSpeedRef.current,
              },
            }
          : {}),
      };

      setEvents(prev => [...prev, newEvent]);
      setSelectedId(id);
      setSelectedIds([id]);
      return;
    }

    const hitInSelection = hitId !== null && selectedIds.includes(hitId);
    if (hitId !== null) {
      const nextSelection = hitInSelection
        ? (selectedIds.length > 0 ? selectedIds : [hitId])
        : [hitId];

      setSelectedIds(nextSelection);
      setSelectedId(hitId);
      setIsDraggingObjects(true);
      dragStateRef.current = { lastGX: pos.gx, lastGY: pos.gy };
      return;
    }

    setIsDraggingSelection(true);
    setSelectionRect({ x1: pos.gx, y1: pos.gy, x2: pos.gx, y2: pos.gy });
  }, [
    getCanvasPos,
    findEventAtCanvasPos,
    isPlacementMode,
    nextIdRef,
    activeCustomShapeIdRef,
    customShapesRef,
    currentTime,
    activeToolRef,
    activeSizeRef,
    activeBehaviorRef,
    activeDurationRef,
    activeShapeRef,
    bombGrowthDurationRef,
    bombParticleCountRef,
    bombParticleSpeedRef,
    setEvents,
    setSelectedId,
    setSelectedIds,
    selectedIds,
    setIsDraggingObjects,
    dragStateRef,
    setIsDraggingSelection,
    setSelectionRect,
  ]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    if (!pos) return;

    setHoverPos({ gx: pos.gx, gy: pos.gy });

    if (isDraggingSelection && selectionRect) {
      setSelectionRect({ ...selectionRect, x2: pos.gx, y2: pos.gy });
      return;
    }

    if (isDraggingObjects && dragStateRef.current) {
      const dx = pos.gx - dragStateRef.current.lastGX;
      const dy = pos.gy - dragStateRef.current.lastGY;
      dragStateRef.current = { lastGX: pos.gx, lastGY: pos.gy };

      const idsToMove = selectedIds.length > 0
        ? selectedIds
        : (selectedId !== null ? [selectedId] : []);
      if (idsToMove.length === 0) return;

      setEvents(prev => prev.map(event => {
        if (!idsToMove.includes(event.id)) return event;
        return {
          ...event,
          x: Math.max(0, Math.min(GAME_W, event.x + dx)),
          y: Math.max(0, Math.min(GAME_H, event.y + dy)),
        };
      }));
    }
  }, [
    getCanvasPos,
    setHoverPos,
    isDraggingSelection,
    selectionRect,
    setSelectionRect,
    isDraggingObjects,
    dragStateRef,
    selectedIds,
    selectedId,
    setEvents,
  ]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);

    if (isDraggingObjects) {
      setIsDraggingObjects(false);
      dragStateRef.current = null;
    }

    if (isPlacementModeRef.current) {
      setIsDraggingSelection(false);
      setSelectionRect(null);
      return;
    }

    if (isDraggingSelection && selectionRect && pos) {
      const xMin = Math.min(selectionRect.x1, selectionRect.x2);
      const xMax = Math.max(selectionRect.x1, selectionRect.x2);
      const yMin = Math.min(selectionRect.y1, selectionRect.y2);
      const yMax = Math.max(selectionRect.y1, selectionRect.y2);
      const dragWidthPx = Math.abs(xMax - xMin) * SCALE;
      const dragHeightPx = Math.abs(yMax - yMin) * SCALE;
      const tiny = dragWidthPx < SELECTION_CLICK_DEADZONE_PX && dragHeightPx < SELECTION_CLICK_DEADZONE_PX;

      if (tiny) {
        const hitId = findEventAtCanvasPos(pos.cx, pos.cy);
        if (hitId !== null) {
          setSelectedId(hitId);
          setSelectedIds([hitId]);
        } else {
          setSelectedId(null);
          setSelectedIds([]);
        }
      } else {
        const ids = events
          .filter(event => event.x >= xMin && event.x <= xMax && event.y >= yMin && event.y <= yMax)
          .map(event => event.id);
        setSelectedIds(ids);
        setSelectedId(ids.length > 0 ? ids[0] : null);
      }
    }

    setIsDraggingSelection(false);
    setSelectionRect(null);
  }, [
    getCanvasPos,
    isDraggingObjects,
    setIsDraggingObjects,
    dragStateRef,
    isPlacementModeRef,
    setIsDraggingSelection,
    setSelectionRect,
    isDraggingSelection,
    selectionRect,
    findEventAtCanvasPos,
    setSelectedId,
    setSelectedIds,
    events,
  ]);

  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacementMode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let time = ratio * audioDuration;

    if (snapEnabled && bpm > 0) {
      time = snapToGrid(time);
    }

    const id = nextIdRef.current++;
    const activeCustomShape = activeCustomShapeIdRef.current
      ? customShapesRef.current.find(shape => shape.id === activeCustomShapeIdRef.current)
      : undefined;

    const newEvent: PlacedEvent = {
      id,
      timestamp: parseFloat(time.toFixed(3)),
      type: activeToolRef.current as LevelEventType,
      x: 512,
      y: 384,
      size: activeSizeRef.current,
      behavior: activeBehaviorRef.current,
      duration: activeDurationRef.current,
      rotation: 0,
      shape: activeShapeRef.current,
      ...(activeCustomShape ? { customShapeDef: activeCustomShape } : {}),
      ...(activeBehaviorRef.current === 'bomb'
        ? {
            bombSettings: {
              growthDuration: bombGrowthDurationRef.current,
              particleCount: bombParticleCountRef.current,
              particleSpeed: bombParticleSpeedRef.current,
            },
          }
        : {}),
    };

    setEvents(prev => [...prev, newEvent]);
    setSelectedId(id);
    setSelectedIds([id]);
  }, [
    isPlacementMode,
    audioDuration,
    snapEnabled,
    bpm,
    snapToGrid,
    nextIdRef,
    activeCustomShapeIdRef,
    customShapesRef,
    activeToolRef,
    activeSizeRef,
    activeBehaviorRef,
    activeDurationRef,
    activeShapeRef,
    bombGrowthDurationRef,
    bombParticleCountRef,
    bombParticleSpeedRef,
    setEvents,
    setSelectedId,
    setSelectedIds,
  ]);

  const clearCanvasDragState = useCallback(() => {
    setHoverPos(null);
    setIsDraggingObjects(false);
    setIsDraggingSelection(false);
    setSelectionRect(null);
    dragStateRef.current = null;
  }, [setHoverPos, setIsDraggingObjects, setIsDraggingSelection, setSelectionRect, dragStateRef]);

  return {
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleTimelineClick,
    clearCanvasDragState,
  };
}
