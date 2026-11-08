/**
 * Decorator pattern implementation for adding behavior to objects dynamically.
 */

/**
 * Component interface that defines the base behavior.
 */
export interface Component<T, R> {
  execute(data: T): R | Promise<R>;
}

/**
 * Base decorator class that implements Component.
 */
export abstract class Decorator<T, R> implements Component<T, R> {
  protected component: Component<T, R>;

  constructor(component: Component<T, R>) {
    this.component = component;
  }

  abstract execute(data: T): R | Promise<R>;

  getWrappedComponent(): Component<T, R> {
    return this.component;
  }
}

/**
 * Logging decorator that adds logging before and after execution.
 */
export class LoggingDecorator<T, R> extends Decorator<T, R> {
  private logger: (message: string, data?: unknown) => void;

  constructor(
    component: Component<T, R>,
    logger: (message: string, data?: unknown) => void = console.log,
  ) {
    super(component);
    this.logger = logger;
  }

  async execute(data: T): Promise<R> {
    this.logger('[LoggingDecorator] Starting execution', data);
    const start = performance.now();

    try {
      const result = await this.component.execute(data);
      const end = performance.now();
      this.logger('[LoggingDecorator] Execution completed', {
        duration: end - start,
        result,
      });
      return result;
    } catch (error) {
      const end = performance.now();
      this.logger('[LoggingDecorator] Execution failed', {
        duration: end - start,
        error,
      });
      throw error;
    }
  }
}

/**
 * Retry decorator that adds retry logic.
 */
export class RetryDecorator<T, R> extends Decorator<T, R> {
  private maxRetries: number;
  private delay: number;

  constructor(component: Component<T, R>, maxRetries: number = 3, delay: number = 1000) {
    super(component);
    this.maxRetries = maxRetries;
    this.delay = delay;
  }

  async execute(data: T): Promise<R> {
    let attempts = 0;
    let lastError: unknown;

    while (attempts <= this.maxRetries) {
      try {
        return await this.component.execute(data);
      } catch (error) {
        lastError = error;
        attempts++;
        if (attempts <= this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.delay));
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

/**
 * Cache decorator that caches results.
 */
export class CacheDecorator<T, R> extends Decorator<T, R> {
  private cache: Map<string, R> = new Map();
  private keyExtractor: (data: T) => string;

  constructor(component: Component<T, R>, keyExtractor: (data: T) => string = JSON.stringify) {
    super(component);
    this.keyExtractor = keyExtractor;
  }

  async execute(data: T): Promise<R> {
    const key = this.keyExtractor(data);
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const result = await this.component.execute(data);
    this.cache.set(key, result);
    return result;
  }

  clearCache(): void {
    this.cache.clear();
  }

  deleteCache(key: string): void {
    this.cache.delete(key);
  }
}

/**
 * Timeout decorator that adds timeout to execution.
 */
export class TimeoutDecorator<T, R> extends Decorator<T, R> {
  private timeout: number;

  constructor(component: Component<T, R>, timeout: number = 5000) {
    super(component);
    this.timeout = timeout;
  }

  async execute(data: T): Promise<R> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);

    try {
      const result = await Promise.race([
        this.component.execute(data),
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () => {
            reject(new Error(`Execution timed out after ${this.timeout}ms`));
          });
        }),
      ]);
      return result;
    } finally {
      clearTimeout(id);
    }
  }
}

/**
 * Validation decorator that validates input and output.
 */
export class ValidationDecorator<T, R> extends Decorator<T, R> {
  private validateInput: (data: T) => boolean;
  private validateOutput: (result: R) => boolean;

  constructor(
    component: Component<T, R>,
    validateInput: (data: T) => boolean = () => true,
    validateOutput: (result: R) => boolean = () => true,
  ) {
    super(component);
    this.validateInput = validateInput;
    this.validateOutput = validateOutput;
  }

  async execute(data: T): Promise<R> {
    if (!this.validateInput(data)) {
      throw new Error('Invalid input data');
    }

    const result = await this.component.execute(data);

    if (!this.validateOutput(result)) {
      throw new Error('Invalid output result');
    }

    return result;
  }
}

/**
 * Compose multiple decorators into a single component.
 */
export function composeDecorators<T, R>(
  component: Component<T, R>,
  ...decorators: Decorator<T, R>[]
): Component<T, R> {
  return decorators.reduce(
    (wrapped: Component<T, R>, decorator: Decorator<T, R>) => {
      const wrappedComponent = wrapped as Component<T, R>;
      return new (decorator.constructor as new (component: Component<T, R>) => Decorator<T, R>)(wrappedComponent);
    },
    component,
  );
}

/**
 * Function decorator for adding behavior to functions.
 */
export function decorate<T extends unknown[], R>(
  fn: (...args: T) => R | Promise<R>,
  decorator: (fn: (...args: T) => R | Promise<R>) => (...args: T) => R | Promise<R>,
): (...args: T) => R | Promise<R> {
  return decorator(fn);
}

/**
 * Memoize decorator for functions.
 */
export function memoize<T extends unknown[], R>(
  fn: (...args: T) => R,
  keyExtractor: (...args: T) => string = (...args: T) => JSON.stringify(args),
): (...args: T) => R {
  const cache = new Map<string, R>();
  return (...args: T) => {
    const key = keyExtractor(...args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}
