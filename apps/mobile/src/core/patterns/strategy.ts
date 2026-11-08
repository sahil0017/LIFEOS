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

/**
 * Fetch strategy for making HTTP requests.
 */
export class FetchStrategy implements Strategy<RequestInfo, Promise<Response>> {
  execute(data: RequestInfo): Promise<Response> {
    return fetch(data);
  }
}

/**
 * Retry strategy with configurable retries and delay.
 */
export class RetryStrategy implements Strategy<RequestInfo, Promise<Response>> {
  maxRetries: number;
  delay: number;

  constructor(maxRetries: number = 3, delay: number = 1000) {
    this.maxRetries = maxRetries;
    this.delay = delay;
  }

  async execute(data: RequestInfo): Promise<Response> {
    let attempts = 0;
    let lastError: unknown;

    while (attempts <= this.maxRetries) {
      try {
        const response = await fetch(data);
        if (response.ok) {
          return response;
        }
        throw new Error(`HTTP ${response.status}`);
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
 * Timeout strategy for adding timeout to requests.
 */
export class TimeoutStrategy implements Strategy<RequestInfo, Promise<Response>> {
  timeout: number;

  constructor(timeout: number = 5000) {
    this.timeout = timeout;
  }

  async execute(data: RequestInfo): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(data, {
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(id);
    }
  }
}

/**
 * Combined retry and timeout strategy.
 */
export class RetryWithTimeoutStrategy implements Strategy<RequestInfo, Promise<Response>> {
  private retryStrategy: RetryStrategy;
  private timeoutStrategy: TimeoutStrategy;

  constructor(maxRetries: number = 3, delay: number = 1000, timeout: number = 5000) {
    this.retryStrategy = new RetryStrategy(maxRetries, delay);
    this.timeoutStrategy = new TimeoutStrategy(timeout);
  }

  async execute(data: RequestInfo): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutStrategy.timeout);

    try {
      let attempts = 0;
      let lastError: unknown;

      while (attempts <= this.retryStrategy.maxRetries) {
        try {
          const response = await fetch(data, {
            signal: controller.signal,
          });
          if (response.ok) {
            return response;
          }
          throw new Error(`HTTP ${response.status}`);
        } catch (error) {
          lastError = error;
          attempts++;
          if (attempts <= this.retryStrategy.maxRetries) {
            await new Promise((resolve) =>
              setTimeout(resolve, this.retryStrategy.delay),
            );
          }
        }
      }

      throw lastError instanceof Error ? lastError : new Error(String(lastError));
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
