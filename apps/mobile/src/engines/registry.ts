/**
 * Engine registry implementation.
 * Uses Factory pattern for creating engines,
 * Singleton pattern for global registry,
 * and Observer pattern for engine lifecycle events.
 */

import { BaseEngine, EnginePlugin, EngineId, EngineDescriptor, EngineResult, EngineInput } from './engine';
import { ObjectFactory, SingletonFactory, EventEmitter, Observer, Subject } from '../core/patterns';
import { MobileAppError } from '../core/exceptions/base';
import type { AnyObject } from '../core/utils/types';

/**
 * Engine registry configuration.
 */
export interface EngineRegistryConfig {
  /**
   * Whether to allow duplicate engine registrations.
   */
  allowDuplicates?: boolean;

  /**
   * Default engine to use when no ID is specified.
   */
  defaultEngine?: EngineId;

  /**
   * Whether to auto-register built-in engines.
   */
  autoRegister?: boolean;
}

/**
 * Engine lifecycle event types.
 */
export type EngineLifecycleEvent = {
  type: 'registered';
  engineId: EngineId;
  engine: EnginePlugin;
} | {
  type: 'unregistered';
  engineId: EngineId;
} | {
  type: 'executed';
  engineId: EngineId;
  input: EngineInput;
  result: EngineResult;
} | {
  type: 'error';
  engineId: EngineId;
  input: EngineInput;
  error: unknown;
};

/**
 * Engine registry class.
 * Uses Observer pattern for lifecycle events.
 */
export class EngineRegistry {
  private engines: Map<EngineId, EnginePlugin> = new Map();
  private factory: ObjectFactory<EnginePlugin, EngineId>;
  private lifecycleEmitter: EventEmitter<{ [K in EngineLifecycleEvent['type']]: EngineLifecycleEvent & { type: K } }>;
  private config: EngineRegistryConfig;

  constructor(config: EngineRegistryConfig = {}) {
    this.config = {
      allowDuplicates: false,
      autoRegister: true,
      ...config,
    };

    this.factory = new ObjectFactory();
    this.lifecycleEmitter = new EventEmitter();

    // Register built-in engines if enabled
    if (this.config.autoRegister) {
      this.registerBuiltInEngines();
    }
  }

  /**
   * Register a new engine.
   */
  register(engine: EnginePlugin): void {
    if (!this.config.allowDuplicates && this.engines.has(engine.id)) {
      throw new MobileAppError(
        `Engine with ID '${engine.id}' is already registered`,
        'ENGINE_DUPLICATE',
        { engineId: engine.id },
      );
    }

    this.engines.set(engine.id, engine);
    this.factory.register(engine.id, () => engine);

    this.lifecycleEmitter.emit('registered', {
      type: 'registered',
      engineId: engine.id,
      engine,
    });
  }

  /**
   * Unregister an engine.
   */
  unregister(engineId: EngineId): void {
    if (this.engines.has(engineId)) {
      this.engines.delete(engineId);
      this.factory.register(engineId, () => {
        throw new MobileAppError(
          `Engine '${engineId}' is not registered`,
          'ENGINE_NOT_FOUND',
          { engineId },
        );
      });

      this.lifecycleEmitter.emit('unregistered', {
        type: 'unregistered',
        engineId,
      });
    }
  }

  /**
   * Get an engine by ID.
   */
  get(engineId: EngineId): EnginePlugin {
    const engine = this.engines.get(engineId);
    if (!engine) {
      throw new MobileAppError(
        `Engine '${engineId}' is not registered`,
        'ENGINE_NOT_FOUND',
        { engineId },
      );
    }
    return engine;
  }

  /**
   * Check if an engine is registered.
   */
  has(engineId: EngineId): boolean {
    return this.engines.has(engineId);
  }

  /**
   * List all registered engines.
   */
  list(): EngineDescriptor[] {
    return Array.from(this.engines.values()).map((engine) => engine.getDescriptor());
  }

  /**
   * List engine IDs.
   */
  ids(): EngineId[] {
    return Array.from(this.engines.keys());
  }

  /**
   * Execute an engine by ID.
   */
  async run(engineId: EngineId, input: EngineInput): Promise<EngineResult> {
    const engine = this.get(engineId);

    if (!engine.validateInput(input)) {
      throw new MobileAppError(
        `Invalid input for engine '${engineId}'`,
        'ENGINE_INVALID_INPUT',
        { engineId, input },
      );
    }

    try {
      const result = await engine.run(input);

      this.lifecycleEmitter.emit('executed', {
        type: 'executed',
        engineId,
        input,
        result,
      });

      return result;
    } catch (error) {
      this.lifecycleEmitter.emit('error', {
        type: 'error',
        engineId,
        input,
        error,
      });

      throw error;
    }
  }

  /**
   * Run the default engine.
   */
  async runDefault(input: EngineInput): Promise<EngineResult> {
    const defaultEngine = this.config.defaultEngine;
    if (!defaultEngine) {
      throw new MobileAppError(
        'No default engine configured',
        'NO_DEFAULT_ENGINE',
      );
    }
    return this.run(defaultEngine, input);
  }

