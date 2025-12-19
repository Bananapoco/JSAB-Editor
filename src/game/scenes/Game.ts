import { EventBus } from '../EventBus';
import { Scene } from 'phaser';

export class Game extends Scene
{
    camera: Phaser.Cameras.Scene2D.Camera;
    player: Phaser.GameObjects.Rectangle & { body: Phaser.Physics.Arcade.Body };
    keys: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };

    private _tempVec: Phaser.Math.Vector2 = new Phaser.Math.Vector2();
    private _accumulatorMs = 0;
    private _fixedStepMs = 1000 / 60; // 60 Hz simulation step (Unity-style)
    private _maxDeltaMs = 100; // clamp huge frame hitches (tab switch / GC) to avoid jumps

    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.camera = this.cameras.main;
        this.camera.setBackgroundColor(0x000000);

        const { width, height } = this.scale;

        // Player: Small cyan square, center of screen
        this.player = this.add.rectangle(width / 2, height / 2, 20, 20, 0x00ffff) as any;
        
        // Add physics
        this.physics.add.existing(this.player);
        
        // Player physics properties
        this.player.body.setCollideWorldBounds(true);
        
        // Input
        if (this.input.keyboard) {
            this.keys = this.input.keyboard.addKeys({
                W: Phaser.Input.Keyboard.KeyCodes.W,
                A: Phaser.Input.Keyboard.KeyCodes.A,
                S: Phaser.Input.Keyboard.KeyCodes.S,
                D: Phaser.Input.Keyboard.KeyCodes.D
            }) as any;
        }

        EventBus.emit('current-scene-ready', this);
    }

    update (time: number, delta: number)
    {
        if (!this.keys || !this.player) return;

        const speed = 600;
        
        // Use manual movement calculation instead of physics velocity to prevent
        // accumulation or physics step glitches.
        this.player.body.setVelocity(0);

        let inputX = 0;
        let inputY = 0;

        // Horizontal movement
        if (this.keys.A.isDown)
        {
            inputX = -1;
        }
        else if (this.keys.D.isDown)
        {
            inputX = 1;
        }

        // Vertical movement
        if (this.keys.W.isDown)
        {
            inputY = -1;
        }
        else if (this.keys.S.isDown)
        {
            inputY = 1;
        }

        // Framerate-independent movement (Unity-style):
        // - Clamp delta (maxDeltaTime equivalent) to avoid huge jumps on hitches
        // - Accumulate time and simulate at a fixed 60Hz step
        const clampedDelta = Math.min(delta, this._maxDeltaMs);
        this._accumulatorMs += clampedDelta;

        // Precompute direction (normalized) once for this frame
        const hasInput = inputX !== 0 || inputY !== 0;
        if (hasInput)
        {
            this._tempVec.set(inputX, inputY).normalize();
        }

        // Prevent spiral-of-death if frame rate tanks:
        // simulate at most N steps per frame.
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

            // Manual World Bounds (since we're bypassing physics movement)
            const halfSize = this.player.width / 2; // Assuming square
            const { width, height } = this.scale;

            // Clamp X
            if (this.player.x < halfSize) this.player.x = halfSize;
            else if (this.player.x > width - halfSize) this.player.x = width - halfSize;

            // Clamp Y
            if (this.player.y < halfSize) this.player.y = halfSize;
            else if (this.player.y > height - halfSize) this.player.y = height - halfSize;

            this._accumulatorMs -= this._fixedStepMs;
            steps++;
        }
    }
}
