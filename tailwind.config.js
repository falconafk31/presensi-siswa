/** Design System — Sistem Presensi & Administrasi Madrasah
 * Clean + Institutional + Modern + Calm + High Information Density
 * Primary: Emerald (Kemenag-inspired). Gold: tiny accent only.
 * Semantic: success=emerald, warning=amber, danger=rose, info=blue, neutral=slate
 */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ce9b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
          DEFAULT: '#047857',
          hover: '#065f46',
          accent: '#ecfdf5',
        },
        gold: {
          light: '#fef3c7',
          DEFAULT: '#d97706',
          bright: '#fbbf24',
        },
        base: '#f8fafc',
        surface: '#ffffff',
        ink: {
          DEFAULT: '#0f172a',
          soft: '#334155',
          muted: '#64748b',
          faint: '#94a3b8',
        },
        library: {
          50: '#eff6ff',
          100: '#dbeafe',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
        },
      },
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        display: ['1.875rem', { lineHeight: '2.25rem', fontWeight: '700', letterSpacing: '-0.01em' }],
        'page-title': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '700', letterSpacing: '-0.01em' }],
        'section-title': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'card-title': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '600' }],
        body: ['0.875rem', { lineHeight: '1.5rem', fontWeight: '400' }],
        secondary: ['0.8125rem', { lineHeight: '1.25rem', fontWeight: '400' }],
        caption: ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],
        tiny: ['0.6875rem', { lineHeight: '1rem', fontWeight: '500' }],
      },
      borderRadius: {
        sm: '0.5rem',
        md: '0.625rem',
        lg: '0.75rem',
        xl: '0.875rem',
        '2xl:': '1rem',
        '2xl': '1rem',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        sm: '0 1px 2px 0 rgb(15 23 42 / 0.06), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        card: '0 1px 2px 0 rgb(15 23 42 / 0.05)',
        modal: '0 20px 50px -12px rgb(15 23 42 / 0.25)',
        none: 'none',
      },
      minHeight: {
        touch: '2.75rem',
      },
      minWidth: {
        touch: '2.75rem',
      },
    },
  },
  plugins: [],
}
