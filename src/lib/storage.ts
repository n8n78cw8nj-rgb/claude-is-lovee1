import { openDB, type IDBPDatabase } from 'idb';
import publicMedia from 'virtual:public-media';
import type { AppSettings, MediaKind, MediaMeta, MediaRecord, Memorial } from '../types/memorial';
import { BUILTINS, builtinRev, isBuiltinId } from './builtin';
import { isQuotaError, uid } from './utils';

/* ------------------------------------------------------------------ */
/*  IndexedDB — медиа (фото, видео, аудио) в виде Blob                  */
/* ------------------------------------------------------------------ */

const DB_NAME = 'nasledie';
const DB_VERSION = 1;
const MEDIA = 'media';

let dbPromise: Promise<IDBPDatabase> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(MEDIA)) d.createObjectStore(MEDIA, { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

export class StorageFullError extends Error {
  constructor() {
    super('Хранилище браузера заполнено. Экспортируйте данные в ZIP и освободите место.');
    this.name = 'StorageFullError';
  }
}

export async function putMedia(rec: MediaRecord): Promise<void> {
  try {
    await (await db()).put(MEDIA, rec);
  } catch (e) {
    if (isQuotaError(e)) throw new StorageFullError();
    throw e;
  }
}

export async function getMedia(id: string): Promise<MediaRecord | undefined> {
  return (await db()).get(MEDIA, id);
}

export async function deleteMedia(ids: (string | null | undefined)[]): Promise<void> {
  const list = ids.filter((x): x is string => !!x && !isStaticMedia(x));
  if (!list.length) return;
  const tx = (await db()).transaction(MEDIA, 'readwrite');
  await Promise.all([...list.map((id) => tx.store.delete(id)), tx.done]);
  list.forEach(revokeUrls);
}

export async function listMediaMeta(): Promise<MediaMeta[]> {
  const out: MediaMeta[] = [];
  let cursor = await (await db()).transaction(MEDIA).store.openCursor();
  while (cursor) {
    const { blob: _b, thumb: _t, ...meta } = cursor.value as MediaRecord;
    out.push(meta);
    cursor = await cursor.continue();
  }
  return out;
}

export async function listMediaIds(): Promise<string[]> {
  return (await (await db()).getAllKeys(MEDIA)) as string[];
}

export async function clearMedia(): Promise<void> {
  await (await db()).clear(MEDIA);
  urlCache.forEach((u) => URL.revokeObjectURL(u));
  urlCache.clear();
}

/** Копия медиа под новым id (для дублирования страницы) */
export async function cloneMedia(id: string | null): Promise<string | null> {
  if (!id) return null;
  if (isStaticMedia(id)) return id; // файл сайта общий, копировать нечего
  const rec = await getMedia(id);
  if (!rec) return null;
  const newId = uid();
  await putMedia({ ...rec, id: newId, createdAt: new Date().toISOString() });
  return newId;
}

/* ---------- файлы сайта (public/) ---------- */

/** Медиа встроенных страниц — файлы сайта, id = путь: «/images/portrait/portrait.jpg» */
export const isStaticMedia = (id: string) => id.startsWith('/');

/** Пути в memorial.json от корня, но сайт может открываться не из корня домена (подпапка, file://) */
export const staticUrl = (path: string) => import.meta.env.BASE_URL + path.replace(/^\/+/, '');

const publicFiles = new Set(publicMedia);

/** Миниатюра фото сайта: /images/gallery/01.jpg → /images/gallery/thumbs/01.webp (если её сделали) */
function staticThumb(path: string): string {
  const thumb = path.replace(/\/([^/]+)\.[^./]+$/, '/thumbs/$1.webp');
  return publicFiles.has(thumb) ? thumb : path;
}

const STATIC_MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', avif: 'image/avif',
  mp4: 'video/mp4', m4v: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime',
  mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav',
};

function staticMeta(path: string): MediaMeta {
  const name = path.split('/').pop() ?? path;
  const mime = STATIC_MIME[name.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
  const kind: MediaKind = mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'image';
  return { id: path, kind, name, mime, size: 0, createdAt: '' };
}

/** Метаданные без загрузки файла в память: для файлов сайта — по имени */
export async function mediaMeta(id: string): Promise<(MediaMeta & { hasThumb: boolean }) | undefined> {
  if (isStaticMedia(id)) return { ...staticMeta(id), hasThumb: false };
  const r = await getMedia(id);
  if (!r) return undefined;
  const { blob: _b, thumb, ...rest } = r;
  return { ...rest, hasThumb: !!thumb };
}

/** Запись вместе с файлом — из IndexedDB или скачанный файл сайта (для экспорта в ZIP) */
export async function readMedia(id: string): Promise<MediaRecord | undefined> {
  if (!isStaticMedia(id)) return getMedia(id);
  try {
    const res = await fetch(staticUrl(id));
    const blob = await res.blob();
    // dev-сервер на отсутствующий файл отвечает index.html
    if (!res.ok || blob.type.startsWith('text/html')) return undefined;
    return { ...staticMeta(id), size: blob.size, blob, thumb: null, createdAt: new Date().toISOString() };
  } catch {
    return undefined;
  }
}

/* ---------- object URL кэш ---------- */

const urlCache = new Map<string, string>();

export async function mediaUrl(id: string, variant: 'full' | 'thumb' = 'full'): Promise<string | null> {
  if (isStaticMedia(id)) return staticUrl(variant === 'thumb' ? staticThumb(id) : id);
  const key = `${id}:${variant}`;
  const cached = urlCache.get(key);
  if (cached) return cached;
  const rec = await getMedia(id);
  if (!rec) return null;
  const blob = variant === 'thumb' ? rec.thumb ?? rec.blob : rec.blob;
  const url = URL.createObjectURL(blob);
  urlCache.set(key, url);
  return url;
}

function revokeUrls(id: string) {
  for (const v of ['full', 'thumb']) {
    const key = `${id}:${v}`;
    const u = urlCache.get(key);
    if (u) {
      URL.revokeObjectURL(u);
      urlCache.delete(key);
    }
  }
}

/* ------------------------------------------------------------------ */
/*  LocalStorage — метаданные страниц и настройки                       */
/* ------------------------------------------------------------------ */

const LS_MEMORIALS = 'nasledie:memorials';
const LS_SETTINGS = 'nasledie:settings';

type Listener = () => void;
const listeners = new Set<Listener>();
let storedCache: Memorial[] | null = null;
let memorialsCache: Memorial[] | null = null;

/** Правка встроенной страницы в браузере устаревает, когда на сайте обновили её содержимое */
const isStale = (m: Memorial) => isBuiltinId(m.id) && m.builtinRev !== builtinRev(m.id);

function readMemorials(): Memorial[] {
  try {
    const raw = localStorage.getItem(LS_MEMORIALS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { memorials?: Memorial[] } | Memorial[];
    const list = Array.isArray(parsed) ? parsed : parsed.memorials ?? [];
    return list.map(normalizeMemorial).filter((m) => !isStale(m));
  } catch {
    return [];
  }
}

/** Страницы, сохранённые в этом браузере (встроенные — только если их правили) */
export function getStoredMemorials(): Memorial[] {
  if (!storedCache) storedCache = readMemorials();
  return storedCache;
}

/** Все страницы: сохранённые в браузере + встроенные страницы сайта (их локальные правки — вместо оригинала) */
export function getMemorials(): Memorial[] {
  if (!memorialsCache) {
    const stored = getStoredMemorials();
    const edited = new Set(stored.map((m) => m.id));
    memorialsCache = [...stored, ...BUILTINS.filter((b) => !edited.has(b.id))];
  }
  return memorialsCache;
}

export function subscribeMemorials(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function writeMemorials(list: Memorial[]) {
  try {
    localStorage.setItem(LS_MEMORIALS, JSON.stringify({ memorials: list }));
  } catch (e) {
    if (isQuotaError(e)) throw new StorageFullError();
    throw e;
  }
  storedCache = list;
  memorialsCache = null;
  listeners.forEach((l) => l());
}

/** Правка встроенной страницы запоминает версию сайта, к которой относится */
const withRev = (m: Memorial): Memorial => (isBuiltinId(m.id) ? { ...m, builtinRev: builtinRev(m.id) } : m);

export function saveMemorial(m: Memorial) {
  const rec = withRev(m);
  const list = getStoredMemorials();
  const idx = list.findIndex((x) => x.id === rec.id);
  writeMemorials(idx === -1 ? [rec, ...list] : list.map((x) => (x.id === rec.id ? rec : x)));
}

export function saveMemorials(items: Memorial[]) {
  const recs = items.map(withRev);
  const incoming = new Set(recs.map((m) => m.id));
  writeMemorials([...recs, ...getStoredMemorials().filter((m) => !incoming.has(m.id))]);
}

/** Встроенная страница — часть сайта: для неё удаляются только правки, сделанные в этом браузере */
export async function removeMemorial(id: string) {
  const m = getMemorials().find((x) => x.id === id);
  if (!m) return;
  writeMemorials(getStoredMemorials().filter((x) => x.id !== id));
  await deleteMedia(mediaIdsOf(m));
}

export async function clearAll() {
  writeMemorials([]);
  await clearMedia();
}

export function mediaIdsOf(m: Memorial): string[] {
  const ids = [
    m.portraitId,
    m.animatedVideoId,
    m.narrationId,
    ...m.galleryIds,
    ...(m.biographyPhotos ?? []).flat(),
    ...m.timeline.flatMap((t) => t.photoIds ?? []),
    ...m.videoIds,
    ...m.audioIds,
  ];
  return [...new Set(ids.filter((x): x is string => !!x))];
}

/** Удаляет из IndexedDB медиа, на которые не ссылается ни одна страница */
export async function collectGarbage(): Promise<number> {
  const used = new Set(getMemorials().flatMap(mediaIdsOf));
  const orphans = (await listMediaIds()).filter((id) => !used.has(id));
  await deleteMedia(orphans);
  return orphans.length;
}

/* ---------- настройки ---------- */

export const DEFAULT_SETTINGS: AppSettings = {
  baseUrl: 'https://xn--80aicbopm7a.xn--p1ai/m/',
  siteLabel: 'наследие.рф',
};

export function getSettings(): AppSettings {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem(LS_SETTINGS) || '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: AppSettings) {
  try {
    localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
  } catch {
    // хранилище недоступно (приватный режим) — настройки действуют до перезагрузки
  }
}

export function buildQrUrl(id: string, settings = getSettings()): string {
  const base = settings.baseUrl.trim() || DEFAULT_SETTINGS.baseUrl;
  return `${base}${base.endsWith('/') || base.endsWith('=') || base.endsWith('#') ? '' : '/'}${id}`;
}

/* ---------- квота ---------- */

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  if (!navigator.storage?.estimate) return null;
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  return { usage, quota };
}

/** Просим браузер не вытеснять данные при нехватке места */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/* ---------- нормализация ---------- */

export function emptyMemorial(): Memorial {
  const now = new Date().toISOString();
  const id = uid();
  return {
    id,
    fullName: '',
    birthDate: '',
    deathDate: '',
    birthPlace: '',
    deathPlace: '',
    epitaph: '',
    biography: '',
    portraitId: null,
    timeline: [],
    galleryIds: [],
    videoIds: [],
    animatedVideoId: null,
    audioIds: [],
    words: [],
    contacts: { email: '', phone: '', visible: false },
    symbol: 'cross',
    qrUrl: buildQrUrl(id),
    createdAt: now,
    updatedAt: now,
  };
}

export function normalizeMemorial(raw: Partial<Memorial>): Memorial {
  const base = emptyMemorial();
  const m: Memorial = {
    ...base,
    ...raw,
    id: raw.id || base.id,
    timeline: Array.isArray(raw.timeline) ? raw.timeline : [],
    galleryIds: Array.isArray(raw.galleryIds) ? raw.galleryIds : [],
    videoIds: Array.isArray(raw.videoIds) ? raw.videoIds : [],
    audioIds: Array.isArray(raw.audioIds) ? raw.audioIds : [],
    words: Array.isArray(raw.words) ? raw.words : [],
    contacts: { ...base.contacts, ...(raw.contacts ?? {}) },
  };
  if (!raw.qrUrl) m.qrUrl = buildQrUrl(m.id);
  return m;
}
