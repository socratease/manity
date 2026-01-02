/**
 * Theme Configuration (Legacy)
 *
 * This module has been moved to src/themes/
 * This file provides backward compatibility by delegating to the new theme system.
 *
 * @deprecated Use import { getActiveTheme, useSeasonalTheme } from '../themes' instead
 */

import { baseTheme, christmasTheme } from '../themes/colors';

// Map old theme names to new themes
const themes = {
  base: baseTheme.colors,
  santa: christmasTheme.colors,
};

/**
 * Get the current theme based on seasonal mode
 * @param {string} mode - 'base' or 'santa'
 * @returns {object} Theme color object
 */
export const getTheme = (mode = 'base') => {
  return themes[mode] || themes.base;
};

/**
 * Get a specific color from the theme
 * @param {string} colorName - Name of the color (e.g., 'earth', 'sage')
 * @param {string} mode - 'base' or 'santa'
 * @returns {string} Hex color code
 */
export const getColor = (colorName, mode = 'base') => {
  const theme = getTheme(mode);
  return theme[colorName] || baseTheme.colors[colorName];
};

/**
 * Get priority color based on priority level
 * @param {string} priority - 'high', 'medium', or 'low'
 * @param {string} mode - 'base' or 'santa'
 * @returns {string} Hex color code
 */
export const getPriorityColor = (priority, mode = 'base') => {
  const theme = getTheme(mode);
  const map = {
    high: theme.coral,
    medium: theme.amber,
    low: theme.sage
  };
  return map[priority] || theme.stone;
};

/**
 * Get status color based on project status
 * @param {string} status - Project status
 * @param {string} mode - 'base' or 'santa'
 * @returns {string} Hex color code
 */
export const getStatusColor = (status, mode = 'base') => {
  const theme = getTheme(mode);
  const map = {
    active: theme.sage,
    planning: theme.amber,
    'on-hold': theme.stone,
    completed: theme.earth
  };
  return map[status] || theme.stone;
};

export default {
  getTheme,
  getColor,
  getPriorityColor,
  getStatusColor,
  themes,
};
