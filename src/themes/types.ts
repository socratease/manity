// Theme color palette interface
export interface ThemeColors {
  earth: string;
  sage: string;
  coral: string;
  amber: string;
  cream: string;
  cloud: string;
  stone: string;
  charcoal: string;
}

// Date specification for season boundaries
export interface SeasonDate {
  month: number; // 1-12
  day: number;   // 1-31
}

// Effect configuration
export interface ThemeEffect {
  type: 'snow' | 'confetti' | 'hearts' | 'none';
  emojis?: string[];
  particleColor?: string;
  particleCount?: number;
}

// Complete seasonal theme definition
export interface SeasonalTheme {
  id: string;
  name: string;
  startDate: SeasonDate;
  endDate: SeasonDate;
  colors: ThemeColors;
  effect: ThemeEffect;
}

// Active theme state
export interface ActiveTheme {
  current: SeasonalTheme;
  previous?: SeasonalTheme;
  transitionProgress?: number;
}

// Theme configuration options
export interface ThemeConfig {
  enableEffects?: boolean;
  enableTransitions?: boolean;
  effectIntensity?: 'low' | 'medium' | 'high';
  respectReducedMotion?: boolean;
}

// Theme context value
export interface ThemeContextValue {
  activeTheme: SeasonalTheme;
  config: ThemeConfig;
  updateConfig: (config: Partial<ThemeConfig>) => void;
}
