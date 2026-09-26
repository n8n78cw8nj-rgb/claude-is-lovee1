/**
 * Конфигурация Next.js — кафе «Львиное сердце».
 *
 * Здесь настроены:
 *  - оптимизация изображений (AVIF/WebP, responsive sizes);
 *  - заголовки безопасности (CSP, HSTS, X-Frame-Options и др.);
 *  - кэширование статики.
 *
 * ВАЖНО про CSP: домены аналитики и карт вынесены в переменные ниже.
 * Если подключаете новый внешний сервис — добавьте его домен в нужную директиву,
 * иначе браузер заблокирует запрос.
 */

/** Домены, которым разрешено отдавать скрипты */
const SCRIPT_SRC = [
  "'self'",
  "'unsafe-inline'", // требуется Next.js для inline-бутстрапа гидрации
  'https://mc.yandex.ru',
  'https://yandex.ru',
  'https://api-maps.yandex.ru',
  'https://core-renderer-tiles.maps.yandex.net',
  'https://www.googletagmanager.com',
];

/** Домены, откуда грузятся стили */
const STYLE_SRC = ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'];

/** Домены, откуда грузятся шрифты */
const FONT_SRC = ["'self'", 'https://fonts.gstatic.com', 'data:'];

/** Домены, откуда грузятся изображения */
const IMG_SRC = [
  "'self'",
  'data:',
  'blob:',
  'https://mc.yandex.ru',
  'https://*.maps.yandex.net',
  'https://*.yandex.ru',
  'https://www.google-analytics.com',
];

/** Домены, куда разрешены сетевые запросы (fetch/XHR/beacon) */
const CONNECT_SRC = [
  "'self'",
  'https://mc.yandex.ru',
  'https://*.yandex.ru',
  'https://*.maps.yandex.net',
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
];

/** Домены, которые можно встраивать во фрейм (карта, виджеты отзывов) */
const FRAME_SRC = [
  "'self'",
  'https://yandex.ru',
  'https://*.yandex.ru',
  'https://mc.yandex.ru',
];

const isDev = process.env.NODE_ENV === 'development';

const csp = [
  `default-src 'self'`,
  // В dev-режиме Next.js использует eval для HMR — в проде этого нет.
  `script-src ${SCRIPT_SRC.join(' ')}${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src ${STYLE_SRC.join(' ')}`,
  `font-src ${FONT_SRC.join(' ')}`,
  `img-src ${IMG_SRC.join(' ')}`,
  `media-src 'self' blob:`,
  `connect-src ${CONNECT_SRC.join(' ')}${isDev ? ' ws: wss:' : ''}`,
  `frame-src ${FRAME_SRC.join(' ')}`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
  `upgrade-insecure-requests`,
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,

  images: {
    // AVIF первым — браузер выберет самый лёгкий поддерживаемый формат
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [360, 414, 640, 750, 828, 1080, 1200, 1440, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },

  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      {
        source: '/images/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/video/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
};

export default nextConfig;
