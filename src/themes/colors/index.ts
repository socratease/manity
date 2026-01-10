/**
 * Seasonal Theme Colors
 * Centralized exports for all theme definitions
 */

import type { SeasonalTheme } from '../types';
import { baseTheme } from './base';
import { christmasTheme } from './christmas';
import { easterTheme } from './easter';
import { halloweenTheme } from './halloween';
import { valentinesTheme } from './valentines';
import { stPatricksTheme } from './stPatricks';

export {
  baseTheme,
  christmasTheme,
  easterTheme,
  halloweenTheme,
  valentinesTheme,
  stPatricksTheme,
};

/**
 * All available seasonal themes
 * Ordered by calendar year for easy iteration
 */
export const allThemes: SeasonalTheme[] = [
  baseTheme,
  valentinesTheme,   // Feb 7-14
  stPatricksTheme,   // Mar 14-17
  easterTheme,       // Mar 20 - Apr 20
  halloweenTheme,    // Oct 24-31
  christmasTheme,    // Dec 1-31
];

/**
 * Map of theme IDs to theme objects for quick lookup
 */
export const themeMap: Record<string, SeasonalTheme> = {
  base: baseTheme,
  christmas: christmasTheme,
  easter: easterTheme,
  halloween: halloweenTheme,
  valentines: valentinesTheme,
  stpatricks: stPatricksTheme,
};
