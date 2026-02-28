import React, { useMemo, useRef, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { EventBus } from '../game/EventBus';
import { ShapeComposerTab } from './ShapeComposerTab';
import { BuildModeTopBar } from './build-mode/ui/BuildModeTopBar';
import { BuildModeToolRail } from './build-mode/ui/BuildModeToolRail';
import { BuildModeLeftPanel } from './build-mode/ui/BuildModeLeftPanel';
import { BuildModeCenterPanel } from './build-mode/ui/BuildModeCenterPanel';
import { BuildModeInspectorPanel } from './build-mode/ui/BuildModeInspectorPanel';
import {
  ActivePanel,
  BehaviorType,
  HoverPos,
  PlacedEvent,
  SelectionRect,
  ShapeType,
  SnapInterval,
  Tool,
} from './build-mode/types';
import { CustomShapeDef } from './shape-composer/types';
import { createLevelPayload, savePayloadToCommunity } from './build-mode/levelPayload';
import { useBuildModeKeyboardShortcuts } from './build-mode/useBuildModeKeyboardShortcuts';
import { useBuildModeCanvasRender } from './build-mode/useBuildModeCanvasRender';
import { useBuildModeInteractions } from './build-mode/useBuildModeInteractions';
import { useBuildModePlacementInteractions } from './build-mode/useBuildModePlacementInteractions';

interface Props {
  onClose: () => void;
  onSwitchToAI: () => void;
}

export const BuildModeEditor: React.FC<Props> = ({ onClose, onSwitchToAI }) => {
  const [events, setEvents] = useState<PlacedEvent[]>([]);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const nextIdRef = useRef(0);
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

  const [bossName, setBossName] = useState('My Level');
  const [bpm, setBpm] = useState(120);
  const [enemyColor, setEnemyColor] = useState('#FF0099');
  const [bgColor, setBgColor] = useState('#0A0A1A');
  const [playerColor, setPlayerColor] = useState('#00FFFF');

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState(60);
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

  const [activePanel, setActivePanel] = useState<ActivePanel>('tools');
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

  const selectedEvent = useMemo(
    () => events.find(event => event.id === selectedId) ?? null,
    [events, selectedId],
  );

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
    handleTimelineClick,
    clearCanvasDragState,
  } = useBuildModePlacementInteractions({
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
  });

  useBuildModeKeyboardShortcuts({
    selectedIdRef,
    selectedIdsRef,
    eventsRef,
    copiedEventsRef,
    pasteNudgeRef,
    nextIdRef,
    setEvents,
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
  });

  useEffect(() => {
    return () => {
      cleanupAudioUrl();
    };
  }, [cleanupAudioUrl]);

  const deleteSelected = () => {
    const ids = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
    if (ids.length === 0) return;

    setEvents(prev => prev.filter(event => !ids.includes(event.id)));
    setSelectedId(null);
    setSelectedIds([]);
  };

  const updateSelected = (updates: Partial<PlacedEvent>) => {
    setEvents(prev => prev.map(event => (event.id === selectedId ? { ...event, ...updates } : event)));
  };

  const handleLaunch = () => {
    if (!audioFile) {
      alert('Drop a song first! 🎵');
      return;
    }

    if (events.length === 0) {
      alert('Add some events first! 🎮');
      return;
    }

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

    savePayloadToCommunity(payload);
    (window as any).pendingLevelData = payload;
    EventBus.emit('load-level', payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[#08080C] text-white flex flex-col z-[1100] font-sans select-none overflow-hidden">
      <BuildModeTopBar
        onClose={onClose}
        onSwitchToAI={onSwitchToAI}
        eventCount={events.length}
        audioDuration={audioDuration}
      />

      <div className="flex-1 flex overflow-hidden">
        <BuildModeToolRail
          activePanel={activePanel}
          onPanelChange={setActivePanel}
          activeTool={activeTool}
          isPlacementMode={isPlacementMode}
          onSelectTool={tool => {
            activeToolRef.current = tool;
            setActiveTool(tool);
            setIsPlacementMode(true);
            isPlacementModeRef.current = true;
          }}
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
              onActiveSizeChange={value => {
                activeSizeRef.current = value;
                setActiveSize(value);
              }}
              onActiveDurationChange={value => {
                activeDurationRef.current = value;
                setActiveDuration(value);
              }}
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
              onAudioFileChange={setAudioFile}
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
            />

            <BuildModeCenterPanel
              canvasRef={canvasRef}
              timelineRef={timelineRef}
              hoverPos={hoverPos}
              isDraggingObjects={isDraggingObjects}
              isPlacementMode={isPlacementMode}
              isDraggingSelection={isDraggingSelection}
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

            <BuildModeInspectorPanel
              selectedEvent={selectedEvent}
              eventCount={events.length}
              onDeleteSelected={deleteSelected}
              onUpdateSelected={updateSelected}
              onLaunch={handleLaunch}
            />
          </>
        )}
      </div>
    </div>
  );
};
