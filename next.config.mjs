/**
 * Конфигурация Next.js — кафе «ПРОTESTO».
 */

const SCRIPT_SRC = ["'self'", "'unsafe-inline'"];
const STYLE_SRC = ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'];
const FONT_SRC = ["'self'", 'https://fonts.gstatic.com', 'data:'];
const IMG_SRC = ["'self'", 'data:', 'blob:', 'https://*.yandex.ru', 'https://*.maps.yandex.net'];
const CONNECT_SRC = ["'self'"];
const FRAME_SRC = ["'self'", 'https://yandex.ru', 'https://*.yandex.ru'];

const isDev = process.env.NODE_ENV === 'development';

const csp = [
  `default-src 'self'`,
  `script-src ${SCRIPT_SRC.join(' ')}${isDev ? " 'unsafe-eval'" : ''}`,
  `style-src ${STYLE_SRC.join(' ')}`,
  `font-src ${FONT_SRC.join(' ')}`,
  `img-src ${IMG_SRC.join(' ')}`,
  `connect-src ${CONNECT_SRC.join(' ')}${isDev ? ' ws: wss:' : ''}`,
  `frame-src ${FRAME_SRC.join(' ')}`,
  `object-src 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
  `frame-ancestors 'none'`,
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    formats: ['image/avif', 'image/webp'],
  },

  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
