/**
 * Timezone utilities for formatting and displaying dates in user's timezone.
 * Default timezone: GMT+8 (Malaysia Time - MYT)
 */

import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { zonedTimeToUtc, utcToZonedTime } from 'date-fns-tz';

// Default timezone
export const DEFAULT_TIMEZONE = 'Asia/Kuala_Lumpur'; // GMT+8

// Common timezone choices
export const TIMEZONE_CHOICES = {
  'Asia/Kuala_Lumpur': 'GMT+8 (Malaysia Time)',
  'Asia/Singapore': 'GMT+8 (Singapore Time)',
  'Asia/Manila': 'GMT+8 (Philippines Time)',
  'Asia/Hong_Kong': 'GMT+8 (Hong Kong Time)',
  'Asia/Shanghai': 'GMT+8 (China Standard Time)',
  'Asia/Taipei': 'GMT+8 (Taiwan Time)',
  'Asia/Jakarta': 'GMT+7 (Western Indonesia Time)',
  'Asia/Bangkok': 'GMT+7 (Indochina Time)',
  'Asia/Tokyo': 'GMT+9 (Japan Standard Time)',
  'Asia/Seoul': 'GMT+9 (Korea Standard Time)',
  'UTC': 'UTC (Coordinated Universal Time)',
  'America/New_York': 'GMT-5/-4 (Eastern Time)',
  'America/Los_Angeles': 'GMT-8/-7 (Pacific Time)',
  'Europe/London': 'GMT+0/+1 (British Time)',
  'Europe/Paris': 'GMT+1/+2 (Central European Time)',
  'Australia/Sydney': 'GMT+10/+11 (Australian Eastern Time)',
};

/**
 * Format a date/timestamp for display in user's timezone.
 * @param dateString ISO datetime string from backend (in UTC)
 * @param userTimezone User's preferred timezone (IANA format)
 * @param formatString Optional custom format string (default: 'yyyy-MM-dd HH:mm:ss zzz')
 */
export function formatDateTime(
  dateString: string | null | undefined,
  userTimezone: string = DEFAULT_TIMEZONE,
  formatString: string = 'yyyy-MM-dd HH:mm:ss zzz'
): string {
  if (!dateString) return '-';
  
  try {
    // Parse ISO string as UTC
    const utcDate = parseISO(dateString);
    
    // Convert to user's timezone
    const zonedDate = utcToZonedTime(utcDate, userTimezone);
    
    // Format with timezone abbreviation
    return format(zonedDate, formatString, { timeZone: userTimezone });
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString;
  }
}

/**
 * Format a date for short display (e.g., "Nov 2, 2025")
 */
export function formatDateShort(
  dateString: string | null | undefined,
  userTimezone: string = DEFAULT_TIMEZONE
): string {
  return formatDateTime(dateString, userTimezone, 'MMM d, yyyy');
}

/**
 * Format a date with time (e.g., "Nov 2, 2025 13:25")
 */
export function formatDateWithTime(
  dateString: string | null | undefined,
  userTimezone: string = DEFAULT_TIMEZONE
): string {
  return formatDateTime(dateString, userTimezone, 'MMM d, yyyy HH:mm');
}

/**
 * Format a relative time (e.g., "2 hours ago")
 * Note: Relative time is timezone-independent - it's always relative to "now"
 */
export function formatRelativeTime(
  dateString: string | null | undefined
): string {
  if (!dateString) return '-';
  
  try {
    // Parse as UTC timestamp
    const date = parseISO(dateString);
    // formatDistanceToNow automatically compares to current time
    // regardless of timezone, so the relative difference is correct
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return dateString;
  }
}

/**
 * Convert a local datetime to UTC for sending to backend
 */
export function convertToUTC(
  localDate: Date,
  userTimezone: string = DEFAULT_TIMEZONE
): Date {
  return zonedTimeToUtc(localDate, userTimezone);
}

/**
 * Get current date/time in user's timezone
 */
export function getCurrentDateTime(userTimezone: string = DEFAULT_TIMEZONE): Date {
  return utcToZonedTime(new Date(), userTimezone);
}

/**
 * Check if a date is overdue (past current time)
 */
export function isOverdue(dateString: string | null | undefined): boolean {
  if (!dateString) return false;
  
  try {
    const date = parseISO(dateString);
    return date < new Date();
  } catch (error) {
    return false;
  }
}

/**
 * Get timezone offset string (e.g., "+08:00")
 */
export function getTimezoneOffset(timezone: string = DEFAULT_TIMEZONE): string {
  try {
    const date = new Date();
    const zonedDate = utcToZonedTime(date, timezone);
    const formatted = format(zonedDate, 'xxx', { timeZone: timezone });
    return formatted;
  } catch (error) {
    return '+00:00';
  }
}
