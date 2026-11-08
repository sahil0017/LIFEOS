/**
 * Validation utilities for data validation.
 */

import { ValidationError } from '../exceptions/base';
import type { AnyObject, JsonValue } from './types';

/**
 * Validation rule type.
 */
export type ValidationRule<T = unknown> = (
  value: T,
  context?: AnyObject,
) => ValidationRuleResult;

/**
 * Result of a validation rule.
 */
export interface ValidationRuleResult {
  valid: boolean;
  error?: string;
  field?: string;
  value?: unknown;
}

/**
 * Schema for validating objects.
 */
export type ValidationSchema<T extends AnyObject = AnyObject> = {
  [K in keyof T]?: ValidationRule<T[K]> | ValidationRule<T[K]>[];
};

/**
 * Validation result with all errors.
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  value: AnyObject;
}

/**
 * Built-in validators.
 */
export const validators = {
  /**
   * Check if value is required (not null, undefined, or empty).
   */
  required: (message: string = 'This field is required') => (
    value: unknown,
  ): ValidationRuleResult => {
    if (value === null || value === undefined || value === '') {
      return { valid: false, error: message };
    }
    if (typeof value === 'string' && value.trim() === '') {
      return { valid: false, error: message };
    }
    if (Array.isArray(value) && value.length === 0) {
      return { valid: false, error: message };
    }
    return { valid: true };
  },

  /**
   * Check if value is a string.
   */
  string: (message: string = 'Must be a string') => (
    value: unknown,
  ): ValidationRuleResult => {
    if (typeof value !== 'string') {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },

  /**
   * Check if value is a number.
   */
  number: (message: string = 'Must be a number') => (
    value: unknown,
  ): ValidationRuleResult => {
    if (typeof value !== 'number' || isNaN(value)) {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },

  /**
   * Check if value is an integer.
   */
  integer: (message: string = 'Must be an integer') => (
    value: unknown,
  ): ValidationRuleResult => {
    if (typeof value !== 'number' || !Number.isInteger(value)) {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },

  /**
   * Check if value is a boolean.
   */
  boolean: (message: string = 'Must be a boolean') => (
    value: unknown,
  ): ValidationRuleResult => {
    if (typeof value !== 'boolean') {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },

  /**
   * Check if value is an array.
   */
  array: (message: string = 'Must be an array') => (
    value: unknown,
  ): ValidationRuleResult => {
    if (!Array.isArray(value)) {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },

  /**
   * Check if value is an object.
   */
  object: (message: string = 'Must be an object') => (
    value: unknown,
  ): ValidationRuleResult => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },

  /**
   * Check if value matches a regex pattern.
   */
  pattern: (regex: RegExp, message: string = 'Invalid format') => (
    value: unknown,
  ): ValidationRuleResult => {
    if (typeof value !== 'string') {
      return { valid: false, error: message, value };
    }
    if (!regex.test(value)) {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },

  /**
   * Check if value is an email.
   */
  email: (message: string = 'Must be a valid email address') => (
    value: unknown,
  ): ValidationRuleResult => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (typeof value !== 'string') {
      return { valid: false, error: message, value };
    }
    if (!emailRegex.test(value)) {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },

  /**
   * Check if value is a URL.
   */
  url: (message: string = 'Must be a valid URL') => (
    value: unknown,
  ): ValidationRuleResult => {
    if (typeof value !== 'string') {
      return { valid: false, error: message, value };
    }
    try {
      new URL(value);
      return { valid: true };
    } catch {
      return { valid: false, error: message, value };
    }
  },

  /**
   * Check if value is a UUID.
   */
  uuid: (message: string = 'Must be a valid UUID') => (
    value: unknown,
  ): ValidationRuleResult => {
    if (typeof value !== 'string') {
      return { valid: false, error: message, value };
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },

  /**
   * Check if value is within a range.
   */
  range: (min: number, max: number, message: string = 'Value out of range') => (
    value: unknown,
  ): ValidationRuleResult => {
    if (typeof value !== 'number') {
      return { valid: false, error: message, value };
    }
    if (value < min || value > max) {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },

  /**
   * Check if string length is within a range.
   */
  length: (min: number, max: number, message: string = 'Invalid length') => (
    value: unknown,
  ): ValidationRuleResult => {
    if (typeof value !== 'string') {
      return { valid: false, error: message, value };
    }
    if (value.length < min || value.length > max) {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },

  /**
   * Check if array length is within a range.
   */
  arrayLength: (
    min: number,
    max: number,
    message: string = 'Invalid array length',
  ) => (value: unknown): ValidationRuleResult => {
    if (!Array.isArray(value)) {
      return { valid: false, error: message, value };
    }
    if (value.length < min || value.length > max) {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },

  /**
   * Check if value is one of the allowed values.
   */
  oneOf: <T>(allowed: T[], message: string = 'Invalid value') => (
    value: unknown,
  ): ValidationRuleResult => {
    if (!allowed.includes(value as T)) {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },

  /**
   * Custom validation with a predicate function.
   */
  custom: (
    predicate: (value: unknown) => boolean,
    message: string = 'Invalid value',
  ) => (value: unknown): ValidationRuleResult => {
    if (!predicate(value)) {
      return { valid: false, error: message, value };
    }
    return { valid: true };
  },
};

/**
 * Validate a single value against rules.
 */
export function validateValue<T>(
  value: T,
  rules: ValidationRule<T> | ValidationRule<T>[],
  field?: string,
  context?: AnyObject,
): ValidationRuleResult[] {
  const results: ValidationRuleResult[] = [];
  const normalizedRules = Array.isArray(rules) ? rules : [rules];

  normalizedRules.forEach((rule) => {
    const result = rule(value, context);
    if (!result.valid && field) {
      result.field = field;
      result.value = value;
    }
    results.push(result);
  });

  return results;
}

/**
 * Validate an object against a schema.
 */
export function validate<T extends AnyObject>(
  data: T,
  schema: ValidationSchema<T>,
  context?: AnyObject,
): ValidationResult {
  const errors: ValidationError[] = [];
  const validated: AnyObject = { ...data };

  Object.entries(schema).forEach(([field, rules]) => {
    if (rules === undefined) return;

    const normalizedRules = Array.isArray(rules) ? rules : [rules];
    const value = data[field as keyof T];

    normalizedRules.forEach((rule) => {
      const result = rule(value, context);
      if (!result.valid) {
        errors.push(
          new ValidationError(
            result.error || 'Validation failed',
            'VALIDATION_ERROR',
            field,
            value,
            { rule: rule.name, context },
          ),
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
    value: validated,
  };
}

/**
 * Validate and throw on first error.
 */
export function validateOrThrow<T extends AnyObject>(
  data: T,
  schema: ValidationSchema<T>,
  context?: AnyObject,
): T {
  const result = validate(data, schema, context);
  if (!result.valid) {
    throw result.errors[0];
  }
  return result.value as T;
}

/**
 * Check if a value is empty.
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

/**
 * Check if a value is a plain object.
 */
export function isPlainObject(value: unknown): value is AnyObject {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Deep merge validation schemas.
 */
export function mergeSchemas<T extends AnyObject>(
  schema1: ValidationSchema<T>,
  schema2: ValidationSchema<T>,
): ValidationSchema<T> {
  const merged: ValidationSchema<T> = { ...schema1 };
  
  Object.entries(schema2).forEach(([field, rules]) => {
    if (merged[field as keyof T]) {
      const existingRules = Array.isArray(merged[field as keyof T])
        ? merged[field as keyof T]!
        : [merged[field as keyof T]!];
      const newRules = Array.isArray(rules) ? rules : [rules];
      merged[field as keyof T] = [...existingRules, ...newRules] as ValidationRule<T[Extract<keyof T, string>]>[];
    } else {
      merged[field as keyof T] = rules as ValidationRule<T[Extract<keyof T, string>]> | ValidationRule<T[Extract<keyof T, string>]>[];
    }
  });
  
  return merged;
}
