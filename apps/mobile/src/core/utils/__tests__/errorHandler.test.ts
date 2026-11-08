/**
 * Tests for error handler utilities.
 */

import {
  createErrorHandler,
  errorHandler,
  logError,
  normalizeError,
  getErrorMessage,
  getErrorCode,
  isNetworkError,
  isTimeoutError,
  isRetryableError,
  getUserFriendlyMessage,
  aggregateErrors,
  retry,
  sleep,
  debounce,
  throttle,
} from '../errorHandler';
import { MobileAppError, NetworkError, AuthError, ApiError } from '../../exceptions/base';

describe('Error Handler', () => {
  describe('createErrorHandler', () => {
    it('should create error handler with configuration', () => {
      const handler = createErrorHandler({
        logErrors: false,
        defaultMessage: 'Custom error',
      });
      
      expect(handler).toBeDefined();
      expect(handler.handleError).toBeDefined();
      expect(handler.execute).toBeDefined();
      expect(handler.wrap).toBeDefined();
    });

    it('should handle errors and return result', () => {
      const handler = createErrorHandler({ logErrors: false });
      const result = handler.handleError(new Error('Test error'));
      
      expect(result.ok).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Test error');
    });

    it('should execute function and handle errors', async () => {
      const handler = createErrorHandler({ logErrors: false });
      
      const result1 = await handler.execute(() => 'success');
      expect(result1.ok).toBe(true);
      expect(result1.data).toBe('success');
      
      const result2 = await handler.execute(() => {
        throw new Error('Test error');
      });
      expect(result2.ok).toBe(false);
    });

    it('should execute async function and handle errors', async () => {
      const handler = createErrorHandler({ logErrors: false });
      
      const result = await handler.execute(async () => {
        await sleep(10);
        return 'async success';
      });
      
      expect(result.ok).toBe(true);
      expect(result.data).toBe('async success');
    });

    it('should wrap function to return error result', async () => {
      const handler = createErrorHandler({ logErrors: false });
      
      const wrapped = handler.wrap((x: number) => x * 2);
      
      const result1 = await wrapped(5);
      expect(result1.ok).toBe(true);
      expect(result1.data).toBe(10);
      
      const result2 = await wrapped('invalid' as any);
      expect(result2.ok).toBe(false);
    });

    it('should execute or throw', async () => {
      const handler = createErrorHandler({ logErrors: false });
      
      const result = await handler.executeOrThrow(() => 'success');
      expect(result).toBe('success');
      
      await expect(
        handler.executeOrThrow(() => {
          throw new Error('Test error');
        })
      ).rejects.toBeDefined();
    });
  });

  describe('default errorHandler', () => {
    it('should be defined', () => {
      expect(errorHandler).toBeDefined();
      expect(errorHandler.handleError).toBeDefined();
      expect(errorHandler.execute).toBeDefined();
    });
  });

  describe('logError', () => {
    it('should log error with context', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      logError(new Error('Test error'), { test: 'context' });
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should log MobileAppError', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const error = new MobileAppError('Test message', 'TEST_CODE', { detail: 'test' });
      logError(error);
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should log unknown error type', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      logError('string error');
      
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });
  });

  describe('normalizeError', () => {
    it('should return MobileAppError for MobileAppError instances', () => {
      const error = new MobileAppError('Test message', 'TEST_CODE');
      const normalized = normalizeError(error);
      
      expect(normalized).toBe(error);
      expect(normalized.message).toBe('Test message');
      expect(normalized.code).toBe('TEST_CODE');
    });

    it('should convert Error to MobileAppError', () => {
      const error = new Error('Test error');
      const normalized = normalizeError(error);
      
      expect(normalized).toBeInstanceOf(MobileAppError);
      expect(normalized.message).toBe('Test error');
      expect(normalized.code).toBe('Error');
    });

    it('should use default message for empty error message', () => {
      const error = new Error('');
      const normalized = normalizeError(error, 'Default message');
      
      expect(normalized.message).toBe('Default message');
    });

    it('should convert string to MobileAppError', () => {
      const normalized = normalizeError('string error', 'Default');
      
      expect(normalized).toBeInstanceOf(MobileAppError);
      expect(normalized.message).toBe('string error');
    });

    it('should include stack when configured', () => {
      const error = new Error('Test error');
      const normalized = normalizeError(error, 'Default', true);
      
      expect(normalized.metadata?.stack).toBeDefined();
    });

    it('should handle null and undefined', () => {
      const normalized1 = normalizeError(null);
      const normalized2 = normalizeError(undefined);
      
      expect(normalized1).toBeInstanceOf(MobileAppError);
      expect(normalized2).toBeInstanceOf(MobileAppError);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from MobileAppError', () => {
      const error = new MobileAppError('Test message', 'CODE');
      expect(getErrorMessage(error)).toBe('Test message');
    });

    it('should extract message from Error', () => {
      const error = new Error('Test message');
      expect(getErrorMessage(error)).toBe('Test message');
    });

    it('should return string directly', () => {
      expect(getErrorMessage('string error')).toBe('string error');
    });

    it('should use default message for empty message', () => {
      const error = new Error('');
      expect(getErrorMessage(error, 'Default message')).toBe('Default message');
    });

    it('should use default message for unknown error type', () => {
      expect(getErrorMessage(123, 'Default message')).toBe('Default message');
    });
  });

  describe('getErrorCode', () => {
    it('should extract code from MobileAppError', () => {
      const error = new MobileAppError('Test', 'TEST_CODE');
      expect(getErrorCode(error)).toBe('TEST_CODE');
    });

    it('should extract name from Error', () => {
      const error = new Error('Test');
      expect(getErrorCode(error)).toBe('Error');
    });

    it('should use default code for unknown error type', () => {
      expect(getErrorCode('string error', 'DEFAULT')).toBe('DEFAULT');
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors by code', () => {
      const networkError = new NetworkError('Network error', 'NETWORK_ERROR', 500);
      expect(isNetworkError(networkError)).toBe(true);
    });

    it('should identify HTTP errors by code', () => {
      const httpError = new NetworkError('Not found', 'HTTP_404', 404);
      expect(isNetworkError(httpError)).toBe(false); // 4xx are not network errors
    });

    it('should identify network errors by message', () => {
      const error = new Error('network connection failed');
      expect(isNetworkError(error)).toBe(true);
    });

    it('should identify fetch errors by message', () => {
      const error = new Error('Failed to fetch');
      expect(isNetworkError(error)).toBe(true);
    });

    it('should return false for non-network errors', () => {
      const error = new Error('Validation error');
      expect(isNetworkError(error)).toBe(false);
    });
  });

  describe('isTimeoutError', () => {
    it('should identify timeout errors by code', () => {
      const timeoutError = new NetworkError('Timeout', 'TIMEOUT', 408);
      expect(isTimeoutError(timeoutError)).toBe(true);
    });

    it('should identify timeout errors by message', () => {
      const error = new Error('Request timeout');
      expect(isTimeoutError(error)).toBe(true);
    });

    it('should return false for non-timeout errors', () => {
      const error = new Error('Validation error');
      expect(isTimeoutError(error)).toBe(false);
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable network errors', () => {
      const networkError = new NetworkError('Network error', 'NETWORK_ERROR', 500);
      expect(isRetryableError(networkError)).toBe(true);
    });

    it('should identify timeout errors as retryable', () => {
      const timeoutError = new NetworkError('Timeout', 'TIMEOUT', 408);
      expect(isRetryableError(timeoutError)).toBe(true);
    });

    it('should identify 5xx HTTP errors as retryable', () => {
      const serverError = new NetworkError('Server error', 'HTTP_503', 503);
      expect(isRetryableError(serverError)).toBe(true);
    });

    it('should not identify 4xx errors as retryable', () => {
      const clientError = new NetworkError('Client error', 'HTTP_400', 400);
      expect(isRetryableError(clientError)).toBe(false);
    });

    it('should return false for non-LIFEOS errors', () => {
      const error = new Error('Test error');
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return message for timeout errors', () => {
      const timeoutError = new NetworkError('Timeout', 'TIMEOUT', 408);
      const message = getUserFriendlyMessage(timeoutError);
      expect(message).toContain('timeout');
    });

    it('should return message for 401 errors', () => {
      const authError = new AuthError('Unauthorized', 'HTTP_401', 'Bearer');
      const message = getUserFriendlyMessage(authError);
      expect(message).toContain('login');
    });

    it('should return message for 403 errors', () => {
      const authError = new AuthError('Forbidden', 'HTTP_403');
      const message = getUserFriendlyMessage(authError);
      expect(message).toContain('permission');
    });

    it('should return message for 404 errors', () => {
      const apiError = new ApiError('Not found', 'HTTP_404', '/api/users', 'GET');
      const message = getUserFriendlyMessage(apiError);
      expect(message).toContain('not found');
    });

    it('should return message for 5xx errors', () => {
      const networkError = new NetworkError('Server error', 'HTTP_500', 500);
      const message = getUserFriendlyMessage(networkError);
      expect(message).toContain('server error');
    });

    it('should return message for validation errors', () => {
      const validationError = new MobileAppError('Invalid input', 'VALIDATION_ERROR');
      const message = getUserFriendlyMessage(validationError);
      expect(message).toContain('form');
    });

    it('should return message for auth errors', () => {
      const authError = new MobileAppError('Invalid credentials', 'AUTH_ERROR');
      const message = getUserFriendlyMessage(authError);
      expect(message).toContain('Authentication');
    });

    it('should return default message for unknown errors', () => {
      const error = new Error('Unknown error');
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('unexpected error');
    });

    it('should return message based on error string', () => {
      const error = new Error('Request timeout');
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('timeout');
    });

    it('should return message based on network error string', () => {
      const error = new Error('Network error occurred');
      const message = getUserFriendlyMessage(error);
      expect(message).toContain('Network');
    });
  });

  describe('aggregateErrors', () => {
    it('should aggregate multiple errors', () => {
      const errors = [
        new Error('Error 1'),
        new Error('Error 2'),
        new MobileAppError('Error 3', 'CODE_3'),
      ];
      
      const aggregated = aggregateErrors(errors, 'Multiple errors occurred');
      
      expect(aggregated).toBeInstanceOf(MobileAppError);
      expect(aggregated.message).toBe('Multiple errors occurred');
      expect(aggregated.code).toBe('AGGREGATE_ERROR');
      expect(aggregated.metadata?.errors).toHaveLength(3);
    });

    it('should use default message', () => {
      const errors = [new Error('Error 1')];
      const aggregated = aggregateErrors(errors);
      
      expect(aggregated.message).toBe('Multiple errors occurred');
    });

    it('should handle empty errors array', () => {
      const aggregated = aggregateErrors([], 'No errors');
      
      expect(aggregated).toBeInstanceOf(MobileAppError);
      expect(aggregated.message).toBe('No errors');
      expect(aggregated.metadata?.errors).toHaveLength(0);
    });
  });

  describe('retry', () => {
    it('should retry on failure and succeed', async () => {
      let callCount = 0;
      
      const result = await retry(
        async () => {
          callCount++;
          if (callCount < 3) {
            throw new Error('Failure');
          }
          return 'success';
        },
        { maxRetries: 3, initialDelay: 0, backoffMultiplier: 1 }
      );
      
      expect(result).toBe('success');
      expect(callCount).toBe(3);
    });

    it('should throw after max retries exceeded', async () => {
      let callCount = 0;
      
      await expect(
        retry(
          async () => {
            callCount++;
            throw new Error('Always fails');
          },
          { maxRetries: 2, initialDelay: 0 }
        )
      ).rejects.toThrow('Always fails');
      
      expect(callCount).toBe(3); // Initial + 2 retries
    });

    it('should not retry on success', async () => {
      let callCount = 0;
      
      const result = await retry(
        async () => {
          callCount++;
          return 'success';
        },
        { maxRetries: 3, initialDelay: 0 }
      );
      
      expect(result).toBe('success');
      expect(callCount).toBe(1);
    });

    it('should respect shouldRetry condition', async () => {
      let callCount = 0;
      
      await expect(
        retry(
          async () => {
            callCount++;
            throw new Error('Non-retryable');
          },
          {
            maxRetries: 3,
            initialDelay: 0,
            shouldRetry: (error) => error.message !== 'Non-retryable',
          }
        )
      ).rejects.toThrow('Non-retryable');
      
      expect(callCount).toBe(1); // No retries
    });

    it('should respect maxDelay', async () => {
      let callCount = 0;
      const startTime = Date.now();
      
      await expect(
        retry(
          async () => {
            callCount++;
            throw new Error('Failure');
          },
          {
            maxRetries: 3,
            initialDelay: 10,
            maxDelay: 10,
            backoffMultiplier: 10,
          }
        )
      ).rejects.toThrow();
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // With maxDelay of 10, delays should be capped at 10
      // 4 attempts with ~10ms delay each = ~40ms
      expect(duration).toBeLessThan(100);
    });
  });

  describe('sleep', () => {
    it('should delay execution', async () => {
      const startTime = Date.now();
      await sleep(50);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeGreaterThanOrEqual(49);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 50);
      
      // Call multiple times quickly
      debounced();
      debounced();
      debounced();
      
      // Function should not be called yet
      expect(mockFn).not.toHaveBeenCalled();
      
      // Wait for debounce delay
      await sleep(60);
      
      // Function should be called once
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should reset timer on each call', async () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 50);
      
      debounced();
      await sleep(30);
      debounced();
      await sleep(30);
      debounced();
      await sleep(30);
      
      // Still not called yet
      expect(mockFn).not.toHaveBeenCalled();
      
      // Wait for final debounce
      await sleep(60);
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should pass arguments to function', async () => {
      const mockFn = jest.fn();
      const debounced = debounce(mockFn, 10);
      
      debounced('arg1', 'arg2');
      await sleep(20);
      
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', async () => {
      const mockFn = jest.fn();
      const throttled = throttle(mockFn, 50);
      
      // Call multiple times quickly
      throttled();
      throttled();
      throttled();
      
      // Function should be called once initially
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // Wait for throttle period
      await sleep(60);
      
      // Function should still be called only once
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should queue last call during throttle period', async () => {
      const mockFn = jest.fn();
      const throttled = throttle(mockFn, 50);
      
      throttled();
      await sleep(20);
      throttled();
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      await sleep(60);
      
      // The last call should be executed after throttle period
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should pass arguments to function', async () => {
      const mockFn = jest.fn();
      const throttled = throttle(mockFn, 10);
      
      throttled('arg1', 'arg2');
      await sleep(20);
      
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });
  });
});
