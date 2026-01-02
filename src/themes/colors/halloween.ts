import type { SeasonalTheme } from '../types';

/**
 * Halloween Theme
 * Spooky colors: orange, purple, and black
 * Active: October 24 - October 31
 */
export const halloweenTheme: SeasonalTheme = {
  id: 'halloween',
  name: 'Halloween',
  startDate: { month: 10, day: 24 },
  endDate: { month: 10, day: 31 },
  colors: {
    earth: '#8B4000',     // Dark orange
    sage: '#663399',      // Deep purple (Rebecca Purple)
    coral: '#FF6347',     // Bright orange-red
    amber: '#FFA500',     // Vibrant orange
    cream: '#FFF5E6',     // Pale cream
    cloud: '#E6D7FF',     // Light lavender
    stone: '#4A4A4A',     // Dark gray
    charcoal: '#1A1A1A',  // Near black
  },
  effect: {
    type: 'confetti',
    emojis: ['🎃', '👻', '🦇', '🕷️', '🕸️'],
    particleColor: '#FFA500',
    particleCount: 40,
  },
};
