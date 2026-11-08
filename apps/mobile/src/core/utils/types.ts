/**
 * Shared type definitions for utilities.
 */

import type { HttpMethod } from './apiHelper';

/**
 * Request options for API calls.
 */
export interface RequestOptions {
  url: string;
  method: HttpMethod;
  headers: HeadersInit;
  body?: unknown;
  timeout: number;
  retries: number;
  retryDelay: number;
}

/**
 * Pagination options.
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  offset?: number;
}

/**
 * Sort options.
 */
export interface SortOptions<T> {
  field: keyof T | string;
  direction: 'asc' | 'desc';
}

/**
 * Filter options.
 */
export type FilterOptions<T> = {
  [K in keyof T]?: T[K] extends string | number | boolean ? T[K] | T[K][] : never;
} & {
  search?: string;
};

/**
 * Query options combining pagination, sort, and filter.
 */
export interface QueryOptions<T> {
  pagination?: PaginationOptions;
  sort?: SortOptions<T>[];
  filter?: FilterOptions<T>;
}

/**
 * Result with pagination info.
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Result with error handling.
 */
export type Result<T, E = Error> = {
  ok: true;
  data: T;
} | {
  ok: false;
  error: E;
};

/**
 * Async result for promises.
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Generic object type.
 */
export type AnyObject = Record<string, unknown>;

/**
 * JSON primitive types.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * JSON value type.
 */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/**
 * JSON object type.
 */
export interface JsonObject {
  [key: string]: JsonValue;
}

/**
 * JSON array type.
 */
export interface JsonArray extends Array<JsonValue> {}

/**
 * Deep partial type for nested objects.
 */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

/**
 * Deep readonly type for nested objects.
 */
export type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

/**
 * Merge two object types.
 */
export type Merge<A, B> = {
  [K in keyof A | keyof B]: K extends keyof A ? A[K] : K extends keyof B ? B[K] : never;
};

/**
 * Omit properties from type.
 */
export type OmitStrict<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Make all properties optional except specified keys.
 */
export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

/**
 * Event type for event emitters.
 */
export interface EventMap {
  [key: string]: unknown;
}

/**
 * Listener type for events.
 */
export type EventListener<T> = (value: T) => void | Promise<void>;

/**
 * Unsubscribe function type.
 */
export type Unsubscribe = () => void;

/**
 * Cache entry type.
 */
export interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
  createdAt: number;
}

/**
 * Cache options.
 */
export interface CacheOptions {
  ttl?: number;
  staleWhileRevalidate?: number;
}
