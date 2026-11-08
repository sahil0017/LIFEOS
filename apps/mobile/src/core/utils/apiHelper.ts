/**
 * API client utilities for making HTTP requests with better error handling.
 */

import { NetworkError, isLIFEOSError } from '../exceptions/base';
import type { RequestOptions } from './types';
import type { MobileAppError } from '../exceptions/base';

/**
 * Default request options.
 */
const DEFAULT_OPTIONS: Omit<RequestOptions, 'url'> = {
  method: 'GET',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  retries: 0,
  retryDelay: 1000,
};

/**
 * HTTP methods.
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Normalize URL by ensuring it has a protocol.
 */
export function normalizeUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
}

/**
 * Join URL paths.
 */
export function joinUrl(base: string, ...paths: string[]): string {
  const url = new URL(normalizeUrl(base));
  paths.forEach((path) => {
    path.split('/').forEach((part) => {
      if (part && part !== '.') {
        if (part === '..') {
          url.pathname = url.pathname.replace(/(?:^|\/)[^\/]+\/?$/, '');
        } else {
          url.pathname = url.pathname.replace(/\/$/, '') + '/' + part;
        }
      }
    });
  });
  return url.toString();
}

/**
 * Build query string from params object.
 */
export function buildQueryString(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/**
 * Build URL with path and query string.
 */
export function buildUrl(base: string, path: string = '', params?: Record<string, string | number | boolean>): string {
  const url = new URL(normalizeUrl(base));
  if (path) {
    url.pathname = url.pathname.replace(/\/$/, '') + '/' + path.replace(/^\//, '');
  }
  if (params) {
    url.search = buildQueryString(params).replace(/^\?/, '');
  }
  return url.toString();
}

/**
 * Create timeout promise.
 */
function createTimeout(ms: number, controller: AbortController): Promise<never> {
  return new Promise((_, reject) => {
    const timeoutId = setTimeout(() => {
      controller.abort();
      reject(new NetworkError(`Request timed out after ${ms}ms`, 'TIMEOUT', 408));
    }, ms);
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });
  });
}

/**
 * Parse response based on content type.
 */
async function parseResponse<T = unknown>(response: Response): Promise<T> {
  const getHeader = (name: string) => {
    if (typeof (response.headers as any)?.get === 'function') {
      return (response.headers as any).get(name);
    }
    const headers = (response.headers as any) || {};
    return headers[name] || headers[name.toLowerCase()] || headers[name.toUpperCase()];
  };
  const contentType = getHeader('content-type') || '';
  
  if (contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  } else if (contentType.includes('text/')) {
    return (response.text() as unknown) as T;
  } else if (contentType.includes('application/octet-stream')) {
    return (response.blob() as unknown) as T;
  }
  
  // Try json first, then text
  try {
    return (await response.json()) as T;
  } catch {
    return (response.text() as unknown) as T;
  }
}

/**
 * Check if response is successful.
 */
function isSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

/**
 * Handle response and throw appropriate errors.
 */
async function handleResponse<T>(response: Response, url: string, options: RequestOptions): Promise<T> {
  const status = response.status;
  
  if (!isSuccess(status)) {
    let error: MobileAppError;
    
    if (status >= 400 && status < 500) {
      error = new NetworkError(
        `Client error: ${status} ${response.statusText}`,
        `HTTP_${status}`,
        status,
        url,
      );
    } else if (status >= 500) {
      error = new NetworkError(
        `Server error: ${status} ${response.statusText}`,
        `HTTP_${status}`,
        status,
        url,
      );
    } else {
      error = new NetworkError(
        `Request failed: ${status} ${response.statusText}`,
        `HTTP_${status}`,
        status,
        url,
      );
    }
    
    try {
      const body = await response.text();
      if (body) {
        const networkError = error as any;
        error = new NetworkError(
          error.message,
          error.code,
          networkError.statusCode,
          networkError.url,
          { ...error.metadata, body },
        );
      }
    } catch {
      // Ignore error parsing body
    }
    
    throw error;
  }

  return parseResponse<T>(response);
}

/**
 * Make HTTP request with error handling.
 */
export async function request<T = unknown>(
  url: string,
  options: Partial<RequestOptions> = {},
): Promise<T> {
  const mergedOptions: RequestOptions = {
    ...DEFAULT_OPTIONS,
    url,
    ...options,
    headers: {
      ...DEFAULT_OPTIONS.headers,
      ...options.headers,
    },
  };

  const { method, headers, body: requestBody, timeout, retries = 0, retryDelay = 1000 } = mergedOptions;

  let lastError: unknown;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const requestOptions: RequestInit = {
        method,
        headers,
        body: requestBody ? JSON.stringify(requestBody) : undefined,
        signal: controller.signal,
      };

      const timeoutPromise = timeout ? createTimeout(timeout, controller) : null;
      
      const response = await Promise.race([
        fetch(url, requestOptions),
        timeoutPromise as Promise<Response>,
      ]);

      return await handleResponse<T>(response, url, mergedOptions);
    } catch (error: unknown) {
      lastError = error;
      
      // Don't retry on client errors (4xx) or if no retries configured
      if (attempt < retries) {
        const isClientError = isLIFEOSError(error) && error.code.startsWith('HTTP_') && parseInt(error.code.substring(5)) >= 400 && parseInt(error.code.substring(5)) < 500;
        if (isClientError) {
          throw error;
        }
        
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      } else {
        throw error;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new NetworkError('Unknown request error', 'REQUEST_ERROR');
}

/**
 * Convenience methods for each HTTP verb.
 */
export const api = {
  get: <T = unknown>(url: string, params?: Record<string, string | number | boolean>, options?: Partial<RequestOptions>): Promise<T> => {
    const fullUrl = params ? buildUrl(url, undefined, params) : url;
    return request<T>(fullUrl, { ...options, method: 'GET' });
  },

  post: <T = unknown>(url: string, data?: unknown, options?: Partial<RequestOptions>): Promise<T> => {
    return request<T>(url, { ...options, method: 'POST', body: data });
  },

  put: <T = unknown>(url: string, data?: unknown, options?: Partial<RequestOptions>): Promise<T> => {
    return request<T>(url, { ...options, method: 'PUT', body: data });
  },

  patch: <T = unknown>(url: string, data?: unknown, options?: Partial<RequestOptions>): Promise<T> => {
    return request<T>(url, { ...options, method: 'PATCH', body: data });
  },

  delete: <T = unknown>(url: string, data?: unknown, options?: Partial<RequestOptions>): Promise<T> => {
    return request<T>(url, { ...options, method: 'DELETE', body: data });
  },
};

/**
 * Check API health.
 */
export async function checkApiHealth(baseUrl: string, endpoint: string = '/health'): Promise<boolean> {
  try {
    const response = await request(joinUrl(baseUrl, endpoint), {
      method: 'GET',
      timeout: 5000,
      retries: 2,
    });
    return true;
  } catch {
    return false;
  }
}
