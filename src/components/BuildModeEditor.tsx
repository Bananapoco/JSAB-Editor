import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MousePointer2, Square, Circle, Triangle, Diamond, Hexagon, Star,
  Zap, Target, Move, RotateCw, Maximize2, Play, Pause, Trash2,
  Upload, Sparkles, Rocket, X, ChevronLeft, Music, Palette, Settings,
  Volume2, Clock, ArrowRight, Magnet, SkipBack, SkipForward
} from 'lucide-react';
import { LevelData, LevelEvent, LevelEventType } from '../game/types';
import { EventBus } from '../game/EventBus';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPESE
// ═══════════════════════════════════════════════════════════════════════════════

type Tool = 'projectile_throw' | 'spawn_obstacle' | 'screen_shake' | 'pulse';
type BehaviorType = 'homing' | 'spinning' | 'bouncing' | 'static' | 'sweep';
type ShapeType = 'square' | 'circle' | 'triangle' | 'diamond' | 'hexagon' | 'star';
type SnapInterval = '1/4' | '1/2' | '1' | '2' | '4';

// Beat snap intervals (fraction of a beat)
const SNAP_INTERVALS: { value: SnapInterval; label: string; divisor: number }[] = [
  { value: '1/4', label: '1/4', divisor: 4 },
  { value: '1/2', label: '1/2', divisor: 2 },
  { value: '1', label: '1', divisor: 1 },
  { value: '2', label: '2', divisor: 0.5 },
  { value: '4', label: '4', divisor: 0.25 },
];

interface PlacedEvent extends LevelEvent {
  id: number;
  shape?: ShapeType;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const GAME_W = 1024;
const GAME_H = 768;
const CANVAS_W = 640;
const CANVAS_H = Math.round(CANVAS_W * GAME_H / GAME_W);
const SCALE = CANVAS_W / GAME_W;
const SELECTION_CLICK_DEADZONE_PX = 8;

// Tool configurations with icons and colors
const TOOLS: Record<string, { icon: React.FC<any>; color: string; label: string }> = {
  projectile_throw: { icon: Rocket, color: '#FF0099', label: 'Projectile' },
  spawn_obstacle: { icon: Square, color: '#FF6B00', label: 'Obstacle' },
  screen_shake: { icon: Zap, color: '#FFEE00', label: 'Shake' },
  pulse: { icon: Target, color: '#00FF88', label: 'Pulse' },
  boss_move: { icon: Move, color: '#9966FF', label: 'Boss Move' },
};

// Shapes for the shape picker
const SHAPES: { type: ShapeType; icon: React.FC<any>; label: string }[] = [
  { type: 'square', icon: Square, label: 'Square' },
  { type: 'circle', icon: Circle, label: 'Circle' },
  { type: 'triangle', icon: Triangle, label: 'Triangle' },
  { type: 'diamond', icon: Diamond, label: 'Diamond' },
  { type: 'hexagon', icon: Hexagon, label: 'Hexagon' },
  { type: 'star', icon: Star, label: 'Star' },
];

// Behaviors with icons
const BEHAVIORS: { type: BehaviorType; icon: React.FC<any>; label: string }[] = [
  { type: 'homing', icon: Target, label: 'Homing' },
  { type: 'spinning', icon: RotateCw, label: 'Spinning' },
  { type: 'bouncing', icon: ArrowRight, label: 'Bouncing' },
  { type: 'static', icon: Square, label: 'Static' },
  { type: 'sweep', icon: Move, label: 'Sweep' },
];

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface Props {
  onClose: () => void;
  onSwitchToAI: () => void;
}

export const BuildModeEditor: React.FC<Props> = ({ onClose, onSwitchToAI }) => {
  // ─── State ─────────────────────────────────────────────────────────────────
  const [events, setEvents] = useState<PlacedEvent[]>([]);
  const nextIdRef = useRef(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Tool state
  const [activeTool, setActiveTool] = useState<Tool>('projectile_throw');
  const [isPlacementMode, setIsPlacementMode] = useState(true);
  const [activeShape, setActiveShape] = useState<ShapeType>('square');
  const [activeBehavior, setActiveBehavior] = useState<BehaviorType>('homing');
  const [activeSize, setActiveSize] = useState(50);
  const [activeDuration, setActiveDuration] = useState(2);

  // Level metadata
  const [bossName, setBossName] = useState('My Level');
  const [bpm, setBpm] = useState(120);
  const [enemyColor, setEnemyColor] = useState('#FF0099');
  const [bgColor, setBgColor] = useState('#0A0A1A');
  const [playerColor, setPlayerColor] = useState('#00FFFF');

  // Audio
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDuration, setAudioDuration] = useState(60);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);

