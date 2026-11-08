/**
 * Custom exception types for the mobile application.
 */

/**
 * Base error class for all LIFEOS mobile app errors.
 */
export class MobileAppError extends Error {
  readonly code: string;
  readonly timestamp: Date;
  readonly metadata?: Record<string, unknown>;

  constructor(
    message: string,
    code: string = 'MOBILE_ERROR',
    metadata?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'MobileAppError';
    this.code = code;
    this.timestamp = new Date();
    this.metadata = metadata;
  }

  toJSON(): Record<string, unknown> {
    return {
      error: this.name,
      message: this.message,
      code: this.code,
      timestamp: this.timestamp.toISOString(),
      metadata: this.metadata,
      stack: this.stack?.split('\n'),
    };
  }

  static isMobileAppError(error: unknown): error is MobileAppError {
    return error instanceof MobileAppError;
  }
}

/**
 * Network-related errors.
 */
export class NetworkError extends MobileAppError {
  readonly statusCode?: number;
  readonly url?: string;

  constructor(
    message: string,
    code: string = 'NETWORK_ERROR',
    statusCode?: number,
    url?: string,
    metadata?: Record<string, unknown>,
  ) {
    super(message, code, metadata);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    this.url = url;
  }

  static fromResponse(response: Response, url: string): NetworkError {
    return new NetworkError(
      `HTTP ${response.status} ${response.statusText}`,
      `HTTP_${response.status}`,
      response.status,
      url,
      { statusText: response.statusText },
    );
  }

  static isNetworkError(error: unknown): error is NetworkError {
    return error instanceof NetworkError;
  }
}

/**
 * API-related errors.
 */
export class ApiError extends MobileAppError {
  readonly endpoint?: string;
  readonly method?: string;

  constructor(
    message: string,
    code: string = 'API_ERROR',
    endpoint?: string,
    method?: string,
    metadata?: Record<string, unknown>,
  ) {
    super(message, code, metadata);
    this.name = 'ApiError';
    this.endpoint = endpoint;
    this.method = method;
  }

  static fromResponse(response: Response, endpoint: string, method: string): ApiError {
    return new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      `API_${response.status}`,
      endpoint,
      method,
      { statusText: response.statusText },
    );
  }

  static isApiError(error: unknown): error is ApiError {
    return error instanceof ApiError;
  }
}

/**
 * Validation errors for input data.
 */
export class ValidationError extends MobileAppError {
  readonly field?: string;
  readonly value?: unknown;

  constructor(
    message: string,
    code: string = 'VALIDATION_ERROR',
    field?: string,
    value?: unknown,
    metadata?: Record<string, unknown>,
  ) {
    super(message, code, metadata);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }

  static isValidationError(error: unknown): error is ValidationError {
    return error instanceof ValidationError;
  }
}

/**
 * Authentication-related errors.
 */
export class AuthError extends MobileAppError {
  readonly authType?: string;

  constructor(
    message: string,
    code: string = 'AUTH_ERROR',
    authType?: string,
    metadata?: Record<string, unknown>,
  ) {
    super(message, code, metadata);
    this.name = 'AuthError';
    this.authType = authType;
  }

  static isAuthError(error: unknown): error is AuthError {
    return error instanceof AuthError;
  }
}

/**
 * Storage-related errors.
 */
export class StorageError extends MobileAppError {
  readonly operation?: string;
  readonly storageType?: string;

  constructor(
    message: string,
    code: string = 'STORAGE_ERROR',
    operation?: string,
    storageType?: string,
    metadata?: Record<string, unknown>,
  ) {
    super(message, code, metadata);
    this.name = 'StorageError';
    this.operation = operation;
    this.storageType = storageType;
  }

  static isStorageError(error: unknown): error is StorageError {
    return error instanceof StorageError;
  }
}

/**
 * State management errors.
 */
export class StateError extends MobileAppError {
  readonly action?: string;
  readonly reducer?: string;

  constructor(
    message: string,
    code: string = 'STATE_ERROR',
    action?: string,
    reducer?: string,
    metadata?: Record<string, unknown>,
  ) {
    super(message, code, metadata);
    this.name = 'StateError';
    this.action = action;
    this.reducer = reducer;
  }

  static isStateError(error: unknown): error is StateError {
    return error instanceof StateError;
  }
}

/**
 * Type guard for checking if an error is any LIFEOS error.
 */
export function isLIFEOSError(error: unknown): error is MobileAppError {
  return (
    error instanceof MobileAppError ||
    error instanceof NetworkError ||
    error instanceof ApiError ||
    error instanceof ValidationError ||
    error instanceof AuthError ||
    error instanceof StorageError ||
    error instanceof StateError
  );
}

/**
 * Extract error details for logging.
 */
export function extractErrorDetails(error: unknown): Record<string, unknown> {
  if (isLIFEOSError(error)) {
    return error.toJSON();
  }
  if (error instanceof Error) {
    return {
      error: error.name,
      message: error.message,
      stack: error.stack?.split('\n'),
    };
  }
  return {
    error: 'Unknown',
    value: error,
  };
}
