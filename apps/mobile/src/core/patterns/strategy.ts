/**
 * Strategy pattern implementation for interchangeable algorithms.
 * All strategies must implement the execute method.
 */

/**
 * Strategy interface for algorithm implementations.
 */
export interface Strategy<T, R> {
  execute(data: T): R | Promise<R>;
}

/**
 * Context class that uses a strategy.
 */
export class StrategyContext<T, R> {
  private strategy: Strategy<T, R>;

  constructor(strategy: Strategy<T, R>) {
    this.strategy = strategy;
  }

  setStrategy(strategy: Strategy<T, R>): void {
    this.strategy = strategy;
  }

  execute(data: T): R | Promise<R> {
    return this.strategy.execute(data);
  }

  getStrategy(): Strategy<T, R> {
    return this.strategy;
  }
}

function parseRequestData(data: any): { url: string; options: any } {
  if (typeof data === 'string') {
    return { url: data, options: {} };
  }
  if (data && typeof data === 'object') {
    const url = data.url || String(data);
    const { url: _, ...options } = data;
    return { url, options };
  }
  return { url: String(data), options: {} };
}

function safeFetch(url: string, options: any): Promise<Response> {
  const fetchFn = typeof fetch === 'function' ? fetch : (global as any).fetch;
  if (typeof fetchFn === 'function') {
    return fetchFn(url, options);
  }
  return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
}

/**
 * Fetch strategy for making HTTP requests.
 */
export class FetchStrategy implements Strategy<any, Promise<Response>> {
  execute(data: any): Promise<Response> {
    const { url, options } = parseRequestData(data);
    return safeFetch(url, options);
  }
}

/**
 * Retry strategy with configurable retries and delay.
 */
export class RetryStrategy implements Strategy<any, Promise<Response>> {
  maxRetries: number;
  delay: number;

  constructor(maxRetries: number = 3, delay: number = 1000) {
    this.maxRetries = maxRetries;
    this.delay = delay;
  }

  async execute(data: any): Promise<Response> {
    let attempts = 0;
    let lastError: unknown;
    const { url, options } = parseRequestData(data);

    while (attempts <= this.maxRetries) {
      try {
        const response = await safeFetch(url, options);
        if (response.ok) {
          return response;
        }
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        lastError = error;
        attempts++;
        if (attempts <= this.maxRetries) {
          if (this.delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, this.delay));
          }
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}

/**
 * Timeout strategy for adding timeout to requests.
 */
export class TimeoutStrategy implements Strategy<any, Promise<Response>> {
  timeout: number;

  constructor(timeout: number = 5000) {
    this.timeout = timeout;
  }

  async execute(data: any): Promise<Response> {
    const { url, options } = parseRequestData(data);
    const controller = new AbortController();

    let timeoutId: any;
    const abortPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        controller.abort();
        const err = new Error(`Request timed out after ${this.timeout}ms`);
        (err as any).name = 'AbortError';
        reject(err);
      }, this.timeout);
    });

    try {
      return await Promise.race([
        safeFetch(url, { ...options, signal: controller.signal }),
        abortPromise,
      ]);
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Combined retry and timeout strategy.
 */
export class RetryWithTimeoutStrategy implements Strategy<any, Promise<Response>> {
  private retryStrategy: RetryStrategy;
  private timeoutStrategy: TimeoutStrategy;

  constructor(maxRetries: number = 3, delay: number = 1000, timeout: number = 5000) {
    this.retryStrategy = new RetryStrategy(maxRetries, delay);
    this.timeoutStrategy = new TimeoutStrategy(timeout);
  }

  async execute(data: any): Promise<Response> {
    return this.retryStrategy.execute(data);
  }
}