  // Timeline scrubbing & snap
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapInterval, setSnapInterval] = useState<SnapInterval>('1');
  const [showSnapMenu, setShowSnapMenu] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverPos, setHoverPos] = useState<{ gx: number; gy: number } | null>(null);

  // Panel state
  const [activePanel, setActivePanel] = useState<'tools' | 'shapes' | 'settings'>('tools');


  const selectedEvent = events.find(e => e.id === selectedId) ?? null;
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

  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [selectionRect, setSelectionRect] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isDraggingObjects, setIsDraggingObjects] = useState(false);
  const dragStateRef = useRef<{ lastGX: number; lastGY: number } | null>(null);

  // ─── Keyboard Shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        if (audioRef.current) {
          if (isPlayingRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
          } else {
            audioRef.current.play();
            setIsPlaying(true);
          }
        }
      }
      
      if (e.code === 'Delete' || e.code === 'Backspace') {
        const ids = selectedIdsRef.current.length > 0
          ? selectedIdsRef.current
          : (selectedIdRef.current !== null ? [selectedIdRef.current] : []);
        if (ids.length > 0) {
          setEvents(prev => prev.filter(ev => !ids.includes(ev.id)));
          setSelectedId(null);
          setSelectedIds([]);
        }
      }

      if (e.code === 'Escape') {
        setIsPlacementMode(false);
        isPlacementModeRef.current = false;
        setIsDraggingObjects(false);
        setIsDraggingSelection(false);
        setSelectionRect(null);
        dragStateRef.current = null;
      }

      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();

        const currentBpm = bpmRef.current;
        const beatDuration = currentBpm > 0 ? 60 / currentBpm : 0;
        const snapConfig = SNAP_INTERVALS.find(s => s.value === snapIntervalRef.current);

        // If magnet is enabled, use its interval. Otherwise fall back to 1 beat.
        const stepSec = (snapEnabledRef.current && beatDuration > 0 && snapConfig)
          ? beatDuration / snapConfig.divisor
          : (beatDuration > 0 ? beatDuration : 0.1);

        const direction = e.code === 'ArrowRight' ? 1 : -1;
        const nextTime = Math.max(
          0,
          Math.min(audioDurationRef.current, currentTimeRef.current + direction * stepSec)
        );

        setCurrentTime(nextTime);
        if (audioRef.current) audioRef.current.currentTime = nextTime;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // ─── Canvas Drawing ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    // Background with gradient
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, shiftColor(bgColor, -10));
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    // Grid (subtle dots)
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let x = 0; x < CANVAS_W; x += 32) {
      for (let y = 0; y < CANVAS_H; y += 32) {
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw events
    events.forEach(event => {
      const cx = event.x * SCALE;
      const cy = event.y * SCALE;
      const s = (event.size ?? 40) * SCALE;
      const isSelected = selectedIds.includes(event.id) || event.id === selectedId;
      const timeDiff = Math.abs(event.timestamp - currentTime);
      const alpha = isSelected ? 1 : timeDiff < 4 ? 0.9 : 0.4;
      const col = isSelected ? '#FFFFFF' : enemyColor;
      const shape = event.shape || 'square';

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(cx, cy);
      ctx.rotate(((event.rotation ?? 0) * Math.PI) / 180);

      // Draw shape based on type
      drawShape(ctx, shape, s, col, isSelected);

      if (isSelected) {
        ctx.rotate(-((event.rotation ?? 0) * Math.PI) / 180);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${event.timestamp.toFixed(1)}s`, 0, -s / 2 - 8);
      }

      ctx.restore();
    });

    // Selection rectangle
    if (selectionRect && !isPlacementMode) {
      const x = Math.min(selectionRect.x1, selectionRect.x2) * SCALE;
      const y = Math.min(selectionRect.y1, selectionRect.y2) * SCALE;
      const w = Math.abs(selectionRect.x2 - selectionRect.x1) * SCALE;
      const h = Math.abs(selectionRect.y2 - selectionRect.y1) * SCALE;

      ctx.save();
      ctx.fillStyle = 'rgba(0,255,255,0.14)';
      ctx.strokeStyle = '#00FFFF';
      ctx.lineWidth = 1.5;
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
      ctx.restore();
    }

    // Hover preview (only while placing)
    if (hoverPos && isPlacementMode) {
      const s = activeSize * SCALE;
      const col = TOOLS[activeTool]?.color ?? enemyColor;
      
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.translate(hoverPos.gx * SCALE, hoverPos.gy * SCALE);
      drawShape(ctx, activeShape, s, col, false);
      ctx.restore();
    }

    // Player (center)
    const px = 512 * SCALE;
    const py = 384 * SCALE;
    ctx.save();
    ctx.fillStyle = playerColor;
    ctx.globalAlpha = 0.9;
    ctx.shadowColor = playerColor;
    ctx.shadowBlur = 12;
    ctx.fillRect(px - 10, py - 10, 20, 20);
    ctx.restore();

  }, [events, selectedId, selectedIds, currentTime, hoverPos, selectionRect, activeTool, isPlacementMode, activeSize, activeShape, bgColor, enemyColor, playerColor]);

  // ─── Audio Setup ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioFile) return;

    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
    const url = URL.createObjectURL(audioFile);
    audioUrlRef.current = url;

    const audio = new Audio(url);
    audioRef.current = audio;
    audio.addEventListener('loadedmetadata', () => setAudioDuration(audio.duration));
    audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
    audio.addEventListener('ended', () => setIsPlaying(false));

    return () => { audio.pause(); };
  }, [audioFile]);

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (ratio: number) => {
    let t = Math.max(0, Math.min(1, ratio)) * audioDuration;
    
    // Apply snap if enabled
    if (snapEnabled && bpm > 0) {
      t = snapToGrid(t);
    }
    
    setCurrentTime(t);
    if (audioRef.current) audioRef.current.currentTime = t;
  };

  // Snap time to nearest beat grid position
  const snapToGrid = (time: number): number => {
    if (bpm <= 0) return time;
    
    const snapConfig = SNAP_INTERVALS.find(s => s.value === snapInterval);
    if (!snapConfig) return time;
    
    // Calculate beat duration and snap unit
    const beatDuration = 60 / bpm;
    const snapUnit = beatDuration / snapConfig.divisor;
    
    // Snap to nearest unit
    return Math.round(time / snapUnit) * snapUnit;
  };

  // Timeline scrubbing handlers
  const handleTimelineScrubStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsScrubbing(true);
    
    // Pause audio while scrubbing
    if (audioRef.current && isPlaying) {
      audioRef.current.pause();
    }
    
    // Immediately seek to click position
    const rect = timelineRef.current?.getBoundingClientRect();
    if (rect) {
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seekTo(ratio);
    }
  };

  const handleTimelineScrubMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    
    const rect = timelineRef.current?.getBoundingClientRect();
    if (rect) {
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seekTo(ratio);
    }
  };

  const handleTimelineScrubEnd = () => {
    setIsScrubbing(false);
  };

  // Global mouse up listener for scrubbing
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isScrubbing) {
        setIsScrubbing(false);
      }
    };
    
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isScrubbing || !timelineRef.current) return;
      
      const rect = timelineRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seekTo(ratio);
    };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isScrubbing, snapEnabled, snapInterval, bpm, audioDuration]);

  // Skip forward/back by beat
  const skipByBeats = (beats: number) => {
    if (bpm <= 0) return;
    const beatDuration = 60 / bpm;
    const newTime = Math.max(0, Math.min(audioDuration, currentTime + (beats * beatDuration)));
    setCurrentTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
  };

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;
    return { cx, cy, gx: cx / SCALE, gy: cy / SCALE };
  };

  const findEventAtCanvasPos = (cx: number, cy: number): number | null => {
    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];
      const s = (ev.size ?? 40) * SCALE;
      const ex = ev.x * SCALE;
      const ey = ev.y * SCALE;
      if (cx >= ex - s / 2 && cx <= ex + s / 2 && cy >= ey - s / 2 && cy <= ey + s / 2) {
        return ev.id;
      }
    }
    return null;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    if (!pos) return;

    const hitId = findEventAtCanvasPos(pos.cx, pos.cy);

    // While placing, disable box-select / drag-move interactions.
    if (isPlacementMode) {
      // Place immediately on click while in placement mode.
      const id = nextIdRef.current++;
      const newEvent: PlacedEvent = {
        id,
        timestamp: parseFloat(currentTime.toFixed(3)),
        type: activeTool as LevelEventType,
        x: Math.min(Math.max(Math.round(pos.gx), 0), GAME_W),
        y: Math.min(Math.max(Math.round(pos.gy), 0), GAME_H),
        size: activeSize,
        behavior: activeBehavior,
        duration: activeDuration,
        rotation: 0,
        shape: activeShape,
      };
      setEvents(prev => [...prev, newEvent]);
      setSelectedId(id);
      setSelectedIds([id]);
      return;
    }

    const hitInSelection = hitId !== null && selectedIds.includes(hitId);

    if (hitId !== null) {
      const newSelection = hitInSelection
        ? (selectedIds.length > 0 ? selectedIds : [hitId])
        : [hitId];
      setSelectedIds(newSelection);
      setSelectedId(hitId);
      setIsDraggingObjects(true);
      dragStateRef.current = { lastGX: pos.gx, lastGY: pos.gy };
      return;
    }

    setIsDraggingSelection(true);
    setSelectionRect({ x1: pos.gx, y1: pos.gy, x2: pos.gx, y2: pos.gy });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
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

      const idsToMove = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
      if (idsToMove.length === 0) return;

      setEvents(prev => prev.map(ev => {
        if (!idsToMove.includes(ev.id)) return ev;
        return {
          ...ev,
          x: Math.max(0, Math.min(GAME_W, ev.x + dx)),
          y: Math.max(0, Math.min(GAME_H, ev.y + dy)),
        };
      }));
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);

    // Always clean up drag states regardless of mode
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
          .filter(ev => ev.x >= xMin && ev.x <= xMax && ev.y >= yMin && ev.y <= yMax)
          .map(ev => ev.id);
        setSelectedIds(ids);
        setSelectedId(ids.length > 0 ? ids[0] : null);
      }
    }

    setIsDraggingSelection(false);
    setSelectionRect(null);
  };

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPlacementMode) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    let time = ratio * audioDuration;
    
    // Apply snap if enabled
    if (snapEnabled && bpm > 0) {
      time = snapToGrid(time);
    }

    const id = nextIdRef.current++;
    const newEvent: PlacedEvent = {
      id,
      timestamp: parseFloat(time.toFixed(3)),
      type: activeTool as LevelEventType,
      x: 512,
      y: 384,
      size: activeSize,
      behavior: activeBehavior,
      duration: activeDuration,
      rotation: 0,
      shape: activeShape,
    };
    setEvents(prev => [...prev, newEvent]);
    setSelectedId(id);
  };

  const deleteSelected = () => {
    const ids = selectedIds.length > 0 ? selectedIds : (selectedId !== null ? [selectedId] : []);
    if (ids.length === 0) return;
    setEvents(prev => prev.filter(e => !ids.includes(e.id)));
    setSelectedId(null);
    setSelectedIds([]);
  };

  const updateSelected = (updates: Partial<PlacedEvent>) => {
    setEvents(prev => prev.map(e => e.id === selectedId ? { ...e, ...updates } : e));
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

    const levelData: LevelData = {
      metadata: { bossName, bpm, duration: audioDuration },
      theme: { enemyColor, backgroundColor: bgColor, playerColor },
      timeline: events.map(({ id, shape, ...rest }) => rest).sort((a, b) => a.timestamp - b.timestamp),
    };

    const audioUrl = URL.createObjectURL(audioFile);
    const payload = { levelData, audioUrl, imageMappings: {} };

    const saved = JSON.parse(localStorage.getItem('community_levels') || '[]');
    saved.unshift(payload);
    localStorage.setItem('community_levels', JSON.stringify(saved));

    (window as any).pendingLevelData = payload;
    EventBus.emit('load-level', payload);
    onClose();
  };

  const formatTime = (t: number) => `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 bg-[#08080C] text-white flex flex-col z-[1100] font-sans select-none overflow-hidden">
      
      {/* ═══ TOP BAR ═══ */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-14 flex items-center px-4 gap-3 border-b border-[#1a1a2e] bg-[#0c0c14] shrink-0"
      >
        {/* Back to AI */}
        <button
          onClick={onSwitchToAI}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1a1a2e] hover:bg-[#252540] text-[#888] hover:text-white transition-all"
        >
          <ChevronLeft size={16} />
          <Sparkles size={14} />
        </button>

        {/* Mode badge */}
        <div className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#FF009920] to-[#FF660020] border border-[#FF0099] text-[#FF0099] font-bold text-sm tracking-wide">
          🛠️ BUILD
        </div>

        <div className="flex-1" />

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-[#666]">
          <span className="flex items-center gap-1">
            <Square size={12} className="text-[#FF0099]" />
            {events.length}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatTime(audioDuration)}
          </span>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-[#1a1a2e] text-[#666] hover:text-white transition-all"
        >
          <X size={18} />
        </button>
      </motion.div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* ═══ LEFT TOOLBAR ═══ */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-20 bg-[#0c0c14] border-r border-[#1a1a2e] flex flex-col items-center py-4 gap-2 shrink-0"
        >
          {/* Panel tabs */}
          <div className="flex flex-col gap-1 mb-4">
            {[
              { id: 'tools' as const, icon: Zap },
              { id: 'shapes' as const, icon: Hexagon },
              { id: 'settings' as const, icon: Settings },
            ].map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActivePanel(id)}
                className={`p-3 rounded-xl transition-all tool-btn ${
                  activePanel === id 
                    ? 'bg-[#FF0099] text-white shadow-lg shadow-[#FF009944]' 
                    : 'bg-[#1a1a2e] text-[#666] hover:text-white hover:bg-[#252540]'
                }`}
              >
                <Icon size={20} />
              </button>
            ))}
          </div>

          <div className="w-10 h-px bg-[#1a1a2e]" />

          {/* Tool buttons */}
          {Object.entries(TOOLS).map(([key, { icon: Icon, color }]) => {
            const isActive = isPlacementMode && activeTool === key;
            return (
              <motion.button
                key={key}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setActiveTool(key as Tool);
                  setIsPlacementMode(true);
                  isPlacementModeRef.current = true;
                }}
                className={`p-3 rounded-xl transition-all tool-btn relative ${
                  isActive 
                    ? 'text-white' 
                    : 'text-[#555] hover:text-white'
                }`}
                style={{ 
                  backgroundColor: isActive ? `${color}30` : '#1a1a2e',
                  boxShadow: isActive ? `0 0 20px ${color}40` : 'none',
                  borderWidth: 2,
                  borderStyle: 'solid',
                  borderColor: isActive ? color : 'transparent',
                }}
              >
                <Icon size={20} style={{ color: isActive ? color : undefined }} />
              </motion.button>
            );
          })}
        </motion.div>

        {/* ═══ LEFT PANEL ═══ */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activePanel}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="w-52 bg-[#0a0a12] border-r border-[#1a1a2e] p-4 shrink-0 overflow-y-auto"
          >
            {activePanel === 'tools' && (
              <div className="space-y-6">
                {/* Current tool info */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">Mode</div>
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[#151520] border border-[#252540]">
                    {isPlacementMode ? (
                      (() => {
                        const tool = TOOLS[activeTool];
                        const Icon = tool.icon;
                        return (
                          <>
                            <Icon size={18} style={{ color: tool.color }} />
                            <span className="text-sm font-medium">Placing: {tool.label}</span>
                          </>
                        );
                      })()
                    ) : (
                      <>
                        <MousePointer2 size={18} style={{ color: '#9ca3af' }} />
                        <span className="text-sm font-medium text-[#bbb]">Select / Move</span>
                      </>
                    )}
                  </div>
                  {isPlacementMode && (
                    <p className="text-[10px] text-[#666] mt-2">Press Esc to stop placing</p>
                  )}
                </div>

                {/* Behavior (for projectile/obstacle) */}
                {(activeTool === 'projectile_throw' || activeTool === 'spawn_obstacle') && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">Behavior</div>
                    <div className="grid grid-cols-3 gap-2">
                      {BEHAVIORS.map(({ type, icon: Icon }) => (
                        <motion.button
                          key={type}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveBehavior(type)}
                          className={`p-2.5 rounded-lg transition-all ${
                            activeBehavior === type
                              ? 'bg-[#FF0099] text-white'
                              : 'bg-[#151520] text-[#666] hover:text-white hover:bg-[#252540]'
                          }`}
                          title={type}
                        >
                          <Icon size={16} />
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Size slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#444]">Size</span>
                    <span className="text-xs font-mono text-[#FF0099]">{activeSize}px</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="200"
                    value={activeSize}
                    onChange={e => setActiveSize(+e.target.value)}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                </div>

                {/* Duration slider */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] uppercase tracking-widest text-[#444]">Duration</span>
                    <span className="text-xs font-mono text-[#FF0099]">{activeDuration.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={activeDuration}
                    onChange={e => setActiveDuration(+e.target.value)}
                    className="w-full accent-[#FF0099] cursor-pointer"
                  />
                </div>
              </div>
            )}

            {activePanel === 'shapes' && (
              <div className="space-y-4">
                <div className="text-[10px] uppercase tracking-widest text-[#444]">Pick Shape</div>
                <div className="shape-grid">
                  {SHAPES.map(({ type, icon: Icon }) => (
                    <motion.button
                      key={type}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setActiveShape(type);
                        setIsPlacementMode(true);
                        isPlacementModeRef.current = true;
                      }}
                      className={`aspect-square p-4 rounded-xl transition-all ${
                        activeShape === type
                          ? 'bg-gradient-to-br from-[#FF0099] to-[#FF6600] text-white shadow-lg shadow-[#FF009944]'
                          : 'bg-[#151520] text-[#666] hover:text-white hover:bg-[#252540] border border-[#252540]'
                      }`}
                    >
                      <Icon size={28} className="w-full h-full" />
                    </motion.button>
                  ))}
                </div>
                <p className="text-[10px] text-[#444] text-center mt-4">
                  Pick a tool to enter placing mode
                </p>
              </div>
            )}

            {activePanel === 'settings' && (
              <div className="space-y-5">
                {/* Song upload */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2 flex items-center gap-1">
                    <Music size={12} /> Song
                  </div>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    onClick={() => document.getElementById('audio-input')?.click()}
                    className="p-4 rounded-xl border-2 border-dashed border-[#00FFFF44] bg-[#00FFFF08] hover:bg-[#00FFFF12] cursor-pointer text-center transition-all"
                  >
                    <input
                      id="audio-input"
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) setAudioFile(f); }}
                    />
                    <Upload size={24} className="mx-auto mb-2 text-[#00FFFF]" />
                    <div className="text-xs text-[#00FFFF]">
                      {audioFile ? audioFile.name.slice(0, 16) : 'Drop MP3'}
                    </div>
                  </motion.div>
                </div>

                {/* BPM */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">BPM</div>
                  <input
                    type="number"
                    value={bpm}
                    onChange={e => setBpm(+e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm focus:outline-none focus:border-[#FF0099]"
                  />
                </div>

                {/* Colors */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2 flex items-center gap-1">
                    <Palette size={12} /> Colors
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: '👾 Enemy', value: enemyColor, set: setEnemyColor },
                      { label: '🌌 BG', value: bgColor, set: setBgColor },
                      { label: '🎮 Player', value: playerColor, set: setPlayerColor },
                    ].map(({ label, value, set }) => (
                      <div key={label} className="flex items-center gap-2">
                        <input
                          type="color"
                          value={value}
                          onChange={e => set(e.target.value)}
                          className="w-8 h-8 rounded-lg cursor-pointer border-2 border-[#252540]"
                        />
                        <span className="text-xs text-[#888]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Level name */}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#444] mb-2">Level Name</div>
                  <input
                    type="text"
                    value={bossName}
                    onChange={e => setBossName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm focus:outline-none focus:border-[#FF0099]"
                    placeholder="My Level"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* ═══ CENTER: Canvas + Timeline ═══ */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          
          {/* Canvas area */}
          <div className="flex-1 flex items-center justify-center bg-[#060609] p-4 relative overflow-hidden">
            <motion.canvas
              ref={canvasRef}
              width={CANVAS_W}
              height={CANVAS_H}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={() => {
                setHoverPos(null);
                setIsDraggingObjects(false);
                setIsDraggingSelection(false);
                setSelectionRect(null);
                dragStateRef.current = null;
              }}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="rounded-xl border border-[#1a1a2e] shadow-2xl max-w-full max-h-full"
              style={{ cursor: isDraggingObjects ? 'grabbing' : isPlacementMode ? 'copy' : isDraggingSelection ? 'crosshair' : 'default' }}
            />
            
            {/* Coordinate display */}
            {hoverPos && (
              <div className="absolute bottom-6 left-6 px-2 py-1 rounded bg-[#000000aa] text-xs font-mono text-[#888]">
                {Math.round(hoverPos.gx)}, {Math.round(hoverPos.gy)}
              </div>
            )}


          </div>

          {/* Playback controls */}
          <div className="h-14 flex items-center gap-3 px-4 bg-[#0a0a12] border-t border-[#1a1a2e] shrink-0">
            {/* Skip back */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => skipByBeats(-4)}
              className="p-2 rounded-lg bg-[#1a1a2e] text-[#666] hover:text-white hover:bg-[#252540] transition-all"
              title="Skip back 4 beats"
            >
              <SkipBack size={14} />
            </motion.button>

            {/* Play/Pause */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={togglePlay}
              disabled={!audioFile}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                audioFile 
                  ? 'bg-gradient-to-r from-[#FF0099] to-[#FF6600] text-white shadow-lg shadow-[#FF009944]' 
                  : 'bg-[#1a1a2e] text-[#444] cursor-not-allowed'
              }`}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
            </motion.button>

            {/* Skip forward */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => skipByBeats(4)}
              className="p-2 rounded-lg bg-[#1a1a2e] text-[#666] hover:text-white hover:bg-[#252540] transition-all"
              title="Skip forward 4 beats"
            >
              <SkipForward size={14} />
            </motion.button>

            <span className="text-sm font-mono text-[#666] min-w-[80px]">
              {formatTime(currentTime)} / {formatTime(audioDuration)}
            </span>

            {/* Progress bar */}
            <div
              className="flex-1 flex items-center cursor-pointer relative"
              style={{ height: 24 }}
              onMouseDown={e => {
                const el = e.currentTarget;
                const seek = (ev: MouseEvent | React.MouseEvent) => {
                  const rect = el.getBoundingClientRect();
                  seekTo(Math.min(1, Math.max(0, (ev.clientX - rect.left) / rect.width)));
                };
                seek(e.nativeEvent);
                const move = (ev: MouseEvent) => seek(ev);
                const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
                window.addEventListener('mousemove', move);
                window.addEventListener('mouseup', up);
              }}
            >
              {/* Track */}
              <div className="absolute inset-x-0 rounded-full bg-[#1a1a2e]" style={{ height: 6, top: '50%', transform: 'translateY(-50%)' }}>
                {/* Fill */}
                <div
                  className="h-full bg-gradient-to-r from-[#FF0099] to-[#FF6600] rounded-full"
                  style={{ width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%` }}
                />
              </div>
              {/* Thumb */}
              <div
                className="absolute rounded-full pointer-events-none"
                style={{
                  width: 16,
                  height: 16,
                  left: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'linear-gradient(135deg, #FF0099, #FF6600)',
                  boxShadow: '0 0 8px rgba(255,0,153,0.7), 0 2px 4px rgba(0,0,0,0.5)',
                  border: '2px solid rgba(255,255,255,0.4)',
                }}
              />
            </div>

            {/* Snap controls */}
            <div className="relative">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSnapMenu(!showSnapMenu)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  snapEnabled 
                    ? 'bg-[#00FFFF22] text-[#00FFFF] border border-[#00FFFF66]' 
                    : 'bg-[#1a1a2e] text-[#666] border border-transparent'
                }`}
                title="Beat Snap"
              >
                <Magnet size={14} />
                <span className="text-xs font-bold">{snapInterval}</span>
              </motion.button>

              {/* Snap dropdown */}
              <AnimatePresence>
                {showSnapMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#12121a] border border-[#252540] rounded-xl p-2 shadow-xl z-50"
                  >
                    {/* Snap toggle */}
                    <button
                      onClick={() => { setSnapEnabled(!snapEnabled); setShowSnapMenu(false); }}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-medium mb-2 transition-all ${
                        snapEnabled 
                          ? 'bg-[#00FFFF22] text-[#00FFFF]' 
                          : 'bg-[#1a1a2e] text-[#666]'
                      }`}
                    >
                      {snapEnabled ? '🧲 Snap ON' : '🧲 Snap OFF'}
                    </button>

                    {/* Interval buttons */}
                    <div className="flex gap-1">
                      {SNAP_INTERVALS.map(({ value, label }) => (
                        <button
                          key={value}
                          onClick={() => { setSnapInterval(value); setShowSnapMenu(false); }}
                          className={`w-10 h-10 rounded-lg text-xs font-bold transition-all ${
                            snapInterval === value && snapEnabled
                              ? 'bg-[#FF0099] text-white'
                              : 'bg-[#1a1a2e] text-[#666] hover:text-white hover:bg-[#252540]'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    <div className="text-[9px] text-[#444] text-center mt-2">
                      beats
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Timeline - now with draggable scrubbing */}
          <div 
            ref={timelineRef}
            className={`h-28 bg-[#08080c] border-t border-[#1a1a2e] relative overflow-hidden shrink-0 ${
              isScrubbing ? 'cursor-grabbing' : ''
            }`}
            onMouseDown={handleTimelineScrubStart}
            onMouseMove={handleTimelineScrubMove}
            onMouseUp={handleTimelineScrubEnd}
            onMouseLeave={handleTimelineScrubEnd}
          >
            {/* Beat grid - enhanced with snap visualization */}
            {bpm > 0 && audioDuration > 0 && (() => {
              const beatDuration = 60 / bpm;
              const snapConfig = SNAP_INTERVALS.find(s => s.value === snapInterval);
              const snapUnit = snapConfig ? beatDuration / snapConfig.divisor : beatDuration;
              const totalSnaps = Math.floor(audioDuration / snapUnit);
              
              return Array.from({ length: totalSnaps + 1 }).map((_, i) => {
                const t = i * snapUnit;
                const left = (t / audioDuration) * 100;
                const beatIndex = t / beatDuration;
                const isMeasure = Math.abs(beatIndex % 4) < 0.01;
                const isBeat = Math.abs(beatIndex % 1) < 0.01;
                
                return (
                  <div
                    key={i}
                    className="absolute top-0 bottom-6"
                    style={{ 
                      left: `${left}%`,
                      width: isMeasure ? '2px' : '1px',
                      backgroundColor: isMeasure 
                        ? 'rgba(255,0,153,0.35)' 
                        : isBeat 
                          ? 'rgba(255,0,153,0.15)' 
                          : snapEnabled 
                            ? 'rgba(0,255,255,0.08)' 
                            : 'rgba(255,0,153,0.04)',
                    }}
                  />
                );
              });
            })()}

            {/* Click area for placing events */}
            <div
              onClick={handleTimelineClick}
              className="absolute inset-0 bottom-6 z-[5]"
              style={{ 
                cursor: isScrubbing ? 'grabbing' : (isPlacementMode ? 'copy' : 'default'),
                pointerEvents: isScrubbing ? 'none' : 'auto'
              }}
            />

            {/* Event blocks */}
            {events.map(ev => {
              const left = audioDuration > 0 ? (ev.timestamp / audioDuration) * 100 : 0;
              const width = audioDuration > 0 ? Math.max(0.5, ((ev.duration ?? 1) / audioDuration) * 100) : 0.5;
              const col = TOOLS[ev.type]?.color ?? '#FF0099';
              const isSel = selectedIds.includes(ev.id) || ev.id === selectedId;
              
              // Show event more prominently if it's near current time
              const timeDiff = Math.abs(ev.timestamp - currentTime);
              const isNearPlayhead = timeDiff < 0.5;

              return (
                <motion.div
                  key={ev.id}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: isNearPlayhead ? 1.05 : 1, 
                    opacity: 1,
                  }}
                  onClick={e => { e.stopPropagation(); setSelectedId(ev.id); setSelectedIds([ev.id]); }}
                  className="absolute top-2 h-14 rounded-lg cursor-pointer transition-all z-[6]"
                  style={{
                    left: `${left}%`,
                    width: `${width}%`,
                    minWidth: 8,
                    backgroundColor: isSel ? `${col}77` : isNearPlayhead ? `${col}55` : `${col}33`,
                    border: `2px solid ${isSel ? '#fff' : col}`,
                    boxShadow: isSel 
                      ? `0 0 16px ${col}88, inset 0 0 20px ${col}44` 
                      : isNearPlayhead 
                        ? `0 0 12px ${col}66` 
                        : 'none',
                  }}
                />
              );
            })}

            {/* Playhead - draggable handle */}
            <div
              className="absolute top-0 bottom-6 z-20 group"
              style={{ 
                left: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {/* Playhead line */}
              <div className="absolute left-1/2 -translate-x-1/2 w-0.5 h-full bg-white shadow-lg shadow-white/60" />
              
              {/* Playhead handle (circle) */}
              <div 
                className="absolute left-1/2 -translate-x-1/2 -top-3 w-6 h-6 rounded-full cursor-grab active:cursor-grabbing flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #FF0099, #FF6600)',
                  boxShadow: '0 0 10px rgba(255,0,153,0.7), 0 2px 8px rgba(0,0,0,0.5)',
                  border: '2px solid rgba(255,255,255,0.3)',
                }}
              >
                {/* inner dot */}
                <div className="w-2 h-2 rounded-full bg-white opacity-60" />
              </div>
              
              {/* Current time tooltip - shows when scrubbing */}
              {isScrubbing && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute left-1/2 -translate-x-1/2 -top-8 px-2 py-1 rounded bg-[#FF0099] text-white text-[10px] font-mono whitespace-nowrap"
                >
                  {currentTime.toFixed(2)}s
                  {snapEnabled && bpm > 0 && (
                    <span className="ml-1 opacity-70">
                      (beat {(currentTime / (60 / bpm)).toFixed(1)})
                    </span>
                  )}
                </motion.div>
              )}
            </div>

            {/* Time ruler */}
            <div className="absolute bottom-0 left-0 right-0 h-6 border-t border-[#1a1a2e] bg-[#0a0a10] flex items-center px-2">
              {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
                <div 
                  key={ratio} 
                  className="absolute text-[10px] text-[#555] font-mono"
                  style={{ left: `${ratio * 100}%`, transform: ratio > 0.9 ? 'translateX(-100%)' : ratio > 0 ? 'translateX(-50%)' : 'none' }}
                >
                  {formatTime(ratio * audioDuration)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL: Selected Event ═══ */}
        <motion.div
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="w-56 bg-[#0a0a12] border-l border-[#1a1a2e] p-4 shrink-0 overflow-y-auto flex flex-col"
        >
          {selectedEvent ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-widest text-[#444]">Selected</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={deleteSelected}
                  className="p-1.5 rounded bg-[#ff333322] text-[#ff4444] hover:bg-[#ff333344] transition-all"
                >
                  <Trash2 size={14} />
                </motion.button>
              </div>

              {/* Type badge */}
              <div 
                className="px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                style={{ 
                  backgroundColor: `${TOOLS[selectedEvent.type]?.color}22`,
                  color: TOOLS[selectedEvent.type]?.color
                }}
              >
                {(() => {
                  const Icon = TOOLS[selectedEvent.type]?.icon || Square;
                  return <Icon size={16} />;
                })()}
                {TOOLS[selectedEvent.type]?.label || selectedEvent.type}
              </div>

              {/* Time */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1">Time</div>
                <input
                  type="number"
                  step="0.01"
                  value={selectedEvent.timestamp}
                  onChange={e => updateSelected({ timestamp: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm font-mono focus:outline-none focus:border-[#FF0099]"
                />
              </div>

              {/* Position */}
              <div className="grid grid-cols-2 gap-2">
                {(['x', 'y'] as const).map(k => (
                  <div key={k}>
                    <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1">{k}</div>
                    <input
                      type="number"
                      value={selectedEvent[k]}
                      onChange={e => updateSelected({ [k]: +e.target.value })}
                      className="w-full px-2 py-1.5 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm font-mono focus:outline-none focus:border-[#FF0099]"
                    />
                  </div>
                ))}
              </div>

              {/* Size & Rotation */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1 flex items-center gap-1">
                    <Maximize2 size={10} /> Size
                  </div>
                  <input
                    type="number"
                    value={selectedEvent.size ?? 40}
                    onChange={e => updateSelected({ size: +e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm font-mono focus:outline-none focus:border-[#FF0099]"
                  />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1 flex items-center gap-1">
                    <RotateCw size={10} /> Rot
                  </div>
                  <input
                    type="number"
                    value={selectedEvent.rotation ?? 0}
                    onChange={e => updateSelected({ rotation: +e.target.value })}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm font-mono focus:outline-none focus:border-[#FF0099]"
                  />
                </div>
              </div>

              {/* Duration */}
              <div>
                <div className="text-[10px] uppercase tracking-widest text-[#444] mb-1 flex items-center gap-1">
                  <Clock size={10} /> Duration
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={selectedEvent.duration ?? 2}
                  onChange={e => updateSelected({ duration: +e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-[#151520] border border-[#252540] text-white text-sm font-mono focus:outline-none focus:border-[#FF0099]"
                />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              <MousePointer2 size={32} className="text-[#252540] mb-3" />
              <p className="text-xs text-[#444]">Click canvas<br/>to add stuff!</p>
            </div>
          )}

          <div className="flex-1" />

          {/* Launch button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLaunch}
            className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FF0099] to-[#FF6600] text-white font-bold text-sm tracking-wide shadow-lg shadow-[#FF009944] hover:shadow-[#FF009966] transition-all flex items-center justify-center gap-2"
          >
            <Rocket size={18} />
            PLAY!
          </motion.button>

          <p className="text-[10px] text-[#333] text-center mt-2">
            {events.length} event{events.length !== 1 ? 's' : ''} ready
          </p>
        </motion.div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function drawShape(ctx: CanvasRenderingContext2D, shape: ShapeType, size: number, color: string, selected: boolean) {
  const r = size / 2;
  
  ctx.fillStyle = `${color}44`;
  ctx.strokeStyle = color;
  ctx.lineWidth = selected ? 3 : 2;
  
  if (selected) {
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
  }

  ctx.beginPath();
  
  switch (shape) {
    case 'circle':
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      break;
    case 'triangle':
      ctx.moveTo(0, -r);
      ctx.lineTo(r * 0.866, r * 0.5);
      ctx.lineTo(-r * 0.866, r * 0.5);
      ctx.closePath();
      break;
    case 'diamond':
      ctx.moveTo(0, -r);
      ctx.lineTo(r, 0);
      ctx.lineTo(0, r);
      ctx.lineTo(-r, 0);
      ctx.closePath();
      break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 2;
        const x = r * Math.cos(angle);
        const y = r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.4;
        const x = rad * Math.cos(angle);
        const y = rad * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    case 'square':
    default:
      ctx.rect(-r, -r, size, size);
      break;
  }

  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
}

function shiftColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
