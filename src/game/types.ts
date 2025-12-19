export type LevelEventType = 
    | 'projectile_throw' 
    | 'spawn_obstacle' 
    | 'boss_move' 
    | 'screen_shake' 
    | 'pulse';

export interface LevelEvent {
    timestamp: number; // In seconds, relative to audio start
    type: LevelEventType;
    x: number; // 0 to 1024 (Phaser width)
    y: number; // 0 to 768 (Phaser height)
    size?: number;
    rotation?: number;
    duration?: number; // How long the event lasts
    assetId?: string; // Maps to the uploaded images
    behavior?: 'homing' | 'spinning' | 'bouncing' | 'static' | 'sweep';
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
    assetMapping: Record<string, string>; // assetId -> original filename or blob URL
}

export interface LevelData {
    metadata: LevelMetadata;
    theme: LevelTheme;
    timeline: LevelEvent[];
    explanation?: string; // Gemini's explanation of the design
}

