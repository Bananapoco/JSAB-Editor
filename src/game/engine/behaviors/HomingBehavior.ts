import { Behavior } from './Behavior';
import { Vector2 } from '../Vector2';

/** Moves the object toward the player's current position each tick. */
export class HomingBehavior extends Behavior {
    constructor(private speed: number = 200) { super(); } // px/s

    tick(dt: number, _currentTime: number, playerPos?: Vector2): void {
        if (!playerPos) return;
        const dir = playerPos.sub(this.object.position).normalize();
        const p = this.object.position;
        this.object.position = new Vector2(
            p.x + dir.x * this.speed * dt,
            p.y + dir.y * this.speed * dt,
        );
    }
}
