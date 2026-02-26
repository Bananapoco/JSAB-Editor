import React, { useState, useEffect, useRef } from 'react';
import { LevelData, LevelEvent, LevelEventType } from '../game/types';
import { EventBus } from '../game/EventBus';

type Tool = LevelEventType | 'select';
type BehaviorType = 'homing' | 'spinning' | 'bouncing' | 'static' | 'sweep';

interface PlacedEvent extends LevelEvent {
    id: number;
}

const GAME_W = 1024;
const GAME_H = 768;
const CANVAS_W = 620;
const CANVAS_H = Math.round(CANVAS_W * GAME_H / GAME_W); // 465
const SCALE = CANVAS_W / GAME_W;

const TOOL_LABELS: Record<string, string> = {
    select:           '↖  SELECT',
    projectile_throw: '◆  PROJECTILE',
    spawn_obstacle:   '■  OBSTACLE',
    screen_shake:     '⚡  SCREEN SHAKE',
    pulse:            '◎  PULSE',
};

const TOOL_COLORS: Record<string, string> = {
    select:           '#555566',
    projectile_throw: '#FF0099',
    spawn_obstacle:   '#ff6600',
    screen_shake:     '#ffee00',
    pulse:            '#00ff88',
};

const BEHAVIOR_LABELS: Record<BehaviorType, string> = {
    homing:   '⟶  HOMING',
    spinning: '↺  SPINNING',
    bouncing: '⤢  BOUNCING',
    static:   '■  STATIC',
    sweep:    '⟿  SWEEP',
};

interface Props {
    onClose: () => void;
    onSwitchToAI: () => void;
}

