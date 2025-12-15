// Centralized theme configuration for Manity
// Supports multiple seasonal themes

const baseTheme = {
  earth: '#8B6F47',
  sage: '#7A9B76',
  coral: '#D67C5C',
  amber: '#E8A75D',
  cream: '#FAF8F3',
  cloud: '#E8E3D8',
  stone: '#6B6554',
  charcoal: '#3A3631',
};

const santaTheme = {
  earth: '#C41E3A',      // Classic Christmas red (replacing brown/burnt orange)
  sage: '#165B33',       // Deep Christmas green
  coral: '#FF6B6B',      // Bright festive red
  amber: '#FFD700',      // Gold (replacing amber/burnt orange)
  cream: '#FFFAF0',      // Warm ivory
  cloud: '#F0E6E6',      // Light pink-tinted cloud
  stone: '#8B4513',      // Warm brown
  charcoal: '#2C1810',   // Deep brown
};

const themes = {
  base: baseTheme,
  santa: santaTheme,
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
  return theme[colorName] || baseTheme[colorName];
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
