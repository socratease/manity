import type { SeasonalTheme } from '../types';

/**
 * Christmas Theme
 * Classic holiday colors: red, green, and gold
 * Active: December 1 - December 31
 */
export const christmasTheme: SeasonalTheme = {
  id: 'christmas',
  name: 'Christmas',
  startDate: { month: 12, day: 1 },
  endDate: { month: 12, day: 31 },
  colors: {
    earth: '#C41E3A',     // Classic Christmas red
    sage: '#165B33',      // Deep Christmas green
    coral: '#FF6B6B',     // Bright festive red
    amber: '#FFD700',     // Rich gold
    cream: '#FFFAF0',     // Warm ivory
    cloud: '#F0E6E6',     // Light pink-tinted cloud
    stone: '#8B4513',     // Warm brown
    charcoal: '#2C1810',  // Deep brown
  },
  effect: {
    type: 'snow',
    emojis: ['❄️', '⛄', '🎄', '🎅', '🎁'],
    particleColor: '#FFFFFF',
    particleCount: 50,
  },
};
