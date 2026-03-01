import { Scene, GameObjects } from 'phaser';
import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    private onLoadLevel = () => {
        // Only react while this scene is actually active.
        if (!this.scene?.isActive?.('MainMenu')) return;
        this.scene.start('Game');
    };

    private overlayInputLocks = 0;

    private onUiInputLockAdd = () => {
        this.overlayInputLocks++;
        this.syncInputEnabled();
    };

    private onUiInputLockRemove = () => {
        this.overlayInputLocks = Math.max(0, this.overlayInputLocks - 1);
        this.syncInputEnabled();
    };

    private syncInputEnabled() {
        this.input.enabled = this.overlayInputLocks === 0;
    }

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        const { width, height } = this.scale;

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

        // Logo - centered vertically
        const logo = this.add.image(100, height / 2, 'logo').setOrigin(0, 0.5).setScale(1.5);


        // --- Menu Buttons ---
        // We'll place them on the right side, skewed
        const startX = width * 0.55;
        const startY = height * 0.4;
        const gap = 120;

        this.createMenuButton(startX, startY, 'MAKE LEVEL', 0x00ffff, () => {
            EventBus.emit('open-editor');
        });

        this.createMenuButton(startX + 40, startY + gap, 'VIEW LEVELS', 0xff0099, () => {
            EventBus.emit('open-community-hub');
        });

        EventBus.on('load-level', this.onLoadLevel);
        EventBus.on('ui-input-lock:add', this.onUiInputLockAdd);
        EventBus.on('ui-input-lock:remove', this.onUiInputLockRemove);
        this.syncInputEnabled();

        const cleanup = () => {
            EventBus.removeListener('load-level', this.onLoadLevel);
            EventBus.removeListener('ui-input-lock:add', this.onUiInputLockAdd);
            EventBus.removeListener('ui-input-lock:remove', this.onUiInputLockRemove);
            this.overlayInputLocks = 0;
            if (this.input) {
                this.input.enabled = true;
            }
        };

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
        this.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

        // --- Top Profile + Bottom-right Settings ---
        // Keep this centered so it's always visible even with ENVELOP cropping.
        const profileWidth = Math.min(240, Math.max(150, width * 0.28));
        const profileHeight = 44;
        const profileFontSize = Math.max(14, Math.min(24, Math.floor(width * 0.022)));
        const profileY = 28;

        const profileContainer = this.add.container(width * 0.5, profileY).setDepth(20);
        const profileBg = this.add.rectangle(0, 0, profileWidth, profileHeight, 0x222222).setOrigin(0.5, 0);
        const profileText = this.add.text(0, profileHeight / 2, 'User Profile', { fontFamily: 'Arial', fontSize: `${profileFontSize}px`, color: '#ffffff' }).setOrigin(0.5, 0.5);
        profileContainer.add([profileBg, profileText]);

        // Interactive Profile
        profileBg.setInteractive({ useHandCursor: true })
            .on('pointerover', () => profileBg.setFillStyle(0x2f2f2f))
            .on('pointerout', () => profileBg.setFillStyle(0x222222))
            .on('pointerdown', () => EventBus.emit('open-user-profile'));


        // Settings (Bottom Right)
        const settingsContainer = this.add.container(width - 50, height - 80);
        const settingsText = this.add.text(0, 0, 'SETTINGS', { fontFamily: 'Arial Black', fontSize: '24px', color: '#888888' }).setOrigin(1, 0.5);
        settingsContainer.add(settingsText);

        settingsText.setInteractive({ useHandCursor: true })
            .on('pointerover', () => settingsText.setColor('#ffffff'))
            .on('pointerout', () => settingsText.setColor('#888888'))
            .on('pointerdown', () => console.log('Settings Clicked'));


        EventBus.emit('current-scene-ready', this);
    }

    createMenuButton(x: number, y: number, text: string, color: number, callback: () => void)
    {
        const buttonWidth = 400;
        const buttonHeight = 80;
        const skew = -0.2; // Skew factor for "fast" look

        const container = this.add.container(x, y);

        // Background graphics for the button
        const bg = this.add.graphics();
        // Draw skewed rectangle
        // We define the path relative to 0,0 of the container
        bg.fillStyle(0x000000, 0.8);
        bg.lineStyle(4, color, 1);
        
        const w = buttonWidth;
        const h = buttonHeight;
        const offset = h * 0.4; // controls skew amount
        
        // Skewed rect path
        bg.beginPath();
        bg.moveTo(offset, 0);
        bg.lineTo(w + offset, 0);
        bg.lineTo(w, h);
        bg.lineTo(0, h);
        bg.closePath();
        bg.fillPath();
        bg.strokePath();

        // Hit Area for interaction (approximate with a rect or polygon)
        // Phaser hit areas don't support skew directly on shape, but we can set a polygon
        const hitPoly = new Phaser.Geom.Polygon([
            offset, 0,
            w + offset, 0,
            w, h,
            0, h
        ]);

        bg.setInteractive(hitPoly, Phaser.Geom.Polygon.Contains);
        
        // Text
        const btnText = this.add.text(w / 2 + offset / 2, h / 2, text, {
            fontFamily: 'Arial Black',
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5);

        container.add([bg, btnText]);

        // Hover Effects
        bg.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(color, 1); // Fill with color on hover
            bg.lineStyle(4, 0xffffff, 1);
            bg.beginPath();
            bg.moveTo(offset, 0);
            bg.lineTo(w + offset, 0);
            bg.lineTo(w, h);
            bg.lineTo(0, h);
            bg.closePath();
            bg.fillPath();
            bg.strokePath();
            
            btnText.setColor('#000000'); // Invert text
            
            // Slide animation
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

            // Slide back
            this.tweens.add({
                targets: container,
                x: x,
                duration: 100,
                ease: 'Power1'
            });
        });

        bg.on('pointerdown', callback);
    }
}

