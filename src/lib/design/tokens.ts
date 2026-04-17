/**
 * Lodgra Design Tokens
 * Single source of truth for brand identity.
 * CSS custom properties defined in globals.css — use these constants in
 * TypeScript code (animations, canvas, charts) where CSS vars are unavailable.
 */

// ─── Brand Scale — Ocean Blue ──────────────────────────────────────────────
export const BRAND = {
  50:  'oklch(0.97 0.01 222)',
  100: 'oklch(0.93 0.03 222)',
  200: 'oklch(0.86 0.06 222)',
  300: 'oklch(0.75 0.09 222)',
  400: 'oklch(0.63 0.12 222)',
  500: 'oklch(0.52 0.13 222)',  // Primary brand colour
  600: 'oklch(0.43 0.12 222)',  // Hover / darker
  700: 'oklch(0.36 0.10 222)',  // Dark text on light bg
  800: 'oklch(0.28 0.08 222)',
  900: 'oklch(0.21 0.06 222)',
  950: 'oklch(0.14 0.04 222)',

  // Hex fallbacks for environments that don't support oklch
  hex: {
    500: '#1567A8',
    600: '#105490',
    700: '#0D4070',
  },
} as const

// ─── Accent Scale — Coral Atlantic ─────────────────────────────────────────
export const ACCENT = {
  400: 'oklch(0.72 0.17 33)',
  500: 'oklch(0.62 0.20 32)',  // CTA primary ("Reservar agora")
  600: 'oklch(0.52 0.18 31)',  // CTA hover

  hex: {
    500: '#E8614A',
    600: '#CF5040',
  },
} as const

// ─── Neutral Warm Scale — Apple-inspired ───────────────────────────────────
export const NEUTRAL = {
  50:  'oklch(0.985 0.002 75)',  // Page background
  100: 'oklch(0.962 0.004 75)', // Card surfaces
  200: 'oklch(0.918 0.004 75)', // Borders
  300: 'oklch(0.850 0.004 75)', // Disabled
  500: 'oklch(0.552 0.008 75)', // Text secondary
  700: 'oklch(0.380 0.006 75)', // Text medium
  900: 'oklch(0.138 0.004 75)', // Text primary (warm near-black)
} as const

// ─── Semantic Tokens ────────────────────────────────────────────────────────
export const SEMANTIC = {
  success: 'oklch(0.527 0.154 145)',
  warning: 'oklch(0.666 0.179 58)',
  error:   'oklch(0.577 0.245 27.325)',
} as const

// ─── Typography ─────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  fontFamily: {
    sans:  'var(--font-geist-sans), system-ui, -apple-system, sans-serif',
    mono:  'var(--font-geist-mono), "Courier New", monospace',
  },
  fontSize: {
    xs:   '0.75rem',    // 12px — captions, meta
    sm:   '0.875rem',   // 14px — secondary text
    base: '1rem',       // 16px — body
    lg:   '1.125rem',   // 18px — large body
    xl:   '1.25rem',    // 20px — small headings
    '2xl': '1.5rem',    // 24px — headings
    '3xl': '1.875rem',  // 30px — section titles
    '4xl': '2.25rem',   // 36px — page titles
    '5xl': '3rem',      // 48px — hero displays
  },
  fontWeight: {
    regular:   '400',
    medium:    '500',
    semibold:  '600',
    bold:      '700',
    extrabold: '800',
  },
  lineHeight: {
    tight:   '1.25',
    snug:    '1.375',
    normal:  '1.5',
    relaxed: '1.625',
    loose:   '2',
  },
  letterSpacing: {
    tight:  '-0.025em',
    normal: '0em',
    wide:   '0.025em',
  },
} as const

// ─── Spacing ─────────────────────────────────────────────────────────────────
export const SPACING = {
  px:   '1px',
  0.5:  '0.125rem',  // 2px
  1:    '0.25rem',   // 4px
  2:    '0.5rem',    // 8px
  3:    '0.75rem',   // 12px
  4:    '1rem',      // 16px
  5:    '1.25rem',   // 20px
  6:    '1.5rem',    // 24px
  8:    '2rem',      // 32px
  10:   '2.5rem',    // 40px
  12:   '3rem',      // 48px
  16:   '4rem',      // 64px
  20:   '5rem',      // 80px — section padding (Apple-like)
  24:   '6rem',      // 96px
} as const

// ─── Border Radius ────────────────────────────────────────────────────────────
export const RADIUS = {
  none: '0',
  sm:   '0.375rem',  // 6px
  md:   '0.5rem',    // 8px
  lg:   '0.75rem',   // 12px — default card radius
  xl:   '1rem',      // 16px — gallery, modals
  '2xl': '1.25rem',  // 20px — large cards
  '3xl': '1.5rem',   // 24px — hero sections
  full: '9999px',    // pills, avatars
} as const

// ─── Shadows ──────────────────────────────────────────────────────────────────
export const SHADOW = {
  none:    'none',
  xs:      '0 1px 2px 0 rgb(0 0 0 / 0.04)',
  sm:      '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
  md:      '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
  card:    '0 2px 12px 0 rgb(0 0 0 / 0.07)',    // property cards
  booking: '0 8px 32px 0 rgb(0 0 0 / 0.10)',    // booking widget
  gallery: '0 20px 60px 0 rgb(0 0 0 / 0.15)',   // lightbox backdrop
} as const

// ─── Animation ────────────────────────────────────────────────────────────────
export const ANIMATION = {
  duration: {
    instant: '0ms',
    fast:    '150ms',
    normal:  '250ms',
    slow:    '400ms',
  },
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    in:      'cubic-bezier(0.4, 0, 1, 1)',
    out:     'cubic-bezier(0, 0, 0.2, 1)',
    spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const

// ─── Z-Index ──────────────────────────────────────────────────────────────────
export const Z = {
  base:     0,
  raised:   1,
  dropdown: 10,
  sticky:   20,
  overlay:  30,
  modal:    40,
  toast:    50,
} as const

// ─── Breakpoints ──────────────────────────────────────────────────────────────
export const BREAKPOINTS = {
  sm:  '640px',
  md:  '768px',
  lg:  '1024px',
  xl:  '1280px',
  '2xl': '1536px',
} as const

// ─── CSS Variable Helpers ─────────────────────────────────────────────────────
/** Returns the CSS variable reference for a Lodgra brand token */
export const hsVar = (token: string) => `var(--hs-${token})`

export const HS_VARS = {
  brand:    (shade: keyof typeof BRAND) => `var(--hs-brand-${shade})`,
  accent:   (shade: 400 | 500 | 600)   => `var(--hs-accent-${shade})`,
  neutral:  (shade: keyof typeof NEUTRAL) => `var(--hs-neutral-${shade})`,
  cta: {
    bg:     'var(--hs-cta-bg)',
    bgHover:'var(--hs-cta-bg-hover)',
    text:   'var(--hs-cta-text)',
  },
  surface:  'var(--hs-surface)',
  card:     'var(--hs-surface-card)',
  border:   'var(--hs-border-subtle)',
  text: {
    primary:   'var(--hs-text-primary)',
    secondary: 'var(--hs-text-secondary)',
  },
} as const
