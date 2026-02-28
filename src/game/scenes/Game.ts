import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { LevelData, LevelEvent } from '../types';

import { Vector2 } from '../engine/Vector2';
import { CompositeObject } from '../engine/CompositeObject';
import { CircleShape } from '../engine/shapes/CircleShape';
import { RectShape } from '../engine/shapes/RectShape';
import { CircleCollider, collidersOverlap } from '../engine/colliders/Collider';
import { ObjectFactory } from '../engine/ObjectFactory';
import { DieAfterBehavior } from '../engine/behaviors/DieAfterBehavior';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WORLD_W = 1024;
const WORLD_H = 768;
const PLAYER_HALF = 10;
const PLAYER_SPEED = 600;       // px/s normal
const PLAYER_DASH_SPEED = 1200; // px/s during dash
const DASH_DURATION_MS = 150;
const DASH_COOLDOWN_MS = 500;
const TELEGRAPH_SEC = 0.5;      // seconds of warning before hazard becomes active
const FIXED_STEP_MS = 1000 / 60;
const MAX_DELTA_MS = 100;

// ---------------------------------------------------------------------------
// Game Scene
// ---------------------------------------------------------------------------

export class Game extends Scene {
    private onLoadLevel = (data: { levelData: LevelData; audioUrl: string }) => {
        this.startLevel(data);
    };

    // --- Canvas rendering ---
    private ctx!: CanvasRenderingContext2D;

