import publicMedia from 'virtual:public-media';
import data from '../data/memorial.json';
import type { Memorial } from '../types/memorial';
import { lifeYears } from './utils';

/**
 * Встроенная страница памяти — часть сайта, а не данные браузера: тексты в src/data/memorial.json,
 * фото, видео и аудио — файлы в public/. Её видит любой посетитель, в том числе по QR с памятника.
 */
interface MemorialJson {
  id: string;
  fullName: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  deathPlace?: string;
  epitaph?: string;
  biography?: string;
  timeline?: Memorial['timeline'];
  words?: Memorial['words'];
  symbol?: Memorial['symbol'];
  /** Пути к файлам в public/: «/images/portrait/portrait.jpg» */
  portrait?: string;
  /** Список фото или папка: «/images/gallery/» — все фото из неё по порядку имён (01, 02 …) */
  gallery?: string | string[];
  animatedVideo?: string;
  videos?: string[];
  /** Озвучка биографии (MP3) — играет кнопка «Послушать историю жизни» */
  audio?: string;
}

const files = new Set(publicMedia);
const IMAGE = /\.(jpe?g|png|webp|gif|avif)$/i;
const CREATED = '2026-10-01T00:00:00.000Z';

const normalize = (path: string) => `/${path.trim().replace(/^\.?\/+/, '')}`;

/** Путь из memorial.json, если файл лежит в public/; иначе null — на странице будет заглушка */
function existing(path: string | undefined): string | null {
  return path && files.has(normalize(path)) ? normalize(path) : null;
}

function galleryOf(gallery: MemorialJson['gallery']): string[] {
  if (Array.isArray(gallery)) return gallery.map(existing).filter((x): x is string => !!x);
  if (!gallery) return [];
  const dir = normalize(gallery).replace(/\/?$/, '/');
  return publicMedia
    .filter((f) => f.startsWith(dir) && !f.slice(dir.length).includes('/') && IMAGE.test(f))
    .sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
}

/** Ссылка на страницу памяти на этом сайте — её кодирует QR встроенной страницы */
export function pageLink(id: string): string {
  return `${location.href.split(/[?#]/)[0]}#/m/${encodeURIComponent(id)}`;
}

function fromJson(j: MemorialJson): Memorial {
  return {
    id: j.id,
    fullName: j.fullName,
    birthDate: j.birthDate ?? '',
    deathDate: j.deathDate ?? '',
    birthPlace: j.birthPlace ?? '',
    deathPlace: j.deathPlace ?? '',
    epitaph: j.epitaph ?? '',
    biography: j.biography ?? '',
    portraitId: existing(j.portrait),
    timeline: j.timeline ?? [],
    galleryIds: galleryOf(j.gallery),
    videoIds: (j.videos ?? []).map(existing).filter((x): x is string => !!x),
    animatedVideoId: existing(j.animatedVideo),
    audioIds: [],
    narrationId: existing(j.audio),
    words: j.words ?? [],
    contacts: { email: '', phone: '', visible: false },
    symbol: j.symbol ?? 'cross',
    qrUrl: pageLink(j.id),
    createdAt: CREATED,
    updatedAt: CREATED,
  };
}

/** FNV-1a: версия содержимого страницы (тексты + найденные файлы) */
function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export const BUILTINS: Memorial[] = [fromJson(data as unknown as MemorialJson)];

/** Страница для главного экрана: её имя и QR — на 3D-памятнике */
export const FEATURED = BUILTINS[0];

/** Надпись на памятнике главного экрана: «ЕРОХИН» / «НИКОЛАЙ ПЕТРОВИЧ» / «1939 — 2000» */
export const MONUMENT = (() => {
  const [surname = '', ...given] = FEATURED.fullName.trim().split(/\s+/);
  return {
    surname: surname.toUpperCase(),
    given: given.join(' ').toUpperCase(),
    years: lifeYears(FEATURED.birthDate, FEATURED.deathDate),
    symbol: FEATURED.symbol,
    link: FEATURED.qrUrl,
  };
})();

// qrUrl зависит от адреса, с которого открыт сайт, — в версию не входит
const revs = new Map(BUILTINS.map((m) => [m.id, hash(JSON.stringify({ ...m, qrUrl: '' }))]));

export const isBuiltinId = (id: string) => revs.has(id);
export const builtinRev = (id: string) => revs.get(id);
