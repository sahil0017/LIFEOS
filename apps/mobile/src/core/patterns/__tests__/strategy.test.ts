/**
 * Tests for Strategy pattern implementation.
 */

import {
  StrategyContext,
  FetchStrategy,
  RetryStrategy,
  TimeoutStrategy,
} from '../strategy';

describe('Strategy Pattern', () => {
  describe('FetchStrategy', () => {
    it('should implement Strategy interface', () => {
      const strategy = new FetchStrategy();
      expect(strategy.execute).toBeDefined();
      expect(typeof strategy.execute).toBe('function');
    });

    it('should execute fetch request', async () => {
      const strategy = new FetchStrategy();
      const mockRequest = new Request('https://jsonplaceholder.typicode.com/posts/1');
      
      const response = await strategy.execute(mockRequest);
      expect(response).toBeDefined();
      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });
  });

  describe('RetryStrategy', () => {
    it('should implement Strategy interface', () => {
      const strategy = new RetryStrategy();
      expect(strategy.execute).toBeDefined();
      expect(typeof strategy.execute).toBe('function');
    });

    it('should retry on failed requests and succeed', async () => {
      const strategy = new RetryStrategy(3, 100);
      
      // Mock a request that fails twice then succeeds
      let callCount = 0;
      const mockFetch = jest.fn(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(new Response(JSON.stringify({ success: true }), {
          status: 200,
          ok: true,
        }));
      });

      global.fetch = mockFetch;

      const request = new Request('https://test.com/api');
      const response = await strategy.execute(request);
      
      expect(response.ok).toBe(true);
      expect(callCount).toBe(3);
      
      // Cleanup
      delete (global as any).fetch;
    });

    it('should throw after max retries exceeded', async () => {
      const strategy = new RetryStrategy(2, 10);
      
      const mockFetch = jest.fn(() => {
        return Promise.reject(new Error('Network error'));
      });

      global.fetch = mockFetch;

      const request = new Request('https://test.com/api');
      
      await expect(strategy.execute(request)).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
      
      // Cleanup
      delete (global as any).fetch;
    });
  });

  describe('TimeoutStrategy', () => {
    it('should implement Strategy interface', () => {
      const strategy = new TimeoutStrategy();
      expect(strategy.execute).toBeDefined();
      expect(typeof strategy.execute).toBe('function');
    });

    it('should resolve before timeout', async () => {
      const strategy = new TimeoutStrategy(5000);
      
      const mockFetch = jest.fn(() => {
        return Promise.resolve(new Response(JSON.stringify({ data: 'test' }), {
          status: 200,
          ok: true,
        }));
      });

      global.fetch = mockFetch;

      const request = new Request('https://test.com/api');
      const response = await strategy.execute(request);
      
      expect(response.ok).toBe(true);
      
      // Cleanup
      delete (global as any).fetch;
    });

    it('should abort request on timeout', async () => {
      const strategy = new TimeoutStrategy(50); // 50ms timeout
      
      const mockFetch = jest.fn(() => {
        return new Promise(() => {
          // Never resolve
        });
      });

      global.fetch = mockFetch;

      const request = new Request('https://test.com/api');
      
      await expect(strategy.execute(request)).rejects.toBeDefined();
      
      // Cleanup
      delete (global as any).fetch;
    });
  });

  describe('StrategyContext', () => {
    it('should use provided strategy', () => {
      const strategy = new FetchStrategy();
      const context = new StrategyContext<RequestInfo, Promise<Response>>(strategy);
      
      expect(context.getStrategy()).toBe(strategy);
    });

    it('should allow changing strategy at runtime', () => {
      const initialStrategy = new FetchStrategy();
      const newStrategy = new RetryStrategy();
      const context = new StrategyContext<RequestInfo, Promise<Response>>(initialStrategy);
      
      expect(context.getStrategy()).toBe(initialStrategy);
      
      context.setStrategy(newStrategy);
      expect(context.getStrategy()).toBe(newStrategy);
    });

    it('should execute strategy through context', async () => {
      const strategy = new FetchStrategy();
      const context = new StrategyContext<RequestInfo, Promise<Response>>(strategy);
      
      const mockFetch = jest.fn(() => {
        return Promise.resolve(new Response(JSON.stringify({ test: 'data' }), {
          status: 200,
          ok: true,
        }));
      });

      global.fetch = mockFetch;

      const request = new Request('https://jsonplaceholder.typicode.com/posts/1');
      const response = await context.execute(request);
      
      expect(response.ok).toBe(true);
      
      // Cleanup
      delete (global as any).fetch;
    });
  });
});
