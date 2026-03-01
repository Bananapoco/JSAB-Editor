import { Behavior } from './Behavior';

/**
 * Oscillates the object's scale between minScale and maxScale, synced to the
 * music beat.
 *
 * @param minScale   Smallest scale value (at trough)
 * @param maxScale   Largest scale value (at peak, which lands on the beat)
 * @param beatRate   How often the pulse fires relative to a beat.
 *                   1 = every beat, 0.5 = every 2 beats, 2 = twice per beat, etc.
 * @param bpm        Beats per minute of the song. If 0 or missing, falls back
 *                   to a 1-second period.
 * @param spawnTime  The audio timestamp (seconds) when this object spawned.
 *                   Used to align the first pulse to the nearest beat grid.
 */
export class PulseBehavior extends Behavior {
    constructor(
        private minScale = 0.8,
        private maxScale = 1.2,
        private beatRate = 1.0,
        private bpm = 120,
        private spawnTime = 0,
    ) { super(); }

    tick(dt: number, currentTime: number): void {
        const effectiveBpm = this.bpm > 0 ? this.bpm : 60; // fallback: 60 BPM = 1s period
        const beatDuration = 60 / (effectiveBpm * this.beatRate);

        // Use absolute audio time so pulse is always on the global beat grid
        const phase = (currentTime % beatDuration) / beatDuration;

        // cos gives peak (1) at phase 0 (the beat) and trough (-1) at phase 0.5
        const t = (Math.cos(phase * Math.PI * 2) + 1) / 2;
        this.object.scale = this.minScale + (this.maxScale - this.minScale) * t;
    }
}
