/**
 * SilkCircuit design tokens: electric meets elegant.
 *
 * The default theme every prezzer deck starts from. Decks override rather
 * than fork: the two ancestor decks (agentos-prez, context-engineering-demo)
 * drifted 15 lines apart by copy-pasting this file, which is exactly the
 * failure `createTheme` exists to prevent.
 */

export interface ThemeColors {
  electricPurple: string
  neonCyan: string
  coral: string
  electricYellow: string
  successGreen: string
  errorRed: string
  deepBlack: string
  terminalBlack: string
  gridLine: string
  scanLine: string
  background: string
  surface: string
  surfaceElevated: string
  textPrimary: string
  textMuted: string
}

export interface ThemeGlow {
  cyan: string
  purple: string
  coral: string
  green: string
  yellow: string
}

export interface ThemeFonts {
  display: string
  body: string
  mono: string
}

export interface ThemeLayers {
  background: number
  grid: number
  scanlines: number
  content: number
  particles: number
  navigation: number
  overlay: number
}

export interface Theme {
  colors: ThemeColors
  glow: ThemeGlow
  fonts: ThemeFonts
  layers: ThemeLayers
}

export const silkCircuit: Theme = {
  colors: {
    electricPurple: '#e135ff',
    neonCyan: '#80ffea',
    coral: '#ff6ac1',
    electricYellow: '#f1fa8c',
    successGreen: '#50fa7b',
    errorRed: '#ff6363',

    deepBlack: '#0a0a12',
    terminalBlack: '#0d0d17',
    gridLine: '#1a1a2e',
    scanLine: 'rgba(128, 255, 234, 0.03)',

    background: '#0a0a12',
    surface: '#10101c',
    surfaceElevated: '#151524',
    textPrimary: '#f0f0f5',
    // Bright enough to survive a washed-out projector from the back row.
    textMuted: '#9fa2bd',
  },

  glow: {
    cyan: '0 0 20px rgba(128, 255, 234, 0.4), 0 0 40px rgba(128, 255, 234, 0.2)',
    purple: '0 0 20px rgba(225, 53, 255, 0.4), 0 0 40px rgba(225, 53, 255, 0.2)',
    coral: '0 0 15px rgba(255, 106, 193, 0.3)',
    green: '0 0 20px rgba(80, 250, 123, 0.4), 0 0 40px rgba(80, 250, 123, 0.2)',
    yellow: '0 0 15px rgba(241, 250, 140, 0.3)',
  },

  fonts: {
    display: '"Clash Display", sans-serif',
    body: '"Satoshi", sans-serif',
    mono: '"Geist Mono", "Berkeley Mono", monospace',
  },

  layers: {
    background: 0,
    grid: 1,
    scanlines: 2,
    content: 10,
    particles: 20,
    navigation: 30,
    overlay: 40,
  },
}

/**
 * Blend any CSS color toward transparent, e.g. `withAlpha(color, 0.4)`.
 * Works for every color form a theme can carry — hex, rgb(), oklch(),
 * named colors — where naive hex-suffix alpha only survives 6-digit hex.
 */
export function withAlpha(color: string, alpha: number): string {
  return `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`
}

export type ThemeOverrides = {
  [Section in keyof Theme]?: Partial<Theme[Section]>
}

export function createTheme(overrides: ThemeOverrides = {}): Theme {
  return {
    colors: { ...silkCircuit.colors, ...overrides.colors },
    glow: { ...silkCircuit.glow, ...overrides.glow },
    fonts: { ...silkCircuit.fonts, ...overrides.fonts },
    layers: { ...silkCircuit.layers, ...overrides.layers },
  }
}

/**
 * Flattens a theme into CSS custom properties, e.g.
 * `--prezzer-color-electric-purple: #e135ff`. Feed the result to a style
 * attribute or a `:root` rule so CSS and JS share one source of truth.
 */
export function themeToCssVars(theme: Theme, prefix = '--prezzer'): Record<string, string> {
  const vars: Record<string, string> = {}
  const kebab = (key: string) => key.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

  for (const [name, value] of Object.entries(theme.colors)) {
    vars[`${prefix}-color-${kebab(name)}`] = value
  }
  for (const [name, value] of Object.entries(theme.glow)) {
    vars[`${prefix}-glow-${kebab(name)}`] = value
  }
  for (const [name, value] of Object.entries(theme.fonts)) {
    vars[`${prefix}-font-${kebab(name)}`] = value
  }
  for (const [name, value] of Object.entries(theme.layers)) {
    vars[`${prefix}-layer-${kebab(name)}`] = String(value)
  }
  return vars
}
