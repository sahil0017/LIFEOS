/**
 * Singleton pattern implementation for ensuring single instance of a class.
 */

/**
 * Singleton interface that can be implemented or extended.
 */
export interface Singleton<T> {
  getInstance(): T;
}

/**
 * Base singleton class that enforces singleton pattern.
 * Subclasses must call getInstance() instead of using constructor directly.
 */
export abstract class BaseSingleton {
  private static instances: Map<Function, BaseSingleton> = new Map();

  protected constructor() {
    // Protected constructor prevents direct instantiation
    // Use getInstance() method instead
  }

  /**
   * Creates and returns the singleton instance.
   * Override in subclasses with proper typing.
   */
  static getInstance<T extends BaseSingleton>(this: new () => T): T {
    if (!BaseSingleton.instances.has(this)) {
      BaseSingleton.instances.set(this, new this());
    }
    return BaseSingleton.instances.get(this) as T;
  }

  /**
   * Resets the singleton instance for testing purposes.
   */
  static resetInstance(): void {
    BaseSingleton.instances.clear();
  }
}

/**
 * Thread-safe singleton using a lock mechanism (async-safe).
 */
export abstract class AsyncSingleton {
  protected static instance: AsyncSingleton | null = null;
  protected static lock: Promise<unknown> | null = null;

  protected constructor() {
    // Protected constructor
  }

  static async getInstance<T extends AsyncSingleton>(): Promise<T> {
    const Constructor = this as any as { instance: T | null; lock: Promise<unknown> | null };
    if (Constructor.instance === null || !(Constructor.instance instanceof this)) {
      if (Constructor.lock === null) {
        Constructor.lock = new Promise((resolve) => {
          Constructor.instance = new (this as any)();
          Constructor.lock = null;
          resolve(undefined);
        });
      }
      await Constructor.lock;
    }
    return Constructor.instance as T;
  }

  static resetInstance(): void {
    (this as any).instance = null;
    (this as any).lock = null;
  }
}

/**
 * Singleton factory that creates and manages singleton instances.
 */
export class SingletonContainer {
  private static instances: Map<string, unknown> = new Map();

  static register<T>(key: string, creator: () => T): T {
    const existing = this.instances.get(key);
    if (existing) {
      return existing as T;
    }
    const instance = creator();
    this.instances.set(key, instance);
    return instance;
  }

  static get<T>(key: string, creator: () => T): T {
    const existing = this.instances.get(key);
    if (existing) {
      return existing as T;
    }
    const instance = creator();
    this.instances.set(key, instance);
    return instance;
  }

  static has(key: string): boolean {
    return this.instances.has(key);
  }

  static reset(key?: string): void {
    if (key) {
      this.instances.delete(key);
    } else {
      this.instances.clear();
    }
  }

  static clear(): void {
    this.instances.clear();
  }
}

/**
 * Lazy singleton that creates instance on first access.
 */
export function createSingleton<T>(creator: () => T): () => T {
  let instance: T | null = null;

  return () => {
    if (instance === null) {
      instance = creator();
    }
    return instance;
  };
}

/**
 * Lazy async singleton.
 */
export function createAsyncSingleton<T>(creator: () => Promise<T>): () => Promise<T> {
  let instance: Promise<T> | null = null;

  return async () => {
    if (instance === null) {
      instance = creator();
    }
    return instance;
  };
}
