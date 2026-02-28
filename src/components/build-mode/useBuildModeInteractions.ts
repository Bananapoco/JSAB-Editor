import React, {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
  useCallback,
  useEffect,
} from 'react';
import { SNAP_INTERVALS } from './constants';
import { SnapInterval } from './types';

interface UseBuildModeInteractionsParams {
  audioFile: File | null;
  audioRef: MutableRefObject<HTMLAudioElement | null>;
  audioUrlRef: MutableRefObject<string | null>;
  isPlaying: boolean;
  setIsPlaying: Dispatch<SetStateAction<boolean>>;
  bpm: number;
  currentTime: number;
  audioDuration: number;
  setAudioDuration: Dispatch<SetStateAction<number>>;
  setCurrentTime: Dispatch<SetStateAction<number>>;
  snapEnabled: boolean;
  snapInterval: SnapInterval;
  isScrubbing: boolean;
  setIsScrubbing: Dispatch<SetStateAction<boolean>>;
  timelineRef: RefObject<HTMLDivElement | null>;
}

interface BuildModePlaybackHandlers {
  togglePlay: () => void;
  seekTo: (ratio: number) => void;
  skipByBeats: (beats: number) => void;
  handleTimelineScrubStart: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleTimelineScrubMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleTimelineScrubEnd: () => void;
  cleanupAudioUrl: () => void;
}

export function useBuildModeInteractions({
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
}: UseBuildModeInteractionsParams): BuildModePlaybackHandlers {
  const snapToGrid = useCallback((time: number): number => {
    if (bpm <= 0) return time;

    const snapConfig = SNAP_INTERVALS.find(interval => interval.value === snapInterval);
    if (!snapConfig) return time;

    const beatDuration = 60 / bpm;
    const snapUnit = beatDuration / snapConfig.divisor;
    return Math.round(time / snapUnit) * snapUnit;
  }, [bpm, snapInterval]);

  const seekTo = useCallback((ratio: number) => {
    let time = Math.max(0, Math.min(1, ratio)) * audioDuration;

    if (snapEnabled && bpm > 0) {
      time = snapToGrid(time);
    }

    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, [audioDuration, snapEnabled, bpm, snapToGrid, setCurrentTime, audioRef]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    audioRef.current.play();
    setIsPlaying(true);
  }, [audioRef, isPlaying, setIsPlaying]);

  useEffect(() => {
    if (!audioFile) return;

    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }

    const url = URL.createObjectURL(audioFile);
    audioUrlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;

    audio.addEventListener('loadedmetadata', () => setAudioDuration(audio.duration));
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => {
      audio.pause();
    };
  }, [audioFile, audioRef, audioUrlRef, setAudioDuration, setCurrentTime, setIsPlaying]);

  const handleTimelineScrubStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);

    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }

    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(ratio);
  }, [audioRef, isPlaying, seekTo, setIsScrubbing, timelineRef]);

  const handleTimelineScrubMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;

    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;

    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(ratio);
  }, [isScrubbing, timelineRef, seekTo]);

  const handleTimelineScrubEnd = useCallback(() => {
    setIsScrubbing(false);
  }, [setIsScrubbing]);

  useEffect(() => {
    const onGlobalMouseUp = () => {
      if (isScrubbing) {
        setIsScrubbing(false);
      }
    };

    const onGlobalMouseMove = (e: MouseEvent) => {
      if (!isScrubbing || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seekTo(ratio);
    };

    window.addEventListener('mouseup', onGlobalMouseUp);
    window.addEventListener('mousemove', onGlobalMouseMove);

    return () => {
      window.removeEventListener('mouseup', onGlobalMouseUp);
      window.removeEventListener('mousemove', onGlobalMouseMove);
    };
  }, [isScrubbing, setIsScrubbing, seekTo, timelineRef]);

  const skipByBeats = useCallback((beats: number) => {
    if (bpm <= 0) return;

    const beatDuration = 60 / bpm;
    const nextTime = Math.max(0, Math.min(audioDuration, currentTime + beats * beatDuration));
    setCurrentTime(nextTime);

    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  }, [bpm, audioDuration, currentTime, setCurrentTime, audioRef]);

  const cleanupAudioUrl = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
    }
  }, [audioUrlRef]);

  return {
    togglePlay,
    seekTo,
    skipByBeats,
    handleTimelineScrubStart,
    handleTimelineScrubMove,
    handleTimelineScrubEnd,
    cleanupAudioUrl,
  };
}
