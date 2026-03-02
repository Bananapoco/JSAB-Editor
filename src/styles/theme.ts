/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║                  JSAB EDITOR — COLOR THEME                      ║
 * ║  This is the single source of truth for all UI colors.          ║
 * ║  Change any value here and the entire editor updates.           ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
export const THEME = {
  // ─── Backgrounds (darkest → lightest) ─────────────────────────────
  base:          '#040406',   // Outermost bg (canvas area, page body)
  panel:         '#08080D',   // Sidebar / topbar panels
  surface:       '#0D0D16',   // Inputs, cards, raised elements
  surfaceHover:  '#141420',   // Hover state for surface elements
  surfaceActive: '#1C1C2C',   // Active / pressed surface

  // ─── Borders ──────────────────────────────────────────────────────
  border:        '#1A1A28',   // Subtle dividers
  borderBright:  '#252540',   // Visible borders, focused states

  // ─── Text ─────────────────────────────────────────────────────────
  text:          '#F0EFF8',   // Primary labels
  textMuted:     '#6E6D88',   // Secondary / dim labels
  textDim:       '#36354E',   // Disabled / ghost text

  // ─── PRIMARY ACCENT ── change this one line to repaint everything ─
  accent:        '#009499',
  accentAlt:     '#0FBBFF',   // Gradient partner (glow, scrubber)

  // ─── Semantic accents (role-based, rarely need changing) ──────────
  violet:        '#A855F7',   // Compose / custom shapes
  cyan:          '#22D3EE',   // Audio / snap
  green:         '#22C55E',   // Pulse modifier
  amber:         '#F59E0B',   // Boss-move events
  danger:        '#EF4444',   // Delete / destructive actions
} as const

export type ThemeColor = keyof typeof THEME

/**
 * Global corner radii for editor UI.
 * Tweak these to change roundness across panels, buttons, icon containers, etc.
 */
export const RADIUS = {
  none: '0px',
  sm: '1px',
  md: '2px',
  lg: '3px',
  xl: '1px',
  pill: '9999px',
} as const

export type ThemeRadius = keyof typeof RADIUS

/**
 * Append a 2-digit hex alpha to any 6-digit hex color.
 *
 * @param hex   A 6-char hex string, e.g. THEME.accent
 * @param pct   Opacity 0–1
 *
 * @example  alpha(THEME.accent, 0.1)  →  "#2F80FF1A"
 */
export function alpha(hex: string, pct: number): string {
  const a = Math.round(Math.min(1, Math.max(0, pct)) * 255)
    .toString(16)
    .padStart(2, '0')
    .toUpperCase()
  return `${hex}${a}`
}

/**
 * Build the CSS custom-property string injected into :root by _app.tsx.
 * Every key in THEME becomes  --color-<kebab-case-key>: <value>
 */
export function buildCSSVars(): string {
  const colorVars = Object.entries(THEME).map(([k, v]) => {
    const prop = '--color-' + k.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase())
    return `${prop}: ${v}`
  })

  const radiusVars = Object.entries(RADIUS).map(([k, v]) => {
    const prop = '--radius-' + k.replace(/([A-Z])/g, (m) => '-' + m.toLowerCase())
    return `${prop}: ${v}`
  })

  return [...colorVars, ...radiusVars].join('; ')
}
