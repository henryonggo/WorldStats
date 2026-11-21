export type AppearanceMode = 'light' | 'dark' | 'system';
export type ResolvedAppearance = 'light' | 'dark';

export type DesignThemeId =
  | 'liquid-glass'
  | 'swiss-editorial'
  | 'quant-terminal'
  | 'nordic-studio';

export interface DesignThemeDefinition {
  id: DesignThemeId;
  name: string;
  styleTag: string;
  description: string;
  swatchLight: string;
  swatchDark: string;
}

export const DEFAULT_APPEARANCE_MODE: AppearanceMode = 'dark';
export const DEFAULT_DESIGN_THEME: DesignThemeId = 'liquid-glass';

export const APPEARANCE_STORAGE_KEY = 'worldstats.appearanceMode';
export const DESIGN_THEME_STORAGE_KEY = 'worldstats.designTheme';

export const DESIGN_THEMES: DesignThemeDefinition[] = [
  {
    id: 'liquid-glass',
    name: 'Liquid Glass',
    styleTag: 'Frosted',
    description: 'Translucent frosted panels with ambient refraction and specular edges',
    swatchLight: 'linear-gradient(135deg, #e0f2fe 0%, #38bdf8 55%, #0284c7 100%)',
    swatchDark: 'linear-gradient(135deg, #38bdf8 0%, #1d4ed8 55%, #0b1324 100%)',
  },
  {
    id: 'swiss-editorial',
    name: 'Swiss Print',
    styleTag: 'Editorial',
    description: 'Crisp matte paper & ink surfaces with architectural hairline rules',
    swatchLight: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #1d4ed8 100%)',
    swatchDark: 'linear-gradient(135deg, #1e293b 0%, #0f172a 55%, #60a5fa 100%)',
  },
  {
    id: 'quant-terminal',
    name: 'Quant Grid',
    styleTag: 'Precision',
    description: 'Sharp rectangular geometry, hairline blueprint grid, and high-contrast signals',
    swatchLight: 'linear-gradient(135deg, #ecfdf5 0%, #6ee7b7 50%, #047857 100%)',
    swatchDark: 'linear-gradient(135deg, #34d399 0%, #065f46 55%, #050a0d 100%)',
  },
  {
    id: 'nordic-studio',
    name: 'Nordic Paper',
    styleTag: 'Tactile',
    description: 'Warm stone surfaces, soft elevated shadows, and generous rounded corners',
    swatchLight: 'linear-gradient(135deg, #fef3c7 0%, #f59e0b 55%, #b45309 100%)',
    swatchDark: 'linear-gradient(135deg, #fbbf24 0%, #92400e 55%, #1c1917 100%)',
  },
];

export function resolveAppearanceMode(candidate: string | null | undefined): AppearanceMode {
  if (candidate === 'light' || candidate === 'dark' || candidate === 'system') {
    return candidate;
  }
  return DEFAULT_APPEARANCE_MODE;
}

export function resolveEffectiveAppearance(
  mode: AppearanceMode,
  systemPrefersDark: boolean
): ResolvedAppearance {
  if (mode === 'system') {
    return systemPrefersDark ? 'dark' : 'light';
  }
  return mode;
}

export function resolveDesignTheme(candidate: string | null | undefined): DesignThemeDefinition {
  // Backwards-compatible mapping from previous glass theme IDs
  if (
    candidate === 'liquid-obsidian' ||
    candidate === 'sequoia-aurora' ||
    candidate === 'linear-indigo' ||
    candidate === 'smoked-amber'
  ) {
    return DESIGN_THEMES[0];
  }
  const found = DESIGN_THEMES.find((t) => t.id === candidate);
  return found ?? DESIGN_THEMES[0];
}
