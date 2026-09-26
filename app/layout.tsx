import type { Metadata } from 'next';
import { Playfair_Display, Manrope } from 'next/font/google';
import './globals.css';

const display = Playfair_Display({
  subsets: ['latin', 'cyrillic'],
  weight: ['700', '900'],
  variable: '--font-display',
  display: 'swap',
});

const body = Manrope({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const siteUrl = 'https://protesto-tutaev.ru';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'ПРОTESTO — семейное кафе в Тутаеве',
  description:
    'Хинкали, хачапури и чебуреки ручной лепки. Комплексные обеды и доставка по Тутаеву. Просп. 50-летия Победы, 11.',
  openGraph: {
    title: 'ПРОTESTO — семейное кафе в Тутаеве',
    description: 'Вкус, который объединяет. Тесто, которое говорит за себя.',
    images: ['/images/og-cover.png'],
    locale: 'ru_RU',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${body.variable}`}>
      <body className="bg-cream font-body text-ink antialiased">{children}</body>
    </html>
  );
}
