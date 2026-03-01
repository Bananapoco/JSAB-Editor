import React, { useCallback, useRef, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { EventBus } from '../game/EventBus';
import { ShapeComposerTab } from './ShapeComposerTab';
import { BuildModeTopBar } from './build-mode/ui/BuildModeTopBar';
import { BuildModeToolRail } from './build-mode/ui/BuildModeToolRail';
import { BuildModeLeftPanel } from './build-mode/ui/BuildModeLeftPanel';
import { BuildModeCenterPanel } from './build-mode/ui/BuildModeCenterPanel';

import {
  ActivePanel,
  BehaviorType,
  CustomAnimationData,
  HoverPos,
  PlacedEvent,
  SelectionRect,
  ShapeType,
  SnapInterval,
  Tool,
} from './build-mode/types';
import { CustomShapeDef } from './shape-composer/types';
import { createLevelPayload, savePayloadToCommunity } from './build-mode/levelPayload';
import { SavedAudioAsset, SavedBuildProject, upsertBuildProject } from './build-mode/projectStorage';
import { useBuildModeKeyboardShortcuts } from './build-mode/useBuildModeKeyboardShortcuts';
import { useBuildModeCanvasRender } from './build-mode/useBuildModeCanvasRender';
import { useBuildModeInteractions } from './build-mode/useBuildModeInteractions';
import { useBuildModePlacementInteractions } from './build-mode/useBuildModePlacementInteractions';

interface Props {
  onClose: () => void;
  onSwitchToAI: () => void;
  initialProject?: SavedBuildProject | null;
}

export const BuildModeEditor: React.FC<Props> = ({ onClose, onSwitchToAI, initialProject }) => {
  const initialSnapshot = initialProject?.snapshot;
  const [events, setEvents] = useState<PlacedEvent[]>(() => initialSnapshot?.events ?? []);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const undoStackRef = useRef<PlacedEvent[][]>([]);
  const redoStackRef = useRef<PlacedEvent[][]>([]);
  const isRestoringHistoryRef = useRef(false);
  const MAX_HISTORY_STEPS = 200;

  const nextIdRef = useRef((initialSnapshot?.events.reduce((maxId, event) => Math.max(maxId, event.id), -1) ?? -1) + 1);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const copiedEventsRef = useRef<Omit<PlacedEvent, 'id'>[] | null>(null);
  const pasteNudgeRef = useRef(0);

  const [activeTool, setActiveTool] = useState<Tool>('projectile_throw');
  const [isPlacementMode, setIsPlacementMode] = useState(true);
  const [activeShape, setActiveShape] = useState<ShapeType>('square');
  const [activeBehavior, setActiveBehavior] = useState<BehaviorType>('homing');
  const [activeSize, setActiveSize] = useState(50);
  const [activeDuration, setActiveDuration] = useState(2);

  const [bombGrowthDuration, setBombGrowthDuration] = useState(2.0);
  const [bombParticleCount, setBombParticleCount] = useState(12);
  const [bombParticleSpeed, setBombParticleSpeed] = useState(300);

  const [customAnimationData, setCustomAnimationData] = useState<CustomAnimationData>({ keyframes: [], handles: [] });
  const [selectedCustomKfIndex, setSelectedCustomKfIndex] = useState<number | null>(null);
  const customAnimationDataRef = useRef(customAnimationData);
  customAnimationDataRef.current = customAnimationData;

  const [bossName, setBossName] = useState(initialSnapshot?.bossName ?? 'My Level');
  const [bpm, setBpm] = useState(initialSnapshot?.bpm ?? 120);
  const [enemyColor, setEnemyColor] = useState(initialSnapshot?.enemyColor ?? '#FF0099');
  const [bgColor, setBgColor] = useState(initialSnapshot?.bgColor ?? '#0A0A1A');
  const [playerColor, setPlayerColor] = useState(initialSnapshot?.playerColor ?? '#00FFFF');

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [savedAudio, setSavedAudio] = useState<SavedAudioAsset | null>(initialSnapshot?.audio ?? null);
  const [audioDuration, setAudioDuration] = useState(initialSnapshot?.audioDuration ?? 60);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapInterval, setSnapInterval] = useState<SnapInterval>('1');
  const [showSnapMenu, setShowSnapMenu] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverPos, setHoverPos] = useState<HoverPos | null>(null);
  const [canvasCursor, setCanvasCursor] = useState('default');

  const [activePanel, setActivePanel] = useState<ActivePanel>('tools');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(initialProject?.id ?? null);
  const [saveStatusText, setSaveStatusText] = useState('');
  const lastAutosaveSignatureRef = useRef<string>(initialSnapshot ? JSON.stringify(initialSnapshot) : '');
  const [customShapes, setCustomShapes] = useState<CustomShapeDef[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('jsab_custom_shapes') || '[]');
    } catch {
      return [];
    }
  });
  const [activeCustomShapeId, setActiveCustomShapeId] = useState<string | null>(null);

  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [selectionRect, setSelectionRect] = useState<SelectionRect | null>(null);
  const [isDraggingObjects, setIsDraggingObjects] = useState(false);
  const dragStateRef = useRef<{ lastGX: number; lastGY: number } | null>(null);

  const selectedIdRef = useRef(selectedId);
  selectedIdRef.current = selectedId;
  const selectedIdsRef = useRef(selectedIds);
  selectedIdsRef.current = selectedIds;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;
  const bpmRef = useRef(bpm);
  bpmRef.current = bpm;
  const audioDurationRef = useRef(audioDuration);
  audioDurationRef.current = audioDuration;
  const snapEnabledRef = useRef(snapEnabled);
  snapEnabledRef.current = snapEnabled;
  const snapIntervalRef = useRef(snapInterval);
  snapIntervalRef.current = snapInterval;

  const isPlacementModeRef = useRef(isPlacementMode);
  isPlacementModeRef.current = isPlacementMode;
  const activeToolRef = useRef(activeTool);
  activeToolRef.current = activeTool;
  const activeBehaviorRef = useRef(activeBehavior);
  activeBehaviorRef.current = activeBehavior;
  const activeShapeRef = useRef(activeShape);
  activeShapeRef.current = activeShape;
  const activeSizeRef = useRef(activeSize);
  activeSizeRef.current = activeSize;
  const activeDurationRef = useRef(activeDuration);
  activeDurationRef.current = activeDuration;
  const activeCustomShapeIdRef = useRef(activeCustomShapeId);
  activeCustomShapeIdRef.current = activeCustomShapeId;
  const customShapesRef = useRef(customShapes);
  customShapesRef.current = customShapes;
  const bombGrowthDurationRef = useRef(bombGrowthDuration);
  bombGrowthDurationRef.current = bombGrowthDuration;
  const bombParticleCountRef = useRef(bombParticleCount);
  bombParticleCountRef.current = bombParticleCount;
  const bombParticleSpeedRef = useRef(bombParticleSpeed);
  bombParticleSpeedRef.current = bombParticleSpeed;

  const pushUndoSnapshot = useCallback((snapshot: PlacedEvent[]) => {
    const cloned = JSON.parse(JSON.stringify(snapshot)) as PlacedEvent[];
    undoStackRef.current.push(cloned);
    if (undoStackRef.current.length > MAX_HISTORY_STEPS) {
      undoStackRef.current.shift();
    }
  }, []);

  const pushRedoSnapshot = useCallback((snapshot: PlacedEvent[]) => {
    const cloned = JSON.parse(JSON.stringify(snapshot)) as PlacedEvent[];
    redoStackRef.current.push(cloned);
    if (redoStackRef.current.length > MAX_HISTORY_STEPS) {
      redoStackRef.current.shift();
    }
  }, []);

  const setEventsTracked = useCallback<React.Dispatch<React.SetStateAction<PlacedEvent[]>>>((updater) => {
    setEvents(prev => {
      const next = typeof updater === 'function'
        ? (updater as (prevState: PlacedEvent[]) => PlacedEvent[])(prev)
        : updater;

      if (!isRestoringHistoryRef.current && next !== prev) {
        pushUndoSnapshot(prev);
        redoStackRef.current = [];
      }

      return next;
    });
  }, [pushUndoSnapshot]);

  const applyHistorySnapshot = useCallback((snapshot: PlacedEvent[]) => {
    isRestoringHistoryRef.current = true;
    setEvents(snapshot);

    const existingIds = new Set(snapshot.map(event => event.id));
    const nextSelectedIds = selectedIdsRef.current.filter(id => existingIds.has(id));
    setSelectedIds(nextSelectedIds);
    setSelectedId(nextSelectedIds[0] ?? null);

    queueMicrotask(() => {
      isRestoringHistoryRef.current = false;
    });
  }, [setSelectedId, setSelectedIds]);

  const undo = useCallback(() => {
    const previous = undoStackRef.current.pop();
    if (!previous) return;

    pushRedoSnapshot(eventsRef.current);
    applyHistorySnapshot(previous);
  }, [applyHistorySnapshot, pushRedoSnapshot]);

  const redo = useCallback(() => {
    const next = redoStackRef.current.pop();
    if (!next) return;

    pushUndoSnapshot(eventsRef.current);
    applyHistorySnapshot(next);
  }, [applyHistorySnapshot, pushUndoSnapshot]);


  const handleSaveCustomShape = (shape: CustomShapeDef) => {
    setCustomShapes(prev => {
      const updated = [...prev, shape];
      localStorage.setItem('jsab_custom_shapes', JSON.stringify(updated));
      return updated;
    });
  };

  const handleDeleteCustomShape = (id: string) => {
    setCustomShapes(prev => {
      const updated = prev.filter(shape => shape.id !== id);
      localStorage.setItem('jsab_custom_shapes', JSON.stringify(updated));
      return updated;
    });

    if (activeCustomShapeId === id) {
      setActiveCustomShapeId(null);
    }
  };

  const fileToDataUrl = useCallback((file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read audio file'));
    reader.readAsDataURL(file);
  }), []);

  const restoreAudioFile = useCallback(async (asset: SavedAudioAsset) => {
    try {
      const response = await fetch(asset.dataUrl);
      const blob = await response.blob();
      const file = new File([blob], asset.name, { type: asset.type || blob.type || 'audio/mpeg' });
      setAudioFile(file);
    } catch {
      setAudioFile(null);
    }
  }, []);

  const handleAudioFileChange = useCallback(async (file: File) => {
    setAudioFile(file);

    try {
      const dataUrl = await fileToDataUrl(file);
      setSavedAudio({
        name: file.name,
        type: file.type || 'audio/mpeg',
        dataUrl,
      });
    } catch {
      setSavedAudio(null);
    }
  }, [fileToDataUrl]);

  const {
    togglePlay,
    seekTo,
    skipByBeats,
    handleTimelineScrubStart,
    handleTimelineScrubMove,
    handleTimelineScrubEnd,
    cleanupAudioUrl,
  } = useBuildModeInteractions({
    audioFile,
    audioRef,
    audioUrlRef,
    isPlaying,
    setIsPlaying,
    bpm,
    currentTime,
    audioDuration,
    setAudioDuration,
    setCurrentTime,
    snapEnabled,
    snapInterval,
    isScrubbing,
    setIsScrubbing,
    timelineRef,
  });

  const {
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    handleCanvasContextMenu,
    handleTimelineClick,
    clearCanvasDragState,
  } = useBuildModePlacementInteractions({
    canvasRef,
    isPlacementMode,
    isPlacementModeRef,
    events,
    setEvents: setEventsTracked,
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
    onCustomAnimationDataChange: setCustomAnimationData,
  });

  useBuildModeKeyboardShortcuts({
    selectedIdRef,
    selectedIdsRef,
    eventsRef,
    copiedEventsRef,
    pasteNudgeRef,
    nextIdRef,
    setEvents: setEventsTracked,
    setSelectedId,
    setSelectedIds,
    audioRef,
    isPlayingRef,
    setIsPlaying,
    onEscape: () => {
      setIsPlacementMode(false);
      isPlacementModeRef.current = false;
      clearCanvasDragState();
    },
    bpmRef,
    snapIntervalRef,
    snapEnabledRef,
    audioDurationRef,
    currentTimeRef,
    setCurrentTime,
    onUndo: undo,
    onRedo: redo,
  });

  useBuildModeCanvasRender({
    canvasRef,
    events,
    selectedId,
    selectedIds,
    currentTime,
    hoverPos,
    selectionRect,
    activeTool,
    isPlacementMode,
    activeSize,
    activeShape,
    bgColor,
    enemyColor,
    playerColor,
    activeCustomShapeId,
    customShapes,
    activeBehavior,
    customAnimationData,
    selectedCustomKfIndex,
  });

  // Sync custom animation data when selecting an event with custom behavior
  useEffect(() => {
    const ids = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
    if (ids.length === 1) {
      const evt = events.find(e => e.id === ids[0]);
      if (evt?.behavior === 'custom' && evt.customAnimation) {
        setCustomAnimationData(evt.customAnimation);
        setSelectedCustomKfIndex(null);
      }
    }
  }, [selectedId, selectedIds]); // intentionally not including events to avoid loops

  // Sync custom animation panel edits back to the selected event
  useEffect(() => {
    const ids = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
    if (ids.length > 0) {
      const evt = events.find(e => e.id === ids[0]);
      if (evt?.behavior === 'custom') {
        setEvents(prev => prev.map(e =>
          ids.includes(e.id) && e.behavior === 'custom'
            ? { ...e, customAnimation: customAnimationData }
            : e
        ));
      }
    }
  }, [customAnimationData]); // intentionally limited deps

  const selectedEvent = (selectedIds.length > 0
    ? events.find(event => event.id === selectedIds[0])
    : (selectedId !== null ? events.find(event => event.id === selectedId) : undefined)) ?? null;

  const updateSelectedEvents = useCallback((updates: Partial<PlacedEvent>) => {
    const ids = selectedIds.length > 0
      ? selectedIds
      : (selectedId !== null ? [selectedId] : []);
    if (ids.length === 0) return;

    setEventsTracked(prev => prev.map(event => (
      ids.includes(event.id)
        ? { ...event, ...updates }
        : event
    )));
  }, [selectedId, selectedIds, setEventsTracked]);

  useEffect(() => {
    if (!audioFile && savedAudio?.dataUrl) {
      void restoreAudioFile(savedAudio);
    }
  }, [audioFile, restoreAudioFile, savedAudio]);

  useEffect(() => {
    return () => {
      cleanupAudioUrl();
    };
  }, [cleanupAudioUrl]);

  useEffect(() => {
    if (!saveStatusText) return;
    const timer = window.setTimeout(() => setSaveStatusText(''), 2200);
    return () => window.clearTimeout(timer);
  }, [saveStatusText]);

  const buildProjectSnapshot = useCallback(() => ({
    bossName,
    bpm,
    enemyColor,
    bgColor,
    playerColor,
    audioDuration,
    audio: savedAudio,
    events,
  }), [audioDuration, bgColor, bossName, bpm, enemyColor, events, playerColor, savedAudio]);

  const persistProject = useCallback((mode: 'manual' | 'auto') => {
    const snapshot = buildProjectSnapshot();
    const hasMeaningfulWork = snapshot.events.length > 0 || snapshot.bossName.trim() !== 'My Level';
    if (!hasMeaningfulWork) return null;

    const savedProject = upsertBuildProject({
      projectId: currentProjectId,
      name: snapshot.bossName.trim() || 'Untitled Project',
      snapshot,
    });

    setCurrentProjectId(savedProject.id);
    lastAutosaveSignatureRef.current = JSON.stringify(snapshot);

    if (mode === 'manual') {
      setSaveStatusText(`Saved: ${savedProject.name}`);
    } else {
      setSaveStatusText(`Autosaved: ${savedProject.name}`);
    }

    return savedProject;
  }, [buildProjectSnapshot, currentProjectId]);

  const handleSaveProject = () => {
    persistProject('manual');
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      const snapshot = {
        bossName,
        bpm,
        enemyColor,
        bgColor,
        playerColor,
        audioDuration,
        audio: savedAudio,
        events,
      };
      const signature = JSON.stringify(snapshot);
      if (signature === lastAutosaveSignatureRef.current) return;

      const hasMeaningfulWork = snapshot.events.length > 0 || snapshot.bossName.trim() !== 'My Level';
      if (!hasMeaningfulWork) return;

      persistProject('auto');
    }, 10000);

    return () => window.clearInterval(interval);
  }, [audioDuration, bgColor, bossName, bpm, enemyColor, events, persistProject, playerColor, savedAudio]);

  const handleLaunch = () => {
    if (!audioFile) {
      alert('Drop a song first! 🎵');
      return;
    }

    if (events.length === 0) {
      alert('Add some events first! 🎮');
      return;
    }

    const savedProject = persistProject('manual');

    const payload = createLevelPayload({
      events,
      bossName,
      bpm,
      audioDuration,
      enemyColor,
      bgColor,
      playerColor,
      audioFile,
    });

    const launchPayload = {
      ...payload,
      source: 'build' as const,
      returnProject: savedProject,
    };

    savePayloadToCommunity(payload);
    (window as any).pendingLevelData = launchPayload;
    EventBus.emit('load-level', launchPayload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#08080C] text-white flex flex-col z-[1100] font-sans select-none overflow-hidden">
      <BuildModeTopBar
        onClose={onClose}
        onSwitchToAI={onSwitchToAI}
        onSaveProject={handleSaveProject}
        onLaunch={handleLaunch}
        saveStatusText={saveStatusText}
        onUndo={undo}
        canUndo={undoStackRef.current.length > 0}
        onRedo={redo}
        canRedo={redoStackRef.current.length > 0}
        eventCount={events.length}
        audioDuration={audioDuration}
      />

      <div className="flex-1 flex overflow-hidden">
        <BuildModeToolRail
          activePanel={activePanel}
          onPanelChange={setActivePanel}
        />

        {activePanel === 'compose' && (
          <AnimatePresence mode="wait">
            <ShapeComposerTab
              key="composer"
              onClose={() => setActivePanel('shapes')}
              onSave={handleSaveCustomShape}
              onDelete={handleDeleteCustomShape}
              existingShapes={customShapes}
              defaultColor={enemyColor}
            />
          </AnimatePresence>
        )}

        {activePanel !== 'compose' && (
          <>
            <BuildModeLeftPanel
              activePanel={activePanel}
              isPlacementMode={isPlacementMode}
              activeTool={activeTool}
              activeBehavior={activeBehavior}
              onBehaviorChange={behavior => {
                activeBehaviorRef.current = behavior;
                setActiveBehavior(behavior);
              }}
              onSelectTool={tool => {
                activeToolRef.current = tool;
                setActiveTool(tool);
                setIsPlacementMode(true);
                isPlacementModeRef.current = true;
              }}
              bombGrowthDuration={bombGrowthDuration}
              bombParticleCount={bombParticleCount}
              bombParticleSpeed={bombParticleSpeed}
              onBombGrowthDurationChange={value => {
                bombGrowthDurationRef.current = value;
                setBombGrowthDuration(value);
              }}
              onBombParticleCountChange={value => {
                bombParticleCountRef.current = value;
                setBombParticleCount(value);
              }}
              onBombParticleSpeedChange={value => {
                bombParticleSpeedRef.current = value;
                setBombParticleSpeed(value);
              }}
              activeSize={activeSize}
              activeDuration={activeDuration}
              selectedEvent={selectedEvent}
              selectedCount={selectedIds.length > 0 ? selectedIds.length : (selectedId !== null ? 1 : 0)}
              onActiveSizeChange={value => {
                activeSizeRef.current = value;
                setActiveSize(value);
              }}
              onActiveDurationChange={value => {
                activeDurationRef.current = value;
                setActiveDuration(value);
              }}
              onUpdateSelectedSize={value => updateSelectedEvents({ size: value })}
              onUpdateSelectedDuration={value => updateSelectedEvents({ duration: value })}
              activeShape={activeShape}
              activeCustomShapeId={activeCustomShapeId}
              customShapes={customShapes}
              onSelectShape={shape => {
                activeShapeRef.current = shape;
                setActiveShape(shape);
                setActiveCustomShapeId(null);
                activeCustomShapeIdRef.current = null;
                setIsPlacementMode(true);
                isPlacementModeRef.current = true;
              }}
              onSelectCustomShape={id => {
                setActiveCustomShapeId(id);
                activeCustomShapeIdRef.current = id;
                setIsPlacementMode(true);
                isPlacementModeRef.current = true;
              }}
              onOpenComposer={() => setActivePanel('compose')}
              audioFile={audioFile}
              onAudioFileChange={handleAudioFileChange}
              bpm={bpm}
              onBpmChange={setBpm}
              enemyColor={enemyColor}
              bgColor={bgColor}
              playerColor={playerColor}
              onEnemyColorChange={setEnemyColor}
              onBgColorChange={setBgColor}
              onPlayerColorChange={setPlayerColor}
              bossName={bossName}
              onBossNameChange={setBossName}
              customAnimationData={customAnimationData}
              onCustomAnimationDataChange={setCustomAnimationData}
              selectedCustomKfIndex={selectedCustomKfIndex}
              onSelectCustomKf={setSelectedCustomKfIndex}
            />

            <BuildModeCenterPanel
              canvasRef={canvasRef}
              timelineRef={timelineRef}
              hoverPos={hoverPos}
              isDraggingObjects={isDraggingObjects}
              isPlacementMode={isPlacementMode}
              isDraggingSelection={isDraggingSelection}
              canvasCursor={canvasCursor}
              isScrubbing={isScrubbing}
              bpm={bpm}
              audioFile={audioFile}
              isPlaying={isPlaying}
              currentTime={currentTime}
              audioDuration={audioDuration}
              snapEnabled={snapEnabled}
              snapInterval={snapInterval}
              showSnapMenu={showSnapMenu}
              events={events}
              selectedId={selectedId}
              selectedIds={selectedIds}
              selectionRect={selectionRect}
              onCanvasMouseDown={handleCanvasMouseDown}
              onCanvasMouseMove={handleCanvasMouseMove}
              onCanvasMouseUp={handleCanvasMouseUp}
              onCanvasContextMenu={handleCanvasContextMenu}
              onCanvasMouseLeave={clearCanvasDragState}
              onTogglePlay={togglePlay}
              onSkipByBeats={skipByBeats}
              onSeekRatio={seekTo}
              onToggleSnapMenu={() => setShowSnapMenu(v => !v)}
              onToggleSnapEnabled={() => {
                setSnapEnabled(v => !v);
                setShowSnapMenu(false);
              }}
              onSelectSnapInterval={interval => {
                setSnapInterval(interval);
                setShowSnapMenu(false);
              }}
              onTimelineScrubStart={handleTimelineScrubStart}
              onTimelineScrubMove={handleTimelineScrubMove}
              onTimelineScrubEnd={handleTimelineScrubEnd}
              onTimelineClick={handleTimelineClick}
              onSelectEvent={id => {
                setSelectedId(id);
                setSelectedIds([id]);
              }}
            />


          </>
        )}
      </div>
    </div>
  );
};
