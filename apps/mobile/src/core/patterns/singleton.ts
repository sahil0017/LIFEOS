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
export abstract class AsyncSingleton<T = any> {
  protected static instance: any = null;
  protected static instancePromise: Promise<any> | null = null;

  protected constructor() {
    // Protected constructor
  }

  static getInstance<T extends AsyncSingleton>(this: new () => T): Promise<T> {
    const Constructor = this as any;
    if (!Constructor.instancePromise) {
      Constructor.instancePromise = (async () => {
        const inst = new (this as any)();
        if (typeof inst.initialize === 'function') {
          await inst.initialize();
        }
        Constructor.instance = inst;
        return inst;
      })();
    }
    return Constructor.instancePromise;
  }

  static resetInstance(): void {
    (this as any).instance = null;
    (this as any).instancePromise = null;
  }
}

/**
 * Singleton factory that creates and manages singleton instances.
 */
export class SingletonContainer {
  private static factories: Map<string, () => unknown> = new Map();
  private static instances: Map<string, unknown> = new Map();

  static register<T>(key: string, creator: () => T): void {
    this.factories.set(key, creator);
  }

  static get<T>(key: string, fallback?: () => T): T {
    if (this.instances.has(key)) {
      return this.instances.get(key) as T;
    }
    if (this.factories.has(key)) {
      const creator = this.factories.get(key)!;
      const instance = creator();
      this.instances.set(key, instance);
      return instance as T;
    }
    throw new Error(`Service not registered: ${key}`);
  }

  static has(key: string): boolean {
    return this.factories.has(key) || this.instances.has(key);
  }

  static reset(key?: string): void {
    if (key) {
      this.factories.delete(key);
      this.instances.delete(key);
    } else {
      this.factories.clear();
      this.instances.clear();
    }
  }

  static clear(): void {
    this.factories.clear();
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
