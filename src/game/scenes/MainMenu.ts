import { Scene, GameObjects } from 'phaser';
import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
    private isTransitioning = false;

    constructor ()
    {
        super('MainMenu');
    }

    create ()
    {
        this.isTransitioning = false;
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

        // Logo
        const logo = this.add.image(width * 0.1, height / 2, 'logo').setOrigin(0, 0.5);
        const logoScale = Math.min(height / 600, 1.5); 
        logo.setScale(logoScale);

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
            
            // Add a brief fade effect
            this.cameras.main.fadeOut(200, 0, 0, 0);
            
            this.time.delayedCall(200, () => {
                this.scene.start('Game');
            });
        };

        // Remove any existing listeners first to prevent duplicates
        EventBus.removeAllListeners('load-level');
        EventBus.on('load-level', handleLoadLevel);

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

    resize(gameSize: Phaser.Structs.Size, baseSize: Phaser.Structs.Size, displaySize: Phaser.Structs.Size, resolution: number)
    {
        const width = gameSize.width;
        const height = gameSize.height;

        this.cameras.resize(width, height);
        this.children.removeAll(); 
        this.create();
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
