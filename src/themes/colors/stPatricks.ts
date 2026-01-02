import type { SeasonalTheme } from '../types';

/**
 * St. Patrick's Day Theme
 * Vibrant greens celebrating Irish heritage
 * Active: March 14 - March 17
 */
export const stPatricksTheme: SeasonalTheme = {
  id: 'stpatricks',
  name: "St. Patrick's Day",
  startDate: { month: 3, day: 14 },
  endDate: { month: 3, day: 17 },
  colors: {
    earth: '#2E7D32',     // Forest green
    sage: '#4CAF50',      // Vibrant green
    coral: '#66BB6A',     // Light green (replacing coral with green variant)
    amber: '#FFD700',     // Gold (for lucky coins)
    cream: '#F1F8E9',     // Very light green
    cloud: '#E8F5E9',     // Pale green
    stone: '#558B2F',     // Olive green
    charcoal: '#1B5E20',  // Dark green
  },
  effect: {
    type: 'confetti',
    emojis: ['🍀', '🌈', '🎩', '☘️', '💚'],
    particleColor: '#4CAF50',
    particleCount: 30,
  },
};
