/**
 * Data normalization utilities for consistent data formatting.
 */

import type { AnyObject, JsonValue } from './types';

/**
 * Normalize string to lowercase and trim.
 */
export function normalizeString(value: string): string {
  return value.toLowerCase().trim();
}

/**
 * Normalize string to camelCase.
 */
export function toCamelCase(value: string): string {
  return value.replace(/[_-][a-z]/g, (match) => match[1].toUpperCase());
}

/**
 * Normalize string to snake_case.
 */
export function toSnakeCase(value: string): string {
  return value
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^-/, '')
    .replace(/[-\s]+/g, '_');
}

/**
 * Normalize string to kebab-case.
 */
export function toKebabCase(value: string): string {
  return value
    .replace(/([A-Z])/g, '-$1')
    .toLowerCase()
    .replace(/^[-_]+/, '')
    .replace(/[\s_]+/g, '-');
}

/**
 * Normalize string to PascalCase.
 */
export function toPascalCase(value: string): string {
  return value
    .replace(/[_-][a-z]/g, (match) => match[1].toUpperCase())
    .replace(/^[a-z]/, (match) => match.toUpperCase());
}

/**
 * Normalize object keys to camelCase.
 */
export function normalizeKeysToCamelCase<T extends AnyObject>(
  obj: T,
): { [K in keyof T as string extends K ? string : K]: T[K] extends AnyObject ? ReturnType<typeof normalizeKeysToCamelCase<T[K]>> : T[K] } {
  if (obj === null || typeof obj !== 'object') {
    return obj as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeKeysToCamelCase(item)) as any;
  }

  const result: AnyObject = {};
  Object.entries(obj).forEach(([key, value]) => {
    const camelKey = toCamelCase(key);
    result[camelKey] = value && typeof value === 'object' && value !== null ? normalizeKeysToCamelCase(value as AnyObject) : value;
  });
  return result as any;
}

/**
 * Normalize object keys to snake_case.
 */
export function normalizeKeysToSnakeCase<T extends AnyObject>(
  obj: T,
): { [K in keyof T as string extends K ? string : K]: T[K] extends AnyObject ? ReturnType<typeof normalizeKeysToSnakeCase<T[K]>> : T[K] } {
  if (obj === null || typeof obj !== 'object') {
    return obj as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => normalizeKeysToSnakeCase(item)) as any;
  }

  const result: AnyObject = {};
  Object.entries(obj).forEach(([key, value]) => {
    const snakeKey = toSnakeCase(key);
    result[snakeKey] = value && typeof value === 'object' && value !== null ? normalizeKeysToSnakeCase(value as AnyObject) : value;
  });
  return result as any;
}

/**
 * Convert nested objects to flat object with dot notation.
 */
export function flattenObject<T extends AnyObject>(
  obj: T,
  prefix: string = '',
  separator: string = '.',
): Record<string, JsonValue> {
  const result: Record<string, JsonValue> = {};

  Object.entries(obj).forEach(([key, value]) => {
    const fullKey = prefix ? `${prefix}${separator}${key}` : key;

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as AnyObject, fullKey, separator));
    } else if (Array.isArray(value)) {
      result[fullKey] = value;
    } else {
      result[fullKey] = value as JsonValue;
    }
  });

  return result;
}

/**
 * Convert flat object with dot notation back to nested object.
 */
export function unflattenObject<T = AnyObject>(
  obj: Record<string, JsonValue>,
  separator: string = '.',
): T {
  const result: AnyObject = {};

  Object.entries(obj).forEach(([key, value]) => {
    const parts = key.split(separator);
    let current: AnyObject = result;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        current[part] = value;
      } else {
        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {};
        }
        current = current[part] as AnyObject;
      }
    });
  });

  return result as T;
}

/**
 * Convert values to specific types based on a schema.
 */
export function normalizeTypes<T extends AnyObject>(
  obj: AnyObject,
  schema: Record<keyof T, 'string' | 'number' | 'boolean' | 'array' | 'object'>,
): T {
  const result: AnyObject = {};

  Object.entries(schema).forEach(([key, type]) => {
    const value = obj[key as keyof AnyObject];

    switch (type) {
      case 'string':
        result[key] = value !== null && value !== undefined ? String(value) : value;
        break;
      case 'number':
        result[key] = value !== null && value !== undefined ? Number(value) : value;
        break;
      case 'boolean':
        result[key] = value !== null && value !== undefined ? Boolean(value) : value;
        break;
      case 'array':
        result[key] = Array.isArray(value) ? value : value !== null && value !== undefined ? [value] : [];
        break;
      case 'object':
        result[key] = value !== null && typeof value === 'object' ? value : {};
        break;
      default:
        result[key] = value;
    }
  });

  return result as T;
}

/**
 * Remove null, undefined, and empty values from object.
 */
export function removeEmptyValues<T extends AnyObject>(obj: T): Partial<T> {
  const result: Partial<T> = {};

  Object.entries(obj).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          result[key as keyof T] = value as any;
        }
      } else if (typeof value === 'object') {
        const cleaned = removeEmptyValues(value as AnyObject);
        if (Object.keys(cleaned).length > 0) {
          result[key as keyof T] = cleaned as any;
        }
      } else {
        result[key as keyof T] = value as any;
      }
    }
  });

  return result;
}

/**
 * Deep clone an object.
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as unknown as T;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as unknown as T;
  }

  const cloned: AnyObject = {};
  Object.entries(obj).forEach(([key, value]) => {
    cloned[key] = deepClone(value);
  });

  return cloned as T;
}

/**
 * Compare two objects deeply.
 */
export function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    return a.length === (b as Array<unknown>).length && a.every((item, index) => deepEqual(item, (b as Array<unknown>)[index]));
  }

  const aKeys = Object.keys(a as AnyObject);
  const bKeys = Object.keys(b as AnyObject);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => deepEqual((a as AnyObject)[key], (b as AnyObject)[key]));
}

/**
 * Normalize date to ISO string.
 */
export function normalizeDate(date: Date | string | number): string {
  return new Date(date).toISOString();
}

/**
 * Normalize boolean values.
 */
export function normalizeBoolean(value: unknown, defaultValue: boolean = false): boolean {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    return normalized === 'true' || normalized === '1';
  }
  return Boolean(value);
}

/**
 * Normalize numeric values.
 */
export function normalizeNumber(value: unknown, defaultValue: number = 0): number {
  if (value === null || value === undefined) return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
}

/**
 * Normalize array to ensure it's always an array.
 */
export function normalizeArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
