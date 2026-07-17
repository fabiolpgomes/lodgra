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
        // ========== BEHANCE DESIGN SYSTEM (YOLO Integration) ==========
        // Primary brand colors
        'be-blue': '#0057ff',           // Behance Blue — primary CTA
        'be-blue-hover': '#003ecb',     // Behance Blue Hover (blue-700)
        'be-blue-active': '#002f9a',    // Behance Blue Active (blue-800)

        // Text & Near-Black
        'be-text': '#191919',           // Near-black body text (grey-900)
        'be-text-muted': '#707070',     // Grey-600
        'be-text-disabled': '#909090',  // Grey-500 (neutral)

        // Surfaces & Backgrounds
        'be-white': '#ffffff',          // Default surface
        'be-surface': '#f9f9f9',        // Off-white (grey-50, tiles)
        'be-surface-secondary': '#f0f0f0', // Grey-100
        'be-surface-tertiary': '#ececec',  // Grey-200

        // Borders
        'be-border': '#e8e8e8',         // Grey-300 (default border)
        'be-border-hover': '#cdcdcd',   // Grey-400
        'be-border-accent': '#0057ff',  // Behance Blue (focus rings)

        // States
        'be-success': '#028901',        // Green-400
        'be-error': '#d00d00',          // Red-500
        'be-warning': '#f97c00',        // Orange-500

        // Accents & Semantic
        'be-blue-light': '#f5f8ff',     // Blue-100
        'be-blue-pale': '#e0eaff',      // Blue-200
        'be-blue-sky': '#bfd2ff',       // Blue-300
        'be-slate': '#0a7494',          // Slate-500
        'be-purple': '#b125c0',         // Purple-500

        // Grey scale
        'be-grey': {
          50:  '#f9f9f9',
          100: '#f0f0f0',
          200: '#ececec',
          300: '#e8e8e8',
          400: '#cdcdcd',
          500: '#909090',
          600: '#707070',
          700: '#474747',
          800: '#303030',
          900: '#191919',
        },

        // ========== DESIGN TOKENS (Phase 3) ==========
        // Token-based colors (CSS variables from tokens.css)
        'lodgra-primary': 'var(--lodgra-primary)',      // #1E3A8A
        'lodgra-accent': 'var(--lodgra-accent)',        // #ffc000
        'lodgra-bg-light': 'var(--lodgra-bg-light)',    // #f8f8f8

        // ========== EXISTING BRAND COLORS ==========
        // LODGRA Brand Guidelines v1.0 - Official Palette
        'lodgra-blue': '#1E3A8A',    // Azul Confiança
        'lodgra-gold': '#D4AF37',    // Ouro Próspero
        'lodgra-green': '#059669',   // Verde Crescimento
        'lodgra-gray': '#F3F4F6',    // Cinza Neutro
        'lodgra-dark': '#374151',    // Cinza Escuro

        // Semantic Colors (aligned with brand)
        'success': '#059669',
        'warning': '#D4AF37',
        'error': '#DC2626',
        'info': '#1E3A8A',

        // Brand scale — Lodgra Blue (#1E3A8A = brand-800)
        'brand': {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#4F63DE',
          600: '#3A4FC5',
          700: '#2D3DA8',
          800: '#1E3A8A',  // Lodgra Blue — primary brand
          900: '#162C6B',
          950: '#0E1B47',
        },
        // Accent scale — Lodgra Gold (#D4AF37 = accent-500)
        'accent': {
          300: '#F0DC87',
          400: '#E5CB5A',
          500: '#D4AF37',  // Lodgra Gold — highlights, CTAs
          600: '#B89229',
          700: '#96751C',
        },

        // Legacy hs-* aliases (public property components)
        'hs-brand': { 400: '#3B82F6', 500: '#1E3A8A', 600: '#1e40af' },
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
