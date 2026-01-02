import type { SeasonalTheme } from '../types';

/**
 * Easter Theme
 * Soft pastel colors evoking spring renewal
 * Active: March 20 - April 20
 */
export const easterTheme: SeasonalTheme = {
  id: 'easter',
  name: 'Easter',
  startDate: { month: 3, day: 20 },
  endDate: { month: 4, day: 20 },
  colors: {
    earth: '#D4A5A5',     // Dusty rose
    sage: '#A8D5BA',      // Soft mint green
    coral: '#FFB6C1',     // Light pink
    amber: '#FFFACD',     // Lemon chiffon
    cream: '#FFF8E7',     // Cornsilk
    cloud: '#F0E6FA',     // Lavender mist
    stone: '#C4B5A0',     // Warm taupe
    charcoal: '#6B5D5A',  // Soft brown
  },
  effect: {
    type: 'confetti',
    emojis: ['🐰', '🥚', '🌷', '🌸', '🐣'],
    particleColor: '#FFB6C1',
    particleCount: 30,
  },
};
