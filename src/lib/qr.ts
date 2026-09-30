import QRCode from 'qrcode';

/**
 * QR с уровнем коррекции H (≈30% площади можно повредить) — для табличек на улице.
 * Чёрный на белом, с «тихой зоной» в 2 модуля.
 */
const BASE = {
  errorCorrectionLevel: 'H' as const,
  margin: 2,
  color: { dark: '#000000', light: '#FFFFFF' },
};

export async function qrDataUrl(text: string, size = 1024): Promise<string> {
  return QRCode.toDataURL(text, { ...BASE, width: size });
}

export async function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { ...BASE, type: 'svg' });
}

export async function qrPngBlob(text: string, size = 1024): Promise<Blob> {
  const res = await fetch(await qrDataUrl(text, size));
  return res.blob();
}
