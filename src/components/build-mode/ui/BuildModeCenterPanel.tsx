import React, { RefObject } from 'react';
import { BuildModeCanvasStage } from './BuildModeCanvasStage';
import { BuildModePlaybackControls } from './BuildModePlaybackControls';
import { BuildModeTimeline } from './BuildModeTimeline';
import { HoverPos, PlacedEvent, SelectionRect, SnapInterval } from '../types';

interface BuildModeCenterPanelProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  timelineRef: RefObject<HTMLDivElement | null>;
  hoverPos: HoverPos | null;
  isDraggingObjects: boolean;
  isPlacementMode: boolean;
  isDraggingSelection: boolean;
  canvasCursor: string;
  isScrubbing: boolean;
  bpm: number;
  audioFile: File | null;
  isPlaying: boolean;
  currentTime: number;
  audioDuration: number;
  snapEnabled: boolean;
  snapInterval: SnapInterval;
  showSnapMenu: boolean;
  events: PlacedEvent[];
  selectedId: number | null;
  selectedIds: number[];
  selectionRect: SelectionRect | null;
  onCanvasMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasMouseUp: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasContextMenu: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  onCanvasMouseLeave: () => void;
  onTogglePlay: () => void;
  onSkipByBeats: (beats: number) => void;
  onSeekRatio: (ratio: number) => void;
  onToggleSnapMenu: () => void;
  onToggleSnapEnabled: () => void;
  onSelectSnapInterval: (interval: SnapInterval) => void;
  onTimelineScrubStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTimelineScrubMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onTimelineScrubEnd: () => void;
  onTimelineClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onSelectEvent: (id: number) => void;
}

export const BuildModeCenterPanel: React.FC<BuildModeCenterPanelProps> = ({
  canvasRef,
  timelineRef,
  hoverPos,
  isDraggingObjects,
  isPlacementMode,
  isDraggingSelection,
  canvasCursor,
  isScrubbing,
  bpm,
  audioFile,
  isPlaying,
  currentTime,
  audioDuration,
  snapEnabled,
  snapInterval,
  showSnapMenu,
  events,
  selectedId,
  selectedIds,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
  onCanvasContextMenu,
  onCanvasMouseLeave,
  onTogglePlay,
  onSkipByBeats,
  onSeekRatio,
  onToggleSnapMenu,
  onToggleSnapEnabled,
  onSelectSnapInterval,
  onTimelineScrubStart,
  onTimelineScrubMove,
  onTimelineScrubEnd,
  onTimelineClick,
  onSelectEvent,
}) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden min-w-0">
      <BuildModeCanvasStage
        canvasRef={canvasRef}
        hoverPos={hoverPos}
        isDraggingObjects={isDraggingObjects}
        isPlacementMode={isPlacementMode}
        isDraggingSelection={isDraggingSelection}
        canvasCursor={canvasCursor}
        onMouseDown={onCanvasMouseDown}
        onMouseMove={onCanvasMouseMove}
        onMouseUp={onCanvasMouseUp}
        onContextMenu={onCanvasContextMenu}
        onMouseLeave={onCanvasMouseLeave}
      />

      <BuildModePlaybackControls
        audioFile={audioFile}
        isPlaying={isPlaying}
        currentTime={currentTime}
        audioDuration={audioDuration}
        snapEnabled={snapEnabled}
        snapInterval={snapInterval}
        showSnapMenu={showSnapMenu}
        onTogglePlay={onTogglePlay}
        onSkipByBeats={onSkipByBeats}
        onSeekRatio={onSeekRatio}
        onToggleSnapMenu={onToggleSnapMenu}
        onToggleSnapEnabled={onToggleSnapEnabled}
        onSelectSnapInterval={onSelectSnapInterval}
      />

      <BuildModeTimeline
        timelineRef={timelineRef}
        isScrubbing={isScrubbing}
        bpm={bpm}
        audioDuration={audioDuration}
        snapInterval={snapInterval}
        snapEnabled={snapEnabled}
        currentTime={currentTime}
        isPlacementMode={isPlacementMode}
        events={events}
        selectedId={selectedId}
        selectedIds={selectedIds}
        onScrubStart={onTimelineScrubStart}
        onScrubMove={onTimelineScrubMove}
        onScrubEnd={onTimelineScrubEnd}
        onTimelineClick={onTimelineClick}
        onSelectEvent={onSelectEvent}
      />
    </div>
  );
};
