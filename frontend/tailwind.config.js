/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0B0B0B',
          light: '#FFFFFF',
        },
        accent: '#00B3E6',
        success: '#00C48C',
        warning: '#FF9500',
        error: '#FF3B30',
        gray: {
          50: '#F8F9FA',
          100: '#F1F3F5',
          200: '#E9ECEF',
          300: '#DEE2E6',
          400: '#CED4DA',
          500: '#ADB5BD',
          600: '#6C757D',
          700: '#495057',
          800: '#343A40',
          900: '#212529',
        },
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        cream: {
          DEFAULT: '#ffffff',
          dark: '#f8fafc',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          dark: '#1A1A1A',
        },
        border: {
          DEFAULT: '#E9ECEF',
          dark: '#2C2C2C',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'heading-xl': ['32px', { lineHeight: '1.2', fontWeight: '700', letterSpacing: '-0.02em' }],
        'heading-l': ['24px', { lineHeight: '1.3', fontWeight: '600' }],
        'heading-m': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'heading-s': ['16px', { lineHeight: '1.4', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['12px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      spacing: {
        4: '4px',
        8: '8px',
        12: '12px',
        16: '16px',
        20: '20px',
        24: '24px',
        32: '32px',
        40: '40px',
        48: '48px',
        64: '64px',
        80: '80px',
        96: '96px',
        128: '128px',
      },
      borderRadius: {
        button: '12px',
        card: '16px',
        modal: '24px',
        input: '12px',
        badge: '100px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.04), 0 8px 16px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.08)',
        modal: '0 24px 48px rgba(0,0,0,0.16)',
      },
      maxWidth: {
        content: '1400px',
      },
      width: {
        sidebar: '260px',
      },
      height: {
        topbar: '64px',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite',
        'fade-in': 'fade-in 200ms ease-out',
        'scale-in': 'scale-in 200ms ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
