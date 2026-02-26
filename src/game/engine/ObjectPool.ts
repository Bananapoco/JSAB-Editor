/**
 * Generic object pool. Pre-allocates `initialSize` objects via `factory`,
 * then hands them out with `acquire()` and reclaims them with `release()`.
 */
export class ObjectPool<T> {
    private pool: T[] = [];

    constructor(
        private factory: () => T,
        private resetFn: (obj: T) => void,
        initialSize = 20,
    ) {
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(factory());
        }
    }

    acquire(): T {
        return this.pool.length > 0 ? this.pool.pop()! : this.factory();
    }

    release(obj: T): void {
        this.resetFn(obj);
        this.pool.push(obj);
    }

    get available(): number { return this.pool.length; }
}
