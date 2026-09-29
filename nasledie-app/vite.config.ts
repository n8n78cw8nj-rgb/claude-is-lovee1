import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`       — обычная сборка + service worker (офлайн после первой загрузки)
// `npm run build:file`  — один самодостаточный index.html, который открывается двойным кликом (file://)
export default defineConfig(({ mode }) => {
  const singleFile = mode === 'file';
  return {
    base: './',
    plugins: [
      react(),
      singleFile
        ? viteSingleFile()
        : VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/*.svg'],
            manifest: {
              name: 'Наследие — страницы памяти',
              short_name: 'Наследие',
              description: 'Цифровая экосистема сохранения памяти',
              lang: 'ru',
              theme_color: '#0A0E1A',
              background_color: '#0A0E1A',
              display: 'standalone',
              start_url: './',
              icons: [{ src: 'icons/logo.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
            },
            workbox: {
              globPatterns: ['**/*.{js,css,html,svg,woff2}'],
              maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
              runtimeCaching: [
                {
                  urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
                  handler: 'CacheFirst',
                  options: {
                    cacheName: 'google-fonts',
                    expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 365 },
                    cacheableResponse: { statuses: [0, 200] },
                  },
                },
              ],
            },
          }),
    ],
    build: {
      chunkSizeWarningLimit: 2500,
      ...(singleFile ? {} : {
        rollupOptions: {
          output: {
            manualChunks: {
              three: ['three', '@react-three/fiber', '@react-three/drei'],
              pdf: ['jspdf', 'html2canvas'],
            },
          },
        },
      }),
    },
  };
});
