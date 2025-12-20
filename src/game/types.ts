export type LevelEventType = 
    | 'projectile_throw' 
    | 'spawn_obstacle' 
    | 'boss_move' 
    | 'screen_shake' 
    | 'pulse'
    | 'laser_beam'
    | 'expanding_circle'
    | 'wave'
    | 'wall'
    | 'spike_ring'
    | 'particle_burst';

export interface LevelEvent {
    timestamp: number; // In seconds, relative to audio start
    type: LevelEventType;
    x: number; // 0 to 1024 (logical width)
    y: number; // 0 to 768 (logical height)
    size?: number;
    rotation?: number; // In degrees
    duration?: number; // How long the event lasts
    assetId?: string; // Maps to the uploaded images
    behavior?: 'homing' | 'spinning' | 'bouncing' | 'static' | 'sweep' | 'expand' | 'contract' | 'oscillate';
    
    // Extended properties for richer patterns
    targetX?: number; // End position X (for sweeping/moving objects)
    targetY?: number; // End position Y
    speed?: number; // Movement speed multiplier
    count?: number; // Number of projectiles in a pattern
    angle?: number; // Starting angle for patterns
    spread?: number; // Angular spread for multi-projectile patterns
    delay?: number; // Delay before becoming dangerous (warning period)
    thickness?: number; // For lasers and walls
    pulseCount?: number; // Number of pulse beats
    easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bounce';
}

export interface LevelTheme {
    enemyColor: string; // Hex code, e.g., "#FF0099"
    backgroundColor: string; // Hex code
    playerColor: string; // Hex code
}

export interface LevelMetadata {
    bossName: string;
    bpm?: number;
    duration: number; // Total song length in seconds
    assetMapping?: Record<string, string>; // assetId -> original filename or blob URL
    energy?: 'calm' | 'building' | 'intense' | 'chaotic'; // Overall track energy
}

export interface LevelData {
    metadata: LevelMetadata;
    theme: LevelTheme;
    timeline: LevelEvent[];
    explanation?: string; // Gemini's explanation of the design
}
