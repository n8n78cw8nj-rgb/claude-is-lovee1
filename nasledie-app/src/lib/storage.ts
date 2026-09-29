import { openDB, type IDBPDatabase } from 'idb';
import type { AppSettings, MediaMeta, MediaRecord, Memorial } from '../types/memorial';
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
  const list = ids.filter((x): x is string => !!x);
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
  const rec = await getMedia(id);
  if (!rec) return null;
  const newId = uid();
  await putMedia({ ...rec, id: newId, createdAt: new Date().toISOString() });
  return newId;
}

/* ---------- object URL кэш ---------- */

const urlCache = new Map<string, string>();

export async function mediaUrl(id: string, variant: 'full' | 'thumb' = 'full'): Promise<string | null> {
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
let memorialsCache: Memorial[] | null = null;

function readMemorials(): Memorial[] {
  try {
    const raw = localStorage.getItem(LS_MEMORIALS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { memorials?: Memorial[] } | Memorial[];
    const list = Array.isArray(parsed) ? parsed : parsed.memorials ?? [];
    return list.map(normalizeMemorial);
  } catch {
    return [];
  }
}

export function getMemorials(): Memorial[] {
  if (!memorialsCache) memorialsCache = readMemorials();
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
  memorialsCache = list;
  listeners.forEach((l) => l());
}

export function saveMemorial(m: Memorial) {
  const list = getMemorials();
  const idx = list.findIndex((x) => x.id === m.id);
  const next = idx === -1 ? [m, ...list] : list.map((x) => (x.id === m.id ? m : x));
  writeMemorials(next);
}

export function saveMemorials(items: Memorial[]) {
  const incoming = new Set(items.map((m) => m.id));
  writeMemorials([...items, ...getMemorials().filter((m) => !incoming.has(m.id))]);
}

export async function removeMemorial(id: string) {
  const m = getMemorials().find((x) => x.id === id);
  if (!m) return;
  writeMemorials(getMemorials().filter((x) => x.id !== id));
  await deleteMedia(mediaIdsOf(m));
}

export async function clearAll() {
  writeMemorials([]);
  await clearMedia();
}

export function mediaIdsOf(m: Memorial): string[] {
  return [m.portraitId, m.animatedVideoId, ...m.galleryIds, ...m.videoIds, ...m.audioIds].filter(
    (x): x is string => !!x,
  );
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
  localStorage.setItem(LS_SETTINGS, JSON.stringify(s));
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
