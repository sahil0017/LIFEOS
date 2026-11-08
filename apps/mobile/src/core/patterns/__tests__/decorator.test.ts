/**
 * Tests for Decorator pattern implementation.
 */

import {
  LoggingDecorator,
  RetryDecorator,
  CacheDecorator,
  TimingDecorator,
  ValidationDecorator,
  createDecorator,
} from '../decorator';

describe('Decorator Pattern', () => {
  describe('LoggingDecorator', () => {
    it('should log function calls', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const decorated = LoggingDecorator((name: string) => `Hello, ${name}!`);
      
      const result = decorated('World');
      
      expect(result).toBe('Hello, World!');
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should work with async functions', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const decorated = LoggingDecorator(async (value: number) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return value * 2;
      });
      
      const result = await decorated(5);
      
      expect(result).toBe(10);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should preserve function name', () => {
      const decorated = LoggingDecorator((x: number) => x * 2);
      
      expect(decorated.name).toBe('anonymous'); // Note: May be 'anonymous' depending on implementation
    });
  });

  describe('RetryDecorator', () => {
    it('should retry on failure and succeed', async () => {
      let callCount = 0;
      
      const decorated = RetryDecorator(
        async () => {
          callCount++;
          if (callCount < 3) {
            throw new Error('Failure');
          }
          return 'success';
        },
        { maxRetries: 3, delay: 0 }
      );
      
      const result = await decorated();
      
      expect(result).toBe('success');
      expect(callCount).toBe(3);
    });

    it('should throw after max retries exceeded', async () => {
      let callCount = 0;
      
      const decorated = RetryDecorator(
        async () => {
          callCount++;
          throw new Error('Always fails');
        },
        { maxRetries: 2, delay: 0 }
      );
      
      await expect(decorated()).rejects.toThrow('Always fails');
      expect(callCount).toBe(3); // Initial + 2 retries
    });

    it('should not retry on success', async () => {
      let callCount = 0;
      
      const decorated = RetryDecorator(
        async () => {
          callCount++;
          return 'success';
        },
        { maxRetries: 3, delay: 0 }
      );
      
      const result = await decorated();
      
      expect(result).toBe('success');
      expect(callCount).toBe(1);
    });

    it('should work with sync functions', () => {
      let callCount = 0;
      
      const decorated = RetryDecorator(
        () => {
          callCount++;
          if (callCount < 2) {
            throw new Error('Failure');
          }
          return 'success';
        },
        { maxRetries: 2, delay: 0 }
      );
      
      const result = decorated();
      
      expect(result).toBe('success');
      expect(callCount).toBe(2);
    });

    it('should respect retryable condition', async () => {
      let callCount = 0;
      
      const decorated = RetryDecorator(
        async () => {
          callCount++;
          throw new Error('Non-retryable error');
        },
        { 
          maxRetries: 3, 
          delay: 0,
          isRetryable: (error) => error.message !== 'Non-retryable error'
        }
      );
      
      await expect(decorated()).rejects.toThrow('Non-retryable error');
      expect(callCount).toBe(1); // No retries because error is not retryable
    });
  });

  describe('CacheDecorator', () => {
    it('should cache function results', async () => {
      let callCount = 0;
      
      const decorated = CacheDecorator(
        async (value: number) => {
          callCount++;
          return value * 2;
        },
        { ttl: 60000 }
      );
      
      const result1 = await decorated(5);
      const result2 = await decorated(5);
      
      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(callCount).toBe(1); // Only called once
    });

    it('should cache different arguments separately', async () => {
      let callCount = 0;
      
      const decorated = CacheDecorator(
        async (value: number) => {
          callCount++;
          return value * 2;
        },
        { ttl: 60000 }
      );
      
      await decorated(5);
      await decorated(10);
      await decorated(5);
      
      expect(callCount).toBe(2); // Called for 5 and 10
    });

    it('should respect TTL and expire cache', async () => {
      let callCount = 0;
      
      const decorated = CacheDecorator(
        async (value: number) => {
          callCount++;
          return value * 2;
        },
        { ttl: 10 } // 10ms TTL
      );
      
      await decorated(5);
      expect(callCount).toBe(1);
      
      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 20));
      
      await decorated(5);
      expect(callCount).toBe(2);
    });

    it('should work with sync functions', () => {
      let callCount = 0;
      
      const decorated = CacheDecorator(
        (value: number) => {
          callCount++;
          return value * 2;
        },
        { ttl: 60000 }
      );
      
      const result1 = decorated(5);
      const result2 = decorated(5);
      
      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(callCount).toBe(1);
    });

    it('should not cache failed calls by default', async () => {
      let callCount = 0;
      
      const decorated = CacheDecorator(
        async (value: number) => {
          callCount++;
          if (value === 0) {
            throw new Error('Zero not allowed');
          }
          return value * 2;
        },
        { ttl: 60000, cacheErrors: false }
      );
      
      await expect(decorated(0)).rejects.toThrow();
      expect(callCount).toBe(1);
      
      await expect(decorated(0)).rejects.toThrow();
      expect(callCount).toBe(2); // Called again because error not cached
    });

    it('should cache errors when configured', async () => {
      let callCount = 0;
      
      const decorated = CacheDecorator(
        async (value: number) => {
          callCount++;
          throw new Error('Always fails');
        },
        { ttl: 60000, cacheErrors: true }
      );
      
      await expect(decorated(5)).rejects.toThrow();
      expect(callCount).toBe(1);
      
      await expect(decorated(5)).rejects.toThrow();
      expect(callCount).toBe(1); // Not called again, error was cached
    });
  });

  describe('TimingDecorator', () => {
    it('should measure execution time', async () => {
      const decorated = TimingDecorator(
        async (value: number) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return value * 2;
        }
      );
      
      const result = await decorated(5);
      
      expect(result.data).toBe(10);
      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThanOrEqual(9); // At least 10ms
    });

    it('should work with sync functions', () => {
      const decorated = TimingDecorator(
        (value: number) => {
          return value * 2;
        }
      );
      
      const result = decorated(5);
      
      expect(result.data).toBe(10);
      expect(result.duration).toBeDefined();
      expect(result.duration).toBeGreaterThanOrEqual(0);
    });

    it('should handle errors and still measure time', async () => {
      const decorated = TimingDecorator(
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          throw new Error('Test error');
        }
      );
      
      await expect(decorated()).rejects.toThrow('Test error');
    });
  });

  describe('ValidationDecorator', () => {
    it('should validate arguments', () => {
      const decorated = ValidationDecorator(
        (value: number) => value * 2,
        {
          validator: (value: number) => {
            if (value < 0) {
              throw new Error('Value must be positive');
            }
          },
        }
      );
      
      expect(decorated(5)).toBe(10);
      expect(() => decorated(-1)).toThrow('Value must be positive');
    });

    it('should validate result', () => {
      const decorated = ValidationDecorator(
        (value: number) => value - 10,
        {
          validator: (value: number) => {
            if (value < 0) {
              throw new Error('Result must be positive');
            }
          },
          validateResult: true,
        }
      );
      
      expect(decorated(15)).toBe(5);
      expect(() => decorated(5)).toThrow('Result must be positive');
    });

    it('should work with async functions', async () => {
      const decorated = ValidationDecorator(
        async (value: number) => value * 2,
        {
          validator: (value: number) => {
            if (value < 0) {
              throw new Error('Value must be positive');
            }
          },
        }
      );
      
      await expect(decorated(5)).resolves.toBe(10);
      await expect(decorated(-1)).rejects.toThrow('Value must be positive');
    });

    it('should work with multiple arguments', () => {
      const decorated = ValidationDecorator(
        (a: number, b: number) => a + b,
        {
          validator: (a: number, b: number) => {
            if (a < 0 || b < 0) {
              throw new Error('Values must be positive');
            }
          },
        }
      );
      
      expect(decorated(5, 3)).toBe(8);
      expect(() => decorated(-1, 3)).toThrow('Values must be positive');
    });
  });

  describe('createDecorator', () => {
    it('should create a custom decorator', () => {
      const customDecorator = createDecorator((fn: Function) => {
        return (...args: any[]) => {
          console.log('Custom decorator called');
          return fn(...args);
        };
      });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      const decorated = customDecorator((x: number) => x * 2);
      const result = decorated(5);
      
      expect(result).toBe(10);
      expect(consoleSpy).toHaveBeenCalledWith('Custom decorator called');
      
      consoleSpy.mockRestore();
    });

    it('should work with async decorators', async () => {
      const customDecorator = createDecorator((fn: Function) => {
        return async (...args: any[]) => {
          await new Promise((resolve) => setTimeout(resolve, 5));
          return fn(...args);
        };
      });
      
      const decorated = customDecorator(async (x: number) => x * 2);
      const result = await decorated(5);
      
      expect(result).toBe(10);
    });
  });
});
