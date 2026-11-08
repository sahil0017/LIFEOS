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
 * Function-based Logging decorator.
 */
export function LoggingDecorator<F extends (...args: any[]) => any>(
  fn: F,
  logger: (...args: any[]) => void = console.log,
): F {
  const decorated = function (this: any, ...args: Parameters<F>): any {
    logger(`Calling function with args:`, args);
    const result = fn.apply(this, args);
    if (result && typeof result.then === 'function') {
      return result.then((res: any) => {
        logger(`Function resolved with:`, res);
        return res;
      });
    }
    logger(`Function returned:`, result);
    return result;
  };
  Object.defineProperty(decorated, 'name', { value: fn.name || 'anonymous' });
  return decorated as unknown as F;
}

/**
 * Function-based Retry decorator.
 */
export function RetryDecorator<F extends (...args: any[]) => any>(
  fn: F,
  options: { maxRetries?: number; delay?: number; isRetryable?: (error: any) => boolean } = {},
): F {
  const { maxRetries = 3, delay = 0, isRetryable = () => true } = options;

  return function (this: any, ...args: Parameters<F>): any {
    let attempts = 0;
    while (attempts <= maxRetries) {
      try {
        const res = fn.apply(this, args);
        if (res && typeof res.then === 'function') {
          return (async () => {
            let lastErr: any;
            try {
              return await res;
            } catch (err) {
              lastErr = err;
              if (attempts >= maxRetries || !isRetryable(err)) {
                throw err;
              }
            }
            for (let i = attempts + 1; i <= maxRetries; i++) {
              if (delay > 0) {
                await new Promise((r) => setTimeout(r, delay));
              }
              try {
                return await fn.apply(this, args);
              } catch (err) {
                lastErr = err;
                if (i >= maxRetries || !isRetryable(err)) {
                  throw err;
                }
              }
            }
            throw lastErr;
          })();
        }
        return res;
      } catch (err) {
        attempts++;
        if (attempts > maxRetries || !isRetryable(err)) {
          throw err;
        }
      }
    }
  } as unknown as F;
}

/**
 * Function-based Cache decorator.
 */
export function CacheDecorator<F extends (...args: any[]) => any>(
  fn: F,
  options: { ttl?: number; cacheErrors?: boolean } = {},
): F {
  const { ttl = 60000, cacheErrors = false } = options;
  const cache = new Map<string, { value?: any; error?: any; hasError: boolean; expires: number }>();

  return function (this: any, ...args: Parameters<F>): any {
    const key = JSON.stringify(args);
    const now = Date.now();
    const cached = cache.get(key);

    if (cached && cached.expires > now) {
      if (cached.hasError) {
        return Promise.reject(cached.error);
      }
      return cached.value;
    }

    try {
      const res = fn.apply(this, args);
      if (res && typeof res.then === 'function') {
        return res
          .then((val: any) => {
            cache.set(key, { value: val, hasError: false, expires: Date.now() + ttl });
            return val;
          })
          .catch((err: any) => {
            if (cacheErrors) {
              cache.set(key, { error: err, hasError: true, expires: Date.now() + ttl });
            }
            throw err;
          });
      }
      cache.set(key, { value: res, hasError: false, expires: Date.now() + ttl });
      return res;
    } catch (err) {
      if (cacheErrors) {
        cache.set(key, { error: err, hasError: true, expires: Date.now() + ttl });
      }
      throw err;
    }
  } as unknown as F;
}

/**
 * Function-based Timing decorator.
 */
export function TimingDecorator<F extends (...args: any[]) => any>(
  fn: F,
): (...args: Parameters<F>) => any {
  return function (this: any, ...args: Parameters<F>): any {
    const start = performance.now();
    const res = fn.apply(this, args);
    if (res && typeof res.then === 'function') {
      return res.then((val: any) => {
        const duration = performance.now() - start;
        return { data: val, duration };
      });
    }
    const duration = performance.now() - start;
    return { data: res, duration };
  };
}

/**
 * Function-based Validation decorator.
 */
export function ValidationDecorator<F extends (...args: any[]) => any>(
  fn: F,
  options: { validator: (...args: any[]) => void; validateResult?: boolean },
): F {
  const { validator, validateResult = false } = options;

  return function (this: any, ...args: Parameters<F>): any {
    const isAsync = fn.constructor.name === 'AsyncFunction';
    try {
      validator(...args);
    } catch (err) {
      if (isAsync) {
        return Promise.reject(err);
      }
      throw err;
    }

    const res = fn.apply(this, args);
    if (res && typeof res.then === 'function') {
      return res.then((val: any) => {
        if (validateResult) {
          validator(val);
        }
        return val;
      });
    }
    if (validateResult) {
      validator(res);
    }
    return res;
  } as unknown as F;
}

/**
 * Helper to create custom decorator.
 */
export function createDecorator(decoratorFn: (fn: Function) => Function): (fn: any) => any {
  return (fn: any) => decoratorFn(fn);
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
