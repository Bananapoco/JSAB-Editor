import type { GameObject } from '../GameObject';
import type { Vector2 } from '../Vector2';

export abstract class Behavior {
    public enabled = true;
    protected object!: GameObject;

    attach(obj: GameObject): void {
        this.object = obj;
    }

    abstract tick(dt: number, currentTime: number, playerPos?: Vector2): void;
}
