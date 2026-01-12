import { useState, useEffect } from 'react';
import { getActiveTheme } from '../seasonManager';
import { baseTheme } from '../colors';
import type { SeasonalTheme } from '../types';

/**
 * React hook that returns the current seasonal theme
 * Automatically updates when crossing seasonal boundaries
 *
 * @param dateOverride - Optional date for testing different seasons
 * @returns The currently active seasonal theme
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const theme = useSeasonalTheme();
 *   return <div style={{ color: theme.colors.earth }}>...</div>;
 * }
 * ```
 *
 * @example
 * // Testing with a specific date
 * const christmasTheme = useSeasonalTheme(new Date('2025-12-25'));
 */
export function useSeasonalTheme(dateOverride?: Date, isEnabled: boolean = true): SeasonalTheme {
  // Track the current theme in state for potential future animations/transitions
  const [currentTheme, setCurrentTheme] = useState<SeasonalTheme>(() =>
    isEnabled ? getActiveTheme(dateOverride) : baseTheme,
  );

  // Update theme when the active theme changes (e.g., crossing a seasonal boundary)
  useEffect(() => {
    setCurrentTheme(isEnabled ? getActiveTheme(dateOverride) : baseTheme);
  }, [dateOverride, isEnabled]);

  // If dateOverride is provided, check daily for theme changes
  // This allows the theme to update automatically at midnight
  useEffect(() => {
    // Only set up the interval if we're using the current date (no override)
    if (dateOverride || !isEnabled) {
      return;
    }

    // Check every hour if we've crossed into a new seasonal boundary
    const checkInterval = setInterval(() => {
      const newTheme = getActiveTheme(dateOverride);
      if (newTheme.id !== currentTheme.id) {
        setCurrentTheme(newTheme);
      }
    }, 60 * 60 * 1000); // Check every hour

    return () => clearInterval(checkInterval);
  }, [dateOverride, currentTheme.id, isEnabled]);

  return currentTheme;
}
