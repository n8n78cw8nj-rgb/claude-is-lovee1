import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import QRCode from 'qrcode';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { viteSingleFile } from 'vite-plugin-singlefile';
import memorial from './src/data/memorial.json';

/** Адрес сайта для images/qr.png: SITE_URL=https://… или production-домен проекта на Vercel */
function siteUrl(): string {
  const env = process.env;
  const url = env.SITE_URL || (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : '');
  return url && !url.endsWith('/') ? `${url}/` : url;
}

/**
 * Фото, видео и аудио встроенной страницы памяти лежат в public/ (images/, videos/, audio/).
 * Список найденных файлов приложение получает из модуля `virtual:public-media`:
 * чего нет на диске — того нет и на странице (вместо битых ссылок — заглушки).
 */
function publicMedia(): Plugin {
  const ID = 'virtual:public-media';
  const RESOLVED = `\0${ID}`;
  let dir = '';
  const list = () => {
    const out: string[] = [];
    const walk = (d: string) => {
      for (const e of readdirSync(d, { withFileTypes: true })) {
        if (e.name.startsWith('.')) continue;
        const full = join(d, e.name);
        if (e.isDirectory()) walk(full);
        else out.push(`/${relative(dir, full).split(sep).join('/')}`);
      }
    };
    for (const sub of ['images', 'videos', 'audio']) if (existsSync(join(dir, sub))) walk(join(dir, sub));
    return out.sort();
  };
  return {
    name: 'nasledie-public-media',
    configResolved(c) {
      dir = c.publicDir;
    },
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load: (id) => (id === RESOLVED ? `export default ${JSON.stringify(list())};` : undefined),
    configureServer(server) {
      // положили или удалили файл в public/ — перечитываем список и перезагружаем страницу
      const onChange = (file: string) => {
        if (!file.startsWith(dir)) return;
        const mod = server.moduleGraph.getModuleById(RESOLVED);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      server.watcher.on('add', onChange).on('unlink', onChange);
    },
    // QR страницы памяти для печати на табличку — только когда известен адрес сайта
    async generateBundle() {
      const site = siteUrl();
      if (!site) return;
      const url = `${site}#/m/${memorial.id}`;
      this.emitFile({
        type: 'asset',
        fileName: 'images/qr.png',
        source: await QRCode.toBuffer(url, { errorCorrectionLevel: 'H', margin: 2, width: 1024 }),
      });
    },
  };
}

// `npm run build`       — обычная сборка + service worker (офлайн после первой загрузки)
// `npm run build:file`  — один самодостаточный index.html, который открывается двойным кликом (file://)
export default defineConfig(({ mode }) => {
  const singleFile = mode === 'file';
  return {
    base: './',
    plugins: [
      react(),
      publicMedia(),
      singleFile
        ? viteSingleFile()
        : VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['icons/*.svg'],
            manifest: {
              name: 'Наследие — страницы памяти',
              short_name: 'Наследие',
              description: 'Память не умирает. Жизнь человека — в одном касании.',
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
