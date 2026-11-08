/**
 * Error handling utilities for consistent error management.
 */

import { MobileAppError, isLIFEOSError, extractErrorDetails } from '../exceptions/base';
import type { AnyObject } from './types';

/**
 * Error handler configuration.
 */
export interface ErrorHandlerConfig {
  onError?: (error: unknown, context?: AnyObject) => void;
  logErrors?: boolean;
  includeStack?: boolean;
  defaultMessage?: string;
}

/**
 * Error handling result.
 */
export type ErrorHandlerResult<T> = 
  | { ok: true; data: T }
  | { ok: false; error: MobileAppError };

/**
 * Create an error handler with configuration.
 */
export function createErrorHandler(config: ErrorHandlerConfig = {}) {
  const {
    onError,
    logErrors = true,
    includeStack = false,
    defaultMessage = 'An unexpected error occurred',
  } = config;

  /**
   * Handle an error and return a standardized result.
   */
  function handleError<T>(error: unknown, context?: AnyObject): ErrorHandlerResult<T> {
    if (logErrors) {
      logError(error, context);
    }

    if (onError) {
      try {
        onError(error, context);
      } catch (handlerError) {
        logError(handlerError, { context, originalError: error });
      }
    }

    const handledError = normalizeError(error, defaultMessage, includeStack);
    return { ok: false, error: handledError };
  }

  /**
   * Execute a function and handle errors.
   */
  async function execute<T, Args extends unknown[]>(
    fn: (...args: Args) => Promise<T> | T,
    ...args: Args
  ): Promise<ErrorHandlerResult<T>> {
    try {
      const result = await Promise.resolve(fn(...args));
      return { ok: true, data: result };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Execute a function and throw on error.
   */
  async function executeOrThrow<T, Args extends unknown[]>(
    fn: (...args: Args) => Promise<T> | T,
    ...args: Args
  ): Promise<T> {
    const result = await execute(fn, ...args);
    if (!result.ok) {
      throw result.error;
    }
    return result.data;
  }

  /**
   * Wrap a function to return an error result instead of throwing.
   */
  function wrap<T, Args extends unknown[]>(
    fn: (...args: Args) => Promise<T> | T,
  ): (...args: Args) => Promise<ErrorHandlerResult<T>> {
    return async (...args: Args) => execute(fn, ...args);
  }

  /**
   * Wrap a function to handle errors and return a default value.
   */
  function wrapWithDefault<T, Args extends unknown[]>(
    fn: (...args: Args) => Promise<T> | T,
    defaultValue: T,
  ): (...args: Args) => Promise<T> {
    return async (...args: Args) => {
      const result = await execute(fn, ...args);
      return result.ok ? result.data : defaultValue;
    };
  }

  return {
    handleError,
    execute,
    executeOrThrow,
    wrap,
    wrapWithDefault,
    config,
  };
}

/**
 * Default error handler instance.
 */
export const errorHandler = createErrorHandler();

/**
 * Log an error with context.
 */
export function logError(error: unknown, context?: AnyObject): void {
  const details = extractErrorDetails(error);
  
  console.error('LIFEOS Error:', {
    timestamp: new Date().toISOString(),
    ...details,
    context,
  });
}

/**
 * Normalize an error to a MobileAppError.
 */
export function normalizeError(
  error: unknown,
  defaultMessage: string = 'An unexpected error occurred',
  includeStack: boolean = false,
): MobileAppError {
  if (isLIFEOSError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new MobileAppError(
      error.message || defaultMessage,
      error.name,
      includeStack ? { stack: error.stack?.split('\n') } : undefined,
    );
  }

  return new MobileAppError(
    defaultMessage,
    'UNKNOWN_ERROR',
    { value: error },
  );
}

/**
 * Get error message from any error type.
 */
export function getErrorMessage(error: unknown, defaultMessage: string = 'An unexpected error occurred'): string {
  if (isLIFEOSError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message || defaultMessage;
  }

  if (typeof error === 'string') {
    return error;
  }

  return defaultMessage;
}

/**
 * Get error code from any error type.
 */
export function getErrorCode(error: unknown, defaultCode: string = 'UNKNOWN'): string {
  if (isLIFEOSError(error)) {
    return error.code;
  }

  if (error instanceof Error) {
    return error.name || defaultCode;
  }

  return defaultCode;
}

/**
 * Check if an error is a network error.
 */
export function isNetworkError(error: unknown): boolean {
  if (isLIFEOSError(error)) {
    return error.code.startsWith('NETWORK_') || error.code.startsWith('HTTP_');
  }
  if (error instanceof Error) {
    return error.message.includes('network') || error.message.includes('fetch');
  }
  return false;
}

/**
 * Check if an error is a timeout error.
 */
export function isTimeoutError(error: unknown): boolean {
  if (isLIFEOSError(error)) {
    return error.code === 'TIMEOUT' || error.message.includes('timeout');
  }
  if (error instanceof Error) {
    return error.message.includes('timeout');
  }
  return false;
}

/**
 * Check if an error is retryable.
 */
export function isRetryableError(error: unknown): boolean {
  if (isLIFEOSError(error)) {
    const code = error.code;
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      code.startsWith('NETWORK_') ||
      code === 'TIMEOUT' ||
      (code.startsWith('HTTP_') && parseInt(code.substring(5)) >= 500)
    );
  }
  return false;
}

/**
 * Create a user-friendly error message.
 */
export function getUserFriendlyMessage(error: unknown): string {
  if (isLIFEOSError(error)) {
    const code = error.code;
    
    if (code === 'TIMEOUT') {
      return 'Request timed out. Please check your connection and try again.';
    }
    if (code.startsWith('HTTP_')) {
      const status = parseInt(code.substring(5));
      if (status === 401) {
        return 'Please login to continue.';
      }
      if (status === 403) {
        return 'You do not have permission to perform this action.';
      }
      if (status === 404) {
        return 'The requested resource was not found.';
      }
      if (status >= 500) {
        return 'A server error occurred. Please try again later.';
      }
    }
    if (code === 'VALIDATION_ERROR') {
      return error.message || 'Please check the form for errors.';
    }
    if (code === 'AUTH_ERROR') {
      return 'Authentication failed. Please try again.';
    }
    return error.message || 'An error occurred.';
  }

  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return 'Request timed out. Please check your connection.';
    }
    if (error.message.includes('network')) {
      return 'Network error. Please check your connection.';
    }
    if (error.message.includes('401') || error.message.includes('403')) {
      return 'Authentication failed. Please login.';
    }
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Aggregate multiple errors into one.
 */
export function aggregateErrors(
  errors: unknown[],
  message: string = 'Multiple errors occurred',
): MobileAppError {
  const details: { errors: AnyObject[] } = { errors: [] };

  errors.forEach((error, index) => {
    const errorDetails = extractErrorDetails(error);
    details.errors.push(errorDetails);
  });

  return new MobileAppError(message, 'AGGREGATE_ERROR', details);
}

/**
 * Retry a function with exponential backoff.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    shouldRetry?: (error: unknown) => boolean;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    backoffMultiplier = 2,
    shouldRetry = isRetryableError,
  } = options;

  let lastError: unknown;
  let currentDelay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt >= maxRetries || !shouldRetry(error)) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      currentDelay = Math.min(currentDelay * backoffMultiplier, maxDelay);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/**
 * Sleep for a specified duration.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Debounce a function.
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      timeoutId = null;
      fn(...args);
    }, delay);
  };
}

/**
 * Throttle a function.
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number,
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs !== null) {
          fn(...lastArgs);
          lastArgs = null;
        }
      }, limit);
      fn(...args);
    } else {
      lastArgs = args;
    }
  };
}
