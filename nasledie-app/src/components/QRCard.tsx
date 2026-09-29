import { forwardRef } from 'react';
import type { Memorial } from '../types/memorial';
import { SLOGAN } from '../lib/brand';
import { lifeYears } from '../lib/utils';

export type PrintTheme = 'light' | 'dark';

export interface PrintProps {
  memorial: Memorial;
  qr: string;
  theme: PrintTheme;
  header: string;
  siteLabel: string;
  /** печатать слоган сервиса */
  slogan: boolean;
}

export const PRINT_FORMATS = {
  card: { w: 85.6, h: 54, label: 'Визитка 85,6 × 54 мм' },
  tablet: { w: 105, h: 148, label: 'Табличка A6 105 × 148 мм' },
  sticker: { w: 70, h: 70, label: 'Наклейка 70 × 70 мм' },
} as const;

export type PrintFormat = keyof typeof PRINT_FORMATS;

export const palette = (t: PrintTheme) =>
  t === 'dark'
    ? { bg: 'linear-gradient(145deg,#1A1F2E 0%,#0A0E1A 100%)', text: '#FFFFFF', muted: '#C9CDD4', gold: '#D4B07A', line: '#B8925A' }
    : { bg: 'linear-gradient(145deg,#FFFDF8 0%,#F4EBDC 100%)', text: '#14161C', muted: '#4A4F5A', gold: '#8E6A34', line: '#B8925A' };

export const symbolChar = (s: Memorial['symbol']) => (s === 'cross' ? '✝' : s === 'star' ? '★' : '');

/** QR-карточка формата визитки 85,6 × 54 мм */
export const QRCard = forwardRef<HTMLDivElement, PrintProps>(function QRCard({ memorial: m, qr, theme, header, slogan }, ref) {
  const c = palette(theme);
  return (
    <div
      ref={ref}
      style={{
        width: '85.6mm',
        height: '54mm',
        background: c.bg,
        color: c.text,
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        boxSizing: 'border-box',
        padding: '3.6mm 4mm',
        overflow: 'hidden',
      }}
    >
      <div style={{ position: 'absolute', inset: '1.6mm', border: `0.25mm solid ${c.line}`, borderRadius: '1.5mm', opacity: 0.8 }} />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '2.3mm', letterSpacing: '0.5mm', textTransform: 'uppercase', color: c.gold, fontWeight: 600 }}>
          {header}
        </div>
        <div style={{ display: 'flex', flex: 1, marginTop: '1.5mm', gap: '3mm' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                fontFamily: '"PT Serif", serif',
                fontWeight: 700,
                fontSize: m.fullName.length > 32 ? '3.1mm' : '3.6mm',
                lineHeight: 1.2,
                textTransform: 'uppercase',
              }}
            >
              {m.fullName}
            </div>
            <div style={{ fontFamily: '"PT Serif", serif', fontSize: '3.2mm', color: c.gold, marginTop: '1mm' }}>
              {lifeYears(m.birthDate, m.deathDate)}
            </div>
            {symbolChar(m.symbol) && (
              <div style={{ fontSize: '5mm', color: c.gold, marginTop: '1.2mm', lineHeight: 1 }}>{symbolChar(m.symbol)}</div>
            )}
            <div
              style={{
                marginTop: 'auto',
                fontFamily: '"PT Serif", serif',
                fontStyle: 'italic',
                fontSize: '2.6mm',
                lineHeight: 1.3,
                color: c.muted,
              }}
            >
              «{m.epitaph || 'Память вечна'}»
            </div>
            {slogan && (
              <div style={{ marginTop: '1mm', fontSize: '1.9mm', lineHeight: 1.3, color: c.gold, letterSpacing: '0.05mm' }}>
                {SLOGAN[0]}
                <br />
                {SLOGAN[1]}
              </div>
            )}
          </div>
          <div style={{ alignSelf: 'flex-end', background: '#fff', padding: '0.8mm', borderRadius: '1mm' }}>
            <img src={qr} alt="QR" style={{ width: '25mm', height: '25mm', display: 'block' }} />
          </div>
        </div>
      </div>
    </div>
  );
});
