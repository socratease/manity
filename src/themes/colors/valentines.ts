import type { SeasonalTheme } from '../types';

/**
 * Valentine's Day Theme
 * Romantic pinks and reds
 * Active: February 7 - February 14
 */
export const valentinesTheme: SeasonalTheme = {
  id: 'valentines',
  name: "Valentine's Day",
  startDate: { month: 2, day: 7 },
  endDate: { month: 2, day: 14 },
  colors: {
    earth: '#C71585',     // Medium violet red
    sage: '#98D8C8',      // Soft mint (complement to pink)
    coral: '#FF69B4',     // Hot pink
    amber: '#FFB6C1',     // Light pink
    cream: '#FFF0F5',     // Lavender blush
    cloud: '#FFE4E1',     // Misty rose
    stone: '#8B6B8B',     // Muted purple
    charcoal: '#4A2C3B',  // Deep burgundy
  },
  effect: {
    type: 'hearts',
    emojis: ['❤️', '💕', '💖', '💗', '💝'],
    particleColor: '#FF69B4',
    particleCount: 35,
  },
};
