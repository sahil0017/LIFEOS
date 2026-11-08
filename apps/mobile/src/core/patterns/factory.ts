/**
 * Factory pattern implementation for creating objects without exposing instantiation logic.
 */

/**
 * Generic factory interface for creating instances of type T.
 */
export interface Factory<T, Args extends unknown[] = []> {
  create(...args: Args): T;
}

/**
 * Abstract creator for factory method pattern.
 */
export abstract class Creator<T> {
  abstract factoryMethod(): T;

  createAndUse(): T {
    const product = this.factoryMethod();
    return product;
  }
}

/**
 * Singleton factory that ensures only one instance is created.
 */
export class SingletonFactory<T> implements Factory<T, []> {
  private instance: T | null = null;
  private creator: () => T;

  constructor(creator: () => T) {
    this.creator = creator;
  }

  create(): T {
    if (this.instance === null) {
      this.instance = this.creator();
    }
    return this.instance;
  }

  reset(): void {
    this.instance = null;
  }
}

/**
 * Object factory that creates different types based on a key.
 */
export class ObjectFactory<T, K extends string | number | symbol = string> {
  private creators: Map<K, () => T> = new Map();

  register(key: K, creator: () => T): void {
    this.creators.set(key, creator);
  }

  create(key: K, ...args: unknown[]): T {
    const creator = this.creators.get(key);
    if (!creator) {
      throw new Error(`No creator registered for key: ${String(key)}`);
    }
    return creator();
  }

  has(key: K): boolean {
    return this.creators.has(key);
  }

  keys(): K[] {
    return Array.from(this.creators.keys());
  }
}

/**
 * Factory for creating HTTP headers configurations.
 */
export class HeadersFactory {
  static createJsonHeaders(): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  static createAuthHeaders(token: string): HeadersInit {
    return {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }

  static createMultipartHeaders(token?: string): HeadersInit {
    const headers: HeadersInit = {
      Accept: 'application/json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }
}

/**
 * Factory for creating URL with query parameters.
 */
export class UrlFactory {
  static createUrl(base: string, params: Record<string, string | number | boolean>): string {
    const url = new URL(base);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.append(key, String(value));
      }
    });
    return url.toString();
  }
}

/**
 * Factory for creating timeout promises.
 */
export class TimeoutFactory {
  static createTimeout(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  static createRejectionTimeout(ms: number, error?: Error): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(error || new Error(`Timeout after ${ms}ms`));
      }, ms);
    });
  }
}
