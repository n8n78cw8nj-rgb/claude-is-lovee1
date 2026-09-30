import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0E1A',
        card: '#1A1F2E',
        field: '#2A3040',
        line: '#3A4050',
        gold: { DEFAULT: '#B8925A', light: '#D4B07A' },
        muted: '#9CA3AF',
        danger: '#E05252',
        success: '#4CAF50',
      },
      fontFamily: {
        serif: ['"PT Serif"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        deep: '0 20px 60px -15px rgba(0,0,0,0.7)',
        gold: '0 10px 40px -10px rgba(184,146,90,0.55)',
      },
    },
  },
  plugins: [],
} satisfies Config;
