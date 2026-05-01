/**
 * Lodgra Design Tokens
 * Single source of truth for brand identity.
 * CSS custom properties defined in globals.css — use these constants in
 * TypeScript code (animations, canvas, charts) where CSS vars are unavailable.
 *
 * Brand palette: Blue (#1E3A8A = brand-800), Gold (#D4AF37 = accent-500), Green (#059669)
 */

// ─── Brand Scale — Lodgra Blue (#1E3A8A = brand-800) ─────────────────────────
export const BRAND = {
  50:  '#EEF2FF',
  100: '#E0E7FF',
  200: '#C7D2FE',
  300: '#A5B4FC',
  400: '#818CF8',
  500: '#4F63DE',
  600: '#3A4FC5',
  700: '#2D3DA8',
  800: '#1E3A8A',  // Primary brand — Lodgra Blue (Azul Confiança)
  900: '#162C6B',
  950: '#0E1B47',

  // CSS var helpers
  css: {
    500: 'var(--lodgra-brand-500)',
    600: 'var(--lodgra-brand-600)',
    700: 'var(--lodgra-brand-700)',
    800: 'var(--lodgra-brand-800)',
    900: 'var(--lodgra-brand-900)',
  },
} as const

// ─── Accent Scale — Lodgra Gold (#D4AF37 = accent-500) ───────────────────────
export const ACCENT = {
  300: '#F0DC87',
  400: '#E5CB5A',
  500: '#D4AF37',  // CTA primary — Lodgra Gold (Ouro Próspero)
  600: '#B89229',  // CTA hover
  700: '#96751C',

  // CSS var helpers
  css: {
    500: 'var(--lodgra-accent-500)',
    600: 'var(--lodgra-accent-600)',
  },
} as const

// ─── CTA — Lodgra Green (#059669) ─────────────────────────────────────────────
export const CTA = {
  default: '#059669',  // Verde Crescimento — primary action buttons
  hover:   '#047857',

  css: {
    default: 'var(--lodgra-green, #059669)',
  },
} as const

// ─── Neutral Warm Scale — Apple-inspired off-whites ───────────────────────────
export const NEUTRAL = {
  50:  'oklch(0.985 0.002 75)',  // Page background
  100: 'oklch(0.962 0.004 75)', // Card surfaces
  200: 'oklch(0.918 0.004 75)', // Borders
  300: 'oklch(0.850 0.004 75)', // Disabled
  500: 'oklch(0.552 0.008 75)', // Text secondary
  700: 'oklch(0.380 0.006 75)', // Text medium
  900: 'oklch(0.138 0.004 75)', // Text primary (warm near-black)
} as const

// ─── Semantic Tokens ────────────────────────────────────────────────────────────
export const SEMANTIC = {
  success: '#059669',  // Lodgra Green
  warning: '#D4AF37',  // Lodgra Gold
  error:   '#DC2626',
  info:    '#1E3A8A',  // Lodgra Blue
} as const

// ─── Typography ─────────────────────────────────────────────────────────────────
export const TYPOGRAPHY = {
  fontFamily: {
    heading: 'var(--font-poppins), Poppins, system-ui, sans-serif',
    body:    'var(--font-inter), Inter, system-ui, sans-serif',
    sans:    'var(--font-inter), Inter, system-ui, sans-serif',
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
