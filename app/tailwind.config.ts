import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        // shadcn/ui tokens (keep for dashboard)
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },

        // ── Legal Matters Design System tokens ────────────────────────────
        // Primary palette – Deep Navy
        primary: {
          DEFAULT: '#000a24',
          container: '#14213d',
          fixed: '#d9e2ff',
          'fixed-dim': '#b9c6ea',
          foreground: 'hsl(var(--primary-foreground))',
        },
        'on-primary': '#ffffff',
        'on-primary-container': '#7c89aa',
        'on-primary-fixed': '#0d1b36',
        'on-primary-fixed-variant': '#3a4664',
        'inverse-primary': '#b9c6ea',

        // Secondary palette – Bronze/Gold
        secondary: {
          DEFAULT: '#78582f',
          container: '#fed39f',
          fixed: '#ffddb7',
          'fixed-dim': '#e9bf8d',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        'on-secondary': '#ffffff',
        'on-secondary-container': '#795930',
        'on-secondary-fixed': '#2a1700',
        'on-secondary-fixed-variant': '#5e411a',

        // Tertiary palette
        tertiary: { DEFAULT: '#120a00', container: '#2d2000', fixed: '#ffdf9c', 'fixed-dim': '#e4c279' },
        'on-tertiary': '#ffffff',
        'on-tertiary-container': '#a38543',
        'on-tertiary-fixed': '#251a00',
        'on-tertiary-fixed-variant': '#5a4304',

        // Surface tokens
        surface: '#fdf9f0',
        'surface-dim': '#dddad1',
        'surface-bright': '#fdf9f0',
        'surface-container': '#f1eee5',
        'surface-container-low': '#f7f3ea',
        'surface-container-high': '#ece8df',
        'surface-container-highest': '#e6e2d9',
        'surface-container-lowest': '#ffffff',
        'surface-variant': '#e6e2d9',
        'surface-dark': '#0B1020',
        'surface-tint': '#525e7d',
        'on-surface': '#1c1c16',
        'on-surface-variant': '#45464d',
        'inverse-surface': '#31302b',
        'inverse-on-surface': '#f4f0e7',

        // Utility tokens
        outline: '#75777e',
        'outline-variant': '#c5c6ce',
        'border-warm': '#E5E0D6',
        card: '#FFFFFF',
        'text-primary': '#111827',
        'text-muted': '#6B7280',
        success: '#166534',
        warning: '#B45309',
        error: '#B91C1C',
        'error-container': '#ffdad6',
        'on-error': '#ffffff',
        'on-error-container': '#93000a',

        // Old gold tokens (keep for dashboard compat)
        gold: {
          50: '#fbf9f1', 100: '#f5f0dc', 200: '#ebdcb7',
          300: '#ddc186', 400: '#cfa257', 500: '#b8860b',
          600: '#9d6d24', 700: '#7e531e', 800: '#67431c', 900: '#55371b',
        },
      },

      fontSize: {
        'headline-xl':      ['48px', { lineHeight: '56px', letterSpacing: '-0.02em', fontWeight: '600' }],
        'headline-lg':      ['32px', { lineHeight: '40px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-lg-mob':  ['28px', { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '600' }],
        'headline-md':      ['24px', { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '500' }],
        'headline-sm':      ['20px', { lineHeight: '28px', letterSpacing: '0em',     fontWeight: '500' }],
        'body-lg':          ['18px', { lineHeight: '28px', letterSpacing: '0em',     fontWeight: '400' }],
        'body-md':          ['16px', { lineHeight: '24px', letterSpacing: '0em',     fontWeight: '400' }],
        'body-sm':          ['14px', { lineHeight: '20px', letterSpacing: '0em',     fontWeight: '400' }],
        'label-md':         ['13px', { lineHeight: '16px', letterSpacing: '0.05em',  fontWeight: '600' }],
        'label-sm':         ['11px', { lineHeight: '14px', letterSpacing: '0.02em',  fontWeight: '500' }],
      },

      maxWidth: { 'max-width': '1440px' },

      spacing: {
        'margin-desktop': '48px',
        'margin-mobile': '20px',
        gutter: '24px',
      },

      borderRadius: {
        DEFAULT: '0.25rem',
        sm: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        full: '9999px',
      },

      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },

      boxShadow: {
        airy:    '0px 4px 12px rgba(20,33,61,0.04)',
        'airy-lg': '0px 12px 32px rgba(20,33,61,0.08)',
      },

      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        meshMove: {
          '0%':   { backgroundPosition: '0% 50%' },
          '50%':  { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
        float3d: {
          '0%':   { transform: 'translate3d(0,0,0) rotateX(0deg) rotateY(0deg) rotateZ(0deg)' },
          '50%':  { transform: 'translate3d(50px,-50px,100px) rotateX(180deg) rotateY(45deg) rotateZ(20deg)' },
          '100%': { transform: 'translate3d(0,0,0) rotateX(360deg) rotateY(0deg) rotateZ(0deg)' },
        },
        particleUp: {
          '0%':   { transform: 'translateY(0)', opacity: '0' },
          '50%':  { opacity: '0.5' },
          '100%': { transform: 'translateY(-200px)', opacity: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'mesh-move':      'meshMove 20s ease infinite',
        'float-3d':       'float3d 25s infinite linear',
        'float-3d-rev':   'float3d 30s infinite linear reverse',
        'float-3d-fast':  'float3d 20s infinite linear',
        'particle-up':    'particleUp 8s infinite ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
