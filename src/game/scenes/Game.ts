import { EventBus } from '../EventBus';
import { Scene } from 'phaser';
import { LevelData, LevelEvent } from '../types';

interface ActiveEvent {
    event: LevelEvent;
    object: Phaser.GameObjects.GameObject;
    startTime: number;
    warningComplete: boolean;
    graphics?: Phaser.GameObjects.Graphics; // For complex shapes like lasers
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
    private enemyGroup: Phaser.Physics.Arcade.Group;
    private timelineIndex = 0;
    private isPlaying = false;
    private isDashing = false;
    private dashCooldown = 0;
    private lastDashTime = 0;
    private progressBar: Phaser.GameObjects.Rectangle;
    private bgGraphics: Phaser.GameObjects.Graphics;
    private particleEmitter: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

    private _tempVec: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private _accumulatorMs = 0;
    private _fixedStepMs = 1000 / 60; 
    private _maxDeltaMs = 100;
    private speed = 600;
    private dashSpeed = 1200;

    // Audio tracking
    private audioStartTime = 0;
    private activeEvents: ActiveEvent[] = [];

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
        
        // Collision with enemies
        this.physics.add.overlap(this.player, this.enemyGroup, (player, enemy) => {
            const active = this.activeEvents.find(ae => ae.object === enemy);
            // Only damage if warning period is complete
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

        // Listen for level data
        EventBus.on('load-level', (data: { levelData: LevelData, audioUrl: string, imageMappings: Record<string, string> }) => {
            this.startLevel(data);
        });

        // Check for pending level data
        if ((window as any).pendingLevelData) {
            this.startLevel((window as any).pendingLevelData);
            (window as any).pendingLevelData = null;
        }

        EventBus.emit('current-scene-ready', this);
    }

    private stopLevel() {
        if (this.music) {
            this.music.stop();
            this.music.destroy();
            this.music = null;
        }
        this.isPlaying = false;
        this.activeEvents = [];
        this.enemyGroup.clear(true, true);
    }

    private startLevel(data: { levelData: LevelData, audioUrl: string, imageMappings: Record<string, string> }) {
        this.levelData = data.levelData;
        this.timelineIndex = 0;
        this.activeEvents = [];
        this.isPlaying = false;
        
        // Reset scene
        this.enemyGroup.clear(true, true);
        if (this.music) {
            this.music.stop();
            this.music.destroy();
        }

        // Set theme colors
        if (this.levelData.theme?.backgroundColor) {
            const bgColor = Phaser.Display.Color.HexStringToColor(this.levelData.theme.backgroundColor).color;
            this.camera.setBackgroundColor(bgColor);
        }

        // Sort timeline by timestamp
        this.levelData.timeline.sort((a, b) => a.timestamp - b.timestamp);

        console.log('Loading level:', this.levelData.metadata.bossName);
        console.log('Timeline events:', this.levelData.timeline.length);
        console.log('First few events:', this.levelData.timeline.slice(0, 5));

        // Load audio
        const audioKey = 'level-music-' + Date.now();
        this.load.audio(audioKey, data.audioUrl);
        
        // Load dynamic images
        Object.entries(data.imageMappings).forEach(([id, url]) => {
            this.load.image(id, url);
        });

        this.load.once('complete', () => {
            this.music = this.sound.add(audioKey) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
            
            this.music.once('play', () => {
                this.audioStartTime = this.time.now;
                this.isPlaying = true;
                console.log('🎵 Level started! BPM:', this.levelData?.metadata.bpm);
            });

            this.music.once('complete', () => {
                this.isPlaying = false;
                console.log('Level complete!');
            });

            this.music.play();
        });

        this.load.start();
    }

    private handlePlayerHit(enemy: Phaser.GameObjects.GameObject) {
        if (this.isDashing) return;

        const enemyObj = enemy as any;
        const angle = Phaser.Math.Angle.Between(enemyObj.x, enemyObj.y, this.player.x, this.player.y);
        
        this.player.x += Math.cos(angle) * 50;
        this.player.y += Math.sin(angle) * 50;
        
        // Visual feedback
        this.camera.shake(100, 0.02);
        this.camera.flash(100, 255, 0, 153, true);
        this.player.setAlpha(0.3);
        this.time.delayedCall(200, () => this.player.setAlpha(1));
    }

    private getCurrentAudioTime(): number {
        if (!this.music || !this.isPlaying) return 0;
        
        // Use the seek property which gives current playback position in seconds
        const seek = (this.music as any).seek;
        if (typeof seek === 'number' && !isNaN(seek)) {
            return seek;
        }
        
        // Fallback: calculate from game time
        return (this.time.now - this.audioStartTime) / 1000;
    }

    private updateProgressBar() {
        if (!this.music || !this.levelData) return;
        const currentTime = this.getCurrentAudioTime();
        const progress = currentTime / this.levelData.metadata.duration;
        this.progressBar.width = this.scale.width * Phaser.Math.Clamp(progress, 0, 1);
    }

    update (time: number, delta: number)
    {
        if (!this.keys || !this.player) return;

        this.updateProgressBar();
        this.updateBackgroundPulse();

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

        // Player Movement
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

        // Attack System & Music Sync
        if (this.isPlaying && this.music && this.levelData) {
            const currentTime = this.getCurrentAudioTime();

            // Spawn events from timeline
            while (
                this.timelineIndex < this.levelData.timeline.length && 
                this.levelData.timeline[this.timelineIndex].timestamp <= currentTime
            ) {
                const event = this.levelData.timeline[this.timelineIndex];
                this.spawnEvent(event, currentTime);
                this.timelineIndex++;
            }

            // Update Active Events
            for (let i = this.activeEvents.length - 1; i >= 0; i--) {
                const active = this.activeEvents[i];
                const age = currentTime - active.startTime;
                const duration = active.event.duration || 2.0;
                const warningDelay = active.event.delay || 0.3;
                
                // Handle warning phase transition
                if (!active.warningComplete && age >= warningDelay) {
                    active.warningComplete = true;
                    this.activateObject(active);
                }
                
                if (age > duration) {
                    // Fade out before destroying
                    if (active.object && (active.object as any).alpha > 0) {
                        (active.object as any).setAlpha(0);
                    }
                    if (active.graphics) {
                        active.graphics.destroy();
                    }
                    active.object.destroy();
                    this.activeEvents.splice(i, 1);
                } else {
                    const t = age / duration;
                    this.updateEventBehavior(active, t, currentTime);
                }
            }

            // Global Pulse Effect
            this.updatePulse(currentTime);
        }
    }

    private updateBackgroundPulse() {
        if (!this.levelData?.metadata.bpm || !this.isPlaying) return;
        
        this.bgGraphics.clear();
        
        const bpm = this.levelData.metadata.bpm;
        const currentTime = this.getCurrentAudioTime();
        const beatDuration = 60 / bpm;
        const beatPhase = (currentTime % beatDuration) / beatDuration;
        const pulse = Math.sin(beatPhase * Math.PI * 2);
        
        // Subtle background pulse
        const intensity = 0.02 + Math.abs(pulse) * 0.03;
        this.bgGraphics.fillStyle(this.PINK, intensity);
        this.bgGraphics.fillRect(0, 0, this.scale.width, this.scale.height);
    }

    private updatePulse(currentTime: number) {
        if (!this.levelData?.metadata.bpm) return;
        
        const bpm = this.levelData.metadata.bpm;
        const beatDuration = 60 / bpm;
        const pulse = Math.abs(Math.sin((currentTime * Math.PI) / beatDuration));
        
        // Pulse all enemies slightly
        this.enemyGroup.children.entries.forEach((child: any) => {
            if (child.active && !child.getData('isScaling') && !child.getData('noGlobalPulse')) {
                const baseScale = child.getData('baseScale') || 1;
                const newScale = baseScale + (pulse * 0.05);
                child.setScale(newScale);
            }
        });
    }

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

    private spawnEvent(event: LevelEvent, startTime: number) {
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
                this.createSpikeRing(x, y, event, startTime);
                return; // spike_ring creates multiple objects

            case 'particle_burst':
                this.createParticleBurst(x, y, event);
                return; // Visual only, no collision

            case 'screen_shake':
                this.camera.shake(event.duration ? event.duration * 1000 : 200, 0.02);
                return;

            case 'pulse':
                this.createPulseEffect(x, y, baseSize, event);
                return;

            default:
                // Fallback: create a simple projectile for unknown types
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
            startTime, 
            warningComplete: warningDelay <= 0,
            graphics 
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

        // Flash effect on activation
        if (active.graphics) {
            active.graphics.clear();
            this.drawLaserGraphics(active);
        }
    }

    private createProjectile(x: number, y: number, size: number, event: LevelEvent): Phaser.GameObjects.Arc {
        const circle = this.add.circle(x, y, size / 2, this.PINK);
        this.physics.add.existing(circle);
        (circle.body as Phaser.Physics.Arcade.Body).setCircle(size / 2);
        
        // Set initial velocity if target specified
        if (event.targetX !== undefined && event.targetY !== undefined) {
            const targetX = this.scaleX(event.targetX);
            const targetY = this.scaleY(event.targetY);
            const angle = Phaser.Math.Angle.Between(x, y, targetX, targetY);
            const speed = (event.speed || 200) * (this.scale.width / 1024);
            circle.setData('velocityX', Math.cos(angle) * speed);
            circle.setData('velocityY', Math.sin(angle) * speed);
        }
        
        return circle;
    }

    private createObstacle(x: number, y: number, size: number, event: LevelEvent): Phaser.GameObjects.Rectangle {
        const rect = this.add.rectangle(x, y, size, size, this.PINK);
        this.physics.add.existing(rect);
        (rect.body as Phaser.Physics.Arcade.Body).setSize(size, size);
        return rect;
    }

    private createLaser(x: number, y: number, event: LevelEvent): { obj: Phaser.GameObjects.Rectangle, graphics: Phaser.GameObjects.Graphics } {
        const thickness = this.scaleSize(event.thickness || 20);
        const angle = event.rotation || 0;
        const length = Math.max(this.scale.width, this.scale.height) * 2;

        // Create invisible collision rectangle
        const rect = this.add.rectangle(x, y, length, thickness, this.PINK, 0);
        rect.setAngle(angle);
        this.physics.add.existing(rect, true); // Static body
        
        // Create visual graphics for the laser
        const graphics = this.add.graphics();
        graphics.setDepth(5);
        
        rect.setData('laserGraphics', graphics);
        rect.setData('laserAngle', angle);
        rect.setData('laserThickness', thickness);
        
        return { obj: rect, graphics };
    }

    private drawLaserGraphics(active: ActiveEvent) {
        const obj = active.object as any;
        const graphics = active.graphics;
        if (!graphics || !obj) return;

        const x = obj.x;
        const y = obj.y;
        const angle = obj.getData('laserAngle') || 0;
        const thickness = obj.getData('laserThickness') || 20;
        const length = Math.max(this.scale.width, this.scale.height) * 2;

        graphics.clear();
        
        // Glow effect
        graphics.lineStyle(thickness + 20, this.PINK, 0.2);
        graphics.beginPath();
        const rad = Phaser.Math.DegToRad(angle);
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
        circle.setData('maxSize', this.scaleSize(event.size || 200));
        return circle;
    }

    private createWave(x: number, y: number, event: LevelEvent): Phaser.GameObjects.Rectangle {
        const width = this.scale.width;
        const height = this.scaleSize(event.thickness || 30);
        const rect = this.add.rectangle(x, y, width, height, this.PINK);
        this.physics.add.existing(rect);
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

    private createSpikeRing(x: number, y: number, event: LevelEvent, startTime: number) {
        const count = event.count || 8;
        const size = this.scaleSize(event.size || 30);
        const startAngle = event.angle || 0;
        const spread = 360 / count;

        for (let i = 0; i < count; i++) {
            const angle = Phaser.Math.DegToRad(startAngle + i * spread);
            const spikeX = x + Math.cos(angle) * size;
            const spikeY = y + Math.sin(angle) * size;

            const spike = this.add.triangle(spikeX, spikeY, 0, -15, 10, 15, -10, 15, this.PINK);
            spike.setScale(this.scale.width / 1024);
            spike.setRotation(angle + Math.PI / 2);
            this.physics.add.existing(spike);
            
            spike.setData('baseScale', spike.scaleX);
            spike.setData('ringAngle', angle);
            spike.setData('ringCenter', { x, y });
            spike.setData('ringRadius', size);
            spike.setData('angularSpeed', (event.speed || 1) * 0.02);

            this.enemyGroup.add(spike as any);
            this.activeEvents.push({ 
                event: { ...event, type: 'projectile_throw', behavior: 'spinning' }, 
                object: spike, 
                startTime,
                warningComplete: (event.delay || 0.3) <= 0
            });
        }
    }

    private createParticleBurst(x: number, y: number, event: LevelEvent) {
        // Simple visual burst using circles that fade out
        const count = event.count || 12;
        const size = this.scaleSize(event.size || 10);
        
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2;
            const speed = (event.speed || 200) * (this.scale.width / 1024);
            
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

    private updateEventBehavior(active: ActiveEvent, t: number, currentTime: number) {
        const obj = active.object as any;
        const event = active.event;
        if (!obj || !obj.active) return;
        
        const scaleX = this.scale.width / 1024;
        const scaleY = this.scale.height / 768;

        // Update laser graphics
        if (active.graphics && active.warningComplete) {
            this.drawLaserGraphics(active);
        }

        // Handle expanding circles
        if (obj.getData('isExpanding')) {
            const maxSize = obj.getData('maxSize') || 200;
            const currentRadius = Phaser.Math.Interpolation.Linear([0, maxSize], t);
            obj.setRadius(currentRadius);
            if (obj.body && obj.body.setCircle) {
                obj.body.setCircle(currentRadius);
            }
            return;
        }

        // Handle spike ring rotation
        if (obj.getData('ringCenter')) {
            const center = obj.getData('ringCenter');
            const radius = obj.getData('ringRadius');
            const baseAngle = obj.getData('ringAngle');
            const angularSpeed = obj.getData('angularSpeed');
            
            const newAngle = baseAngle + currentTime * angularSpeed;
            obj.x = center.x + Math.cos(newAngle) * radius;
            obj.y = center.y + Math.sin(newAngle) * radius;
            obj.setRotation(newAngle + Math.PI / 2);
            return;
        }

        if (!event.behavior || event.behavior === 'static') return;

        switch (event.behavior) {
            case 'homing':
                const homingSpeed = (event.speed || 3) * scaleX;
                const angle = Phaser.Math.Angle.Between(obj.x, obj.y, this.player.x, this.player.y);
                obj.x += Math.cos(angle) * homingSpeed;
                obj.y += Math.sin(angle) * homingSpeed;
                obj.rotation = angle;
                break;

            case 'spinning':
                const spinSpeed = (event.speed || 360) * t;
                obj.angle = spinSpeed;
                break;

            case 'sweep':
                if (event.targetX !== undefined && event.targetY !== undefined) {
                    const startX = this.scaleX(event.x);
                    const startY = this.scaleY(event.y);
                    const targetX = this.scaleX(event.targetX);
                    const targetY = this.scaleY(event.targetY);
                    obj.x = Phaser.Math.Interpolation.Linear([startX, targetX], t);
                    obj.y = Phaser.Math.Interpolation.Linear([startY, targetY], t);
                } else {
                    // Default: sweep horizontally
                    const startX = this.scaleX(event.x);
                    const targetX = startX < (this.scale.width / 2) ? this.scale.width : 0;
                    obj.x = Phaser.Math.Interpolation.Linear([startX, targetX], t);
                }
                break;

            case 'bouncing':
                obj.setData('isScaling', true);
                const beatPhase = Math.sin(t * Math.PI * (event.pulseCount || 4));
                const baseScale = obj.getData('baseScale') || 1;
                const bounceScale = baseScale + Math.abs(beatPhase) * 0.3;
                obj.setScale(bounceScale);
                
                // Sync physics body
                if (obj.body?.isCircle) {
                    obj.body.setCircle((obj.width * bounceScale) / 2);
                }
                break;

            case 'expand':
                const expandScale = 1 + t * 2;
                obj.setScale(expandScale);
                obj.setAlpha(1 - t * 0.5);
                break;

            case 'contract':
                const contractScale = 2 - t * 1.5;
                obj.setScale(Math.max(0.1, contractScale));
                break;

            case 'oscillate':
                const oscillation = Math.sin(t * Math.PI * (event.pulseCount || 4));
                const oscillateRange = this.scaleSize(event.size || 50);
                if (event.rotation === 90 || event.rotation === 270) {
                    obj.x = this.scaleX(event.x) + oscillation * oscillateRange;
                } else {
                    obj.y = this.scaleY(event.y) + oscillation * oscillateRange;
                }
                break;
        }

        // Apply velocity if set
        const vx = obj.getData('velocityX');
        const vy = obj.getData('velocityY');
        if (vx !== undefined && vy !== undefined) {
            obj.x += vx * (1/60);
            obj.y += vy * (1/60);
        }
    }
}
