import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: '#EDE3D6',
          light: '#F5EEE4',
          dark: '#DDCEBA',
        },
        ink: {
          DEFAULT: '#201C18',
          soft: '#4A423B',
        },
        brick: {
          DEFAULT: '#A8432F',
          dark: '#8A3527',
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
