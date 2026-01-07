/**
 * ChristmasConfetti (Legacy)
 *
 * This component has been moved to src/themes/effects/ConfettiEffect.tsx
 * The new component is generic and accepts emojis as a prop.
 * This file provides backward compatibility with the Christmas-specific version.
 *
 * @deprecated Use import { ConfettiEffect } from '../themes/effects' instead
 */

import React from 'react';
import { ConfettiEffect } from '../themes/effects';

const CHRISTMAS_EMOJIS = ['🎄', '🎅', '🎁', '⛄', '🦌', '🔔', '⭐', '🍬', '🕯️', '❄️'];

const ChristmasConfetti = () => {
  return <ConfettiEffect emojis={CHRISTMAS_EMOJIS} />;
};

export default ChristmasConfetti;
