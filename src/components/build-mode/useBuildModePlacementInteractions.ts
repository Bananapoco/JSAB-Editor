import React, {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
  useCallback,
  useRef,
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
import { BehaviorType, CustomAnimationData, CustomKeyframe, CustomSegmentHandle, HoverPos, PlacedEvent, SelectionRect, ShapeType, SnapInterval, Tool } from './types';

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
  setCanvasCursor: Dispatch<SetStateAction<string>>;
  isDraggingSelection: boolean;
  setIsDraggingSelection: Dispatch<SetStateAction<boolean>>;
  selectionRect: SelectionRect | null;
  setSelectionRect: Dispatch<SetStateAction<SelectionRect | null>>;
  isDraggingObjects: boolean;
  setIsDraggingObjects: Dispatch<SetStateAction<boolean>>;
  dragStateRef: MutableRefObject<{ lastGX: number; lastGY: number } | null>;
  customAnimationDataRef: MutableRefObject<CustomAnimationData>;
  onCustomAnimationDataChange: (data: CustomAnimationData) => void;
}

interface BuildModePlacementHandlers {
  handleCanvasMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
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
  setCanvasCursor,
  isDraggingSelection,
  setIsDraggingSelection,
  selectionRect,
  setSelectionRect,
  isDraggingObjects,
  setIsDraggingObjects,
  dragStateRef,
  customAnimationDataRef,
  onCustomAnimationDataChange,
}: UseBuildModePlacementInteractionsParams): BuildModePlacementHandlers {
  const snapToGrid = useCallback((time: number): number => {
    if (bpm <= 0) return time;

    const snapConfig = SNAP_INTERVALS.find(interval => interval.value === snapInterval);
    if (!snapConfig) return time;

    const beatDuration = 60 / bpm;
    const snapUnit = beatDuration / snapConfig.divisor;
    return Math.round(time / snapUnit) * snapUnit;
  }, [bpm, snapInterval]);

  type ResizeHandle = {
    sx: -1 | 0 | 1;
    sy: -1 | 0 | 1;
  };

  const resizeDragRef = useRef<{
    eventId: number;
    handle: ResizeHandle;
  } | null>(null);

  const HANDLE_HIT_RADIUS = 9;
  const HANDLE_PAD = 8;

  const getResizeHandleCursor = (handle: ResizeHandle): string => {
    if (handle.sx !== 0 && handle.sy !== 0) {
      return handle.sx === handle.sy ? 'nwse-resize' : 'nesw-resize';
    }
    if (handle.sx === 0) return 'ns-resize';
    return 'ew-resize';
  };

  const getSelectedResizableEvent = useCallback((): PlacedEvent | null => {
    const ids = selectedIds.length > 0
      ? selectedIds
      : (selectedId !== null ? [selectedId] : []);
    if (ids.length !== 1) return null;
    const selected = events.find(event => event.id === ids[0]);
    if (!selected || selected.customShapeDef) return null;
    return selected;
  }, [events, selectedId, selectedIds]);

  const getResizeHandleAt = useCallback((cx: number, cy: number): ResizeHandle | null => {
    const selected = getSelectedResizableEvent();
    if (!selected) return null;

    const ex = selected.x * SCALE;
    const ey = selected.y * SCALE;
    const half = ((selected.size ?? 40) * SCALE) / 2 + HANDLE_PAD;
    const rot = ((selected.rotation ?? 0) * Math.PI) / 180;
    const c = Math.cos(rot);
    const s = Math.sin(rot);

    const handles: ResizeHandle[] = [
      { sx: -1, sy: -1 },
      { sx: 0, sy: -1 },
      { sx: 1, sy: -1 },
      { sx: -1, sy: 0 },
      { sx: 1, sy: 0 },
      { sx: -1, sy: 1 },
      { sx: 0, sy: 1 },
      { sx: 1, sy: 1 },
    ];

    for (const handle of handles) {
      const lx = handle.sx * half;
      const ly = handle.sy * half;
      const hx = ex + lx * c - ly * s;
      const hy = ey + lx * s + ly * c;
      if (Math.hypot(cx - hx, cy - hy) <= HANDLE_HIT_RADIUS) {
        return handle;
      }
    }

    return null;
  }, [getSelectedResizableEvent]);

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

    if (!isPlacementMode) {
      const handle = getResizeHandleAt(pos.cx, pos.cy);
      const selected = getSelectedResizableEvent();
      if (handle && selected) {
        resizeDragRef.current = {
          eventId: selected.id,
          handle,
        };
        setCanvasCursor(getResizeHandleCursor(handle));
        return;
      }
    }

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
        ...(activeBehaviorRef.current === 'custom'
          ? {
              customAnimation: {
                keyframes: [{
                  t: 0,
                  x: Math.min(Math.max(Math.round(pos.gx), 0), GAME_W),
                  y: Math.min(Math.max(Math.round(pos.gy), 0), GAME_H),
                  rotation: 0,
                  scale: 1,
                }],
                handles: [],
              },
            }
          : {}),
      };

      // When placing with custom behavior, initialize the shared custom animation data from the placed event
      if (activeBehaviorRef.current === 'custom' && newEvent.customAnimation) {
        onCustomAnimationDataChange(newEvent.customAnimation);
      }

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
      setCanvasCursor('grabbing');
      dragStateRef.current = { lastGX: pos.gx, lastGY: pos.gy };
      return;
    }

    setIsDraggingSelection(true);
    setCanvasCursor('crosshair');
    setSelectionRect({ x1: pos.gx, y1: pos.gy, x2: pos.gx, y2: pos.gy });
  }, [
    getCanvasPos,
    findEventAtCanvasPos,
    isPlacementMode,
    getResizeHandleAt,
    getSelectedResizableEvent,
    setCanvasCursor,
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
      setCanvasCursor('crosshair');
      setSelectionRect({ ...selectionRect, x2: pos.gx, y2: pos.gy });
      return;
    }

    if (resizeDragRef.current) {
      const drag = resizeDragRef.current;
      const event = events.find(item => item.id === drag.eventId);
      if (!event) return;

      setCanvasCursor(getResizeHandleCursor(drag.handle));

      const ex = event.x * SCALE;
      const ey = event.y * SCALE;
      const rot = ((event.rotation ?? 0) * Math.PI) / 180;
      const c = Math.cos(-rot);
      const s = Math.sin(-rot);
      const localX = (pos.cx - ex) * c - (pos.cy - ey) * s;
      const localY = (pos.cx - ex) * s + (pos.cy - ey) * c;

      const currentHalf = ((event.size ?? 40) * SCALE) / 2;
      const targetHalfX = drag.handle.sx !== 0
        ? Math.max(7, Math.abs(localX) - HANDLE_PAD)
        : currentHalf;
      const targetHalfY = drag.handle.sy !== 0
        ? Math.max(7, Math.abs(localY) - HANDLE_PAD)
        : currentHalf;
      const targetHalf = Math.max(7, Math.max(targetHalfX, targetHalfY));
      const nextSize = Math.max(14, Math.min(200, (targetHalf * 2) / SCALE));

      setEvents(prev => prev.map(item => (
        item.id === drag.eventId
          ? { ...item, size: nextSize }
          : item
      )));
      return;
    }

    if (isDraggingObjects && dragStateRef.current) {
      setCanvasCursor('grabbing');
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
      return;
    }

    if (!isPlacementMode) {
      const handle = getResizeHandleAt(pos.cx, pos.cy);
      if (handle) {
        setCanvasCursor(getResizeHandleCursor(handle));
        return;
      }

      const hoveringId = findEventAtCanvasPos(pos.cx, pos.cy);
      setCanvasCursor(hoveringId !== null ? 'grab' : 'default');
      return;
    }

    setCanvasCursor('copy');
  }, [
    getCanvasPos,
    setHoverPos,
    setCanvasCursor,
    isDraggingSelection,
    selectionRect,
    setSelectionRect,
    events,
    isDraggingObjects,
    dragStateRef,
    selectedIds,
    selectedId,
    setEvents,
    isPlacementMode,
    getResizeHandleAt,
    findEventAtCanvasPos,
  ]);

  const handleCanvasMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);

    if (resizeDragRef.current) {
      resizeDragRef.current = null;
      setCanvasCursor('default');
    }

    if (isDraggingObjects) {
      setIsDraggingObjects(false);
      dragStateRef.current = null;
      setCanvasCursor('default');
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
    setCanvasCursor,
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
      ...(activeBehaviorRef.current === 'custom'
        ? {
            customAnimation: {
              keyframes: [{ t: 0, x: 512, y: 384, rotation: 0, scale: 1 }],
              handles: [],
            },
          }
        : {}),
    };

    if (activeBehaviorRef.current === 'custom' && newEvent.customAnimation) {
      onCustomAnimationDataChange(newEvent.customAnimation);
    }

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

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    // Only handle right-click for adding custom keyframes
    if (activeBehaviorRef.current !== 'custom') return;

    e.preventDefault();
    const pos = getCanvasPos(e);
    if (!pos) return;

    const data = customAnimationDataRef.current;
    const existingKfs = data.keyframes;
    const existingHandles = data.handles;

    // Add new keyframe with a temporary t value; we'll redistribute evenly below.
    const newKf: CustomKeyframe = {
      t: 0, // will be overwritten
      x: Math.min(Math.max(Math.round(pos.gx), 0), GAME_W),
      y: Math.min(Math.max(Math.round(pos.gy), 0), GAME_H),
      rotation: 0,
      scale: 1,
    };

    const newKfs = [...existingKfs, newKf];

    // Evenly distribute t values across all keyframes (0 to 1)
    const totalCount = newKfs.length;
    for (let i = 0; i < totalCount; i++) {
      newKfs[i] = { ...newKfs[i], t: totalCount === 1 ? 0 : i / (totalCount - 1) };
    }

    // If we're adding a keyframe between existing ones, we need to recalculate handles array
    // For simplicity, just add a disabled handle for the new segment
    const newHandles: CustomSegmentHandle[] = [];
    for (let i = 0; i < newKfs.length - 1; i++) {
      // Try to find an existing handle for this pair, otherwise create disabled
      if (i < existingHandles.length && newKfs.length - 1 === existingKfs.length) {
        newHandles.push(existingHandles[i]);
      } else {
        newHandles.push({ enabled: false, cp1x: 50, cp1y: 0, cp2x: -50, cp2y: 0 });
      }
    }

    const newData: CustomAnimationData = { keyframes: newKfs, handles: newHandles };

    onCustomAnimationDataChange(newData);
  }, [activeBehaviorRef, isPlacementModeRef, selectedIds, selectedId, getCanvasPos, customAnimationDataRef, onCustomAnimationDataChange]);

  const clearCanvasDragState = useCallback(() => {
    setHoverPos(null);
    setCanvasCursor('default');
    setIsDraggingObjects(false);
    setIsDraggingSelection(false);
    setSelectionRect(null);
    dragStateRef.current = null;
    resizeDragRef.current = null;
  }, [setHoverPos, setCanvasCursor, setIsDraggingObjects, setIsDraggingSelection, setSelectionRect, dragStateRef]);

  return {
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasContextMenu,
    handleTimelineClick,
    clearCanvasDragState,
  };
}