    // --- Phaser UI (kept as Phaser objects for simplicity) ---
    private progressBar!: Phaser.GameObjects.Rectangle;
    private keys!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
        SPACE: Phaser.Input.Keyboard.Key;
    };

    // --- Game state ---
    private levelData: LevelData | null = null;
    private music: Phaser.Sound.BaseSound | null = null;
    private isPlaying = false;
    private timelineIndex = 0;
    private sceneReady = false;
    private pendingStartLevelData: { levelData: LevelData; audioUrl: string } | null = null;

    // --- Objects ---
    private playerObj!: CompositeObject;
    private hazards: CompositeObject[] = [];
    private telegraphs: CompositeObject[] = [];

    // --- Player movement (fixed-step accumulator) ---
    private accMs = 0;
    private inputDir = new Vector2();

    // --- Dash ---
    private isDashing = false;
    private lastDashMs = -Infinity;

    // --- Hit flash ---
    private playerAlpha = 1;
    private hitFlashMs = 0;
    private invulMs = 0;         // remaining invulnerability time in ms

    // --- Screen shake ---
    private shakeMs = 0;
    private shakeIntensity = 0;

    constructor() { super('Game'); }

    // -----------------------------------------------------------------------
    // create
    // -----------------------------------------------------------------------

    create() {
        // Grab the raw 2D context from Phaser's canvas
        this.ctx = (this.sys.game.canvas as HTMLCanvasElement).getContext('2d')!;

        // Phaser UI elements (drawn by Phaser, appear under our custom layer)
        const { width, height } = this.scale;

        this.add.text(20, 20, '◀ MENU', {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#ffffff',
        }).setInteractive({ useHandCursor: true })
          .on('pointerdown', () => {
              if (this.music) this.music.stop();
              this.scene.start('MainMenu');
          })
          .setDepth(10);

        this.progressBar = this.add.rectangle(0, height, 0, 6, 0x00ffff).setOrigin(0, 1).setDepth(10);

        // Keyboard input
        if (this.input.keyboard) {
            this.keys = this.input.keyboard.addKeys({
                W: Phaser.Input.Keyboard.KeyCodes.W,
                A: Phaser.Input.Keyboard.KeyCodes.A,
                S: Phaser.Input.Keyboard.KeyCodes.S,
                D: Phaser.Input.Keyboard.KeyCodes.D,
                SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
            }) as any;
        }

        // Build the player object (small cyan rect with a circle hitbox)
        this.playerObj = new CompositeObject(new Vector2(width / 2, height / 2), 0, 1);
        this.playerObj.addShape(new RectShape(20, 20, {
            fillColor: '#00ffff',
            glowColor: '#00ffff',
            glowRadius: 14,
        }));
        this.playerObj.collider = new CircleCollider(8); // tight hitbox

        // Hook our custom rendering AFTER Phaser's own render pass
        this.sys.game.events.on('postrender', this.customRender, this);

        // Level loading
        EventBus.on('load-level', this.onLoadLevel);

        if ((window as any).pendingLevelData) {
            this.startLevel((window as any).pendingLevelData);
            (window as any).pendingLevelData = null;
        }

        this.sceneReady = true;

        // If a level was requested before the scene finished creating, start it now.
        if (this.pendingStartLevelData) {
            const pending = this.pendingStartLevelData;
            this.pendingStartLevelData = null;
            this.startLevel(pending);
        }

        EventBus.emit('current-scene-ready', this);
    }

    // -----------------------------------------------------------------------
    // Level loading
    // -----------------------------------------------------------------------

    private startLevel(data: { levelData: LevelData; audioUrl: string }) {
        // In some flows load-level can arrive before create() has finished.
        if (!this.sceneReady || !this.cameras?.main || !this.playerObj) {
            this.pendingStartLevelData = data;
            return;
        }

        this.levelData = data.levelData;
        // Ensure timeline is always a sorted array
        if (!Array.isArray(this.levelData.timeline)) {
            this.levelData.timeline = [];
        }
        this.levelData.timeline.sort((a, b) => a.timestamp - b.timestamp);

        console.log('[Game] startLevel:', this.levelData.timeline.length, 'events, first 3:', this.levelData.timeline.slice(0, 3));

        this.timelineIndex = 0;
        this.isPlaying = false;
        this.hazards = [];
        this.telegraphs = [];

        // Stop and destroy old music
        if (this.music) {
            this.music.stop();
            this.music.destroy();
            this.music = null;
        }

        const bg = this.levelData.theme?.backgroundColor || '#000000';
        this.cameras.main.setBackgroundColor(bg);

        // Update player color from theme
        this.playerObj.setColor(
            this.levelData.theme?.playerColor || '#00ffff',
            this.levelData.theme?.playerColor || '#00ffff',
        );

        // Remove cached audio so Phaser loads the new blob URL instead of reusing stale cache
        if (this.cache.audio.exists('level-music')) {
            this.cache.audio.remove('level-music');
        }
        // Also remove from sound manager if it has a reference
        if (this.sound.get('level-music')) {
            this.sound.removeByKey('level-music');
        }

        this.load.audio('level-music', data.audioUrl);

        let audioLoaded = false;

        // Fire only when this exact audio key has been added to cache.
        this.load.once('filecomplete-audio-level-music', () => {
            audioLoaded = true;
            console.log('[Game] Audio loaded, starting playback');
            this.music = this.sound.add('level-music');
            this.music.play();
            this.isPlaying = true;
        });

        this.load.once('loaderror', (file: any) => {
            if (file?.key !== 'level-music') return;
            console.error('[Game] Audio failed to load:', file);
            this.music = null;
            this.isPlaying = false;
        });

        // "complete" can still fire if a file failed; guard before using sound.add().
        this.load.once('complete', () => {
            if (!audioLoaded || !this.cache.audio.exists('level-music')) {
                console.warn('[Game] Loader completed but level-music was not cached.');
            }
        });

        this.load.start();
    }

    // -----------------------------------------------------------------------
    // update (Phaser game loop)
    // -----------------------------------------------------------------------

    update(_time: number, delta: number) {
        if (!this.keys) return;

        const dt = Math.min(delta, MAX_DELTA_MS) / 1000; // seconds

        this.updateInput(dt);
        this.updateDash(_time);
        this.updateHitFlash(dt);

        if (this.isPlaying && this.levelData) {
            const currentSec = this.music ? (this.music as any).seek as number : 0;
            this.processTimeline(currentSec);
            this.tickObjects(dt, currentSec);
            this.checkCollisions();
            this.pruneInactive();
            this.updateProgressBar(currentSec);
        }

        if (this.shakeMs > 0) {
            this.shakeMs -= delta;
            if (this.shakeMs <= 0) {
                this.cameras.main.resetFX();
                this.shakeMs = 0;
            }
        }
    }

    // -----------------------------------------------------------------------
    // Movement (fixed-step)
    // -----------------------------------------------------------------------

    private updateInput(dt: number) {
        const speed = this.isDashing ? PLAYER_DASH_SPEED : PLAYER_SPEED;
        const w = this.keys.W.isDown;
        const a = this.keys.A.isDown;
        const s = this.keys.S.isDown;
        const d = this.keys.D.isDown;
        const hasInput = w || a || s || d;

        if (hasInput) {
            this.inputDir.setXY(
                (d ? 1 : 0) - (a ? 1 : 0),
                (s ? 1 : 0) - (w ? 1 : 0),
            );
            const len = this.inputDir.length();
            if (len > 0) { this.inputDir.x /= len; this.inputDir.y /= len; }
        }

        this.accMs += dt * 1000;
        let steps = 0;
        while (this.accMs >= FIXED_STEP_MS && steps < 5) {
            if (hasInput) {
                const dist = speed * (FIXED_STEP_MS / 1000);
                const p = this.playerObj.position;
                this.playerObj.position = new Vector2(
                    Math.max(PLAYER_HALF, Math.min(WORLD_W - PLAYER_HALF, p.x + this.inputDir.x * dist)),
                    Math.max(PLAYER_HALF, Math.min(WORLD_H - PLAYER_HALF, p.y + this.inputDir.y * dist)),
                );
            }
            this.accMs -= FIXED_STEP_MS;
            steps++;
        }
    }

    // -----------------------------------------------------------------------
    // Dash
    // -----------------------------------------------------------------------

    private updateDash(timeMs: number) {
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) &&
            timeMs > this.lastDashMs + DASH_COOLDOWN_MS) {
            this.isDashing = true;
            this.invulMs = 200;
            this.lastDashMs = timeMs;
            this.time.delayedCall(DASH_DURATION_MS, () => { this.isDashing = false; });
        }
    }

    // -----------------------------------------------------------------------
    // Hit flash
    // -----------------------------------------------------------------------

    private updateHitFlash(dt: number) {
        if (this.invulMs > 0) this.invulMs -= dt * 1000;
        if (this.hitFlashMs > 0) {
            this.hitFlashMs -= dt * 1000;
            this.playerAlpha = 0.4;
        } else {
            this.playerAlpha = 1;
        }
    }

    // -----------------------------------------------------------------------
    // Timeline processing
    // -----------------------------------------------------------------------

    private _lastLogSec = -1;

    private processTimeline(currentSec: number) {
        const timeline = this.levelData?.timeline;
        if (!timeline) return;

        // Log once per second so we can verify the timeline is advancing
        const sec = Math.floor(currentSec);
        if (sec !== this._lastLogSec) {
            this._lastLogSec = sec;
            console.log(`[Game] t=${currentSec.toFixed(2)}s  idx=${this.timelineIndex}/${timeline.length}  hazards=${this.hazards.length}  telegraphs=${this.telegraphs.length}`);
        }

        while (
            this.timelineIndex < timeline.length &&
            timeline[this.timelineIndex].timestamp <= currentSec + TELEGRAPH_SEC
        ) {
            const event = timeline[this.timelineIndex];
            if (event.timestamp > currentSec) {
                this.spawnTelegraph(event, event.timestamp - currentSec);
            } else {
                this.spawnHazard(event);
            }
            this.timelineIndex++;
        }
    }

    private spawnTelegraph(event: LevelEvent, delayRemaining: number) {
        const obj = this.buildEventObject(event, 0.2);
        if (!obj) return;
        this.telegraphs.push(obj);

        // After the delay expires, promote to actual hazard
        this.time.delayedCall(delayRemaining * 1000, () => {
            const idx = this.telegraphs.indexOf(obj);
            if (idx !== -1) this.telegraphs.splice(idx, 1);
            obj.setAlpha(1);
            obj.isTelegraph = false;
            this.hazards.push(obj);
        });
    }

    private spawnHazard(event: LevelEvent) {
        if (event.type === 'screen_shake') {
            this.cameras.main.shake(event.duration ? event.duration * 1000 : 200, 0.02);
            return;
        }
        const obj = this.buildEventObject(event, 1);
        if (obj) this.hazards.push(obj);
    }

    /**
     * Construct a CompositeObject from a LevelEvent, applying `alpha` for
     * telegraph / active distinction.
     */
    private buildEventObject(event: LevelEvent, alpha: number): CompositeObject | null {
        const color = this.levelData!.theme.enemyColor || '#FF0099';
        let obj: CompositeObject;

        const hasVisibleDef = event.objectDef &&
            (event.objectDef.shape || (event.objectDef.children && event.objectDef.children.length > 0));

        if (hasVisibleDef) {
            // Full procedural definition from JSON — has at least one visible shape
            obj = ObjectFactory.fromDef({
                ...event.objectDef!,
                spawnTime: event.timestamp,
            });
        } else {
            // Legacy simple event or objectDef without shapes → build from helper
            const size = event.size ?? (event.objectDef?.scale ? event.objectDef.scale * 30 : 30);
            const dur = event.duration ?? 6;
            obj = ObjectFactory.fromLegacyEvent(
                event.type,
                event.objectDef?.x ?? event.x,
                event.objectDef?.y ?? event.y,
                size,
                event.rotation ?? 0,
                dur,
                event.behavior ?? 'static',
                color,
            );

            // Carry over any behaviors from objectDef that the legacy path wouldn't generate
            if (event.objectDef?.behaviors) {
                for (const bDef of event.objectDef.behaviors) {
                    obj.addBehavior(ObjectFactory.buildBehavior(bDef));
                }
            }
        }

        obj.setAlpha(alpha);
        obj.isTelegraph = alpha < 1;
        return obj;
    }

    // -----------------------------------------------------------------------
    // Per-frame object ticking
    // -----------------------------------------------------------------------

    private tickObjects(dt: number, currentSec: number) {
        const playerPos = this.playerObj.position;
        for (const h of this.hazards) h.tick(dt, currentSec, playerPos);
        for (const t of this.telegraphs) t.tick(dt, currentSec);
    }

    // -----------------------------------------------------------------------
    // Collision detection
    // -----------------------------------------------------------------------

    private checkCollisions() {
        if (this.invulMs > 0) return;
        const pPos = this.playerObj.position;
        const pCol = this.playerObj.collider!;

        for (const h of this.hazards) {
            if (!h.active || !h.collider) continue;
            if (collidersOverlap(pCol, pPos, h.collider, h.position)) {
                this.handleHit(h);
                return; // one hit per frame
            }
        }
    }

    private handleHit(hazard: CompositeObject) {
        // Knockback
        const angle = Math.atan2(
            this.playerObj.position.y - hazard.position.y,
            this.playerObj.position.x - hazard.position.x,
        );
        const p = this.playerObj.position;
        this.playerObj.position = new Vector2(
            Math.max(PLAYER_HALF, Math.min(WORLD_W - PLAYER_HALF, p.x + Math.cos(angle) * 50)),
            Math.max(PLAYER_HALF, Math.min(WORLD_H - PLAYER_HALF, p.y + Math.sin(angle) * 50)),
        );

        this.invulMs = 200;
        this.hitFlashMs = 200;
        this.cameras.main.shake(100, 0.008);
    }

    // -----------------------------------------------------------------------
    // Cleanup inactive / off-screen objects
    // -----------------------------------------------------------------------

    private pruneInactive() {
        this.hazards = this.hazards.filter(h => {
            if (!h.active) return false;
            const { x, y } = h.position;
            return x > -150 && x < WORLD_W + 150 && y > -150 && y < WORLD_H + 150;
        });
    }

    // -----------------------------------------------------------------------
    // Progress bar
    // -----------------------------------------------------------------------

    private updateProgressBar(currentSec: number) {
        if (!this.levelData) return;
        const progress = currentSec / this.levelData.metadata.duration;
        this.progressBar.width = this.scale.width * Math.min(1, Math.max(0, progress));
    }

    // -----------------------------------------------------------------------
    // Custom canvas rendering (fires after Phaser's own render pass)
    // -----------------------------------------------------------------------

    private customRender() {
        const ctx = this.ctx;
        if (!ctx) return;

        // Reset canvas state — Phaser may leave transforms/clips applied
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;

        // Draw telegraphs first (under hazards)
        for (const t of this.telegraphs) {
            if (t.active) t.draw(ctx);
        }

        // Draw hazards
        for (const h of this.hazards) {
            if (h.active) h.draw(ctx);
        }

        // Draw player (with hit-flash alpha)
        ctx.save();
        ctx.globalAlpha = this.playerAlpha;
        // Dash squash: widen X, squeeze Y
        if (this.isDashing) {
            const p = this.playerObj.position;
            ctx.translate(p.x, p.y);
            ctx.scale(1.5, 0.5);
            ctx.translate(-p.x, -p.y);
        }
        this.playerObj.draw(ctx);
        ctx.restore();
    }

    // -----------------------------------------------------------------------
    // Cleanup on scene shutdown
    // -----------------------------------------------------------------------

    shutdown() {
        this.sceneReady = false;
        this.pendingStartLevelData = null;
        this.sys.game.events.off('postrender', this.customRender, this);
        EventBus.removeListener('load-level', this.onLoadLevel);
        if (this.music) this.music.stop();
    }
}
