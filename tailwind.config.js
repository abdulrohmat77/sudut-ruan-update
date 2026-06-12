/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── ACOS Dark Navy Palette ──────────────────────────────
        brand: {
          DEFAULT: 'var(--brand-default, #04203a)',
          dark: 'var(--brand-dark, #022747)',
          mid: 'var(--brand-mid, #082a4b)',
          accent: 'var(--brand-accent, #4AB3D8)',
          soft: 'var(--brand-soft, #06223e)',
        },
        white: 'var(--color-white, #ffffff)',
        sky: { DEFAULT: '#4AB3D8', soft: 'rgba(74,179,216,0.15)' },
        tint: { DEFAULT: '#5FD4FF' },
        bright: { DEFAULT: '#9AF0FF' },
        green: { DEFAULT: '#25D366', soft: 'rgba(37,211,102,0.15)' },
        amber: { DEFAULT: '#FFB020', soft: 'rgba(255,176,32,0.15)' },
        red: { DEFAULT: '#FF4D4D', soft: 'rgba(255,77,77,0.15)' },
        navy700: { DEFAULT: '#093153' },

        // ── Semantic tokens ────────────────
        background: 'var(--bg-background, #04203a)',
        surface: 'var(--bg-surface, #082a4b)',
        'surface-bright': 'var(--bg-surface-bright, #0b3460)',
        'surface-dim': 'var(--bg-surface-dim, #06223e)',
        'surface-variant': 'var(--bg-surface-variant, #022747)',

        // ── Surface container scale (MD3-style elevation) ──
        'surface-container-lowest': 'var(--bg-surface-container-lowest, #06223e)',
        'surface-container-low': 'var(--bg-surface-container-low, #082a4b)',
        'surface-container': 'var(--bg-surface-container, #0b3460)',
        'surface-container-high': 'var(--bg-surface-container-high, #0e3d6e)',

        'on-background': 'var(--text-on-background, #EAF4FB)',
        'on-surface': 'var(--text-on-surface, #EAF4FB)',
        'on-surface-variant': 'var(--text-on-surface-variant, #9DBAD2)',
        'dim-text': 'var(--text-dim, #5F7C97)',

        outline: 'var(--border-outline, rgba(255,255,255,0.09))',
        'outline-variant': 'var(--border-outline-variant, rgba(255,255,255,0.16))',

        primary: 'var(--color-primary, #4AB3D8)',
        'on-primary': 'var(--text-on-primary, #04203a)',
        'primary-container': 'var(--bg-primary-container, rgba(74,179,216,0.15))',
        'on-primary-container': 'var(--text-on-primary-container, #5FD4FF)',

        // ── Secondary (emphasis / result highlight) ──
        secondary: 'var(--color-secondary, #5FD4FF)',
        'on-secondary': 'var(--text-on-secondary, #04203a)',
        'secondary-container': 'var(--bg-secondary-container, #045D93)',
        'on-secondary-container': 'var(--text-on-secondary-container, #EAF4FB)',

        // ── Tertiary fixed (chips / badges) ──
        'tertiary-fixed': 'var(--bg-tertiary-fixed, rgba(74,179,216,0.15))',
        'on-tertiary-fixed': 'var(--text-on-tertiary-fixed, #5FD4FF)',

        error: 'var(--color-error, #FF4D4D)',
        'on-error': 'var(--text-on-error, #FFFFFF)',
        'error-container': 'var(--bg-error-container, rgba(255,77,77,0.15))',
        'on-error-container': 'var(--text-on-error-container, #FF4D4D)',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '0.625rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
        full: '9999px',
      },
      spacing: {
        base: '4px',
        xs: '8px',
        sm: '16px',
        md: '24px',
        lg: '32px',
        xl: '48px',
        gutter: '24px',
        'container-max': '1440px',
      },
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        'serif-display': ['"DM Serif Display"', 'Georgia', 'serif'],
        'headline-sm': ['DM Sans', 'system-ui', 'sans-serif'],
        'mono-label': ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'display-lg': ['30px', { lineHeight: '1.15', fontWeight: '700' }],
        'headline-sm': ['18px', { lineHeight: '1.3' }],
        'body-md': ['14px', { lineHeight: '1.5' }],
        'label-caps': ['11px', { lineHeight: '1.4', letterSpacing: '0.06em' }],
        'mono-label': ['13px', { lineHeight: '1.4' }],
      },
      boxShadow: {
        soft: '0 1px 3px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1)',
        'soft-md': '0 2px 8px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.2)',
      },
      keyframes: {
        'scale-up': {
          from: { opacity: '0', transform: 'scale(0.95)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        pulse: {
          '0%,100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.85)' },
        },
      },
      animation: {
        'scale-up': 'scale-up 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
      },
    },
  },
  plugins: [],
}
