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
        this.player = this.add.rectangle(width / 2, height / 2, 20, 20, 0x00ffff) as any;
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
        const speed = this.isDashing ? 1200 : 600;
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

            // Spawn events from timeline
            while (
                this.timelineIndex < this.levelData.timeline.length && 
                this.levelData.timeline[this.timelineIndex].timestamp <= currentTime
            ) {
                this.spawnEvent(this.levelData.timeline[this.timelineIndex]);
                this.timelineIndex++;
            }

            // Cleanup off-screen enemies
            this.enemyGroup.getChildren().forEach((enemy: any) => {
                if (enemy.x < -100 || enemy.x > 1124 || enemy.y < -100 || enemy.y > 868) {
                    enemy.destroy();
                }
            });
        }
    }

    private spawnEvent(event: LevelEvent) {
        const enemyColor = Phaser.Display.Color.HexStringToColor(this.levelData?.theme.enemyColor || '#FF0099').color;

        // Telegraphing: 500ms before the actual attack
        const warning = event.assetId 
            ? this.add.image(event.x, event.y, event.assetId).setDisplaySize(event.size || 40, event.size || 40).setAlpha(0.2).setTint(enemyColor)
            : this.add.rectangle(event.x, event.y, event.size || 20, event.size || 20, enemyColor, 0.2);

        this.time.delayedCall(500, () => {
            warning.destroy();
            
            if (event.type === 'projectile_throw') {
            const projectile = this.add.rectangle(event.x, event.y, event.size || 20, event.size || 20, enemyColor);
            if (event.assetId) {
                // Use custom asset if provided
                const img = this.add.image(event.x, event.y, event.assetId).setDisplaySize(event.size || 40, event.size || 40).setTint(enemyColor);
                projectile.setAlpha(0); // Hide the helper rect
                this.enemyGroup.add(img);
                
                // Add movement logic based on behavior
                this.applyBehavior(img, event);
            } else {
                this.enemyGroup.add(projectile);
                this.applyBehavior(projectile, event);
            }
        } else if (event.type === 'spawn_obstacle') {
            const obstacle = event.assetId 
                ? this.add.image(event.x, event.y, event.assetId).setDisplaySize(event.size || 60, event.size || 60).setTint(enemyColor)
                : this.add.rectangle(event.x, event.y, event.size || 40, event.size || 40, enemyColor);
            
            this.enemyGroup.add(obstacle as any);
            this.applyBehavior(obstacle as any, event);
        } else if (event.type === 'screen_shake') {
            this.camera.shake(event.duration || 200, 0.02);
        }
    });
}

    private applyBehavior(obj: any, event: LevelEvent) {
        if (!event.behavior || event.behavior === 'static') return;

        if (event.behavior === 'homing') {
            this.tweens.add({
                targets: obj,
                x: this.player.x,
                y: this.player.y,
                duration: 1000,
                ease: 'Power1'
            });
        } else if (event.behavior === 'spinning') {
            this.tweens.add({
                targets: obj,
                angle: 360,
                duration: 2000,
                repeat: -1
            });
        } else if (event.behavior === 'bouncing') {
            const body = obj.body as Phaser.Physics.Arcade.Body;
            if (body) {
                body.setVelocity(Phaser.Math.Between(-200, 200), Phaser.Math.Between(-200, 200));
                body.setBounce(1, 1);
                body.setCollideWorldBounds(true);
            }
        }
    }
}

