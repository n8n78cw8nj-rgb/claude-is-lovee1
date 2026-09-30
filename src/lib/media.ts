import imageCompression from 'browser-image-compression';
import type { MediaKind, MediaRecord } from '../types/memorial';
import { putMedia } from './storage';
import { formatBytes, uid } from './utils';

export const LIMITS = {
  image: 50 * 1024 * 1024,
  video: 2 * 1024 * 1024 * 1024,
  audio: 500 * 1024 * 1024,
  galleryPerPage: 500,
  videosPerPage: 50,
};

export const ACCEPT = {
  image: {
    'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif', '.tif', '.tiff', '.bmp', '.avif'],
  },
  video: {
    'video/*': ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v', '.3gp'],
  },
  animated: {
    'video/mp4': ['.mp4', '.m4v'],
    'video/webm': ['.webm'],
    'video/quicktime': ['.mov'],
  },
  audio: {
    'audio/*': ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.opus'],
  },
};

const EXT: Record<MediaKind, RegExp> = {
  image: /\.(jpe?g|png|webp|gif|heic|heif|tiff?|bmp|avif)$/i,
  video: /\.(mp4|mov|avi|mkv|webm|m4v|3gp)$/i,
  audio: /\.(mp3|wav|ogg|m4a|aac|flac|opus)$/i,
};

export function detectKind(file: File): MediaKind | null {
  // HEIC/TIFF/MKV часто приходят с пустым или «чужим» MIME — сначала смотрим на расширение
  for (const k of Object.keys(EXT) as MediaKind[]) if (EXT[k].test(file.name)) return k;
  if (file.type.startsWith('image/')) return 'image';
  if (file.type.startsWith('video/')) return 'video';
  if (file.type.startsWith('audio/')) return 'audio';
  return null;
}

const isHeic = (f: File) => /image\/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);
const isTiff = (f: File) => /image\/tiff/i.test(f.type) || /\.tiff?$/i.test(f.name);

/* ---------------- изображения ---------------- */

async function heicToJpeg(file: File): Promise<File> {
  const { default: heic2any } = await import('heic2any');
  const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 });
  const blob = Array.isArray(out) ? out[0] : out;
  return new File([blob], file.name.replace(/\.hei[cf]$/i, '.jpg'), { type: 'image/jpeg' });
}

async function tiffToJpeg(file: File): Promise<File> {
  const UTIF = await import('utif2');
  const buf = await file.arrayBuffer();
  const page = UTIF.decode(buf)[0];
  UTIF.decodeImage(buf, page);
  const rgba = UTIF.toRGBA8(page);
  const canvas = document.createElement('canvas');
  canvas.width = page.width;
  canvas.height = page.height;
  canvas.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(rgba), page.width, page.height), 0, 0);
  const blob = await canvasToBlob(canvas, 'image/jpeg', 0.92);
  return new File([blob], file.name.replace(/\.tiff?$/i, '.jpg'), { type: 'image/jpeg' });
}

export function canvasToBlob(canvas: HTMLCanvasElement, type = 'image/jpeg', quality = 0.9): Promise<Blob> {
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('canvas'))), type, quality));
}

async function imageSize(blob: Blob): Promise<{ width: number; height: number } | null> {
  try {
    const bmp = await createImageBitmap(blob);
    const r = { width: bmp.width, height: bmp.height };
    bmp.close();
    return r;
  } catch {
    return null;
  }
}

/** Миниатюра до 520 px — простой ресайз через canvas, быстрее итеративного сжатия */
async function makeThumb(blob: Blob, onProgress?: (p: number) => void): Promise<Blob | null> {
  try {
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, 520 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bmp.width * k));
    canvas.height = Math.max(1, Math.round(bmp.height * k));
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    bmp.close();
    onProgress?.(100);
    return await canvasToBlob(canvas, 'image/webp', 0.82);
  } catch {
    return null;
  }
}

async function prepareImage(file: File, onProgress?: (p: number) => void) {
  let src = file;
  if (isHeic(file)) src = await heicToJpeg(file);
  else if (isTiff(file)) {
    // Safari умеет TIFF нативно, остальные браузеры — через UTIF
    src = (await imageSize(file)) ? file : await tiffToJpeg(file);
  }
  onProgress?.(15);

  // GIF сохраняем как есть, чтобы не потерять анимацию
  const keepOriginal = src.type === 'image/gif';
  const full: Blob = keepOriginal
    ? src
    : await imageCompression(src, {
        maxSizeMB: 1.6,
        maxWidthOrHeight: 2560,
        initialQuality: 0.86,
        useWebWorker: false, // воркер библиотеки грузится с CDN — офлайн не работает
        fileType: src.type === 'image/png' ? 'image/webp' : 'image/jpeg',
        onProgress: (p) => onProgress?.(15 + p * 0.6),
      });

  const thumb = await makeThumb(full, (p) => onProgress?.(75 + p * 0.2));
  const size = await imageSize(full);
  return { full, thumb, ...(size ?? {}) };
}

/* ---------------- видео / аудио ---------------- */

