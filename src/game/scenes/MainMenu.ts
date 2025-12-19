import { Scene, GameObjects } from 'phaser';
import { EventBus } from '../EventBus';

export class MainMenu extends Scene
{
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
        
        // Dark diagonal background splash - Scaled to screen
        graphics.fillStyle(0x000000, 0.5);
        graphics.beginPath();
        graphics.moveTo(width * 0.4, 0);
        graphics.lineTo(width, 0);
        graphics.lineTo(width, height);
        graphics.lineTo(width * 0.2, height);
        graphics.closePath();
        graphics.fillPath();

        // Logo - centered vertically, responsive position
        const logo = this.add.image(width * 0.1, height / 2, 'logo').setOrigin(0, 0.5);
        // Scale logo based on screen height, max scale 1.5
        const logoScale = Math.min(height / 600, 1.5); 
        logo.setScale(logoScale);


        // --- Menu Buttons ---
        // We'll place them on the right side, skewed
        const startX = width * 0.55;
        const startY = height * 0.4;
        const gap = 120; // This can also be dynamic if needed

        this.createMenuButton(startX, startY, 'MAKE LEVEL', 0x00ffff, () => {
            EventBus.emit('open-editor');
        });

        this.createMenuButton(startX + 40, startY + gap, 'VIEW LEVELS', 0xff0099, () => {
            EventBus.emit('open-community-hub');
        });

        EventBus.on('load-level', () => {
            this.scene.start('Game');
        });

        EventBus.on('go-to-main-menu', () => {
            this.scene.start('MainMenu');
        });

        // --- Bottom Bar / Settings ---
        // Profile
        const profileContainer = this.add.container(50, height - 80);
        const profileBg = this.add.rectangle(0, 0, 200, 60, 0x222222).setOrigin(0, 0.5);
        const profileText = this.add.text(20, 0, 'User Profile', { fontFamily: 'Arial', fontSize: '24px', color: '#ffffff' }).setOrigin(0, 0.5);
        profileContainer.add([profileBg, profileText]);
        
        // Interactive Profile
        profileBg.setInteractive({ useHandCursor: true })
            .on('pointerdown', () => console.log('Profile Clicked'));


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

    resize(gameSize: Phaser.Structs.Size, baseSize: Phaser.Structs.Size, displaySize: Phaser.Structs.Size, resolution: number)
    {
        const width = gameSize.width;
        const height = gameSize.height;

        this.cameras.resize(width, height);
        
        // Re-create the UI elements to fit new size
        this.children.removeAll(); 
        this.create();
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

