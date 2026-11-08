/**
 * API client implementation using design patterns.
 * Uses Strategy pattern for different API strategies,
 * Factory pattern for creating API clients,
 * and Singleton pattern for default instance.
 */

import { StrategyContext, FetchStrategy, RetryStrategy, TimeoutStrategy } from '../core/patterns';
import { NetworkError, AuthError, ApiError } from '../core/exceptions/base';
import { isRetryableError } from '../core/utils/errorHandler';
import { buildUrl, joinUrl } from '../core/utils/apiHelper';
import type { 
  ApiRequestOptions,
  ApiResponse,
  ApiErrorResponse,
  EngineId,
  EngineResult,
  EngineInput,
  EngineRunRequest,
  EngineRunResponse,
  ApiGoal,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalsListResponse,
  UserProfile,
  LoginRequest,
  LoginResponse,
  AuthToken,
} from './types';
import { ApiPaths, HttpStatus } from './types';
import type { AnyObject } from '../core/utils/types';
import type { MobileAppError } from '../core/exceptions/base';

/**
 * API client configuration.
 */
export interface ApiClientConfig {
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  withAuth?: boolean;
  authToken?: string;
  onRequest?: (url: string, options: RequestInit) => void;
  onResponse?: (response: Response, url: string) => void;
  onError?: (error: unknown, url: string, options: RequestInit) => void;
}

/**
 * Default API client configuration.
 * Note: In React Native/Expo, process.env doesn't work at runtime.
 * Use Constants.expoConfig?.extra?.API_URL or pass baseUrl in config.
 */
const DEFAULT_CONFIG: ApiClientConfig = {
  baseUrl: 'https://api.lifeos.com',
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  withAuth: false,
};

/**
 * API strategy types.
 */
export type ApiStrategyType = 'fetch' | 'retry' | 'timeout' | 'retry-with-timeout';

/**
 * Create API strategy based on type.
 */
function createApiStrategy(type: ApiStrategyType, config: ApiClientConfig): { execute: (request: RequestInfo) => Promise<Response> } {
  switch (type) {
    case 'retry':
      return new RetryStrategy(config.maxRetries || 3, config.retryDelay || 1000);
    case 'timeout':
      return new TimeoutStrategy(config.timeout || 30000);
    case 'retry-with-timeout':
      // For retry-with-timeout, we create a custom strategy that combines both
      return {
        execute: async (request: RequestInfo) => {
          const retryStrategy = new RetryStrategy(config.maxRetries || 3, config.retryDelay || 1000);
          const timeoutStrategy = new TimeoutStrategy(config.timeout || 30000);
          // For now, just use retry strategy
          return retryStrategy.execute(request);
        },
      };
    default:
      return new FetchStrategy();
  }
}

/**
 * Main API client class.
 * Uses Strategy pattern for different request strategies.
 */
export class ApiClient {
  private config: ApiClientConfig;
  private strategy: { execute: (request: RequestInfo) => Promise<Response> };

  constructor(config: Partial<ApiClientConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.strategy = createApiStrategy('retry-with-timeout', this.config);
  }

  /**
   * Set strategy for the API client.
   */
  setStrategy(type: ApiStrategyType): void {
    this.strategy = createApiStrategy(type, this.config);
  }

  /**
   * Update client configuration.
   */
  updateConfig(newConfig: Partial<ApiClientConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.strategy = createApiStrategy('retry-with-timeout', this.config);
  }

  /**
   * Set authentication token.
   */
  setAuthToken(token: string): void {
    this.config.authToken = token;
    this.config.withAuth = true;
  }

  /**
   * Clear authentication token.
   */
  clearAuthToken(): void {
    this.config.authToken = undefined;
    this.config.withAuth = false;
  }

  /**
   * Build request URL.
   */
  private buildRequestUrl(path: string, query?: Record<string, string | number | boolean>): string {
    const baseUrl = this.config.baseUrl || DEFAULT_CONFIG.baseUrl;
    let url = joinUrl(baseUrl, path);
    if (query && Object.keys(query).length > 0) {
      url = buildUrl(url, '', query);
    }
    return url;
  }

  /**
   * Build request headers.
   */
  private buildHeaders(headers?: HeadersInit): HeadersInit {
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.config.withAuth && this.config.authToken) {
      defaultHeaders.Authorization = `Bearer ${this.config.authToken}`;
    }

