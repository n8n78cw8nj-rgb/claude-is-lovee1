import type { Config } from 'tailwindcss';

/**
 * DESIGN TOKENS — кафе «Львиное сердце»
 * ─────────────────────────────────────
 * Источник истины для цвета, типографики, теней и радиусов.
 * Те же значения продублированы как CSS-переменные в src/app/globals.css,
 * чтобы их можно было использовать вне Tailwind (inline-стили, canvas, SVG).
 *
 * Правило распределения цвета (из ТЗ):
 *   60% — тёмная база (charcoal)
 *   20% — тёплые светлые поверхности (ivory)
 *   10% — бордо (burgundy)
 *    7% — золото (gold) — только точечно: CTA, иконки, рамки, hover
 *    3% — изумрудные/статусные акценты (emerald)
 */

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      // Дополнительные шаги прозрачности для модификаторов вида bg-gold/12.
      // Без них Tailwind молча не создаёт класс, и элемент теряет фон/рамку.
      opacity: {
        '8': '0.08',
        '12': '0.12',
        '18': '0.18',
        '92': '0.92',
        '97': '0.97',
      },

      colors: {
        charcoal: {
          DEFAULT: '#181513',
          50: '#F5F4F3',
          800: '#211D1A',
          900: '#1C1917',
          950: '#0F0D0C',
        },
        burgundy: {
          DEFAULT: '#58111A',
          light: '#7A1F2A',
          dark: '#3C0B11',
        },
        gold: {
          DEFAULT: '#D4AF37',
          muted: '#C5A059',
          bright: '#E7C765',
          dark: '#A8862A',
        },
        ivory: {
          DEFAULT: '#F9F6F0',
          dim: '#EFE9DF',
        },
        emerald: {
          DEFAULT: '#1E4D3B',
          light: '#2C6B53',
        },
        muted: '#B9B1A7',
      },

      fontFamily: {
        // Заголовки — высокий контраст, «редакционный» характер
        display: ['var(--font-display)', 'Cormorant Garamond', 'Georgia', 'serif'],
        // Интерфейс — нейтральный гротеск
        sans: ['var(--font-sans)', 'Manrope', 'system-ui', 'sans-serif'],
      },

      /**
       * Флюидная типографика: clamp(min, preferred, max).
       * Mobile-значения из ТЗ достигаются на 375px,
       * desktop-значения — на 1280–1440px.
       */
      fontSize: {
        'display-1': ['clamp(2.625rem, 1.5rem + 5.2vw, 5.5rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        'display-2': ['clamp(2.125rem, 1.4rem + 3.4vw, 4rem)', { lineHeight: '1.08', letterSpacing: '-0.015em' }],
        'display-3': ['clamp(1.4375rem, 1.05rem + 1.6vw, 2.25rem)', { lineHeight: '1.18', letterSpacing: '-0.01em' }],
        'body-lg': ['clamp(1rem, 0.93rem + 0.3vw, 1.1875rem)', { lineHeight: '1.65' }],
        'body': ['clamp(0.9375rem, 0.9rem + 0.2vw, 1.0625rem)', { lineHeight: '1.6' }],
        'caption': ['clamp(0.8125rem, 0.78rem + 0.16vw, 0.9375rem)', { lineHeight: '1.45' }],
        'overline': ['0.75rem', { lineHeight: '1.3', letterSpacing: '0.18em' }],
      },

      borderRadius: {
        btn: '12px',
        card: '20px',
        'card-lg': '24px',
      },

      boxShadow: {
        'gold-glow': '0 0 0 1px rgba(212,175,55,.35), 0 8px 28px -10px rgba(212,175,55,.45)',
        'gold-glow-lg': '0 0 0 1px rgba(212,175,55,.5), 0 14px 40px -12px rgba(212,175,55,.55)',
        card: '0 10px 34px -18px rgba(0,0,0,.85)',
        'card-hover': '0 20px 48px -20px rgba(0,0,0,.9)',
        ember: '0 -10px 60px -20px rgba(212,175,55,.25)',
      },

      transitionDuration: {
        DEFAULT: '200ms',
        quick: '180ms',
        slow: '250ms',
      },

      transitionTimingFunction: {
        premium: 'cubic-bezier(.22,.61,.36,1)',
      },

      spacing: {
        'safe-bottom': 'env(safe-area-inset-bottom, 0px)',
        'bottom-bar': '68px',
      },

      maxWidth: {
        content: '1280px',
        prose: '68ch',
      },

      backgroundImage: {
        // Виньетка для hero — не даёт тексту утонуть в картинке
        'hero-veil':
          'linear-gradient(180deg, rgba(15,13,12,.82) 0%, rgba(15,13,12,.45) 38%, rgba(15,13,12,.72) 72%, rgba(15,13,12,.97) 100%)',
        'gold-line':
          'linear-gradient(90deg, transparent, rgba(212,175,55,.55) 20%, rgba(212,175,55,.9) 50%, rgba(212,175,55,.55) 80%, transparent)',
        'card-sheen':
          'linear-gradient(135deg, rgba(255,255,255,.055) 0%, rgba(255,255,255,.015) 45%, rgba(255,255,255,0) 100%)',
      },

      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'ember-rise': {
          '0%': { opacity: '0', transform: 'translateY(0) scale(.6)' },
          '18%': { opacity: '.9' },
          '100%': { opacity: '0', transform: 'translateY(-120px) scale(1.15)' },
        },
        'gold-sweep': {
          '0%': { backgroundPosition: '-160% 0' },
          '100%': { backgroundPosition: '260% 0' },
        },
        'skeleton': {
          '0%,100%': { opacity: '.45' },
          '50%': { opacity: '.85' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },

      animation: {
        'fade-up': 'fade-up .6s cubic-bezier(.22,.61,.36,1) both',
        'ember-rise': 'ember-rise 6s linear infinite',
        'gold-sweep': 'gold-sweep 2.4s linear infinite',
        skeleton: 'skeleton 1.4s ease-in-out infinite',
        'modal-in': 'modal-in .22s cubic-bezier(.22,.61,.36,1) both',
      },

      zIndex: {
        header: '50',
        'bottom-bar': '60',
        modal: '90',
        toast: '100',
      },
    },
  },
  plugins: [],
};

export default config;
