import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#F4EEDD',
          light: '#FAF6EB',
          dark: '#E4DABF',
        },
        ink: {
          DEFAULT: '#1E1B15',
          soft: '#544D3F',
        },
        forest: {
          DEFAULT: '#1E3D2E',
          dark: '#142A20',
        },
        gold: {
          DEFAULT: '#B08A3E',
          light: '#C9A659',
        },
        teal: {
          DEFAULT: '#1B6B72',
          dark: '#14555B',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'serif'],
        body: ['var(--font-body)', 'sans-serif'],
      },
      maxWidth: {
        content: '1180px',
      },
    },
  },
  plugins: [],
};

export default config;