    return { ...defaultHeaders, ...headers };
  }

  /**
   * Build request options.
   */
  private buildOptions(method: string, body?: unknown, headers?: HeadersInit): RequestInit {
    const options: RequestInit = {
      method,
      headers: this.buildHeaders(headers),
    };

    if (body) {
      options.body = JSON.stringify(body as any);
    }

    return options;
  }

  /**
   * Execute a request with the current strategy.
   */
  private async executeRequest(url: string, options: RequestInit): Promise<Response> {
    try {
      if (this.config.onRequest) {
        this.config.onRequest(url, options);
      }

      const response = await this.strategy.execute(new Request(url, options));

      if (this.config.onResponse) {
        this.config.onResponse(response, url);
      }

      return response;
    } catch (error) {
      if (this.config.onError) {
        this.config.onError(error, url, options);
      }
      throw error;
    }
  }

  /**
   * Process response and handle errors.
   */
  private async processResponse<T>(response: Response, url: string): Promise<ApiResponse<T>> {
    const status = response.status;

    // Handle successful responses
    if (status >= 200 && status < 300) {
      try {
        const data = await response.json();
        return { data, ok: true };
      } catch {
        return { data: null as T, ok: true };
      }
    }

    // Handle error responses
    let errorData: ApiErrorResponse;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        ok: false,
        error: 'Unknown error',
        code: `HTTP_${status}`,
        message: response.statusText || '',
      };
    }

    // Create appropriate error type
    let error: MobileAppError;

    if (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) {
      error = new AuthError(
        errorData.message || 'Authentication failed',
        errorData.code || `HTTP_${status}`,
        status === HttpStatus.UNAUTHORIZED ? 'Bearer' : undefined,
        { ...errorData.details, url },
      );
    } else if (status >= 500) {
      error = new NetworkError(
        errorData.message || 'Server error',
        errorData.code || `HTTP_${status}`,
        status,
        url,
        errorData.details,
      );
    } else {
      error = new ApiError(
        errorData.message || 'Request failed',
        errorData.code || `HTTP_${status}`,
        url,
        'GET',
        errorData.details,
      );
    }

    if (this.config.onError) {
      this.config.onError(error, url, {});
    }

    throw error;
  }

  /**
   * Make a raw request.
   */
  async request<T = unknown>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean>,
    headers?: HeadersInit,
  ): Promise<ApiResponse<T>> {
    const url = this.buildRequestUrl(path, query);
    const options = this.buildOptions(method, body, headers);

    const response = await this.executeRequest(url, options);
    return this.processResponse<T>(response, url);
  }

  /**
   * GET request.
   */
  async get<T = AnyObject>(
    path: string,
    query?: Record<string, string | number | boolean>,
    headers?: HeadersInit,
  ): Promise<ApiResponse<T>> {
    return this.request('GET', path, undefined, query, headers);
  }

  /**
   * POST request.
   */
  async post<T = unknown>(
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean>,
    headers?: HeadersInit,
  ): Promise<ApiResponse<T>> {
    return this.request('POST', path, body, query, headers);
  }

  /**
   * PUT request.
   */
  async put<T = unknown>(
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean>,
    headers?: HeadersInit,
  ): Promise<ApiResponse<T>> {
    return this.request('PUT', path, body, query, headers);
  }

  /**
   * PATCH request.
   */
  async patch<T = unknown>(
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean>,
    headers?: HeadersInit,
  ): Promise<ApiResponse<T>> {
    return this.request('PATCH', path, body, query, headers);
  }

  /**
   * DELETE request.
   */
  async delete<T = unknown>(
    path: string,
    body?: unknown,
    query?: Record<string, string | number | boolean>,
    headers?: HeadersInit,
  ): Promise<ApiResponse<T>> {
    return this.request('DELETE', path, body, query, headers);
  }

  // Authentication methods

  /**
   * Login with email and password.
   */
  async login(request: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return this.post<LoginResponse>(ApiPaths.login, request);
  }

  /**
   * Get current user profile.
   */
  async getMe(): Promise<ApiResponse<UserProfile>> {
    return this.get<UserProfile>(ApiPaths.me);
  }

  /**
   * Logout.
   */
  async logout(): Promise<ApiResponse<null>> {
    return this.post<null>(ApiPaths.logout);
  }

  // Goals methods

  /**
   * Get all goals.
   */
  async getGoals(query?: { page?: number; limit?: number; search?: string }): Promise<ApiResponse<GoalsListResponse>> {
    return this.get<GoalsListResponse>(ApiPaths.goals, query);
  }

  /**
   * Get a single goal by ID.
   */
  async getGoal(id: string): Promise<ApiResponse<ApiGoal>> {
    return this.get<ApiGoal>(ApiPaths.goal(id));
  }

  /**
   * Create a new goal.
   */
  async createGoal(request: CreateGoalRequest): Promise<ApiResponse<ApiGoal>> {
    return this.post<ApiGoal>(ApiPaths.goals, request);
  }

  /**
   * Update a goal.
   */
  async updateGoal(id: string, request: UpdateGoalRequest): Promise<ApiResponse<ApiGoal>> {
    return this.patch<ApiGoal>(ApiPaths.goal(id), request);
  }

  /**
   * Delete a goal.
   */
  async deleteGoal(id: string): Promise<ApiResponse<ApiGoal>> {
    return this.delete<ApiGoal>(ApiPaths.goal(id));
  }

  // Engine methods

  /**
   * Run an engine with input.
   */
  async runEngine(request: EngineRunRequest): Promise<ApiResponse<EngineRunResponse>> {
    return this.post<EngineRunResponse>(ApiPaths.runEngine, request);
  }

  /**
   * Get engine result.
   */
  async getEngineResult(engineId: EngineId, input: EngineInput): Promise<ApiResponse<EngineResult>> {
    return this.post<EngineResult>(ApiPaths.engine(engineId), input);
  }

  // Health check

  /**
   * Check API health.
   */
  async healthCheck(): Promise<ApiResponse<{ status: 'ok' | 'error' }>> {
    return this.get<{ status: 'ok' | 'error' }>(ApiPaths.health);
  }
}

