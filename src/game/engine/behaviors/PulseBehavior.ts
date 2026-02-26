import { Behavior } from './Behavior';

/** Oscillates the object's scale between minScale and maxScale over `period` seconds. */
export class PulseBehavior extends Behavior {
    private elapsed = 0;

    constructor(
        private minScale = 0.8,
        private maxScale = 1.2,
        private period = 1.0,
    ) { super(); }

    tick(dt: number): void {
        this.elapsed += dt;
        const t = (Math.sin((this.elapsed / this.period) * Math.PI * 2) + 1) / 2;
        this.object.scale = this.minScale + (this.maxScale - this.minScale) * t;
    }
}
