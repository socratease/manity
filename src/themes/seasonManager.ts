/**
 * Season Manager
 * Determines which seasonal theme should be active based on the current date
 */

import { allThemes, baseTheme } from './colors';
import type { SeasonalTheme, SeasonDate } from './types';

/**
 * Calculates Easter Sunday for a given year using the Computus algorithm
 * (Anonymous Gregorian algorithm)
 * @param year - The year to calculate Easter for
 * @returns Date object representing Easter Sunday
 */
export function getEasterDate(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

/**
 * Checks if a given month/day falls within a date range
 * Handles year boundaries (e.g., Dec 15 - Jan 15)
 * @param month - Month to check (1-12)
 * @param day - Day to check (1-31)
 * @param startDate - Range start date
 * @param endDate - Range end date
 * @returns True if the date falls within the range
 */
export function isDateInRange(
  month: number,
  day: number,
  startDate: SeasonDate,
  endDate: SeasonDate
): boolean {
  // Convert dates to comparable numbers (MMDD format)
  const checkDate = month * 100 + day;
  const start = startDate.month * 100 + startDate.day;
  const end = endDate.month * 100 + endDate.day;

  // If start <= end, it's a simple range within one year
  if (start <= end) {
    return checkDate >= start && checkDate <= end;
  }

  // If start > end, the range crosses year boundary (e.g., Dec 1 - Jan 31)
  // Date is in range if it's >= start OR <= end
  return checkDate >= start || checkDate <= end;
}

/**
 * Determines the active seasonal theme for a given date
 * @param date - The date to check (defaults to current date)
 * @returns The active seasonal theme
 */
export function getActiveTheme(date: Date = new Date()): SeasonalTheme {
  const month = date.getMonth() + 1; // getMonth() returns 0-11, we need 1-12
  const day = date.getDate();

  // Check each theme to see if the current date falls within its range
  for (const theme of allThemes) {
    // Skip base theme - it's the fallback
    if (theme.id === 'base') {
      continue;
    }

    if (isDateInRange(month, day, theme.startDate, theme.endDate)) {
      return theme;
    }
  }

  // No seasonal theme active, return base theme
  return baseTheme;
}