/**
 * Singleton API client for the application.
 * Uses Singleton pattern to ensure a single instance.
 */
export class SingletonApiClient {
  private static instance: ApiClient | null = null;
  private static config: Partial<ApiClientConfig> | null = null;

  static getInstance(config?: Partial<ApiClientConfig>): ApiClient {
    if (this.instance === null || this.config !== config) {
      this.instance = new ApiClient(config);
      this.config = config || {};
    }
    return this.instance;
  }

  static reset(): void {
    this.instance = null;
    this.config = null;
  }

  static setAuthToken(token: string): void {
    const client = this.getInstance();
    client.setAuthToken(token);
  }

  static clearAuthToken(): void {
    const client = this.getInstance();
    client.clearAuthToken();
  }
}

/**
 * Default API client instance.
 */
export const apiClient = SingletonApiClient.getInstance();

/**
 * Factory function for creating API clients with specific configurations.
 * Uses Factory pattern.
 */
export function createApiClient(config: Partial<ApiClientConfig> = {}): ApiClient {
  return new ApiClient(config);
}

/**
 * Create a client with a specific base URL.
 */
export function createApiClientForUrl(baseUrl: string): ApiClient {
  return createApiClient({ baseUrl });
}

/**
 * Create a mock API client for testing.
 */
export function createMockApiClient(): Partial<ApiClient> {
  return {
    setStrategy: () => {},
    updateConfig: () => {},
    setAuthToken: () => {},
    clearAuthToken: () => {},
  };
}

/**
 * API client with retry logic.
 * Uses Decorator pattern.
 */
export class RetryApiClient extends ApiClient {
  private maxRetries: number;
  private delay: number;

  constructor(config: Partial<ApiClientConfig> & { maxRetries: number; delay: number }) {
    super(config);
    this.maxRetries = config.maxRetries;
    this.delay = config.delay;
  }

  async request<T = AnyObject>(
    method: string,
    path: string,
    body?: AnyObject,
    query?: Record<string, string | number | boolean>,
    headers?: HeadersInit,
  ): Promise<ApiResponse<T>> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await super.request(method, path, body, query, headers);
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries && isRetryableError(error)) {
          await new Promise((resolve) => setTimeout(resolve, this.delay * (attempt + 1)));
        } else {
          throw error;
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  }
}
