/**
 * Lodgra Design Tokens
 * Single source of truth for brand identity.
 * CSS custom properties defined in globals.css — use these constants in
 * TypeScript code (animations, canvas, charts) where CSS vars are unavailable.
 *
 * Brand palette: Lodgra Premium institutional blue (#10203E), gold (#C9A227),
 * warm white (#FBFAF6), sand (#F7F5EF), and slate text.
 */

// ─── Brand Scale — Lodgra institutional blue ─────────────────────────────────
export const BRAND = {
  50:  '#F7F5EF',
  100: '#EFE7D4',
  200: '#D8CFB7',
  300: '#D8BF6A',
  400: '#C9A227',
  500: '#10203E',
  600: '#0c1830',
  700: '#9f2f1f',
  800: '#1B2430',
  900: '#111111',
  950: '#050505',

  // CSS var helpers
  css: {
    500: 'var(--lodgra-brand-500)',
    600: 'var(--lodgra-brand-600)',
    700: 'var(--lodgra-brand-700)',
    800: 'var(--lodgra-brand-800)',
    900: 'var(--lodgra-brand-900)',
  },
} as const

// ─── Accent Scale — Lodgra gold highlights ───────────────────────────────────
export const ACCENT = {
  300: '#D8BF6A',
  400: '#C9A227',
  500: '#C9A227',
  600: '#B08B1F',
  700: '#8F7018',

  // CSS var helpers
  css: {
    500: 'var(--lodgra-accent-500)',
    600: 'var(--lodgra-accent-600)',
  },
} as const

// ─── CTA — Primary action ────────────────────────────────────────────────────
export const CTA = {
  default: '#10203E',
  hover:   '#0c1830',

  css: {
    default: 'var(--lodgra-cta-bg, #10203E)',
  },
} as const

// ─── Neutral Scale — warm canvas, slate ink and hairlines ────────────────────
export const NEUTRAL = {
  50:  '#FBFAF6',
  100: '#F7F5EF',
  200: '#EFEADF',
  300: '#E5DFD2',
  500: '#4D5566',
  700: '#4D5566',
  900: '#1B2430',
} as const

// ─── Semantic Tokens ────────────────────────────────────────────────────────────
export const SEMANTIC = {
  success: '#008a05',
  warning: '#C9A227',
  error:   '#9f2f1f',
  info:    '#1B2430',
} as const

// ─── Typography ─────────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  fontFamily: {
    heading: 'var(--font-inter), "Airbnb Cereal VF", Circular, system-ui, sans-serif',
    body:    'var(--font-inter), "Airbnb Cereal VF", Circular, system-ui, sans-serif',
    sans:    'var(--font-inter), "Airbnb Cereal VF", Circular, system-ui, sans-serif',
    mono:    '"Courier New", monospace',
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
  20:   '5rem',      // 80px — section padding
  24:   '6rem',      // 96px
} as const

// ─── Border Radius ────────────────────────────────────────────────────────────
export const RADIUS = {
  none: '0',
  sm:   '0.5rem',    // 8px
  md:   '0.75rem',   // 12px — default card radius
  lg:   '1rem',      // 16px — gallery, modals
  xl:   '1.5rem',    // 24px — large cards
  '2xl': '2rem',     // 32px — hero sections
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
export const LODGRA_VARS = {
  brand:   (shade: keyof typeof BRAND extends string ? keyof typeof BRAND : never) =>
             `var(--lodgra-brand-${shade})`,
  accent:  (shade: 300 | 400 | 500 | 600 | 700) => `var(--lodgra-accent-${shade})`,
  neutral: (shade: keyof typeof NEUTRAL) => `var(--lodgra-neutral-${shade})`,
  cta: {
    bg:      'var(--lodgra-cta-bg)',
    bgHover: 'var(--lodgra-cta-bg-hover)',
    text:    'var(--lodgra-cta-text)',
  },
  surface:  'var(--lodgra-surface)',
  card:     'var(--lodgra-surface-card)',
  border:   'var(--lodgra-border-subtle)',
  text: {
    primary:   'var(--lodgra-text-primary)',
    secondary: 'var(--lodgra-text-secondary)',
  },
} as const

// Legacy alias — kept for backward compatibility
export const HS_VARS = LODGRA_VARS
export const hsVar = (token: string) => `var(--lodgra-${token})`
