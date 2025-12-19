import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { LevelData, LevelEvent } from '../types';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    player: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
    keys: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
        SPACE: Phaser.Input.Keyboard.Key;
    };

    private levelData: LevelData | null = null;
    private music: Phaser.Sound.BaseSound | null = null;
    private enemyGroup: Phaser.Physics.Arcade.Group;
    private timelineIndex = 0;
    private isPlaying = false;
    private isDashing = false;
    private dashCooldown = 0;
    private lastDashTime = 0;
    private progressBar: Phaser.GameObjects.Rectangle;

    private _tempVec: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private _accumulatorMs = 0;
    private _fixedStepMs = 1000 / 60; 
    private _maxDeltaMs = 100; 

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        const { width, height } = this.scale;

        this.enemyGroup = this.physics.add.group();

        // --- Back to Menu Button ---
        const backBtn = this.add.text(20, 20, '◀ MENU', {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#ffffff'
        }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            if (this.music) this.music.stop();
            this.scene.start('MainMenu');
        });

        this.progressBar = this.add.rectangle(0, height, 0, 10, 0x00ffff).setOrigin(0, 1);

        // Player: Small cyan square, center of screen
        this.player = this.add.rectangle(width / 2, height / 2, 25, 25, 0x00ffff) as any;
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        
        // Knockback logic
        this.physics.add.overlap(this.player, this.enemyGroup, (player, enemy) => {
            this.handlePlayerHit(enemy as Phaser.GameObjects.GameObject);
        });

        if (this.input.keyboard) {
            this.keys = this.input.keyboard.addKeys({
                W: Phaser.Input.Keyboard.KeyCodes.W,
                A: Phaser.Input.Keyboard.KeyCodes.A,
                S: Phaser.Input.Keyboard.KeyCodes.S,
                D: Phaser.Input.Keyboard.KeyCodes.D,
                SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE
            }) as any;
        }

        // Listen for level data
        EventBus.on('load-level', (data: { levelData: LevelData, audioUrl: string, imageMappings: Record<string, string> }) => {
            this.startLevel(data);
        });

        // Check for pending level data from Editor
        if ((window as any).pendingLevelData) {
            this.startLevel((window as any).pendingLevelData);
            (window as any).pendingLevelData = null;
        }

        EventBus.emit('current-scene-ready', this);
    }

    private startLevel(data: { levelData: LevelData, audioUrl: string, imageMappings: Record<string, string> }) {
        this.levelData = data.levelData;
        this.timelineIndex = 0;
        this.activeEvents = []; // Reset active events
        this.isPlaying = false;
        
        // Reset scene
        this.enemyGroup.clear(true, true);
        if (this.music) this.music.stop();

        // Set theme colors
        if (this.levelData.theme.backgroundColor) {
            this.camera.setBackgroundColor(this.levelData.theme.backgroundColor);
        }

        // Load dynamic assets
        this.load.audio('level-music', data.audioUrl);
        Object.entries(data.imageMappings).forEach(([id, url]) => {
            this.load.image(id, url);
        });

        this.load.once('complete', () => {
            this.music = this.sound.add('level-music');
            this.music.play();
            this.isPlaying = true;
            console.log('Level started:', this.levelData?.metadata.bossName);
        });

        this.load.start();
    }

    private handlePlayerHit(enemy: Phaser.GameObjects.GameObject) {
        if (this.isDashing) return; // Invulnerability frames during dash

        // Knockback: Move player away from enemy
        const enemyObj = enemy as any;
        const angle = Phaser.Math.Angle.Between(enemyObj.x, enemyObj.y, this.player.x, this.player.y);
        const force = 400;
        
        // Simple immediate knockback for now
        this.player.x += Math.cos(angle) * 50;
        this.player.y += Math.sin(angle) * 50;
        
        // Visual feedback
        this.camera.shake(100, 0.01);
        this.player.setAlpha(0.5);
        this.time.delayedCall(200, () => this.player.setAlpha(1));
    }

    private updateProgressBar() {
        if (!this.music || !this.levelData) return;
        const progress = (this.music as any).seek / this.levelData.metadata.duration;
        this.progressBar.width = this.scale.width * Phaser.Math.Clamp(progress, 0, 1);
    }

    private activeEvents: { event: LevelEvent, object: Phaser.GameObjects.GameObject, startTime: number }[] = [];

    update (time: number, delta: number)
    {
        if (!this.keys || !this.player) return;

        this.updateProgressBar();

        // --- Dash Logic ---
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && time > this.lastDashTime + 500) {
            this.isDashing = true;
            this.lastDashTime = time;
            
            // Visual for dash
            this.player.setScale(1.5, 0.5);
            this.time.delayedCall(150, () => {
                this.isDashing = false;
                this.player.setScale(1);
            });
        }

        // --- Player Movement (Existing) ---
        const speed = this.isDashing ? this.dashSpeed : this.speed;
        this.player.body.setVelocity(0);
        let inputX = 0;
        let inputY = 0;

        if (this.keys.A.isDown) inputX = -1;
        else if (this.keys.D.isDown) inputX = 1;

        if (this.keys.W.isDown) inputY = -1;
        else if (this.keys.S.isDown) inputY = 1;

        const clampedDelta = Math.min(delta, this._maxDeltaMs);
        this._accumulatorMs += clampedDelta;

        const hasInput = inputX !== 0 || inputY !== 0;
        if (hasInput) this._tempVec.set(inputX, inputY).normalize();

        const maxStepsPerFrame = 5;
        let steps = 0;

        while (this._accumulatorMs >= this._fixedStepMs && steps < maxStepsPerFrame)
        {
            if (hasInput)
            {
                const moveDistance = speed * (this._fixedStepMs / 1000);
                this.player.x += this._tempVec.x * moveDistance;
                this.player.y += this._tempVec.y * moveDistance;
            }

            const halfSize = this.player.width / 2;
            const { width, height } = this.scale;
            if (this.player.x < halfSize) this.player.x = halfSize;
            else if (this.player.x > width - halfSize) this.player.x = width - halfSize;
            if (this.player.y < halfSize) this.player.y = halfSize;
            else if (this.player.y > height - halfSize) this.player.y = height - halfSize;

            this._accumulatorMs -= this._fixedStepMs;
            steps++;
        }

        // --- Attack System & Music Sync ---
        if (this.isPlaying && this.music && this.levelData) {
            const currentTime = (this.music as any).seek; // Master Clock

            // Spawn events from timeline (Spawn early for telegraphing? Or assume timestamp is spawn time)
            // We assume timestamp is the START of the event lifecycle
            while (
                this.timelineIndex < this.levelData.timeline.length && 
                this.levelData.timeline[this.timelineIndex].timestamp <= currentTime
            ) {
                this.spawnEvent(this.levelData.timeline[this.timelineIndex], currentTime);
                this.timelineIndex++;
            }

            // Update Active Events based on AUDIO CLOCK
            for (let i = this.activeEvents.length - 1; i >= 0; i--) {
                const active = this.activeEvents[i];
                const age = currentTime - active.startTime;
                const duration = active.event.duration || 2.0; // Default duration if missing
                
                if (age > duration) {
                    // Destroy
                    active.object.destroy();
                    this.activeEvents.splice(i, 1);
                } else {
                    // Interpolate
                    const t = age / duration;
                    this.updateEventBehavior(active.object, active.event, t, currentTime);
                }
            }
        }
    }

    private spawnEvent(event: LevelEvent, startTime: number) {
        const enemyColor = Phaser.Display.Color.HexStringToColor(this.levelData?.theme.enemyColor || '#FF0099').color;
        let obj: Phaser.GameObjects.GameObject;

        if (event.type === 'projectile_throw') {
             if (event.assetId) {
                obj = this.add.image(event.x, event.y, event.assetId).setDisplaySize(event.size || 40, event.size || 40).setTint(enemyColor);
             } else {
                obj = this.add.rectangle(event.x, event.y, event.size || 20, event.size || 20, enemyColor);
             }
             this.enemyGroup.add(obj as any);
        } else if (event.type === 'spawn_obstacle') {
             if (event.assetId) {
                obj = this.add.image(event.x, event.y, event.assetId).setDisplaySize(event.size || 60, event.size || 60).setTint(enemyColor);
             } else {
                obj = this.add.rectangle(event.x, event.y, event.size || 40, event.size || 40, enemyColor);
             }
             this.enemyGroup.add(obj as any);
        } else if (event.type === 'screen_shake') {
            this.camera.shake(event.duration || 200, 0.02);
            return; // Instant event, don't track
        } else {
            return; 
        }

        this.activeEvents.push({ event, object: obj, startTime });
    }

    private updateEventBehavior(obj: any, event: LevelEvent, t: number, currentTime: number) {
        if (!event.behavior || event.behavior === 'static') return;

        // "Interpolation: Calculate movement and rotations as a function of (currentAudioTime - eventStartTime) / duration."
        
        if (event.behavior === 'homing') {
            // Homing: Move towards player, but derived from time t
            // Simple Linear Interpolation from Spawn Pos to Player Pos? 
            // Real homing usually tracks dynamic position. 
            // For Sync Homing, let's make it move in a straight line to where the player WAS at spawn + some tracking.
            // Or simple drift:
            const angle = Phaser.Math.Angle.Between(obj.x, obj.y, this.player.x, this.player.y);
            // Move slowly towards player based on time step? 
            // Since we must be deterministic based on t, true homing (tracking current player pos) 
            // is okay to do frame-by-frame, but let's sync speed to music.
            // This runs every frame, so we just move it.
            // BUT, to be "Master Clock" compliant, we should calculate position based on t.
            // If it's homing, it implies dynamic destination. 
            // Let's stick to "Sweep" or deterministic behaviors for pure sync.
            // For now, let's just rotate it based on t for visual sync.
            obj.rotation += 0.1; 
            
            // Move forward
            const speed = 200;
            // We can't strictly set X/Y via formula for homing without storing initial state.
            // Let's assume standard movement for homing is allowed to use delta, 
            // OR we use 'Sweep' for deterministic movement.
            
             // Fallback to simple movement for homing to keep it playable
             const moveStep = 3; // pixels per frame
             obj.x += Math.cos(angle) * moveStep;
             obj.y += Math.sin(angle) * moveStep;

        } else if (event.behavior === 'spinning') {
            // Deterministic rotation
            // 360 degrees over the duration
            obj.angle = t * 360 * 2; // Spin twice
        } else if (event.behavior === 'sweep') {
            // Move across screen horizontally
            // Start X to End X
            // If start is left (0), go to right (1024)
            const startX = event.x;
            const targetX = startX < 512 ? 1024 : 0;
            
            obj.x = Phaser.Math.Interpolation.Linear([startX, targetX], t);
        } else if (event.behavior === 'bouncing') {
             // Bounce on beat?
             // Scale pulse
             const beat = Math.sin(t * Math.PI * 4); // 2 pulses
             const baseScale = (event.size || 40) / 40; 
             obj.setScale(baseScale + beat * 0.2);
        }
    }
}

