import { Behavior } from './Behavior';

/** Deactivates the object after `lifetime` seconds. */
export class DieAfterBehavior extends Behavior {
    private elapsed = 0;

    constructor(private lifetime: number) { super(); }

    tick(dt: number): void {
        this.elapsed += dt;
        if (this.elapsed >= this.lifetime) {
            this.object.active = false;
        }
    }
}
