import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { LevelData, LevelEvent } from '../types';

interface ActiveEvent {
    event: LevelEvent;
    object: Phaser.GameObjects.GameObject;
    startTime: number; // Audio time when spawned
    warningComplete: boolean;
    graphics?: Phaser.GameObjects.Graphics;
    initialX: number;
    initialY: number;
}

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
    private music: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | null = null;
    private loadingMusic: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | null = null;
    private enemyGroup: Phaser.Physics.Arcade.Group;
    private timelineIndex = 0;
    private isPlaying = false;
    private isDashing = false;
    private lastDashTime = 0;
    private progressBar: Phaser.GameObjects.Rectangle;
    private bgGraphics: Phaser.GameObjects.Graphics;
    private pulseGraphics: Phaser.GameObjects.Graphics;

    private _tempVec: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private _accumulatorMs = 0;
    private _fixedStepMs = 1000 / 60; 
    private _maxDeltaMs = 100;
    private speed = 600;
    private dashSpeed = 1200;

    // Audio tracking - use audio.seek as master clock
    private activeEvents: ActiveEvent[] = [];
    private lastBeatTime = 0;
    private beatFlash = 0;

    // JSAB Colors
    private readonly PINK = 0xFF0099;
    private readonly CYAN = 0x00FFFF;
    private readonly WARNING_COLOR = 0xFFFFFF;

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x0a0a0f);

        const { width, height } = this.scale;

        // Background graphics for visual effects
        this.bgGraphics = this.add.graphics();
        this.bgGraphics.setDepth(-10);
        
        // Pulse graphics for beat effects
        this.pulseGraphics = this.add.graphics();
        this.pulseGraphics.setDepth(-5);

        this.enemyGroup = this.physics.add.group();

        // Back to Menu Button
        const backBtn = this.add.text(20, 20, '◀ MENU', {
            fontFamily: 'Arial Black', fontSize: '24px', color: '#ffffff'
        }).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            this.stopLevel();
            this.scene.start('MainMenu');
        });

        this.progressBar = this.add.rectangle(0, height, 0, 10, this.CYAN).setOrigin(0, 1).setDepth(100);

        // Player: Small cyan square
        this.player = this.add.rectangle(width / 2, height / 2, 25, 25, this.CYAN) as any;
        this.physics.add.existing(this.player);
        this.player.body.setCollideWorldBounds(true);
        this.player.setDepth(50);
        
        // Collision with enemies - only when warning complete
        this.physics.add.overlap(this.player, this.enemyGroup, (player, enemy) => {
            if (this.isDashing) return;
            
            const active = this.activeEvents.find(ae => ae.object === enemy);
            if (active && active.warningComplete) {
            this.handlePlayerHit(enemy as Phaser.GameObjects.GameObject);
            }
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

        // Listen for level generation start - play PIXL Sugar Rush
        EventBus.on('level-generation-start', () => {
            console.log('[GAME] Level generation started, playing PIXL Sugar Rush');
            this.playLoadingMusic();
        });

        // Listen for level data
        EventBus.on('load-level', (data: { levelData: LevelData, audioUrl: string, imageMappings: Record<string, string> }) => {
            console.log('[GAME] Received load-level event');
            // Stop loading music when level starts loading
            this.stopLoadingMusic();
            this.startLevel(data);
        });

        // Check for pending level data
        if ((window as any).pendingLevelData) {
            console.log('[GAME] Found pending level data');
            this.startLevel((window as any).pendingLevelData);
            (window as any).pendingLevelData = null;
        }

        EventBus.emit('current-scene-ready', this);
    }

    private playLoadingMusic() {
        // Stop any existing loading music
        this.stopLoadingMusic();
        
        // Play PIXL Sugar Rush with loop
        this.loadingMusic = this.sound.add('pixl-sugar-rush', { loop: true }) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
        this.loadingMusic.play();
        console.log('[GAME] PIXL Sugar Rush started');
    }

    private stopLoadingMusic() {
        if (this.loadingMusic) {
            this.loadingMusic.stop();
            this.loadingMusic.destroy();
            this.loadingMusic = null;
            console.log('[GAME] PIXL Sugar Rush stopped');
        }
    }

    private stopLevel() {
        if (this.music) {
            this.music.stop();
            this.music.destroy();
            this.music = null;
        }
        this.stopLoadingMusic();
        this.isPlaying = false;
        this.activeEvents = [];
        this.timelineIndex = 0;
        this.enemyGroup.clear(true, true);
        this.bgGraphics.clear();
        this.pulseGraphics.clear();
    }

    private startLevel(data: { levelData: LevelData, audioUrl: string, imageMappings: Record<string, string> }) {
        this.levelData = data.levelData;
        this.timelineIndex = 0;
        this.activeEvents = [];
        this.isPlaying = false;
        this.lastBeatTime = 0;
        
        // Reset scene
        this.enemyGroup.clear(true, true);
        // Stop loading music if still playing
        this.stopLoadingMusic();
        if (this.music) {
            this.music.stop();
            this.music.destroy();
        }

        // Reset player position
        this.player.x = this.scale.width / 2;
        this.player.y = this.scale.height / 2;

        // Set theme colors
        if (this.levelData.theme?.backgroundColor) {
            const bgColor = Phaser.Display.Color.HexStringToColor(this.levelData.theme.backgroundColor).color;
            this.camera.setBackgroundColor(bgColor);
        }

        // Sort timeline by timestamp
        this.levelData.timeline.sort((a, b) => a.timestamp - b.timestamp);

        console.log('[GAME] Loading level:', this.levelData.metadata.name);
        console.log('[GAME] BPM:', this.levelData.metadata.bpm);
        console.log('[GAME] Duration:', this.levelData.metadata.duration, 's');
        console.log('[GAME] Timeline events:', this.levelData.timeline.length);

        // Load audio
        const audioKey = 'level-music-' + Date.now();
        this.load.audio(audioKey, data.audioUrl);
        
        // Load dynamic images
        Object.entries(data.imageMappings).forEach(([id, url]) => {
            console.log('[GAME] Loading asset:', id);
            this.load.image(id, url);
        });

        this.load.once('complete', () => {
            console.log('[GAME] Assets loaded, starting playback');
            this.music = this.sound.add(audioKey) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
            
            this.music.once('play', () => {
                this.isPlaying = true;
                console.log('[GAME] 🎵 Level started!');
            });

            this.music.once('complete', () => {
                this.isPlaying = false;
                console.log('[GAME] Level complete!');
                this.showLevelComplete();
            });

            // Start music
            this.music.play();
        });

        this.load.start();
    }

    private showLevelComplete() {
        const { width, height } = this.scale;
        
        const overlay = this.add.rectangle(width/2, height/2, width, height, 0x000000, 0.8);
        overlay.setDepth(200);
        
        const text = this.add.text(width/2, height/2, 'LEVEL COMPLETE', {
            fontFamily: 'Arial Black',
            fontSize: '64px',
            color: '#00ffff'
        }).setOrigin(0.5).setDepth(201);
        
        this.tweens.add({
            targets: text,
            scale: { from: 0, to: 1 },
            duration: 500,
            ease: 'Back.easeOut'
        });
    }

    private handlePlayerHit(enemy: Phaser.GameObjects.GameObject) {
        const enemyObj = enemy as any;
        const angle = Phaser.Math.Angle.Between(enemyObj.x, enemyObj.y, this.player.x, this.player.y);
        
        // Knockback
        this.player.x += Math.cos(angle) * 50;
        this.player.y += Math.sin(angle) * 50;
        
        // Visual feedback
        this.camera.shake(100, 0.02);
        this.camera.flash(100, 255, 0, 153, true);
        this.player.setAlpha(0.3);
        this.time.delayedCall(200, () => this.player.setAlpha(1));
    }

    /**
     * MASTER CLOCK: Get current audio playback time in seconds
     * This is the ONLY source of truth for timing - no delta-based drift
     */
    private getAudioTime(): number {
        if (!this.music || !this.isPlaying) return 0;
        
        // Use seek property which gives actual playback position
        const webAudioMusic = this.music as Phaser.Sound.WebAudioSound;
        if (webAudioMusic.seek !== undefined) {
            return webAudioMusic.seek;
        }
        
        return 0;
    }

    private updateProgressBar() {
        if (!this.music || !this.levelData) return;
        const currentTime = this.getAudioTime();
        const progress = currentTime / this.levelData.metadata.duration;
        this.progressBar.width = this.scale.width * Phaser.Math.Clamp(progress, 0, 1);
    }

    update (time: number, delta: number)
    {
        if (!this.keys || !this.player) return;

        this.updateProgressBar();

        const audioTime = this.getAudioTime();

        // Dash Logic
        if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE) && time > this.lastDashTime + 500) {
            this.isDashing = true;
            this.lastDashTime = time;
            
            this.player.setScale(1.5, 0.5);
            this.player.setAlpha(0.5);
            this.time.delayedCall(150, () => {
                this.isDashing = false;
                this.player.setScale(1);
                this.player.setAlpha(1);
            });
        }

        // Player Movement (frame-independent)
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

            // Clamp player position
            const halfSize = this.player.width / 2;
            const { width, height } = this.scale;
            this.player.x = Phaser.Math.Clamp(this.player.x, halfSize, width - halfSize);
            this.player.y = Phaser.Math.Clamp(this.player.y, halfSize, height - halfSize);

            this._accumulatorMs -= this._fixedStepMs;
            steps++;
        }

        // Level update system (audio-time based)
        if (this.isPlaying && this.music && this.levelData) {
            this.updateBackgroundPulse(audioTime);
            this.updateGlobalBeatEffect(audioTime);
            this.processTimeline(audioTime);
            this.updateActiveEvents(audioTime);
        }
    }

    /**
     * Background pulse effect synced to BPM
     */
    private updateBackgroundPulse(audioTime: number) {
        if (!this.levelData?.metadata.bpm) return;
        
        this.bgGraphics.clear();
        
        const bpm = this.levelData.metadata.bpm;
        const beatDuration = 60 / bpm;
        const beatPhase = (audioTime % beatDuration) / beatDuration;
        const pulse = Math.sin(beatPhase * Math.PI * 2);
        
        // Subtle background pulse
        const intensity = 0.02 + Math.abs(pulse) * 0.03;
        this.bgGraphics.fillStyle(this.PINK, intensity);
        this.bgGraphics.fillRect(0, 0, this.scale.width, this.scale.height);
    }

    /**
     * Global beat flash effect
     */
    private updateGlobalBeatEffect(audioTime: number) {
        if (!this.levelData?.metadata.bpm) return;
        
        const bpm = this.levelData.metadata.bpm;
        const beatDuration = 60 / bpm;
        const currentBeat = Math.floor(audioTime / beatDuration);
        
        // Detect new beat
        if (currentBeat > this.lastBeatTime) {
            this.lastBeatTime = currentBeat;
            this.beatFlash = 1;
            
            // Pulse all active enemies on beat
            this.enemyGroup.children.entries.forEach((child: any) => {
                if (child.active && !child.getData('noGlobalPulse')) {
                    const baseScale = child.getData('baseScale') || 1;
                    this.tweens.add({
                        targets: child,
                        scaleX: baseScale * 1.15,
                        scaleY: baseScale * 1.15,
                        duration: 50,
                        yoyo: true,
                        ease: 'Sine.easeOut'
                    });
                }
            });
        }
        
        // Decay flash
        this.beatFlash *= 0.9;
        
        // Draw pulse circles on beat
        this.pulseGraphics.clear();
        if (this.beatFlash > 0.1) {
            this.pulseGraphics.lineStyle(2, this.PINK, this.beatFlash * 0.3);
            const radius = (1 - this.beatFlash) * 100 + 20;
            this.pulseGraphics.strokeCircle(this.scale.width / 2, this.scale.height / 2, radius);
        }
    }

    /**
     * Process timeline and spawn events based on audio time
     */
    private processTimeline(audioTime: number) {
        if (!this.levelData) return;

            while (
                this.timelineIndex < this.levelData.timeline.length && 
            this.levelData.timeline[this.timelineIndex].timestamp <= audioTime
            ) {
            const event = this.levelData.timeline[this.timelineIndex];
            this.spawnEvent(event, audioTime);
                this.timelineIndex++;
        }
            }

    /**
     * Update all active events using audio time for deterministic positioning
     */
    private updateActiveEvents(audioTime: number) {
            for (let i = this.activeEvents.length - 1; i >= 0; i--) {
                const active = this.activeEvents[i];
            const eventAge = audioTime - active.startTime;
                const duration = active.event.duration || 2.0;
            const warningDelay = active.event.delay || 0.3;
            
            // Handle warning phase transition
            if (!active.warningComplete && eventAge >= warningDelay) {
                active.warningComplete = true;
                this.activateObject(active);
            }
            
            // Remove expired events
            if (eventAge > duration) {
                if (active.graphics) {
                    active.graphics.destroy();
                }
                    active.object.destroy();
                    this.activeEvents.splice(i, 1);
                } else {
                // Update behavior using normalized progress (0 to 1)
                const progress = eventAge / duration;
                this.updateEventBehavior(active, progress, audioTime);
            }
        }
    }

    // Coordinate transformation helpers
    private scaleX(x: number): number {
        return (x / 1024) * this.scale.width;
    }

    private scaleY(y: number): number {
        return (y / 768) * this.scale.height;
    }

    private scaleSize(size: number): number {
        const avgScale = (this.scale.width / 1024 + this.scale.height / 768) / 2;
        return size * avgScale;
    }

    private spawnEvent(event: LevelEvent, audioTime: number) {
        const x = this.scaleX(event.x);
        const y = this.scaleY(event.y);
        const baseSize = this.scaleSize(event.size || 40);
        const warningDelay = event.delay ?? 0.3;

        let obj: Phaser.GameObjects.GameObject | null = null;
        let graphics: Phaser.GameObjects.Graphics | undefined;

        switch (event.type) {
            case 'projectile_throw':
                obj = this.createProjectile(x, y, baseSize, event);
                break;

            case 'spawn_obstacle':
                obj = this.createObstacle(x, y, baseSize, event);
                break;

            case 'laser_beam':
                const laserResult = this.createLaser(x, y, event);
                obj = laserResult.obj;
                graphics = laserResult.graphics;
                break;

            case 'expanding_circle':
                obj = this.createExpandingCircle(x, y, baseSize, event);
                break;

            case 'wave':
                obj = this.createWave(x, y, event);
                break;

            case 'wall':
                obj = this.createWall(x, y, event);
                break;

            case 'spike_ring':
                this.createSpikeRing(x, y, event, audioTime);
                return;

            case 'particle_burst':
                this.createParticleBurst(x, y, event);
                return;

            case 'screen_shake':
                this.camera.shake(event.duration ? event.duration * 1000 : 200, 0.02);
                return;

            case 'pulse':
                this.createPulseEffect(x, y, baseSize, event);
                return;

            default:
                obj = this.createProjectile(x, y, baseSize, event);
        }

        if (!obj) return;

        // Start in warning state (white, transparent)
        if (warningDelay > 0) {
            (obj as any).setAlpha(0.3);
            if ((obj as any).setFillStyle) {
                (obj as any).setFillStyle(this.WARNING_COLOR);
            } else if ((obj as any).setTint) {
                (obj as any).setTint(this.WARNING_COLOR);
            }
        }

        obj.setData('baseScale', (obj as any).scaleX || 1);
        this.enemyGroup.add(obj as any);
        this.activeEvents.push({ 
            event, 
            object: obj, 
            startTime: audioTime, 
            warningComplete: warningDelay <= 0,
            graphics,
            initialX: x,
            initialY: y
        });
    }

    private activateObject(active: ActiveEvent) {
        const obj = active.object as any;
        if (!obj || !obj.active) return;

        // Transition from warning to active (pink)
        this.tweens.add({
            targets: obj,
            alpha: 1,
            duration: 100,
            ease: 'Power2'
        });

        if (obj.setFillStyle) {
            obj.setFillStyle(this.PINK);
        } else if (obj.setTint) {
            obj.setTint(this.PINK);
        }

        // Update laser graphics
        if (active.graphics) {
            this.drawLaserGraphics(active);
        }
    }

    private createProjectile(x: number, y: number, size: number, event: LevelEvent): Phaser.GameObjects.Arc {
        const circle = this.add.circle(x, y, size / 2, this.PINK);
        this.physics.add.existing(circle);
        (circle.body as Phaser.Physics.Arcade.Body).setCircle(size / 2);
        
        // Store movement data for audio-time-based positioning
        if (event.targetX !== undefined && event.targetY !== undefined) {
            const targetX = this.scaleX(event.targetX);
            const targetY = this.scaleY(event.targetY);
            circle.setData('targetX', targetX);
            circle.setData('targetY', targetY);
            circle.setData('startX', x);
            circle.setData('startY', y);
        }
        
        circle.setData('speed', event.speed || 200);
        
        return circle;
    }

    private createObstacle(x: number, y: number, size: number, event: LevelEvent): Phaser.GameObjects.Rectangle {
        const rect = this.add.rectangle(x, y, size, size, this.PINK);
        this.physics.add.existing(rect);
        (rect.body as Phaser.Physics.Arcade.Body).setSize(size, size);
        
        if (event.rotation) {
            rect.setAngle(event.rotation);
        }
        
        return rect;
    }

    private createLaser(x: number, y: number, event: LevelEvent): { obj: Phaser.GameObjects.Rectangle, graphics: Phaser.GameObjects.Graphics } {
        const thickness = this.scaleSize(event.thickness || 20);
        const angle = event.rotation || 0;
        const length = Math.max(this.scale.width, this.scale.height) * 2;

        const rect = this.add.rectangle(x, y, length, thickness, this.PINK, 0);
        rect.setAngle(angle);
        this.physics.add.existing(rect, true);
        
        const graphics = this.add.graphics();
        graphics.setDepth(5);
        
        rect.setData('laserGraphics', graphics);
        rect.setData('laserAngle', angle);
        rect.setData('laserThickness', thickness);
        rect.setData('startAngle', angle);
        rect.setData('noGlobalPulse', true);
        
        return { obj: rect, graphics };
    }

    private drawLaserGraphics(active: ActiveEvent) {
        const obj = active.object as any;
        const graphics = active.graphics;
        if (!graphics || !obj) return;

        const x = obj.x;
        const y = obj.y;
        const angle = obj.angle || 0;
        const thickness = obj.getData('laserThickness') || 20;
        const length = Math.max(this.scale.width, this.scale.height) * 2;

        graphics.clear();
        
        const rad = Phaser.Math.DegToRad(angle);
        
        // Glow effect
        graphics.lineStyle(thickness + 20, this.PINK, 0.2);
        graphics.beginPath();
        graphics.moveTo(x - Math.cos(rad) * length, y - Math.sin(rad) * length);
        graphics.lineTo(x + Math.cos(rad) * length, y + Math.sin(rad) * length);
        graphics.strokePath();

        // Core beam
        graphics.lineStyle(thickness, this.PINK, 0.8);
        graphics.beginPath();
        graphics.moveTo(x - Math.cos(rad) * length, y - Math.sin(rad) * length);
        graphics.lineTo(x + Math.cos(rad) * length, y + Math.sin(rad) * length);
        graphics.strokePath();

        // Bright center
        graphics.lineStyle(thickness * 0.3, 0xFFFFFF, 1);
        graphics.beginPath();
        graphics.moveTo(x - Math.cos(rad) * length, y - Math.sin(rad) * length);
        graphics.lineTo(x + Math.cos(rad) * length, y + Math.sin(rad) * length);
        graphics.strokePath();
    }

    private createExpandingCircle(x: number, y: number, size: number, event: LevelEvent): Phaser.GameObjects.Arc {
        const circle = this.add.circle(x, y, size / 2, this.PINK, 0);
        circle.setStrokeStyle(this.scaleSize(8), this.PINK, 1);
        this.physics.add.existing(circle);
        circle.setData('isExpanding', true);
        circle.setData('maxRadius', this.scaleSize((event.size || 200) * 2));
        circle.setData('startRadius', size / 2);
        circle.setData('noGlobalPulse', true);
        return circle;
    }

    private createWave(x: number, y: number, event: LevelEvent): Phaser.GameObjects.Rectangle {
        const width = this.scale.width;
        const height = this.scaleSize(event.thickness || 30);
        const rect = this.add.rectangle(x, y, width, height, this.PINK);
        this.physics.add.existing(rect);
        
        rect.setData('startY', y);
        
        return rect;
    }

    private createWall(x: number, y: number, event: LevelEvent): Phaser.GameObjects.Rectangle {
        const isVertical = (event.rotation || 0) % 180 === 90;
        const width = isVertical ? this.scaleSize(event.thickness || 40) : this.scale.width;
        const height = isVertical ? this.scale.height : this.scaleSize(event.thickness || 40);
        
        const rect = this.add.rectangle(x, y, width, height, this.PINK);
        this.physics.add.existing(rect);
        (rect.body as Phaser.Physics.Arcade.Body).setSize(width, height);
        return rect;
    }

    private createSpikeRing(x: number, y: number, event: LevelEvent, audioTime: number) {
        const count = event.count || 8;
        const size = this.scaleSize(event.size || 30);
        const startAngle = event.angle || 0;
        const spread = 360 / count;
        const rotationSpeed = event.rotationSpeed || event.speed || 60;

        for (let i = 0; i < count; i++) {
            const angleOffset = startAngle + i * spread;
            const rad = Phaser.Math.DegToRad(angleOffset);
            const spikeX = x + Math.cos(rad) * size;
            const spikeY = y + Math.sin(rad) * size;

            const spike = this.add.triangle(spikeX, spikeY, 0, -15, 10, 15, -10, 15, this.PINK);
            spike.setScale(this.scale.width / 1024);
            spike.setRotation(rad + Math.PI / 2);
            this.physics.add.existing(spike);
            
            spike.setData('baseScale', spike.scaleX);
            spike.setData('ringCenter', { x, y });
            spike.setData('ringRadius', size);
            spike.setData('initialAngle', angleOffset);
            spike.setData('rotationSpeed', rotationSpeed);

            this.enemyGroup.add(spike as any);
            this.activeEvents.push({ 
                event: { ...event, behavior: 'spinning' }, 
                object: spike, 
                startTime: audioTime,
                warningComplete: (event.delay || 0.3) <= 0,
                initialX: spikeX,
                initialY: spikeY
            });
        }
    }

    private createParticleBurst(x: number, y: number, event: LevelEvent) {
        const count = event.count || 12;
        const size = this.scaleSize(event.size || 10);
        const speed = this.scaleSize(event.speed || 200);
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const particle = this.add.circle(x, y, size, this.PINK);
            particle.setAlpha(0.8);
            
            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * speed,
                y: y + Math.sin(angle) * speed,
                alpha: 0,
                scale: 0.1,
                duration: (event.duration || 0.5) * 1000,
                ease: 'Power2',
                onComplete: () => particle.destroy()
            });
        }
    }

    private createPulseEffect(x: number, y: number, size: number, event: LevelEvent) {
        const ring = this.add.circle(x, y, size, this.PINK, 0);
        ring.setStrokeStyle(this.scaleSize(4), this.PINK, 1);
        
        const maxSize = this.scaleSize((event.size || 100) * 3);
        
        this.tweens.add({
            targets: ring,
            radius: maxSize,
            alpha: 0,
            duration: (event.duration || 0.5) * 1000,
            ease: 'Power2',
            onComplete: () => ring.destroy()
        });
    }

    /**
     * Update event behavior using audio time for DETERMINISTIC positioning
     * All positions are calculated from audio time, not accumulated deltas
     */
    private updateEventBehavior(active: ActiveEvent, progress: number, audioTime: number) {
        const obj = active.object as any;
        const event = active.event;
        if (!obj || !obj.active) return;

        // Update laser graphics
        if (active.graphics && active.warningComplete) {
            this.drawLaserGraphics(active);
        }

        // Handle expanding circles (audio-time based)
        if (obj.getData('isExpanding')) {
            const startRadius = obj.getData('startRadius') || 20;
            const maxRadius = obj.getData('maxRadius') || 200;
            const currentRadius = Phaser.Math.Interpolation.Linear([startRadius, maxRadius], progress);
            obj.setRadius(currentRadius);
            if (obj.body && obj.body.setCircle) {
                obj.body.setCircle(currentRadius);
            }
            return; 
        }

        // Handle spike ring rotation (audio-time based)
        if (obj.getData('ringCenter')) {
            const center = obj.getData('ringCenter');
            const radius = obj.getData('ringRadius');
            const initialAngle = obj.getData('initialAngle') || 0;
            const rotationSpeed = obj.getData('rotationSpeed') || 60;
            
            const eventAge = audioTime - active.startTime;
            const angleDelta = rotationSpeed * eventAge;
            const newAngle = Phaser.Math.DegToRad(initialAngle + angleDelta);
            
            obj.x = center.x + Math.cos(newAngle) * radius;
            obj.y = center.y + Math.sin(newAngle) * radius;
            obj.setRotation(newAngle + Math.PI / 2);
            return;
        }

        if (!event.behavior || event.behavior === 'static') return;
        
        const eventAge = audioTime - active.startTime;

        switch (event.behavior) {
            case 'homing': {
                // Homing movement (deterministic approximation based on player position at current time)
                const homingSpeed = (event.speed || 100) * (this.scale.width / 1024);
             const angle = Phaser.Math.Angle.Between(obj.x, obj.y, this.player.x, this.player.y);
                const distance = homingSpeed * eventAge;
                
                // Limit max movement per update for fairness
                const maxMove = homingSpeed * 0.016; // ~60fps equivalent
                obj.x += Math.cos(angle) * Math.min(maxMove, 5);
                obj.y += Math.sin(angle) * Math.min(maxMove, 5);
                obj.rotation = angle;
                break;
            }

            case 'spinning': {
                const rotationSpeed = event.rotationSpeed || event.speed || 360;
                obj.angle = rotationSpeed * eventAge;
                break;
            }

            case 'sweep': {
                // Deterministic sweep from start to target based on progress
                const startX = active.initialX;
                const startY = active.initialY;
                const targetX = event.targetX !== undefined ? this.scaleX(event.targetX) : (startX < this.scale.width / 2 ? this.scale.width : 0);
                const targetY = event.targetY !== undefined ? this.scaleY(event.targetY) : startY;
                
                obj.x = Phaser.Math.Interpolation.Linear([startX, targetX], progress);
                obj.y = Phaser.Math.Interpolation.Linear([startY, targetY], progress);
                
                // Update laser angle for sweeping lasers
                if (active.graphics) {
                    const startAngle = obj.getData('startAngle') || 0;
                    const sweepRange = event.angle || 90;
                    obj.angle = startAngle + sweepRange * progress;
                }
                break;
            }

            case 'bouncing': {
                // Pulsing scale synced to beat
                const pulseCount = event.pulseCount || 4;
                const beatPhase = Math.sin(progress * Math.PI * pulseCount);
             const baseScale = obj.getData('baseScale') || 1;
                const bounceScale = baseScale * (1 + Math.abs(beatPhase) * 0.3);
                obj.setScale(bounceScale);
                
                // Sync physics body
                if (obj.body?.isCircle) {
                    obj.body.setCircle((obj.width / 2) * bounceScale / baseScale);
                }
                break;
            }

            case 'expand': {
                const expandScale = 1 + progress * 2;
                obj.setScale(expandScale);
                obj.setAlpha(1 - progress * 0.7);
                break;
            }

            case 'contract': {
                const contractScale = 2 - progress * 1.5;
                obj.setScale(Math.max(0.1, contractScale));
                break;
            }

            case 'oscillate': {
                const freq = event.oscillationFreq || event.pulseCount || 2;
                const oscillation = Math.sin(progress * Math.PI * freq * 2);
                const oscillateRange = this.scaleSize(event.size || 50);
                
                if (event.rotation === 90 || event.rotation === 270) {
                    obj.x = active.initialX + oscillation * oscillateRange;
             } else {
                    obj.y = active.initialY + oscillation * oscillateRange;
                }
                break;
            }
        }

        // Linear movement for projectiles with targets (audio-time based)
        if (obj.getData('targetX') !== undefined) {
            const startX = obj.getData('startX');
            const startY = obj.getData('startY');
            const targetX = obj.getData('targetX');
            const targetY = obj.getData('targetY');
            
            obj.x = Phaser.Math.Interpolation.Linear([startX, targetX], progress);
            obj.y = Phaser.Math.Interpolation.Linear([startY, targetY], progress);
        }
    }
}
