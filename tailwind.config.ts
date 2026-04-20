import type { Config } from 'tailwindcss'

const config: Config = {
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
  plugins: [],
}

export default config