  /**
   * Run multiple engines and aggregate results.
   */
  async runMultiple(engineIds: EngineId[], input: EngineInput): Promise<Map<EngineId, EngineResult>> {
    const results: Map<EngineId, EngineResult> = new Map();

    await Promise.all(
      engineIds.map(async (engineId) => {
        try {
          const result = await this.run(engineId, input);
          results.set(engineId, result);
        } catch (error) {
          console.error(`Error running engine '${engineId}':`, error);
        }
      }),
    );

    return results;
  }

  /**
   * Create a factory for creating engines.
   */
  createFactory(): ObjectFactory<EnginePlugin, EngineId> {
    return this.factory;
  }

  /**
   * Subscribe to engine lifecycle events.
   */
  onEvent<K extends EngineLifecycleEvent['type']>(
    event: K,
    observer: Observer<Extract<EngineLifecycleEvent, { type: K }>>,
  ): () => void {
    return this.lifecycleEmitter.on(event, observer as Observer<EngineLifecycleEvent>);
  }

  /**
   * Subscribe to all engine lifecycle events.
   */
  onAnyEvent(observer: Observer<EngineLifecycleEvent>): () => void {
    return this.lifecycleEmitter.on('registered' as EngineLifecycleEvent['type'], observer as any);
  }

  /**
   * Get engines that can handle the input.
   */
  getEnginesForInput(input: EngineInput): EngineId[] {
    return Array.from(this.engines.entries())
      .filter(([_, engine]) => engine.canHandle(input))
      .map(([id]) => id);
  }

  /**
   * Get engines that match tags.
   */
  getEnginesByTag(tag: string): EngineId[] {
    return Array.from(this.engines.entries())
      .filter(([_, engine]) => {
        const descriptor = engine.getDescriptor();
        return descriptor.tags?.includes(tag);
      })
      .map(([id]) => id);
  }

  /**
   * Get engines by status.
   */
  getEnginesByStatus(status: string): EngineId[] {
    return Array.from(this.engines.entries())
      .filter(([_, engine]) => {
        const descriptor = engine.getDescriptor();
        return descriptor.status === status;
      })
      .map(([id]) => id);
  }

  /**
   * Clear all registered engines.
   */
  clear(): void {
    this.engines.clear();
    this.factory = new ObjectFactory();
  }

  /**
   * Get engine count.
   */
  get size(): number {
    return this.engines.size;
  }

  /**
   * Register built-in engines.
   */
  private registerBuiltInEngines(): void {}

  /**
   * Static instance for singleton access.
   */
  private static instance: EngineRegistry | null = null;

  /**
   * Get singleton instance.
   */
  static getInstance(config?: EngineRegistryConfig): EngineRegistry {
    if (this.instance === null) {
      this.instance = new EngineRegistry(config);
    }
    return this.instance;
  }

  /**
   * Reset singleton instance.
   */
  static resetInstance(): void {
    this.instance = null;
  }

  /**
   * Create a new instance (factory method).
   */
  static create(config?: EngineRegistryConfig): EngineRegistry {
    return new EngineRegistry(config);
  }
}

/**
 * Default engine registry instance.
 */
export const engines = EngineRegistry.getInstance();

/**
 * Engine registry factory.
 * Uses Factory pattern.
 */
export const engineRegistryFactory = {
  create: (config?: EngineRegistryConfig): EngineRegistry => EngineRegistry.create(config),
  getDefault: (): EngineRegistry => engines,
};

/**
 * Engine registry with caching.
 * Uses Decorator pattern.
 */
export class CachedEngineRegistry extends EngineRegistry {
  private cache: Map<string, EngineResult> = new Map();
  private ttl: number;

  constructor(ttl: number = 5 * 60 * 1000) {
    super();
    this.ttl = ttl;
  }

  async run(engineId: EngineId, input: EngineInput): Promise<EngineResult> {
    const cacheKey = this.buildCacheKey(engineId, input);
    const cached = this.cache.get(cacheKey);

    if (cached && !this.isExpired(cacheKey)) {
      return cached;
    }

    const result = await super.run(engineId, input);
    this.cache.set(cacheKey, result);
    this.setExpiration(cacheKey);

    return result;
  }

  private buildCacheKey(engineId: EngineId, input: EngineInput): string {
    return `${engineId}:${JSON.stringify(input)}`;
  }

  private setExpiration(key: string): void {
    // Store expiration as metadata in the cache
    const expirationKey = `${key}:expiration`;
    this.cache.set(expirationKey as any, { expiresAt: Date.now() + this.ttl } as any);
  }

  private isExpired(key: string): boolean {
    const expirationKey = `${key}:expiration`;
    const expiration = this.cache.get(expirationKey as any) as any;
    return expiration && expiration.expiresAt && Date.now() > expiration.expiresAt;
  }

  clearCache(): void {
    this.cache.clear();
  }

  invalidate(engineId: EngineId, input?: EngineInput): void {
    const cacheKey = input ? this.buildCacheKey(engineId, input) : engineId;
    this.cache.delete(cacheKey);
    this.cache.delete(`${cacheKey}:expiration` as any);
  }
}
