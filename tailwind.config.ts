// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ========== LODGRA PREMIUM DESIGN SYSTEM ==========
        // Legacy be-* aliases resolve to Lodgra Premium tokens so existing pages inherit the redesign.
        'be-blue': '#10203E',
        'be-blue-hover': '#0c1830',
        'be-blue-active': '#081226',

        // Text & Near-Black
        'be-text': '#1B2430',
        'be-text-muted': '#4D5566',
        'be-text-disabled': '#7C8492',

        // Surfaces & Backgrounds
        'be-white': '#FBFAF6',
        'be-surface': '#F7F5EF',
        'be-surface-secondary': '#EEE7D8',
        'be-surface-tertiary': '#EFEADF',

        // Borders
        'be-border': '#E5DFD2',
        'be-border-hover': '#CFC4AA',
        'be-border-accent': '#10203E',

        // States
        'be-success': '#008a05',
        'be-error': '#9f2f1f',
        'be-warning': '#C9A227',

        // Accents & Semantic
        'be-blue-light': '#D8CFB7',
        'be-blue-pale': '#F7F5EF',
        'be-blue-sky': '#D8BF6A',
        'be-slate': '#4D5566',
        'be-purple': '#C9A227',

        // Grey scale
        'be-grey': {
          50:  '#F7F5EF',
          100: '#EEE7D8',
          200: '#EFEADF',
          300: '#E5DFD2',
          400: '#c1c1c1',
          500: '#7C8492',
          600: '#4D5566',
          700: '#4D5566',
          800: '#1B2430',
          900: '#111111',
        },

        // ========== DESIGN TOKENS (Phase 3) ==========
        // Token-based colors (CSS variables from tokens.css)
        'lodgra-primary': 'var(--lodgra-primary)',
        'lodgra-accent': 'var(--lodgra-accent)',
        'lodgra-bg-light': 'var(--lodgra-bg-light)',

        // ========== EXISTING BRAND COLORS ==========
        // LODGRA Brand Guidelines v1.0 - Official Palette
        'lodgra-blue': '#10203E',
        'lodgra-gold': '#C9A227',
        'lodgra-green': '#059669',   // Verde Crescimento
        'lodgra-gray': '#F3F4F6',    // Cinza Neutro
        'lodgra-dark': '#374151',    // Cinza Escuro

        // Semantic Colors (aligned with brand)
        'success': '#059669',
        'warning': '#C9A227',
        'error': '#DC2626',
        'info': '#1B2430',

        // Reference dashboard aliases from lodgra-dashboard.zip
        'brand-blue': '#10203E',
        'brand-blue-trans': 'rgba(16, 32, 62, 0.62)',
        'brand-blue-overlay': 'rgba(12, 24, 48, 0.9)',
        'brand-gold': '#C9A227',
        'brand-bg': '#F7F5EF',
        'brand-white': '#FBFAF6',
        'brand-text-dark': '#1B2430',
        'brand-text-medium': '#4D5566',
        neutral: {
          850: '#1a1a1a',
        },

        // Brand scale — Lodgra institutional blue
        'brand': {
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
        },
        // Accent scale — Lodgra gold and premium highlights
        'accent': {
          300: '#D8BF6A',
          400: '#C9A227',
          500: '#C9A227',
          600: '#B08B1F',
          700: '#8F7018',
        },

        // Legacy hs-* aliases (public property components)
        'hs-brand': { 400: '#D8BF6A', 500: '#10203E', 600: '#0c1830' },
        'hs-neutral': { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB', 400: '#9CA3AF', 500: '#6B7280', 600: '#4B5563', 700: '#374151', 800: '#1F2937', 900: '#111827' },
      },
      fontFamily: {
        // ========== BEHANCE DESIGN SYSTEM ==========
        'adobe-clean': ['adobe-clean', 'helvetica', 'arial', 'sans-serif'],
        'acumin-pro': ['acumin-pro', 'adobe-clean', 'sans-serif'],
        'acumin-wide': ['acumin-pro-wide', 'acumin-pro', 'adobe-clean', 'sans-serif'],

        // Design tokens
        'heading': 'var(--font-heading)',
        'body': 'var(--font-body)',
        // Existing fonts
        'poppins': ['var(--font-poppins)', 'Poppins', 'sans-serif'],
        'inter': ['var(--font-inter)', 'Inter', 'sans-serif'],
        'lodgra-heading': ['var(--font-poppins)', 'Poppins', 'sans-serif'],
        'lodgra-body': ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      fontSize: {
        // Design tokens (10px, 11px, 13px custom sizes)
        'design-xs': ['10px', { lineHeight: '1' }],
        'design-sm': ['11px', { lineHeight: '1' }],
        'design-base': ['13px', { lineHeight: '1.5' }],
        'design-md': ['12px', { lineHeight: '1.5' }],
        'design-lg': ['14px', { lineHeight: '1.5' }],
        // Existing sizes
        'xs': ['12px', { lineHeight: '1.4', letterSpacing: '0.5px' }],
        'sm': ['14px', { lineHeight: '1.5', letterSpacing: '0px' }],
        'base': ['16px', { lineHeight: '1.6', letterSpacing: '0px' }],
        'lg': ['18px', { lineHeight: '1.6', letterSpacing: '0px' }],
        'xl': ['20px', { lineHeight: '1.6', letterSpacing: '0px' }],
        '2xl': ['24px', { lineHeight: '1.5', letterSpacing: '0px' }],
        '3xl': ['28px', { lineHeight: '1.4', letterSpacing: '0px' }],
        '4xl': ['36px', { lineHeight: '1.3', letterSpacing: '-0.5px' }],
        '5xl': ['48px', { lineHeight: '1.2', letterSpacing: '-1px' }],
        '6xl': ['60px', { lineHeight: '1.1', letterSpacing: '-1.5px' }],
      },
      letterSpacing: {
        // Design tokens
        'wide': '0.5px',
        'wider': '1px',
        'widest': '1.5px',
        'ultra-wide': '2px',
      },
      // spacing uses Tailwind numeric scale (1 unit = 4px): p-1=4px, p-2=8px, p-4=16px, p-6=24px, p-8=32px
      borderRadius: {
        // Semantic scale: none(0) → xs(4) → sm(8) → md(12) → lg(16) → xl(24) → 2xl(32) → full
        'none': '0',
        'xs':   '4px',   // shadcn close buttons
        'sm':   '8px',   // badges, chips
        'md':   '12px',  // inputs, buttons
        'lg':   '16px',  // cards, containers (dominant)
        'xl':   '24px',  // widgets, property cards
        '2xl':  '32px',  // modals, auth forms (was 16px = bug; now distinct)
        'full': '9999px',
      },
      boxShadow: {
        '2xs': '0 1px 2px rgb(16 32 62 / 0.04)',
        'xs': '0 1px 3px rgb(16 32 62 / 0.06)',
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      zIndex: {
        // Design tokens
        'dropdown': '30',
        'sidebar': '40',
        'modal': '50',
      },
      animation: {
        'spin': 'spin 1s linear infinite',
        'bounce': 'bounce 1s infinite',
        'fade-in': 'fade-in 0.3s ease-in',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  safelist: [
    'bg-lodgra-blue', 'bg-lodgra-gold', 'bg-lodgra-green', 'bg-lodgra-gray', 'bg-lodgra-dark',
    'text-lodgra-blue', 'text-lodgra-gold', 'text-lodgra-dark',
    'text-white', 'shadow-none', 'shadow-sm',  // Button component primary variant
    'bg-brand-600', 'border-brand-600', 'hover:border-brand-400', 'hover:bg-brand-50',  // AmenitiesSelector selected state
    'h-14', 'py-3', 'pl-14',  // Input fields in login form
    'hover:bg-lodgra-blue', 'hover:bg-lodgra-gold',
    'border-lodgra-blue', 'border-lodgra-gold',
    'hover:bg-[#ffc000]/10',  // Mobile menu hover states
    'border-[#ffc000]', 'text-[#ffc000]', 'bg-transparent',  // Mobile menu active states
  ],
  plugins: [],
}

export default config
