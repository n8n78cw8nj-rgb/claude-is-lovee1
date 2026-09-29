import { forwardRef } from 'react';
import { SLOGAN, SLOGAN_TEXT } from '../lib/brand';
import { lifeYears } from '../lib/utils';
import { palette, symbolChar, type PrintProps } from './QRCard';

/** QR-табличка для памятника, формат A6 105 × 148 мм */
export const QRTablet = forwardRef<HTMLDivElement, PrintProps>(function QRTablet({ memorial: m, qr, theme, siteLabel, slogan }, ref) {
  const c = palette(theme);
  return (
    <div
      ref={ref}
      style={{
        width: '105mm',
        height: '148mm',
        background: c.bg,
        color: c.text,
        fontFamily: 'Inter, sans-serif',
        position: 'relative',
        boxSizing: 'border-box',
        padding: '9mm 8mm',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      <div style={{ position: 'absolute', inset: '3.5mm', border: `0.4mm solid ${c.line}`, borderRadius: '3mm' }} />
      <div style={{ position: 'absolute', inset: '5mm', border: `0.15mm solid ${c.line}`, borderRadius: '2mm', opacity: 0.6 }} />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ background: '#fff', padding: '2mm', borderRadius: '2mm', marginTop: '2mm' }}>
          <img src={qr} alt="QR" style={{ width: '62mm', height: '62mm', display: 'block' }} />
        </div>
        {symbolChar(m.symbol) && (
          <div style={{ fontSize: '6mm', color: c.gold, marginTop: '4mm', lineHeight: 1 }}>{symbolChar(m.symbol)}</div>
        )}
        <div
          style={{
            fontFamily: '"PT Serif", serif',
            fontWeight: 700,
            fontSize: m.fullName.length > 30 ? '5mm' : '5.8mm',
            lineHeight: 1.2,
            textTransform: 'uppercase',
            marginTop: symbolChar(m.symbol) ? '3mm' : '6mm',
            letterSpacing: '0.2mm',
          }}
        >
          {m.fullName}
        </div>
        <div style={{ fontFamily: '"PT Serif", serif', fontSize: '5.5mm', color: c.gold, marginTop: '2mm' }}>
          {lifeYears(m.birthDate, m.deathDate)}
        </div>
        <div style={{ width: '24mm', height: '0.3mm', background: c.line, margin: '5mm auto 4mm' }} />
        <div style={{ fontSize: '3.6mm', lineHeight: 1.45, color: c.muted }}>
          Отсканируйте, чтобы увидеть
          <br />
          историю жизни
        </div>
        {slogan && (
          <div style={{ marginTop: '3mm', fontFamily: '"PT Serif", serif', fontStyle: 'italic', fontSize: '3.3mm', lineHeight: 1.35, color: c.gold }}>
            {SLOGAN[0]}
            <br />
            {SLOGAN[1]}
          </div>
        )}
        <div style={{ marginTop: 'auto', fontSize: '3.4mm', letterSpacing: '0.4mm', color: c.gold, fontWeight: 600 }}>{siteLabel}</div>
      </div>
    </div>
  );
});

/** Квадратная QR-наклейка 70 × 70 мм */
export const QRSticker = forwardRef<HTMLDivElement, PrintProps>(function QRSticker({ memorial: m, qr, theme, slogan }, ref) {
  const c = palette(theme);
  return (
    <div
      ref={ref}
      style={{
        width: '70mm',
        height: '70mm',
        background: c.bg,
        color: c.text,
        fontFamily: 'Inter, sans-serif',
        boxSizing: 'border-box',
        padding: '4mm',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        borderRadius: '4mm',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <div style={{ position: 'absolute', inset: '1.8mm', border: `0.3mm solid ${c.line}`, borderRadius: '3mm' }} />
      <div style={{ background: '#fff', padding: '1.2mm', borderRadius: '1.5mm' }}>
        <img src={qr} alt="QR" style={{ width: '46mm', height: '46mm', display: 'block' }} />
      </div>
      <div
        style={{
          fontFamily: '"PT Serif", serif',
          fontWeight: 700,
          fontSize: m.fullName.length > 30 ? '2.9mm' : '3.4mm',
          lineHeight: 1.2,
          marginTop: '2.5mm',
          textTransform: 'uppercase',
          maxWidth: '60mm',
        }}
      >
        {m.fullName}
      </div>
      <div style={{ fontFamily: '"PT Serif", serif', fontSize: '3mm', color: c.gold, marginTop: '0.8mm' }}>
        {lifeYears(m.birthDate, m.deathDate)}
      </div>
      {slogan && (
        <div style={{ fontSize: '1.9mm', color: c.muted, marginTop: '0.8mm', maxWidth: '60mm', lineHeight: 1.25 }}>{SLOGAN_TEXT}</div>
      )}
    </div>
  );
});
