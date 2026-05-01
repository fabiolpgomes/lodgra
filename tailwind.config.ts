// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: any = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
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
        'poppins': ['var(--font-poppins)', 'Poppins', 'sans-serif'],
        'inter': ['var(--font-inter)', 'Inter', 'sans-serif'],
        'lodgra-heading': ['var(--font-poppins)', 'Poppins', 'sans-serif'],
        'lodgra-body': ['var(--font-inter)', 'Inter', 'sans-serif'],
      },
      fontSize: {
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
      spacing: {
        'micro': '4px',
        'small': '8px',
        'medium': '16px',
        'large': '24px',
        'xl': '32px',
        '2xl': '64px',
      },
      borderRadius: {
        'none': '0',
        'sm': '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'md': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        'lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        'xl': '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
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
    'hover:bg-lodgra-blue', 'hover:bg-lodgra-gold',
    'border-lodgra-blue', 'border-lodgra-gold',
  ],
  plugins: [],
}

export default config