export const BuildModeEditor: React.FC<Props> = ({ onClose, onSwitchToAI }) => {
    // Events
    const [events, setEvents] = useState<PlacedEvent[]>([]);
    const nextIdRef = useRef(0);
    const [selectedId, setSelectedId] = useState<number | null>(null);

    // Tool settings
    const [activeTool, setActiveTool] = useState<Tool>('projectile_throw');
    const [activeBehavior, setActiveBehavior] = useState<BehaviorType>('homing');
    const [activeSize, setActiveSize] = useState(40);
    const [activeDuration, setActiveDuration] = useState(2);

    // Level metadata
    const [bossName, setBossName] = useState('My Level');
    const [bpm, setBpm] = useState(120);
    const [enemyColor, setEnemyColor] = useState('#FF0099');
    const [bgColor, setBgColor] = useState('#0a0010');
    const [playerColor, setPlayerColor] = useState('#00ffff');

    // Audio
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [audioDuration, setAudioDuration] = useState(60);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDraggingAudio, setIsDraggingAudio] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const audioObjectUrlRef = useRef<string | null>(null);

    // Canvas
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hoverPos, setHoverPos] = useState<{ gx: number; gy: number } | null>(null);

    const selectedEvent = events.find(e => e.id === selectedId) ?? null;
    const selectedIdRef = useRef(selectedId);
    selectedIdRef.current = selectedId;
    const isPlayingRef = useRef(isPlaying);
    isPlayingRef.current = isPlaying;

    // ── Keyboard shortcuts ─────────────────────────────────────────────────────
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
            if ((e.code === 'Delete' || e.code === 'Backspace') && selectedIdRef.current !== null) {
                setEvents(prev => prev.filter(ev => ev.id !== selectedIdRef.current));
                setSelectedId(null);
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    // ── Canvas Drawing ─────────────────────────────────────────────────────────
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Background
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Subtle grid
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 16; i++) {
            ctx.beginPath();
            ctx.moveTo((CANVAS_W / 16) * i, 0);
            ctx.lineTo((CANVAS_W / 16) * i, CANVAS_H);
            ctx.stroke();
        }
        for (let i = 1; i < 12; i++) {
            ctx.beginPath();
            ctx.moveTo(0, (CANVAS_H / 12) * i);
            ctx.lineTo(CANVAS_W, (CANVAS_H / 12) * i);
            ctx.stroke();
        }

        // Center crosshair
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.setLineDash([4, 8]);
        ctx.beginPath();
        ctx.moveTo(CANVAS_W / 2, 0); ctx.lineTo(CANVAS_W / 2, CANVAS_H);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_H / 2); ctx.lineTo(CANVAS_W, CANVAS_H / 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw events
        events.forEach(event => {
            const cx = event.x * SCALE;
            const cy = event.y * SCALE;
            const s = (event.size ?? 40) * SCALE;
            const isSelected = event.id === selectedId;
            const timeDiff = Math.abs(event.timestamp - currentTime);
            const alpha = isSelected ? 1 : timeDiff < 4 ? 0.85 : 0.3;
            const col = isSelected ? '#ffffff' : enemyColor;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(cx, cy);
            ctx.rotate(((event.rotation ?? 0) * Math.PI) / 180);

            if (event.type === 'screen_shake' || event.type === 'pulse') {
                ctx.beginPath();
                ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
                ctx.fillStyle = `${col}22`;
                ctx.fill();
                ctx.strokeStyle = col;
                ctx.lineWidth = isSelected ? 2 : 1;
                ctx.stroke();
            } else {
                ctx.fillStyle = `${col}33`;
                ctx.fillRect(-s / 2, -s / 2, s, s);
                ctx.strokeStyle = col;
                ctx.lineWidth = isSelected ? 2 : 1;
                if (isSelected) {
                    ctx.shadowColor = col;
                    ctx.shadowBlur = 14;
                }
                ctx.strokeRect(-s / 2, -s / 2, s, s);
                ctx.shadowBlur = 0;
            }

            // Timestamp label for selected
            if (isSelected) {
                ctx.rotate(-((event.rotation ?? 0) * Math.PI) / 180);
                ctx.shadowBlur = 0;
                ctx.globalAlpha = 1;
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(`${event.timestamp.toFixed(2)}s`, 0, -s / 2 - 7);
            }

            ctx.restore();
        });

        // Hover preview
        if (hoverPos && activeTool !== 'select') {
            const s = activeSize * SCALE;
            const col = TOOL_COLORS[activeTool] ?? enemyColor;
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = `${col}33`;
            ctx.fillRect(hoverPos.gx * SCALE - s / 2, hoverPos.gy * SCALE - s / 2, s, s);
            ctx.strokeStyle = col;
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.strokeRect(hoverPos.gx * SCALE - s / 2, hoverPos.gy * SCALE - s / 2, s, s);
            ctx.setLineDash([]);
            ctx.restore();
        }

        // Player indicator (center of screen)
        const px = 512 * SCALE;
        const py = 384 * SCALE;
        ctx.save();
        ctx.fillStyle = playerColor;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(px - 8, py - 8, 16, 16);
        ctx.strokeStyle = `${playerColor}88`;
        ctx.lineWidth = 1;
        ctx.strokeRect(px - 8, py - 8, 16, 16);
        ctx.restore();

    }, [events, selectedId, currentTime, hoverPos, activeTool, activeSize, bgColor, enemyColor, playerColor]);

    // ── Audio Setup ─────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!audioFile) return;

        if (audioObjectUrlRef.current) {
            URL.revokeObjectURL(audioObjectUrlRef.current);
        }
        const url = URL.createObjectURL(audioFile);
        audioObjectUrlRef.current = url;

        const audio = new Audio(url);
        audioRef.current = audio;

        audio.addEventListener('loadedmetadata', () => setAudioDuration(audio.duration));
        audio.addEventListener('timeupdate', () => setCurrentTime(audio.currentTime));
        audio.addEventListener('ended', () => setIsPlaying(false));

        return () => {
            audio.pause();
        };
    }, [audioFile]);

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
        const t = Math.max(0, Math.min(1, ratio)) * audioDuration;
        setCurrentTime(t);
        if (audioRef.current) audioRef.current.currentTime = t;
    };

    // ── Canvas Interactions ──────────────────────────────────────────────────────
    const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        const gx = Math.round(cx / SCALE);
        const gy = Math.round(cy / SCALE);

        if (activeTool === 'select') {
            let found: number | null = null;
            for (let i = events.length - 1; i >= 0; i--) {
                const ev = events[i];
                const s = (ev.size ?? 40) * SCALE;
                const ex = ev.x * SCALE;
                const ey = ev.y * SCALE;
                if (cx >= ex - s / 2 && cx <= ex + s / 2 && cy >= ey - s / 2 && cy <= ey + s / 2) {
                    found = ev.id;
                    break;
                }
            }
            setSelectedId(found);
        } else {
            const id = nextIdRef.current++;
            const newEvent: PlacedEvent = {
                id,
                timestamp: parseFloat(currentTime.toFixed(3)),
                type: activeTool as LevelEventType,
                x: Math.min(Math.max(gx, 0), GAME_W),
                y: Math.min(Math.max(gy, 0), GAME_H),
                size: activeSize,
                behavior: activeBehavior,
                duration: activeDuration,
                rotation: 0,
            };
            setEvents(prev => [...prev, newEvent]);
            setSelectedId(id);
        }
    };

    const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const scaleX = CANVAS_W / rect.width;
        const scaleY = CANVAS_H / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;
        setHoverPos({ gx: cx / SCALE, gy: cy / SCALE });
    };

    // ── Timeline Interactions ────────────────────────────────────────────────────
    const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = ratio * audioDuration;

        if (activeTool === 'select') {
            seekTo(ratio);
        } else {
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
            };
            setEvents(prev => [...prev, newEvent]);
            setSelectedId(id);
        }
    };

    const deleteSelected = () => {
        if (selectedId === null) return;
        setEvents(prev => prev.filter(e => e.id !== selectedId));
        setSelectedId(null);
    };

    const updateSelected = (updates: Partial<PlacedEvent>) => {
        setEvents(prev => prev.map(e => e.id === selectedId ? { ...e, ...updates } : e));
    };

    // ── Save / Launch ────────────────────────────────────────────────────────────
    const handleLaunch = () => {
        if (!audioFile) {
            alert('Please upload an audio file first!');
            return;
        }
        if (events.length === 0) {
            alert('Place at least one event before launching!');
            return;
        }

        const levelData: LevelData = {
            metadata: {
                bossName,
                bpm,
                duration: audioDuration,
            },
            theme: {
                enemyColor,
                backgroundColor: bgColor,
                playerColor,
            },
            timeline: events
                .map(({ id, ...rest }) => rest)
                .sort((a, b) => a.timestamp - b.timestamp),
        };

        const audioUrl = URL.createObjectURL(audioFile);
        const payload = { levelData, audioUrl, imageMappings: {} };

        const savedLevels = JSON.parse(localStorage.getItem('community_levels') || '[]');
        savedLevels.unshift(payload);
        localStorage.setItem('community_levels', JSON.stringify(savedLevels));

        (window as any).pendingLevelData = payload;
        EventBus.emit('load-level', payload);
        onClose();
    };

    const formatTime = (t: number) => {
        const m = Math.floor(t / 60);
        const s = Math.floor(t % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const beatCount = bpm > 0 && audioDuration > 0
        ? Math.floor((audioDuration * bpm) / 60)
        : 0;

    // Input style helper
    const inputStyle: React.CSSProperties = {
        width: '100%',
        backgroundColor: '#0a0a1a',
        border: '1px solid #1a1a35',
        color: '#ccc',
        padding: '6px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        outline: 'none',
        boxSizing: 'border-box',
        fontFamily: 'monospace',
    };

    const labelStyle: React.CSSProperties = {
        fontSize: '9px',
        color: '#2a2a4c',
        display: 'block',
        letterSpacing: '1.5px',
        marginBottom: '4px',
        textTransform: 'uppercase',
    };

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: '#050508',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1100,
            fontFamily: 'Arial, sans-serif',
            userSelect: 'none',
        }}>
            {/* Top accent bar */}
            <div style={{ height: '3px', background: 'linear-gradient(90deg, #00ffff, #FF0099, #00ffff)', flexShrink: 0 }} />

            {/* Header */}
            <div style={{
                height: '44px',
                display: 'flex', alignItems: 'center',
                padding: '0 14px', gap: '12px',
                borderBottom: '1px solid #10102a',
                flexShrink: 0,
                backgroundColor: '#07070f',
            }}>
                {/* Mode tabs */}
                <button
                    onClick={onSwitchToAI}
                    style={{
                        background: 'transparent',
                        border: '1px solid #1a1a35',
                        color: '#3a3a5c',
                        padding: '4px 14px', borderRadius: '4px',
                        cursor: 'pointer', fontSize: '10px',
                        letterSpacing: '1.5px', fontFamily: 'Arial Black',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#00ffff55'; e.currentTarget.style.color = '#00ffff88'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a35'; e.currentTarget.style.color = '#3a3a5c'; }}
                >
                    ← AI MODE
                </button>

                <div style={{
                    padding: '4px 14px', borderRadius: '4px',
                    border: '1px solid #FF009988',
                    backgroundColor: '#FF009915',
                    fontSize: '10px', letterSpacing: '1.5px',
                    color: '#FF0099', fontFamily: 'Arial Black',
                }}>
                    BUILD MODE
                </div>

                <div style={{ width: '1px', height: '20px', backgroundColor: '#1a1a35' }} />

                <span style={{ fontSize: '10px', color: '#2a2a4c', fontFamily: 'monospace' }}>
                    {events.length} EVENT{events.length !== 1 ? 'S' : ''} · {formatTime(audioDuration)}
                </span>

                <div style={{ flex: 1 }} />

                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent', border: '1px solid #1a1a35',
                        color: '#3a3a5c', padding: '4px 16px', borderRadius: '4px',
                        cursor: 'pointer', fontSize: '10px', letterSpacing: '1.5px',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#444'; e.currentTarget.style.color = '#888'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a1a35'; e.currentTarget.style.color = '#3a3a5c'; }}
                >
                    CLOSE
                </button>
            </div>

            {/* ── Main 3-column layout ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

                {/* ── LEFT: Tools ── */}
                <div style={{
                    width: '176px', flexShrink: 0,
                    backgroundColor: '#07070f',
                    borderRight: '1px solid #10102a',
                    display: 'flex', flexDirection: 'column',
                    overflowY: 'auto',
                }}>
                    {/* Event type tools */}
                    <div style={{ padding: '12px 10px', borderBottom: '1px solid #10102a' }}>
                        <div style={{ fontSize: '9px', color: '#2a2a4c', letterSpacing: '2.5px', marginBottom: '8px', textTransform: 'uppercase' }}>Event Type</div>
                        {(['select', 'projectile_throw', 'spawn_obstacle', 'screen_shake', 'pulse'] as Tool[]).map(tool => {
                            const active = activeTool === tool;
                            const col = TOOL_COLORS[tool];
                            return (
                                <button key={tool} onClick={() => setActiveTool(tool)} style={{
                                    width: '100%', padding: '7px 10px', marginBottom: '3px',
                                    backgroundColor: active ? `${col}16` : 'transparent',
                                    border: `1px solid ${active ? col : '#16163a'}`,
                                    color: active ? col : '#30305a',
                                    borderRadius: '5px', cursor: 'pointer', textAlign: 'left',
                                    fontSize: '10px', letterSpacing: '0.5px',
                                    fontWeight: active ? 900 : 400,
                                    fontFamily: 'Arial Black',
                                    transition: 'all 0.1s',
                                }}
                                    onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = `${col}55`; e.currentTarget.style.color = `${col}88`; } }}
                                    onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#16163a'; e.currentTarget.style.color = '#30305a'; } }}
                                >
                                    {TOOL_LABELS[tool]}
                                </button>
                            );
                        })}
                    </div>

                    {/* Behavior selector */}
                    {(activeTool === 'projectile_throw' || activeTool === 'spawn_obstacle') && (
                        <div style={{ padding: '12px 10px', borderBottom: '1px solid #10102a' }}>
                            <div style={{ fontSize: '9px', color: '#2a2a4c', letterSpacing: '2.5px', marginBottom: '8px', textTransform: 'uppercase' }}>Behavior</div>
                            {(['homing', 'spinning', 'bouncing', 'static', 'sweep'] as BehaviorType[]).map(b => {
                                const active = activeBehavior === b;
                                return (
                                    <button key={b} onClick={() => setActiveBehavior(b)} style={{
                                        width: '100%', padding: '7px 10px', marginBottom: '3px',
                                        backgroundColor: active ? '#FF009916' : 'transparent',
                                        border: `1px solid ${active ? '#FF0099' : '#16163a'}`,
                                        color: active ? '#FF0099' : '#30305a',
                                        borderRadius: '5px', cursor: 'pointer', textAlign: 'left',
                                        fontSize: '10px', fontFamily: 'Arial',
                                        transition: 'all 0.1s',
                                    }}
                                        onMouseEnter={e => { if (!active) { e.currentTarget.style.borderColor = '#FF009955'; e.currentTarget.style.color = '#FF009988'; } }}
                                        onMouseLeave={e => { if (!active) { e.currentTarget.style.borderColor = '#16163a'; e.currentTarget.style.color = '#30305a'; } }}
                                    >
                                        {BEHAVIOR_LABELS[b]}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* Size & Duration */}
                    <div style={{ padding: '12px 10px' }}>
                        <div style={{ fontSize: '9px', color: '#2a2a4c', letterSpacing: '2.5px', marginBottom: '10px', textTransform: 'uppercase' }}>Properties</div>

                        <div style={{ marginBottom: '14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontSize: '9px', color: '#2a2a4c', letterSpacing: '1px' }}>SIZE</span>
                                <span style={{ fontSize: '10px', color: '#FF0099', fontFamily: 'monospace' }}>{activeSize}px</span>
                            </div>
                            <input
                                type="range" min="10" max="200" value={activeSize}
                                onChange={e => setActiveSize(+e.target.value)}
                                style={{ width: '100%', accentColor: '#FF0099', cursor: 'pointer' }}
                            />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontSize: '9px', color: '#2a2a4c', letterSpacing: '1px' }}>DURATION</span>
                                <span style={{ fontSize: '10px', color: '#FF0099', fontFamily: 'monospace' }}>{activeDuration.toFixed(1)}s</span>
                            </div>
                            <input
                                type="range" min="0.1" max="10" step="0.1" value={activeDuration}
                                onChange={e => setActiveDuration(+e.target.value)}
                                style={{ width: '100%', accentColor: '#FF0099', cursor: 'pointer' }}
                            />
                        </div>
                    </div>

                    {/* Hint */}
                    <div style={{ padding: '0 10px 12px', marginTop: 'auto' }}>
                        <div style={{
                            fontSize: '9px', color: '#16163a', lineHeight: '1.7',
                            borderTop: '1px solid #10102a', paddingTop: '10px',
                        }}>
                            <div>◆ Click canvas to place</div>
                            <div>◆ Click timeline to place</div>
                            <div>◆ Select tool to pick</div>
                            <div>◆ Space = play/pause</div>
                        </div>
                    </div>
                </div>

                {/* ── CENTER: Canvas + Playback + Timeline ── */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

                    {/* Canvas preview */}
                    <div style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: '#030306', overflow: 'hidden', padding: '8px',
                        position: 'relative',
                    }}>
                        <canvas
                            ref={canvasRef}
                            width={CANVAS_W}
                            height={CANVAS_H}
                            onClick={handleCanvasClick}
                            onMouseMove={handleCanvasMouseMove}
                            onMouseLeave={() => setHoverPos(null)}
                            style={{
                                cursor: activeTool === 'select' ? 'default' : 'crosshair',
                                border: '1px solid #10102a',
                                borderRadius: '4px',
                                maxWidth: '100%',
                                maxHeight: '100%',
                            }}
                        />
                        {/* Corner label */}
                        <div style={{
                            position: 'absolute', top: '12px', left: '12px',
                            fontSize: '9px', color: '#2a2a4c', letterSpacing: '1px',
                            pointerEvents: 'none',
                        }}>
                            PREVIEW  1024×768
                        </div>
                        {hoverPos && activeTool !== 'select' && (
                            <div style={{
                                position: 'absolute', bottom: '12px', left: '12px',
                                fontSize: '9px', color: '#3a3a6c', fontFamily: 'monospace',
                                pointerEvents: 'none',
                            }}>
                                {Math.round(hoverPos.gx)}, {Math.round(hoverPos.gy)}
                            </div>
                        )}
                    </div>

                    {/* Playback bar */}
                    <div style={{
                        height: '40px', display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '0 12px',
                        backgroundColor: '#07070f',
                        borderTop: '1px solid #10102a',
                        borderBottom: '1px solid #10102a',
                        flexShrink: 0,
                    }}>
                        <button
                            onClick={togglePlay}
                            disabled={!audioFile}
                            style={{
                                width: '26px', height: '26px',
                                background: audioFile ? '#FF0099' : '#1a1a35',
                                border: 'none', color: '#fff',
                                borderRadius: '50%',
                                cursor: audioFile ? 'pointer' : 'not-allowed',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '10px', flexShrink: 0,
                                transition: 'background 0.15s',
                            }}
                        >
                            {isPlaying ? '⏸' : '▶'}
                        </button>

                        <span style={{ fontSize: '10px', color: '#3a3a6c', fontFamily: 'monospace', minWidth: '90px' }}>
                            {formatTime(currentTime)} / {formatTime(audioDuration)}
                        </span>

                        {/* Scrubber bar */}
                        <div
                            onClick={e => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                seekTo((e.clientX - rect.left) / rect.width);
                            }}
                            style={{
                                flex: 1, height: '3px', backgroundColor: '#10102a',
                                borderRadius: '2px', cursor: 'pointer', position: 'relative',
                            }}
                        >
                            <div style={{
                                position: 'absolute', left: 0, top: 0,
                                width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%`,
                                height: '100%', backgroundColor: '#FF0099', borderRadius: '2px',
                                transition: 'width 0.05s linear',
                            }} />
                        </div>

                        {!audioFile && (
                            <span style={{ fontSize: '9px', color: '#1e1e40', letterSpacing: '1px' }}>UPLOAD SONG →</span>
                        )}
                    </div>

                    {/* Timeline */}
                    <div style={{
                        height: '90px', backgroundColor: '#050508',
                        flexShrink: 0, position: 'relative', overflow: 'hidden',
                    }}>
                        {/* BPM grid lines */}
                        {Array.from({ length: beatCount + 1 }).map((_, i) => {
                            const t = (i * 60) / bpm;
                            const left = audioDuration > 0 ? (t / audioDuration) * 100 : 0;
                            const isMeasure = i % 4 === 0;
                            return (
                                <div key={i} style={{
                                    position: 'absolute', left: `${left}%`,
                                    top: 0, bottom: '20px', width: '1px',
                                    backgroundColor: isMeasure ? 'rgba(255,0,153,0.18)' : 'rgba(255,0,153,0.06)',
                                    zIndex: 0, pointerEvents: 'none',
                                }} />
                            );
                        })}

                        {/* Clickable timeline area */}
                        <div
                            onClick={handleTimelineClick}
                            style={{
                                position: 'absolute', top: 0, left: 0, right: 0, bottom: '20px',
                                cursor: activeTool === 'select' ? 'text' : 'copy',
                                zIndex: 1,
                            }}
                        />

                        {/* Event blocks */}
                        {events.map(ev => {
                            const left = audioDuration > 0 ? (ev.timestamp / audioDuration) * 100 : 0;
                            const width = audioDuration > 0
                                ? Math.max(0.3, ((ev.duration ?? 1) / audioDuration) * 100)
                                : 0.5;
                            const col = TOOL_COLORS[ev.type] ?? '#FF0099';
                            const isSel = ev.id === selectedId;
                            return (
                                <div
                                    key={ev.id}
                                    onClick={e => { e.stopPropagation(); setSelectedId(ev.id); }}
                                    style={{
                                        position: 'absolute',
                                        left: `${left}%`,
                                        top: '8px',
                                        width: `${width}%`,
                                        minWidth: '5px',
                                        height: '44px',
                                        backgroundColor: isSel ? `${col}44` : `${col}18`,
                                        border: `1px solid ${isSel ? col : `${col}66`}`,
                                        borderRadius: '3px',
                                        cursor: 'pointer',
                                        zIndex: 2,
                                        boxShadow: isSel ? `0 0 8px ${col}55` : 'none',
                                        transition: 'box-shadow 0.1s',
                                    }}
                                />
                            );
                        })}

                        {/* Playhead */}
                        <div style={{
                            position: 'absolute',
                            left: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%`,
                            top: 0, bottom: '20px',
                            width: '2px',
                            backgroundColor: '#ffffff',
                            zIndex: 4, pointerEvents: 'none',
                            boxShadow: '0 0 6px rgba(255,255,255,0.5)',
                        }} />

                        {/* Time ruler */}
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0, height: '20px',
                            borderTop: '1px solid #10102a',
                        }}>
                            {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
                                <div key={ratio} style={{
                                    position: 'absolute',
                                    left: `${ratio * 100}%`,
                                    transform: ratio >= 0.9 ? 'translateX(-100%)' : ratio > 0 ? 'translateX(-50%)' : 'none',
                                    fontSize: '9px', color: '#1e1e40', fontFamily: 'monospace',
                                    top: '4px',
                                    paddingLeft: ratio === 0 ? '4px' : 0,
                                }}>
                                    {formatTime(ratio * audioDuration)}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── RIGHT: Metadata + Properties + Save ── */}
                <div style={{
                    width: '200px', flexShrink: 0,
                    backgroundColor: '#07070f',
                    borderLeft: '1px solid #10102a',
                    display: 'flex', flexDirection: 'column',
                    overflowY: 'auto',
                }}>
                    {/* Song upload */}
                    <div style={{ padding: '12px 10px', borderBottom: '1px solid #10102a' }}>
                        <div style={{ fontSize: '9px', color: '#2a2a4c', letterSpacing: '2.5px', marginBottom: '8px', textTransform: 'uppercase' }}>Song</div>
                        <div
                            onDragEnter={e => { e.preventDefault(); setIsDraggingAudio(true); }}
                            onDragLeave={() => setIsDraggingAudio(false)}
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => {
                                e.preventDefault(); setIsDraggingAudio(false);
                                const f = e.dataTransfer.files[0];
                                if (f) setAudioFile(f);
                            }}
                            onClick={() => document.getElementById('build-audio-input')?.click()}
                            style={{
                                border: `2px dashed ${isDraggingAudio ? '#fff' : '#00ffff44'}`,
                                backgroundColor: isDraggingAudio ? '#00ffff0e' : '#00ffff06',
                                borderRadius: '8px', padding: '14px 8px', textAlign: 'center',
                                cursor: 'pointer', transition: 'all 0.15s',
                            }}
                        >
                            <input
                                id="build-audio-input"
                                type="file" accept="audio/*"
                                style={{ display: 'none' }}
                                onChange={e => { const f = e.target.files?.[0]; if (f) setAudioFile(f); }}
                            />
                            <div style={{ fontSize: '20px', marginBottom: '5px' }}>🎵</div>
                            <div style={{ fontSize: '10px', color: '#00ffff', letterSpacing: '1px', lineHeight: '1.4', wordBreak: 'break-all' }}>
                                {audioFile
                                    ? (audioFile.name.length > 22 ? audioFile.name.slice(0, 20) + '…' : audioFile.name)
                                    : 'DROP MP3 HERE'}
                            </div>
                            {audioFile && (
                                <div style={{ fontSize: '9px', color: '#2a2a5c', marginTop: '4px', fontFamily: 'monospace' }}>
                                    {formatTime(audioDuration)}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Level info */}
                    <div style={{ padding: '12px 10px', borderBottom: '1px solid #10102a' }}>
                        <div style={{ fontSize: '9px', color: '#2a2a4c', letterSpacing: '2.5px', marginBottom: '8px', textTransform: 'uppercase' }}>Level Info</div>

                        <label style={labelStyle}>Boss Name</label>
                        <input
                            value={bossName}
                            onChange={e => setBossName(e.target.value)}
                            style={{ ...inputStyle, marginBottom: '10px', fontFamily: 'Arial' }}
                        />

                        <label style={labelStyle}>BPM</label>
                        <input
                            type="number" value={bpm}
                            onChange={e => setBpm(+e.target.value)}
                            style={inputStyle}
                        />
                    </div>

                    {/* Theme colors */}
                    <div style={{ padding: '12px 10px', borderBottom: '1px solid #10102a' }}>
                        <div style={{ fontSize: '9px', color: '#2a2a4c', letterSpacing: '2.5px', marginBottom: '8px', textTransform: 'uppercase' }}>Theme</div>
                        {[
                            { label: 'Enemy Color', value: enemyColor, set: setEnemyColor },
                            { label: 'Background', value: bgColor, set: setBgColor },
                            { label: 'Player Color', value: playerColor, set: setPlayerColor },
                        ].map(({ label, value, set }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                <input
                                    type="color" value={value}
                                    onChange={e => set(e.target.value)}
                                    style={{
                                        width: '28px', height: '26px', borderRadius: '4px',
                                        border: '1px solid #1a1a35', cursor: 'pointer',
                                        padding: 0, flexShrink: 0,
                                        backgroundColor: 'transparent',
                                    }}
                                />
                                <div>
                                    <div style={{ fontSize: '9px', color: '#2a2a4c', letterSpacing: '1px' }}>{label}</div>
                                    <div style={{ fontSize: '10px', color: '#3a3a6c', fontFamily: 'monospace' }}>{value}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Selected event properties */}
                    {selectedEvent ? (
                        <div style={{ padding: '12px 10px', borderBottom: '1px solid #10102a' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '9px' }}>
                                <div style={{ fontSize: '9px', color: '#2a2a4c', letterSpacing: '2.5px', textTransform: 'uppercase' }}>Selected</div>
                                <button
                                    onClick={deleteSelected}
                                    style={{
                                        background: 'transparent', border: '1px solid #ff333344',
                                        color: '#ff4444', padding: '2px 8px', borderRadius: '3px',
                                        cursor: 'pointer', fontSize: '9px', letterSpacing: '1px',
                                        transition: 'border-color 0.15s',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = '#ff3333'}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = '#ff333344'}
                                >
                                    DELETE
                                </button>
                            </div>

                            <label style={labelStyle}>Time (s)</label>
                            <input
                                type="number" step="0.01"
                                value={selectedEvent.timestamp}
                                onChange={e => updateSelected({ timestamp: parseFloat(e.target.value) || 0 })}
                                style={{ ...inputStyle, marginBottom: '8px' }}
                            />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                                {(['x', 'y'] as const).map(k => (
                                    <div key={k}>
                                        <label style={labelStyle}>{k.toUpperCase()}</label>
                                        <input
                                            type="number"
                                            value={selectedEvent[k]}
                                            onChange={e => updateSelected({ [k]: +e.target.value })}
                                            style={{ ...inputStyle, padding: '5px 6px' }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '8px' }}>
                                <div>
                                    <label style={labelStyle}>Size</label>
                                    <input
                                        type="number"
                                        value={selectedEvent.size ?? 40}
                                        onChange={e => updateSelected({ size: +e.target.value })}
                                        style={{ ...inputStyle, padding: '5px 6px' }}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Rotation</label>
                                    <input
                                        type="number"
                                        value={selectedEvent.rotation ?? 0}
                                        onChange={e => updateSelected({ rotation: +e.target.value })}
                                        style={{ ...inputStyle, padding: '5px 6px' }}
                                    />
                                </div>
                            </div>

                            <label style={labelStyle}>Duration (s)</label>
                            <input
                                type="number" step="0.1"
                                value={selectedEvent.duration ?? 2}
                                onChange={e => updateSelected({ duration: +e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                    ) : (
                        <div style={{ padding: '16px 10px', borderBottom: '1px solid #10102a' }}>
                            <div style={{ fontSize: '9px', color: '#16163a', letterSpacing: '1px', textAlign: 'center', lineHeight: '1.8' }}>
                                CLICK CANVAS<br />OR TIMELINE<br />TO PLACE EVENTS
                            </div>
                        </div>
                    )}

                    <div style={{ flex: 1 }} />

                    {/* Launch button */}
                    <div style={{ padding: '12px 10px' }}>
                        <div style={{ fontSize: '9px', color: '#1e1e40', textAlign: 'center', marginBottom: '8px', letterSpacing: '1px' }}>
                            {events.length} event{events.length !== 1 ? 's' : ''} placed
                        </div>
                        <button
                            onClick={handleLaunch}
                            style={{
                                width: '100%', padding: '13px',
                                background: 'linear-gradient(135deg, #FF0099, #cc0077)',
                                border: 'none', color: '#fff', borderRadius: '6px',
                                cursor: 'pointer', fontSize: '12px', fontWeight: 900,
                                fontFamily: 'Arial Black',
                                letterSpacing: '2px', textTransform: 'uppercase',
                                boxShadow: '0 4px 20px rgba(255,0,153,0.25)',
                                transition: 'transform 0.1s, box-shadow 0.1s',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.transform = 'scale(1.02)';
                                e.currentTarget.style.boxShadow = '0 6px 24px rgba(255,0,153,0.4)';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = '0 4px 20px rgba(255,0,153,0.25)';
                            }}
                        >
                            LAUNCH LEVEL
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
