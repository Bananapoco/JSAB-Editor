import { Scene } from 'phaser';

export class Preloader extends Scene
{
    constructor ()
    {
        super('Preloader');
    }

    init ()
    {
        //  A simple progress bar. This is the outline of the bar.
        this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0xffffff);

        //  This is the progress bar itself. It will increase in size from the left based on the % of progress.
        const bar = this.add.rectangle(512-230, 384, 4, 28, 0xffffff);

        //  Use the 'progress' event emitted by the LoaderPlugin to update the loading bar
        this.load.on('progress', (progress: number) => {

            //  Update the progress bar (our bar is 464px wide, so 100% = 464px)
            bar.width = 4 + (460 * progress);

        });
    }

    preload ()
    {
        //  Load the assets for the game - Replace with your own assets
        this.load.setPath('');
        this.load.image('logo', 'jsab-logo.webp');
        
        // Load menu audio and PIXL Sugar Rush (using same pattern as Boot.ts)
        console.log('[Preloader] Loading menu audio...');
        this.load.audio('menu-music', 'assets/menu-music.mp3');
        this.load.audio('pixl-sugar-rush', 'assets/PIXL - Sugar Rush (Challenge Loop).mp3');
        
        // Add error handlers
        this.load.on('filecomplete', (key: string) => {
            console.log('[Preloader] Loaded:', key);
        });
        
        this.load.on('loaderror', (file: any) => {
            console.error('[Preloader] Failed to load:', file.key, file.url);
        });
    }

    create ()
    {
        // Verify audio is loaded before starting MainMenu
        const menuMusicLoaded = this.cache.audio.exists('menu-music');
        const pixlLoaded = this.cache.audio.exists('pixl-sugar-rush');
        
        console.log('[Preloader] Menu music loaded:', menuMusicLoaded);
        console.log('[Preloader] PIXL Sugar Rush loaded:', pixlLoaded);
        console.log('[Preloader] Starting MainMenu...');
        
        this.scene.start('MainMenu');
    }
}
