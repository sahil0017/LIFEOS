/**
 * Data formatting utilities for displaying data in a user-friendly way.
 */

import type { AnyObject } from './types';

/**
 * Format a date for display.
 */
export function formatDate(
  date: Date | string | number,
  options?: Intl.DateTimeFormatOptions,
  locales?: string | string[],
): string {
  const parsedDate = new Date(date);
  return new Intl.DateTimeFormat(locales, options).format(parsedDate);
}

/**
 * Format a date as a relative time string.
 */
export function formatRelativeTime(
  date: Date | string | number,
  now: Date = new Date(),
  options?: Intl.RelativeTimeFormatOptions,
  locales?: string | string[],
): string {
  const parsedDate = new Date(date);
  const diffMs = now.getTime() - parsedDate.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  const formatter = new Intl.RelativeTimeFormat(locales, options);

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / 60000);
      if (diffMinutes === 0) {
        return formatter.format(0, 'second');
      }
      return formatter.format(-diffMinutes, 'minute');
    }
    return formatter.format(-diffHours, 'hour');
  }

  if (diffDays < 7) {
    return formatter.format(-diffDays, 'day');
  }

  if (diffDays < 30) {
    const diffWeeks = Math.floor(diffDays / 7);
    return formatter.format(-diffWeeks, 'week');
  }

  if (diffDays < 365) {
    const diffMonths = Math.floor(diffDays / 30);
    return formatter.format(-diffMonths, 'month');
  }

  const diffYears = Math.floor(diffDays / 365);
  return formatter.format(-diffYears, 'year');
}

/**
 * Format a number with locale-specific formatting.
 */
export function formatNumber(
  value: number,
  options?: Intl.NumberFormatOptions,
  locales?: string | string[],
): string {
  return new Intl.NumberFormat(locales, options).format(value);
}

/**
 * Format a currency value.
 */
export function formatCurrency(
  value: number,
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions,
  locales?: string | string[],
): string {
  return new Intl.NumberFormat(locales, {
    style: 'currency',
    currency,
    ...options,
  }).format(value);
}

/**
 * Format a percentage value.
 */
export function formatPercentage(
  value: number,
  options?: Intl.NumberFormatOptions,
  locales?: string | string[],
): string {
  return new Intl.NumberFormat(locales, {
    style: 'percent',
    ...options,
  }).format(value / 100);
}

/**
 * Format bytes to human-readable string.
 */
export function formatBytes(
  bytes: number,
  decimals: number = 2,
  locales?: string | string[],
): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return new Intl.NumberFormat(locales, {
    maximumFractionDigits: decimals,
  }).format(parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to human-readable string.
 */
export function formatDuration(
  ms: number,
  options?: { long?: boolean; decimals?: number },
): string {
  const { long = false, decimals = 2 } = options || {};

  if (ms < 1000) {
    return long ? `${ms} milliseconds` : `${ms}ms`;
  }

  if (ms < 60000) {
    const seconds = ms / 1000;
    return long ? `${seconds.toFixed(decimals)} seconds` : `${seconds.toFixed(decimals)}s`;
  }

  if (ms < 3600000) {
    const minutes = ms / 60000;
    return long ? `${minutes.toFixed(decimals)} minutes` : `${minutes.toFixed(decimals)}m`;
  }

  if (ms < 86400000) {
    const hours = ms / 3600000;
    return long ? `${hours.toFixed(decimals)} hours` : `${hours.toFixed(decimals)}h`;
  }

  const days = ms / 86400000;
  return long ? `${days.toFixed(decimals)} days` : `${days.toFixed(decimals)}d`;
}

/**
 * Format a list of items as a readable string.
 */
export function formatList(
  items: string[],
  conjunction: string = 'and',
  separator: string = ', ',
): string {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return items.join(` ${conjunction} `);

  const firstPart = items.slice(0, -1).join(separator);
  const lastPart = items[items.length - 1];
  return `${firstPart}${separator}${conjunction} ${lastPart}`;
}

/**
 * Format a phone number.
 */
export function formatPhoneNumber(
  phone: string,
  country: string = 'US',
): string {
  const cleaned = phone.replace(/\D/g, '');

  switch (country.toUpperCase()) {
    case 'US':
    case 'CA':
      if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
      }
      break;
    default:
      return cleaned;
  }

  return cleaned;
}

/**
 * Format a credit card number.
 */
export function formatCreditCard(card: string): string {
  const cleaned = card.replace(/\D/g, '');
  return cleaned.replace(/(\d{4})/g, '$1-').replace(/-$/, '');
}

/**
 * Format a Social Security Number or similar ID.
 */
export function formatSSN(ssn: string): string {
  const cleaned = ssn.replace(/\D/g, '');
  return cleaned.replace(/(\d{3})(\d{2})(\d{4})/, '$1-$2-$3');
}

/**
 * Format a string as title case.
 */
export function formatTitleCase(str: string): string {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format a string as sentence case.
 */
export function formatSentenceCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Format a slug from a string.
 */
export function formatSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Format an object as a query string.
 */
export function formatQueryString(params: AnyObject): string {
  return Object.entries(params)
    .filter(([_, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}

/**
 * Format a file size with appropriate unit.
 */
export function formatFileSize(
  bytes: number,
  decimals: number = 2,
  binary: boolean = true,
): string {
  if (bytes === 0) return '0 B';

  const base = binary ? 1024 : 1000;
  const units = binary ? ['B', 'KB', 'MB', 'GB', 'TB'] : ['B', 'kB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(base));

  return `${parseFloat((bytes / Math.pow(base, i)).toFixed(decimals))} ${units[i]}`;
}

/**
 * Format a percentage value.
 */
export function formatPercent(
  value: number,
  decimals: number = 2,
  symbol: string = '%',
): string {
  return `${value.toFixed(decimals)}${symbol}`;
}

/**
 * Format a number with commas.
 */
export function formatNumberWithCommas(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a timestamp for display.
 */
export function formatTimestamp(
  timestamp: Date | string | number,
  includeDate: boolean = true,
  includeTime: boolean = true,
): string {
  const date = new Date(timestamp);
  const parts: string[] = [];

  if (includeDate) {
    parts.push(
      date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
    );
  }

  if (includeTime) {
    parts.push(
      date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }),
    );
  }

  return parts.join(' ');
}

/**
 * Truncate a string to a specified length.
 */
export function truncate(str: string, length: number, suffix: string = '...'): string {
  if (str.length <= length) return str;
  return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Format a string for display, escaping HTML special characters.
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Format a markdown string for display (basic formatting).
 */
export function formatMarkdownBasic(md: string): string {
  // Headers
  let result = md
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>');

  // Bold and italic
  result = result
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  // Links
  result = result.replace(/\\[(.*?)\\]\\((.*?)\\)/g, '<a href="$2">$1</a>');

  // Lists
  result = result
    .replace(/^\- (.*$)/gm, '<li>$1</li>')
    .replace(/^\d+\. (.*$)/gm, '<li>$1</li>');

  return result;
}
