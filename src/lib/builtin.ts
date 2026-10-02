import publicMedia from 'virtual:public-media';
import data from '../data/memorial.json';
import type { Memorial, TimelineEvent } from '../types/memorial';
import { lifeYears } from './utils';

/**
 * Встроенная страница памяти — часть сайта, а не данные браузера: тексты в src/data/memorial.json,
 * фото, видео и аудио — файлы в public/. Её видит любой посетитель, в том числе по QR с памятника.
 */

/** Фото галереи: файл в public/images/gallery/ и подпись */
interface PhotoJson {
  /** «01_1939_детство.jpg» */
  file: string;
  /** Год или период: «1939», «1957–1960»; пусто — год неизвестен */
  year?: string;
  /** «1939 год. Детство» */
  caption?: string;
}

/** Абзац биографии и фото к нему (имена файлов из галереи) */
interface ParagraphJson {
  text: string;
  photos?: string[];
}

interface MemorialJson {
  id: string;
  fullName: string;
  birthDate?: string;
  deathDate?: string;
  birthPlace?: string;
  deathPlace?: string;
  epitaph?: string;
  /** Абзацы с фото; можно и одной строкой с абзацами через пустую строку */
  biography?: string | ParagraphJson[];
  /** Фото события: "photo": "01_1939_детство.jpg" или список имён */
  timeline?: (Omit<TimelineEvent, 'photoIds'> & { photo?: string | string[] | null })[];
  words?: Memorial['words'];
  symbol?: Memorial['symbol'];
  /** Пути к файлам в public/: «/images/portrait/portrait.jpg» */
  portrait?: string;
  /** Фото с подписями по порядку; или папка «/images/gallery/» — все фото из неё по порядку имён */
  gallery?: string | (string | PhotoJson)[];
  animatedVideo?: string;
  videos?: string[];
  /** Озвучка биографии (MP3) — играет кнопка «Послушать историю жизни» */
  audio?: string;
}

const GALLERY_DIR = '/images/gallery/';
const IMAGE = /\.(jpe?g|png|webp|gif|avif)$/i;
const CREATED = '2026-10-01T00:00:00.000Z';

// Имена сравниваем в NFC: на macOS «й» и «ё» в именах файлов хранятся разложенными
const files = new Map(publicMedia.map((f) => [f.normalize('NFC'), f]));

/** Путь к файлу как он лежит в public/, если файл есть; иначе null — на странице будет заглушка */
function existing(path: string | null | undefined): string | null {
  if (!path) return null;
  return files.get(`/${path.trim().replace(/^\.?\/+/, '')}`.normalize('NFC')) ?? null;
}

/** «01_1939_детство.jpg» → фото из галереи; путь от корня — как есть */
const photo = (ref: string | null | undefined) => existing(ref && !ref.startsWith('/') ? GALLERY_DIR + ref : ref);

function folder(dir: string): string[] {
  const d = `/${dir.trim().replace(/^\.?\/+/, '').replace(/\/?$/, '/')}`;
  return publicMedia
    .filter((f) => f.startsWith(d) && !f.slice(d.length).includes('/') && IMAGE.test(f))
    .sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }));
}

function galleryOf(gallery: MemorialJson['gallery']) {
  const ids: string[] = [];
  const captions: Record<string, string> = {};
  const add = (id: string | null, caption?: string) => {
    if (!id || ids.includes(id)) return;
    ids.push(id);
    if (caption) captions[id] = caption;
  };
  if (typeof gallery === 'string') folder(gallery).forEach((id) => add(id));
  else
    for (const g of gallery ?? []) {
      if (typeof g === 'string') add(photo(g));
      else add(photo(g.file), g.caption);
    }
  // фото, которые положили в папку, но ещё не описали в memorial.json, — в конце, без подписи
  folder(GALLERY_DIR).forEach((id) => add(id));
  return { ids, captions };
}

function paragraphsOf(biography: MemorialJson['biography']) {
  const list: ParagraphJson[] = typeof biography === 'string' ? biography.split(/\n{2,}/).map((text) => ({ text })) : biography ?? [];
  return list
    .map((p) => ({ text: p.text.trim(), photos: (p.photos ?? []).map(photo).filter((x): x is string => !!x) }))
    .filter((p) => p.text);
}

/** Ссылка на страницу памяти на этом сайте — её кодирует QR встроенной страницы */
export function pageLink(id: string): string {
  return `${location.href.split(/[?#]/)[0]}#/m/${encodeURIComponent(id)}`;
}

function fromJson(j: MemorialJson): Memorial {
  const gallery = galleryOf(j.gallery);
  const paragraphs = paragraphsOf(j.biography);
  return {
    id: j.id,
    fullName: j.fullName,
    birthDate: j.birthDate ?? '',
    deathDate: j.deathDate ?? '',
    birthPlace: j.birthPlace ?? '',
    deathPlace: j.deathPlace ?? '',
    epitaph: j.epitaph ?? '',
    biography: paragraphs.map((p) => p.text).join('\n\n'),
    biographyPhotos: paragraphs.map((p) => p.photos),
    portraitId: existing(j.portrait),
    timeline: (j.timeline ?? []).map(({ photo: ref, ...t }) => ({
      ...t,
      photoIds: (Array.isArray(ref) ? ref : [ref]).map(photo).filter((x): x is string => !!x),
    })),
    galleryIds: gallery.ids,
    captions: gallery.captions,
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

/** Памятник главного экрана: «ЕРОХИН» / «НИКОЛАЙ ПЕТРОВИЧ» / «1939 — 2000», портрет в медальоне, QR */
export const MONUMENT = (() => {
  const [surname = '', ...given] = FEATURED.fullName.trim().split(/\s+/);
  return {
    surname: surname.toUpperCase(),
    given: given.join(' ').toUpperCase(),
    years: lifeYears(FEATURED.birthDate, FEATURED.deathDate),
    symbol: FEATURED.symbol,
    portrait: FEATURED.portraitId,
    link: FEATURED.qrUrl,
  };
})();

// qrUrl зависит от адреса, с которого открыт сайт, — в версию не входит
const revs = new Map(BUILTINS.map((m) => [m.id, hash(JSON.stringify({ ...m, qrUrl: '' }))]));

export const isBuiltinId = (id: string) => revs.has(id);
export const builtinRev = (id: string) => revs.get(id);
