import type { SeasonalTheme } from '../types';

/**
 * Base/Default Theme
 * Natural earth tones providing a calm, professional aesthetic
 * This is the fallback theme when no seasonal theme is active
 */
export const baseTheme: SeasonalTheme = {
  id: 'base',
  name: 'Base Theme',
  // Base theme has no date range - it's the default
  startDate: { month: 1, day: 1 },
  endDate: { month: 12, day: 31 },
  colors: {
    earth: '#8B6F47',     // Warm brown
    sage: '#7A9B76',      // Muted green
    coral: '#D67C5C',     // Soft coral red
    amber: '#E8A75D',     // Golden amber
    cream: '#FAF8F3',     // Off-white cream
    cloud: '#E8E3D8',     // Light beige
    stone: '#6B6554',     // Medium gray-brown
    charcoal: '#3A3631',  // Dark gray-brown
  },
  effect: {
    type: 'none',
  },
};
