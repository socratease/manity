import React from 'react';
import SnowEffect from './SnowEffect';
import ChristmasConfetti from './ChristmasConfetti';

/**
 * SeasonalEffects
 *
 * Renders seasonal effects based on configuration or date.
 * Currently supports:
 * - Christmas/Winter mode via isEnabled prop (maps to isSantafied in main app)
 */
export default function SeasonalEffects({ isEnabled = false }) {
  if (!isEnabled) return null;

  return (
    <>
      <SnowEffect />
      <ChristmasConfetti />
    </>
  );
}
