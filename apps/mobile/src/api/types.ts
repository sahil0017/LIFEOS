/**
 * API type definitions.
 */

import type { Goal } from '../goals';
import type { PaginationOptions, PaginatedResult, AnyObject } from '../core/utils/types';

/**
 * API response wrapper.
 */
export interface ApiResponse<T> {
  data: T;
  ok: boolean;
  error?: string;
  message?: string;
  timestamp?: string;
}

/**
 * API error response.
 */
export interface ApiErrorResponse {
  ok: false;
  error: string;
  code: string;
  message?: string;
  details?: AnyObject;
  timestamp?: string;
}

/**
 * Engine types matching the intelligence-engine.
 */
export type EngineId =
  | 'multimodal'
  | 'world-model'
  | 'quantum'
  | 'causal'
  | 'neuro-symbolic'
  | 'memory'
  | 'generative'
  | 'multi-agent'
  | 'predictive'
  | 'neuromorphic'
  | 'evolutionary'
  | 'evaluation';

/**
 * Engine result from intelligence engine.
 */
export interface EngineResult {
  summary: string;
  evidence: string[];
  assumptions: string[];
  limitations: string[];
  version: string;
  metadata?: AnyObject;
}

/**
 * Engine input.
 */
export interface EngineInput {
  goals: readonly Goal[];
  userId?: string;
  context?: AnyObject;
}

/**
 * Request options for API calls.
 */
export interface ApiRequestOptions extends RequestInit {
  /**
   * Base URL override.
   */
  baseUrl?: string;
  /**
   * Path parameters.
   */
  params?: Record<string, string | number | boolean>;
  /**
   * Query parameters.
   */
  query?: Record<string, string | number | boolean>;
  /**
   * Request timeout in milliseconds.
   */
  timeout?: number;
  /**
   * Number of retries.
   */
  retries?: number;
  /**
   * Whether to include authentication.
   */
  withAuth?: boolean;
}

/**
 * Goal types for API.
 */
export interface ApiGoal {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  sessionCount: number;
  targetDate?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

/**
 * Create goal request.
 */
export interface CreateGoalRequest {
  title: string;
  description?: string;
  targetDate?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

/**
 * Update goal request.
 */
export interface UpdateGoalRequest {
  title?: string;
  description?: string;
  completed?: boolean;
  targetDate?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
}

/**
 * Goals list response.
 */
export interface GoalsListResponse {
  goals: ApiGoal[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Engine run request.
 */
export interface EngineRunRequest {
  engineId: EngineId;
  input: EngineInput;
  options?: AnyObject;
}

/**
 * Engine run response.
 */
export interface EngineRunResponse {
  engineId: EngineId;
  result: EngineResult;
  timestamp: string;
}

/**
 * User profile.
 */
export interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  username?: string;
  createdAt: string;
  updatedAt: string;
  preferences?: AnyObject;
}

/**
 * Authentication token.
 */
export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string;
  tokenType: 'Bearer';
}

/**
 * Login request.
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response.
 */
export interface LoginResponse {
  token: AuthToken;
  user: UserProfile;
}

/**
 * API endpoint paths.
 */
export const ApiPaths = {
  // Auth
  login: '/api/auth/login',
  logout: '/api/auth/logout',
  refresh: '/api/auth/refresh',
  me: '/api/auth/me',
  
  // Goals
  goals: '/api/goals',
  goal: (id: string) => `/api/goals/${id}`,
  
  // Engines
  engines: '/api/engines',
  engine: (id: EngineId) => `/api/engines/${id}`,
  runEngine: '/api/engines/run',
  
  // Health
  health: '/api/health',
} as const;

/**
 * HTTP status codes.
 */
export enum HttpStatus {
  CONTINUE = 100,
  SWITCHING_PROTOCOLS = 101,
  PROCESSING = 102,
  EARLY_HINTS = 103,
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NON_AUTHORITATIVE_INFORMATION = 203,
  NO_CONTENT = 204,
  RESET_CONTENT = 205,
  PARTIAL_CONTENT = 206,
  AMBIGUOUS = 300,
  MOVED_PERMANENTLY = 301,
  FOUND = 302,
  SEE_OTHER = 303,
  NOT_MODIFIED = 304,
  TEMPORARY_REDIRECT = 307,
  PERMANENT_REDIRECT = 308,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  PAYMENT_REQUIRED = 402,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  METHOD_NOT_ALLOWED = 405,
  NOT_ACCEPTABLE = 406,
  PROXY_AUTHENTICATION_REQUIRED = 407,
  REQUEST_TIMEOUT = 408,
  CONFLICT = 409,
  GONE = 410,
  LENGTH_REQUIRED = 411,
  PRECONDITION_FAILED = 412,
  PAYLOAD_TOO_LARGE = 413,
  URI_TOO_LONG = 414,
  UNSUPPORTED_MEDIA_TYPE = 415,
  RANGE_NOT_SATISFIABLE = 416,
  EXPECTATION_FAILED = 417,
  MISDIRECTED = 421,
  UNPROCESSABLE_ENTITY = 422,
  LOCKED = 423,
  FAILED_DEPENDENCY = 424,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  NOT_IMPLEMENTED = 501,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
  HTTP_VERSION_NOT_SUPPORTED = 505,
}