function loadMedia<T extends HTMLMediaElement>(el: T, url: string, timeout = 15000): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('timeout')), timeout);
    el.onloadedmetadata = () => {
      clearTimeout(t);
      resolve(el);
    };
    el.onerror = () => {
      clearTimeout(t);
      reject(new Error('unsupported'));
    };
    el.preload = 'metadata';
    el.src = url;
  });
}

async function videoInfo(file: Blob): Promise<{ thumb: Blob | null; duration?: number; width?: number; height?: number }> {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  try {
    await loadMedia(video, url);
    const duration = Number.isFinite(video.duration) ? video.duration : undefined;
    await new Promise<void>((res, rej) => {
      const t = setTimeout(() => rej(new Error('seek')), 10000);
      video.onseeked = () => {
        clearTimeout(t);
        res();
      };
      video.currentTime = Math.min(1, (duration ?? 3) / 3);
    });
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return { thumb: null, duration };
    const scale = Math.min(1, 640 / Math.max(w, h));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    const thumb = await canvasToBlob(canvas, 'image/webp', 0.8).catch(() => null);
    return { thumb, duration, width: w, height: h };
  } catch {
    // Формат не декодируется браузером (AVI, часть MKV/MOV) — сохраняем без превью
    return { thumb: null };
  } finally {
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  }
}

async function audioDuration(file: Blob): Promise<number | undefined> {
  const url = URL.createObjectURL(file);
  try {
    const a = await loadMedia(document.createElement('audio'), url, 8000);
    return Number.isFinite(a.duration) ? a.duration : undefined;
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function guessMime(name: string, kind: MediaKind): string {
  const ext = /\.([a-z0-9]+)$/i.exec(name)?.[1]?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    mp4: 'video/mp4', m4v: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska',
    avi: 'video/x-msvideo', '3gp': 'video/3gpp', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg',
    m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', opus: 'audio/ogg',
  };
  return map[ext] ?? (kind === 'video' ? 'video/mp4' : 'audio/mpeg');
}

/* ---------------- публичный API ---------------- */

export class MediaError extends Error {}

export function validate(file: File, expected: MediaKind): void {
  const kind = detectKind(file);
  if (kind !== expected) {
    const names = { image: 'изображением', video: 'видео', audio: 'аудиофайлом' };
    throw new MediaError(`«${file.name}» не является ${names[expected]}`);
  }
  if (file.size > LIMITS[kind]) {
    throw new MediaError(`«${file.name}» больше ${formatBytes(LIMITS[kind])}`);
  }
}

/**
 * Обрабатывает файл (сжатие фото, миниатюры, длительность) и сохраняет в IndexedDB.
 * Видео и аудио не перекодируются.
 */
export async function importFile(file: File, expected: MediaKind, onProgress?: (p: number) => void): Promise<string> {
  validate(file, expected);
  const id = uid();
  const base = { id, kind: expected, name: file.name, createdAt: new Date().toISOString() };
  let rec: MediaRecord;

  if (expected === 'image') {
    const { full, thumb, width, height } = await prepareImage(file, onProgress);
    rec = { ...base, blob: full, thumb, mime: full.type || 'image/jpeg', size: full.size, width, height };
  } else if (expected === 'video') {
    onProgress?.(10);
    const info = await videoInfo(file);
    onProgress?.(60);
    rec = { ...base, blob: file, mime: file.type || guessMime(file.name, 'video'), size: file.size, ...info };
  } else {
    onProgress?.(20);
    const duration = await audioDuration(file);
    rec = { ...base, blob: file, thumb: null, mime: file.type || guessMime(file.name, 'audio'), size: file.size, duration };
  }
  onProgress?.(90);
  await putMedia(rec);
  onProgress?.(100);
  return id;
}

/** Сохраняет готовый Blob (демо-данные, импорт из ZIP) */
export async function storeBlob(
  blob: Blob,
  kind: MediaKind,
  name: string,
  opts: { id?: string; mime?: string; thumb?: Blob | null; width?: number; height?: number; duration?: number } = {},
): Promise<string> {
  const id = opts.id ?? uid();
  let thumb: Blob | null = opts.thumb ?? null;
  let { width, height, duration } = opts;
  const mime = opts.mime || blob.type || (kind === 'image' ? 'image/jpeg' : guessMime(name, kind));
  const typed = blob.type === mime ? blob : new Blob([blob], { type: mime });
  if (thumb) {
    // миниатюра уже есть (импорт из ZIP) — ничего не пересчитываем
  } else if (kind === 'image') {
    thumb = await makeThumb(typed);
    const s = await imageSize(typed);
    width ??= s?.width;
    height ??= s?.height;
  } else if (kind === 'video') {
    const info = await videoInfo(typed);
    thumb = info.thumb;
    duration ??= info.duration;
  }
  await putMedia({
    id, kind, name, mime, size: typed.size, blob: typed, thumb, width, height, duration,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export function formatDuration(sec?: number): string {
  if (!sec || !Number.isFinite(sec)) return '';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Может ли текущий браузер воспроизвести этот MIME */
export function canPlay(mime: string): boolean {
  const el = document.createElement(mime.startsWith('audio') ? 'audio' : 'video');
  return el.canPlayType(mime) !== '';
}
