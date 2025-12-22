import { Scene, GameObjects } from 'phaser';
import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    private isTransitioning = false;
    private menuMusic: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | null = null;
    private loadingMusic: Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound | null = null;
    private logo: GameObjects.Image;
    private readonly MENU_MUSIC_PATH = 'assets/menu-music.mp3';
    private readonly PIXL_SUGAR_RUSH_PATH = 'assets/PIXL - Sugar Rush (Challenge Loop).mp3';
    private readonly MENU_BPM = 124; // Danimal Cannon - Menu is ~124 BPM

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.isTransitioning = false;
        const { width, height } = this.scale;

        // Play menu music
        void this.playMenuMusic();

        // Background
        this.cameras.main.setBackgroundColor('#111111');

        // Decorative Shapes (JSAB style)
        const graphics = this.add.graphics();
        
        // Dark diagonal background splash
        graphics.fillStyle(0x000000, 0.5);
        graphics.beginPath();
        graphics.moveTo(width * 0.4, 0);
        graphics.lineTo(width, 0);
        graphics.lineTo(width, height);
        graphics.lineTo(width * 0.2, height);
        graphics.closePath();
        graphics.fillPath();

        // Logo
        this.logo = this.add.image(width * 0.1, height / 2, 'logo').setOrigin(0, 0.5);
        const logoScale = Math.min(height / 600, 1.5); 
        this.logo.setScale(logoScale);

        // Menu Buttons
        const startX = width * 0.55;
        const startY = height * 0.4;
        const gap = 120;

        const btn1 = this.createMenuButton(startX, startY, 'MAKE LEVEL', 0x00ffff, () => {
            EventBus.emit('open-editor');
        });

        const btn2 = this.createMenuButton(startX + 40, startY + gap, 'VIEW LEVELS', 0xff0099, () => {
            EventBus.emit('open-community-hub');
        });

        // Staggered Entrance Animation
        btn1.setAlpha(0);
        btn1.x += 100;
        
        btn2.setAlpha(0);
        btn2.x += 100;

        this.tweens.add({
            targets: [btn1, btn2],
            alpha: 1,
            x: '-=100',
            duration: 800,
            ease: 'Power3',
            stagger: 200
        });

        // Handle level loading - transition to Game scene
        const handleLoadLevel = () => {
            if (this.isTransitioning) return;
            this.isTransitioning = true;
            
            console.log('MainMenu: Transitioning to Game scene...');
            
            // Stop all music when level starts
            this.stopMenuMusic();
            this.stopLoadingMusic();
            
            // Add a brief fade effect
            this.cameras.main.fadeOut(200, 0, 0, 0);
            
            this.time.delayedCall(200, () => {
                this.scene.start('Game');
            });
        };

        // Stop menu music and play PIXL Sugar Rush when level generation starts
        const handleLevelGenerationStart = () => {
            console.log('MainMenu: Level generation started, switching to PIXL Sugar Rush');
            this.stopMenuMusic();
            void this.playLoadingMusic();
        };

        // Remove any existing listeners first to prevent duplicates
        EventBus.removeAllListeners('load-level');
        EventBus.on('load-level', handleLoadLevel);

        // Listen for level generation start
        EventBus.removeAllListeners('level-generation-start');
        EventBus.on('level-generation-start', handleLevelGenerationStart);

        // Also handle direct navigation
        EventBus.removeAllListeners('go-to-main-menu');
        EventBus.on('go-to-main-menu', () => {
            this.scene.start('MainMenu');
        });

        // Bottom Bar / Profile
        const profileContainer = this.add.container(50, height - 80);
        const profileBg = this.add.rectangle(0, 0, 200, 60, 0x222222).setOrigin(0, 0.5);
        const profileText = this.add.text(20, 0, 'User Profile', { fontFamily: 'Arial', fontSize: '24px', color: '#ffffff' }).setOrigin(0, 0.5);
        profileContainer.add([profileBg, profileText]);
        
        profileBg.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => console.log('Profile Clicked'));

        // Settings
        const settingsContainer = this.add.container(width - 50, height - 80);
        const settingsText = this.add.text(0, 0, 'SETTINGS', { fontFamily: 'Arial Black', fontSize: '24px', color: '#888888' }).setOrigin(1, 0.5);
        settingsContainer.add(settingsText);

        settingsText.setInteractive({ useHandCursor: true })
            .on('pointerover', () => settingsText.setColor('#ffffff'))
            .on('pointerout', () => settingsText.setColor('#888888'))
            .on('pointerdown', () => console.log('Settings Clicked'));

        EventBus.emit('current-scene-ready', this);
    }

    private async playMenuMusic() {
        // Stop any existing menu music
        this.stopMenuMusic();
        
        // Check if already loaded by Preloader
        if (!this.cache.audio.exists('menu-music')) {
            console.log('[MainMenu] Menu music not in cache, attempting to load...');
            try {
                await this.ensureAudioLoaded('menu-music', this.MENU_MUSIC_PATH);
            } catch (e) {
                console.error('[MainMenu] Failed to load menu music:', e);
                return;
            }
        }

        if (!this.cache.audio.exists('menu-music')) {
            console.error('[MainMenu] Menu music still missing from cache after load. Aborting playback.');
            return;
        }
        
        try {
            // Ensure audio context is running (browsers block auto-play)
            const soundManager = this.sound as Phaser.Sound.WebAudioSoundManager;
            if (soundManager.context && soundManager.context.state === 'suspended') {
                console.log('[MainMenu] Audio context suspended, waiting for user interaction...');
                const resumeAudio = () => {
                    soundManager.context.resume().then(() => {
                        console.log('[MainMenu] Audio context resumed!');
                        this.input.off('pointerdown', resumeAudio);
                        // Try playing again once resumed
                        if (!this.menuMusic) {
                            void this.playMenuMusic();
                        }
                    });
                };
                this.input.once('pointerdown', resumeAudio);
            }

            // Play menu music with loop
            this.menuMusic = this.sound.add('menu-music', { loop: true }) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
            this.menuMusic.play();
            console.log('[MainMenu] Menu music started successfully');
        } catch (e) {
            console.error('[MainMenu] Failed to start menu music (cache mismatch?):', e);
        }
    }

    private stopMenuMusic() {
        if (this.menuMusic) {
            this.menuMusic.stop();
            this.menuMusic.destroy();
            this.menuMusic = null;
            console.log('[MainMenu] Menu music stopped');
        }
    }

    private async playLoadingMusic() {
        // Stop any existing loading music
        this.stopLoadingMusic();
        
        // Check if already loaded by Preloader
        if (!this.cache.audio.exists('pixl-sugar-rush')) {
            console.log('[MainMenu] PIXL Sugar Rush not in cache, attempting to load...');
            try {
                await this.ensureAudioLoaded('pixl-sugar-rush', this.PIXL_SUGAR_RUSH_PATH);
            } catch (e) {
                console.error('[MainMenu] Failed to load PIXL Sugar Rush:', e);
                return;
            }
        }

        if (!this.cache.audio.exists('pixl-sugar-rush')) {
            console.error('[MainMenu] PIXL Sugar Rush still missing from cache after load. Aborting playback.');
            return;
        }
        
        try {
            // Play PIXL Sugar Rush with loop
            this.loadingMusic = this.sound.add('pixl-sugar-rush', { loop: true }) as Phaser.Sound.WebAudioSound | Phaser.Sound.HTML5AudioSound;
            this.loadingMusic.play();
            console.log('[MainMenu] PIXL Sugar Rush started successfully');
        } catch (e) {
            console.error('[MainMenu] Failed to start PIXL Sugar Rush (cache mismatch?):', e);
        }
    }

    private stopLoadingMusic() {
        if (this.loadingMusic) {
            this.loadingMusic.stop();
            this.loadingMusic.destroy();
            this.loadingMusic = null;
            console.log('[MainMenu] PIXL Sugar Rush stopped');
        }
    }

    private ensureAudioLoaded(key: string, path: string): Promise<void> {
        if (this.cache.audio.exists(key)) {
            console.log(`[MainMenu] Audio "${key}" already in cache`);
            return Promise.resolve();
        }

        console.log(`[MainMenu] Loading audio "${key}" from "${path}"...`);

        return new Promise((resolve, reject) => {
            const encodedPath = encodeURI(path);
            const timeoutMs = 30000; // Increased to 30 seconds for large files

            const cleanup = () => {
                this.load.off('filecomplete', onFileComplete);
                this.load.off('loaderror', onLoadError as any);
                clearTimeout(timeout);
            };

            const onFileComplete = (fileKey: string) => {
                if (fileKey !== key) return;
                cleanup();
                resolve();
            };

            const onLoadError = (file: any) => {
                if (!file) return;
                if (file.key !== key) return;
                cleanup();
                reject(new Error(`Failed to load audio "${key}" from "${encodedPath}"`));
            };

            const timeout = setTimeout(() => {
                cleanup();
                reject(new Error(`Timed out loading audio "${key}" from "${encodedPath}"`));
            }, timeoutMs);

            // Listen for this specific file completing / failing
            this.load.on('filecomplete', onFileComplete);
            this.load.on('loaderror', onLoadError as any);

            this.load.audio(key, encodedPath);

            if (!this.load.isLoading()) {
                this.load.start();
            }
        });
    }

    shutdown() {
        // Clean up audio when scene is shut down
        this.stopMenuMusic();
        this.stopLoadingMusic();
        EventBus.removeAllListeners('level-generation-start');
    }

    resize(gameSize: Phaser.Structs.Size, baseSize: Phaser.Structs.Size, displaySize: Phaser.Structs.Size, resolution: number)
    {
        const width = gameSize.width;
        const height = gameSize.height;

        this.cameras.resize(width, height);
        this.children.removeAll(); 
        this.create();
    }

    update(time: number, delta: number)
    {
        if (this.logo && !this.isTransitioning) {
            const beatDuration = 60000 / this.MENU_BPM;
            const pulse = (time % beatDuration) / beatDuration;
            
            // Pulsing effect: expand on the beat and shrink back
            const baseScale = Math.min(this.scale.height / 600, 1.5);
            const bounce = Math.exp(-4 * pulse); // Faster decay for a subtler "pop"
            const targetScale = baseScale * (1 + bounce * 0.03); // Reduced scale increase from 5% to 3%
            
            this.logo.setScale(targetScale);
        }
    }

    createMenuButton(x: number, y: number, text: string, color: number, callback: () => void)
    {
        const buttonWidth = 400;
        const buttonHeight = 80;

        const container = this.add.container(x, y);

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.8);
        bg.lineStyle(4, color, 1);
        
        const w = buttonWidth;
        const h = buttonHeight;
        const offset = h * 0.4;
        
        // Skewed rect path
        bg.beginPath();
        bg.moveTo(offset, 0);
        bg.lineTo(w + offset, 0);
        bg.lineTo(w, h);
        bg.lineTo(0, h);
        bg.closePath();
        bg.fillPath();
        bg.strokePath();

        const hitPoly = new Phaser.Geom.Polygon([
            offset, 0,
            w + offset, 0,
            w, h,
            0, h
        ]);

        bg.setInteractive(hitPoly, Phaser.Geom.Polygon.Contains);
        
        const btnText = this.add.text(w / 2 + offset / 2, h / 2, text, {
            fontFamily: 'Arial Black',
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        container.add([bg, btnText]);

        // Hover Effects
        bg.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(color, 1);
            bg.lineStyle(4, 0xffffff, 1);
            bg.beginPath();
            bg.moveTo(offset, 0);
            bg.lineTo(w + offset, 0);
            bg.lineTo(w, h);
            bg.lineTo(0, h);
            bg.closePath();
            bg.fillPath();
            bg.strokePath();
            
            btnText.setColor('#000000');
            
            this.tweens.add({
                targets: container,
                x: x + 20,
                duration: 100,
                ease: 'Power1'
            });
        });

        bg.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x000000, 0.8);
            bg.lineStyle(4, color, 1);
            bg.beginPath();
            bg.moveTo(offset, 0);
            bg.lineTo(w + offset, 0);
            bg.lineTo(w, h);
            bg.lineTo(0, h);
            bg.closePath();
            bg.fillPath();
            bg.strokePath();

            btnText.setColor('#ffffff');

            this.tweens.add({
                targets: container,
                x: x,
                duration: 100,
                ease: 'Power1'
            });
        });

        bg.on('pointerdown', callback);

        return container;
    }
}
