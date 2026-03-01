import { Dispatch, MutableRefObject, SetStateAction, useEffect } from 'react';
import { GAME_W, GAME_H, SNAP_INTERVALS } from './constants';
import { PlacedEvent, SnapInterval } from './types';

interface UseBuildModeKeyboardShortcutsParams {
  selectedIdRef: MutableRefObject<number | null>;
  selectedIdsRef: MutableRefObject<number[]>;
  eventsRef: MutableRefObject<PlacedEvent[]>;
  copiedEventsRef: MutableRefObject<Omit<PlacedEvent, 'id'>[] | null>;
  pasteNudgeRef: MutableRefObject<number>;
  nextIdRef: MutableRefObject<number>;
  setEvents: Dispatch<SetStateAction<PlacedEvent[]>>;
  setSelectedId: Dispatch<SetStateAction<number | null>>;
  setSelectedIds: Dispatch<SetStateAction<number[]>>;
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  isPlayingRef: MutableRefObject<boolean>;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  onEscape: () => void;
  bpmRef: MutableRefObject<number>;
  snapIntervalRef: MutableRefObject<SnapInterval>;
  snapEnabledRef: MutableRefObject<boolean>;
  audioDurationRef: MutableRefObject<number>;
  currentTimeRef: MutableRefObject<number>;
  setCurrentTime: Dispatch<SetStateAction<number>>;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelectedCustomKeyframe?: () => boolean;
  onEnterSelectMode?: () => void;
}

export function useBuildModeKeyboardShortcuts({
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
  onEscape,
  bpmRef,
  snapIntervalRef,
  snapEnabledRef,
  audioDurationRef,
  currentTimeRef,
  setCurrentTime,
  onUndo,
  onRedo,
  onDeleteSelectedCustomKeyframe,
  onEnterSelectMode,
}: UseBuildModeKeyboardShortcutsParams) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return;

      const isMod = e.metaKey || e.ctrlKey;

      if (isMod && e.code === 'KeyZ') {
        e.preventDefault();
        if (e.shiftKey) {
          onRedo();
        } else {
          onUndo();
        }
        return;
      }

      if (isMod && e.code === 'KeyY') {
        e.preventDefault();
        onRedo();
        return;
      }

      if (isMod && e.code === 'KeyC') {
        const ids = selectedIdsRef.current.length > 0
          ? selectedIdsRef.current
          : (selectedIdRef.current !== null ? [selectedIdRef.current] : []);
        if (ids.length === 0) return;

        const selectedEvents = eventsRef.current.filter(ev => ids.includes(ev.id));
        if (selectedEvents.length === 0) return;

        copiedEventsRef.current = selectedEvents.map(({ id, ...rest }) => JSON.parse(JSON.stringify(rest)));
        pasteNudgeRef.current = 0;
        e.preventDefault();
        return;
      }

      if (isMod && e.code === 'KeyV') {
        if (!copiedEventsRef.current || copiedEventsRef.current.length === 0) return;

        pasteNudgeRef.current += 1;
        const nudge = 16 * pasteNudgeRef.current;
        const clones = copiedEventsRef.current.map(ev => ({
          ...JSON.parse(JSON.stringify(ev)),
          id: nextIdRef.current++,
          x: Math.max(0, Math.min(GAME_W, ev.x + nudge)),
          y: Math.max(0, Math.min(GAME_H, ev.y + nudge)),
        }));

        setEvents(prev => [...prev, ...clones]);
        const newIds = clones.map(ev => ev.id);
        setSelectedIds(newIds);
        setSelectedId(newIds[0] ?? null);
        e.preventDefault();
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (!audioRef.current) return;

        if (isPlayingRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        } else {
          audioRef.current.play();
          setIsPlaying(true);
        }
      }

      if (e.code === 'Delete' || e.code === 'Backspace') {
        if (onDeleteSelectedCustomKeyframe?.()) {
          e.preventDefault();
          return;
        }

        const ids = selectedIdsRef.current.length > 0
          ? selectedIdsRef.current
          : (selectedIdRef.current !== null ? [selectedIdRef.current] : []);

        if (ids.length > 0) {
          setEvents(prev => prev.filter(ev => !ids.includes(ev.id)));
          setSelectedId(null);
          setSelectedIds([]);
          e.preventDefault();
        }
      }

      if (e.code === 'KeyS' && !isMod) {
        e.preventDefault();
        onEnterSelectMode?.();
        return;
      }

      if (e.code === 'Escape') {
        e.preventDefault();
        onEscape();
      }

      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();

        const beatDuration = bpmRef.current > 0 ? 60 / bpmRef.current : 0;
        const snapConfig = SNAP_INTERVALS.find(s => s.value === snapIntervalRef.current);

        const stepSec = (snapEnabledRef.current && beatDuration > 0 && snapConfig)
          ? beatDuration / snapConfig.divisor
          : (beatDuration > 0 ? beatDuration : 0.1);

        const direction = e.code === 'ArrowRight' ? 1 : -1;
        const nextTime = Math.max(
          0,
          Math.min(audioDurationRef.current, currentTimeRef.current + direction * stepSec),
        );

        setCurrentTime(nextTime);
        if (audioRef.current) {
          audioRef.current.currentTime = nextTime;
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    audioRef,
    audioDurationRef,
    bpmRef,
    copiedEventsRef,
    currentTimeRef,
    eventsRef,
    isPlayingRef,
    nextIdRef,
    onEscape,
    onUndo,
    onRedo,
    onDeleteSelectedCustomKeyframe,
    onEnterSelectMode,
    pasteNudgeRef,
    selectedIdRef,
    selectedIdsRef,
    setCurrentTime,
    setEvents,
    setIsPlaying,
    setSelectedId,
    setSelectedIds,
    snapEnabledRef,
    snapIntervalRef,
  ]);
}
