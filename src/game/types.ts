import type { ObjectDef, ShapeDef, BehaviorDef, ChildDef } from './engine/ObjectFactory';

// ---------------------------------------------------------------------------
// Legacy event type enum (kept for backwards compat with Build Mode editor)
// ---------------------------------------------------------------------------

export type LevelEventType =
    | 'projectile_throw'
    | 'spawn_obstacle'
    | 'boss_move'
    | 'screen_shake'
    | 'pulse';

export type LegacyBehaviorType = 'homing' | 'spinning' | 'bouncing' | 'static' | 'sweep' | 'bomb';

// ---------------------------------------------------------------------------
// Extended timeline event
// ---------------------------------------------------------------------------

export interface LevelEvent {
    /** Audio timestamp in seconds when this event triggers. */
    timestamp: number;
    type: LevelEventType;
    x: number;    // 0–1024
    y: number;    // 0–768
    size?: number;
    rotation?: number;
    /** How long (seconds) the hazard lives. 0 / undefined = forever until off-screen. */
    duration?: number;
    /** Legacy behavior hint — only used when objectDef is absent. */
    behavior?: LegacyBehaviorType;
    /**
     * Full procedural object definition. When present, completely overrides
     * the legacy type/size/behavior fields. The engine instantiates this
     * generically via ObjectFactory.fromDef().
     */
    objectDef?: ObjectDef;
}

// ---------------------------------------------------------------------------
// Theme & Metadata
// ---------------------------------------------------------------------------

export interface LevelTheme {
    enemyColor: string;       // e.g. "#FF0099"
    backgroundColor: string;  // e.g. "#0a0010"
    playerColor: string;      // e.g. "#00ffff"
}

export interface LevelMetadata {
    bossName: string;
    bpm?: number;
    duration: number;         // total song length in seconds
}

// ---------------------------------------------------------------------------
// Top-level level data
// ---------------------------------------------------------------------------

export interface LevelData {
    metadata: LevelMetadata;
    theme: LevelTheme;
    timeline: LevelEvent[];
    explanation?: string;
}

// Re-export engine types so editors can import them from one place
export type { ObjectDef, ShapeDef, BehaviorDef, ChildDef };
