import { lazy, useMemo, createElement } from 'react';
import { useSeasonalTheme } from './useSeasonalTheme';
import type { ThemeEffect } from '../types';

// Lazy load effect components for better performance
const SnowEffect = lazy(() => import('../effects/SnowEffect'));
const ConfettiEffect = lazy(() => import('../effects/ConfettiEffect'));
const HeartsEffect = lazy(() => import('../effects/HeartsEffect'));

/**
 * React hook that returns the appropriate effect component based on the current theme
 * Components are lazy-loaded for optimal performance
 * The returned component has all necessary props pre-configured from the theme
 *
 * @param dateOverride - Optional date for testing different seasonal effects
 * @returns A configured effect component or null if no effect should be shown
 *
 * @example
 * ```tsx
 * import { Suspense } from 'react';
 *
 * function App() {
 *   const EffectComponent = useSeasonalEffect();
 *
 *   return (
 *     <div>
 *       <Suspense fallback={null}>
 *         {EffectComponent && <EffectComponent />}
 *       </Suspense>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSeasonalEffect(dateOverride?: Date) {
  const theme = useSeasonalTheme(dateOverride);
  const effect = theme.effect;

  // Memoize the component selection and configuration to avoid recreating on every render
  const EffectComponent = useMemo(() => {
    switch (effect.type) {
      case 'snow':
        return SnowEffect;
      case 'confetti':
        // ConfettiEffect requires emojis prop, so we create a configured wrapper
        if (!effect.emojis) return null;
        // Return a component that renders ConfettiEffect with the emojis
        const ConfiguredConfetti = () =>
          createElement(ConfettiEffect, { emojis: effect.emojis || [] });
        // Set display name for debugging
        ConfiguredConfetti.displayName = 'ConfiguredConfetti';
        return ConfiguredConfetti;
      case 'hearts':
        return HeartsEffect;
      case 'none':
      default:
        return null;
    }
  }, [effect.type, effect.emojis]);

  return EffectComponent;
}

/**
 * Hook variant that returns the effect configuration along with the component
 * Useful when you need both the component and its configuration
 *
 * @param dateOverride - Optional date for testing
 * @returns Object containing the effect component and configuration
 *
 * @example
 * ```tsx
 * function App() {
 *   const { EffectComponent, config } = useSeasonalEffectWithConfig();
 *
 *   return (
 *     <Suspense fallback={null}>
 *       {EffectComponent && (
 *         <EffectComponent
 *           emojis={config.emojis}
 *           particleCount={config.particleCount}
 *         />
 *       )}
 *     </Suspense>
 *   );
 * }
 * ```
 */
export function useSeasonalEffectWithConfig(dateOverride?: Date): {
  EffectComponent: React.LazyExoticComponent<() => JSX.Element> | null;
  config: ThemeEffect;
} {
  const theme = useSeasonalTheme(dateOverride);
  const EffectComponent = useSeasonalEffect(dateOverride);

  return {
    EffectComponent,
    config: theme.effect,
  };
}
