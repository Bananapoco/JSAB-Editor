// Event types supported by the game
export type LevelEventType = 
    | 'projectile_throw'
    | 'spawn_obstacle'
    | 'laser_beam'
    | 'expanding_circle'
    | 'wave'
    | 'wall'
    | 'spike_ring'
    | 'particle_burst'
    | 'screen_shake'
    | 'pulse';

// Behavior types for dynamic movement
export type EventBehavior = 
    | 'static'
    | 'homing'
    | 'spinning'
    | 'bouncing'
    | 'sweep'
    | 'expand'
    | 'contract'
    | 'oscillate';

export interface LevelEvent {
    timestamp: number;          // When to spawn (seconds from start)
    type: LevelEventType | string;
    x: number;                  // X position (0-1024 logical space)
    y: number;                  // Y position (0-768 logical space)
    size?: number;              // Size in pixels (scaled to screen)
    rotation?: number;          // Initial rotation in degrees
    duration?: number;          // How long the event lasts (seconds)
    behavior?: EventBehavior | string;
    
    // Movement properties
    targetX?: number;           // Target X for sweep/linear movement
    targetY?: number;           // Target Y for sweep/linear movement
    speed?: number;             // Movement speed
    
    // Pattern properties
    count?: number;             // Number of objects (for rings, bursts)
    angle?: number;             // Starting angle or sweep range
    spread?: number;            // Angle spread for patterns
    
    // Timing properties
    delay?: number;             // Warning delay before becoming dangerous
    
    // Visual properties
    thickness?: number;         // For lasers and walls
    
    // Behavior-specific properties
    pulseCount?: number;        // Number of pulses for bouncing/oscillating
    rotationSpeed?: number;     // Degrees per second for spinning
    oscillationFreq?: number;   // Frequency for oscillation behavior
    easing?: string;            // Easing function name
    
    // Asset reference (for boss sprites)
    assetId?: string;           // Reference to uploaded/generated asset
}

export interface LevelTheme {
    enemyColor: string;         // Must be #FF0099 for JSAB
    backgroundColor: string;    // Dark background
    playerColor: string;        // Typically cyan #00FFFF
}

export interface LevelMetadata {
    bossName: string;           // Level/boss name
    duration: number;           // Total duration in seconds
    bpm: number;                // Beats per minute
    energy?: string;            // Energy profile: 'calm', 'building', 'intense', 'dynamic'
    difficulty?: string;        // Optional difficulty indicator
}

export interface LevelData {
    metadata: LevelMetadata;
    theme: LevelTheme;
    timeline: LevelEvent[];
    explanation?: string;       // AI's description of choreography
}
