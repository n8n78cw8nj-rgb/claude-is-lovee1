// Фото встроенной страницы памяти: сжатие, порядок по годам, имена, миниатюры, отчёт.
//
//   node scripts/photos.mjs import <файл> <имя.jpg>  — фото в public/images/gallery/: до 2560 px, до 2 МБ,
//                                                     поворот по EXIF, без метаданных (GPS, камера) + миниатюра
//   node scripts/photos.mjs portrait <файл>         — портрет в public/images/portrait/portrait.jpg
//   node scripts/photos.mjs sync                     — галерея в memorial.json по годам (без года — в конце),
//                                                     имена NN_ГГГГ_описание.jpg / XX_…, миниатюры, ссылки абзацев и событий
//   node scripts/photos.mjs report                   — что где стоит и что не привязано
//
// Нужен ImageMagick (команда magick или convert).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MEMORIAL = join(ROOT, 'src/data/memorial.json');
const GALLERY = join(ROOT, 'public/images/gallery');
const PORTRAIT = join(ROOT, 'public/images/portrait');
const IMAGE = /\.(jpe?g|png|webp|gif|avif)$/i;
const MAX_BYTES = 2 * 1024 * 1024;

function magick(args) {
  for (const bin of ['magick', 'convert']) {
    try {
      return execFileSync(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    } catch (e) {
      if (e.code !== 'ENOENT') throw new Error(`${bin}: ${e.stderr?.toString().trim() || e.message}`);
    }
  }
  throw new Error('Нужен ImageMagick (https://imagemagick.org): команда magick или convert');
}

/** JPEG до maxSide по длинной стороне и до 2 МБ: поворот по EXIF, sRGB, без метаданных */
function compress(src, dst, maxSide) {
  for (const quality of [85, 78, 70, 62]) {
    magick([`${src}[0]`, '-auto-orient', '-strip', '-colorspace', 'sRGB', '-resize', `${maxSide}x${maxSide}>`,
      '-sampling-factor', '4:2:0', '-interlace', 'JPEG', '-quality', String(quality), dst]);
    if (statSync(dst).size <= MAX_BYTES) break;
  }
  const size = magick([dst, '-format', '%wx%h', 'info:']).trim();
  return `${basename(dst)}: ${size}, ${Math.round(statSync(dst).size / 1024)} КБ`;
}

const thumbOf = (dir, file) => join(dir, 'thumbs', `${basename(file, extname(file))}.webp`);

/** Миниатюра 800 px в thumbs/ — для сетки галереи и фото у абзацев */
function thumb(dir, file) {
  mkdirSync(join(dir, 'thumbs'), { recursive: true });
  magick([join(dir, file), '-resize', '800x800>', '-quality', '80', thumbOf(dir, file)]);
}

/* ---------- memorial.json: тот же вид, что и при ручной правке ---------- */

const compact = (v) =>
  Array.isArray(v)
    ? `[${v.map(compact).join(', ')}]`
    : v && typeof v === 'object'
      ? `{${Object.entries(v).map(([k, x]) => `${JSON.stringify(k)}: ${compact(x)}`).join(', ')}}`
      : JSON.stringify(v);

function format(json) {
  const fields = Object.entries(json).map(([k, v]) => {
    const key = JSON.stringify(k);
    if (['biography', 'words'].includes(k) && Array.isArray(v) && v.length)
      return `  ${key}: [\n${v.map((o) => `    {\n${Object.entries(o).map(([kk, x]) => `      ${JSON.stringify(kk)}: ${compact(x)}`).join(',\n')}\n    }`).join(',\n')}\n  ]`;
    if (['timeline', 'gallery'].includes(k) && Array.isArray(v) && v.length)
      return `  ${key}: [\n${v.map((o) => `    ${compact(o)}`).join(',\n')}\n  ]`;
    return `  ${key}: ${compact(v)}`;
  });
  return `{\n${fields.join(',\n')}\n}\n`;
}

const readMemorial = () => JSON.parse(readFileSync(MEMORIAL, 'utf8'));
const galleryOf = (j) => (Array.isArray(j.gallery) ? j.gallery : []).map((g) => (typeof g === 'string' ? { file: g } : g));
const paragraphs = (j) => (Array.isArray(j.biography) ? j.biography : []);
const yearOf = (g) => /\d{4}/.exec(g.year ?? '')?.[0];
/** год в имени файла: «1957» → 1957, «1950-е» → 1950е */
const yearTag = (g) => {
  const m = /(\d{4})(-е)?/.exec(g.year ?? '');
  return m && `${m[1]}${m[2] ? 'е' : ''}`;
};

/* ---------- команды ---------- */

function sync() {
  const j = readMemorial();
  // по годам, без года — в конце; при равном годе порядок как был
  const gallery = galleryOf(j)
    .map((g, i) => ({ g, i }))
    .sort((a, b) => Number(yearOf(a.g) ?? 1e9) - Number(yearOf(b.g) ?? 1e9) || a.i - b.i)
    .map(({ g }) => g);

  const renames = new Map();
  const taken = new Set();
  let n = 0;
  for (const g of gallery) {
    const parts = basename(g.file, extname(g.file)).split('_');
    const desc = parts.length >= 3 ? parts.slice(2).join('_') : parts[parts.length - 1];
    const year = yearTag(g);
    let name = year ? `${String(++n).padStart(2, '0')}_${year}_${desc}` : `XX_${parts.length >= 3 ? parts[1] : 'без-года'}_${desc}`;
    for (let k = 2; taken.has(name); k++) name = `${name.replace(/-\d+$/, '')}-${k}`; // два «XX_без-года_семья»
    taken.add(name);
    const next = `${name}${extname(g.file).toLowerCase()}`;
    if (next !== g.file) renames.set(g.file, next);
    g.file = next;
  }

  // переименование в два шага, чтобы 02↔03 не затёрли друг друга
  const moved = [];
  for (const [from, to] of renames) {
    if (!existsSync(join(GALLERY, from))) {
      console.warn(`⚠ нет файла ${from}`);
      continue;
    }
    const tmp = `.sync-${moved.length}${extname(from)}`;
    renameSync(join(GALLERY, from), join(GALLERY, tmp));
    if (existsSync(thumbOf(GALLERY, from))) renameSync(thumbOf(GALLERY, from), thumbOf(GALLERY, tmp));
    moved.push([tmp, to]);
  }
  for (const [tmp, to] of moved) {
    renameSync(join(GALLERY, tmp), join(GALLERY, to));
    if (existsSync(thumbOf(GALLERY, tmp))) renameSync(thumbOf(GALLERY, tmp), thumbOf(GALLERY, to));
  }

  // миниатюры: недостающие сделать, лишние убрать
  for (const g of gallery) if (existsSync(join(GALLERY, g.file)) && !existsSync(thumbOf(GALLERY, g.file))) thumb(GALLERY, g.file);
  const thumbsDir = join(GALLERY, 'thumbs');
  const keep = new Set(gallery.map((g) => basename(thumbOf(GALLERY, g.file))));
  if (existsSync(thumbsDir)) for (const f of readdirSync(thumbsDir)) if (!keep.has(f)) unlinkSync(join(thumbsDir, f));

  const ren = (f) => renames.get(f) ?? f;
  j.gallery = gallery;
  if (Array.isArray(j.biography)) j.biography = j.biography.map((p) => ({ ...p, photos: (p.photos ?? []).map(ren) }));
  // у события — одно фото строкой или список
  j.timeline = (j.timeline ?? []).map((t) => ({ ...t, photo: Array.isArray(t.photo) ? t.photo.map(ren) : t.photo ? ren(t.photo) : null }));
  writeFileSync(MEMORIAL, format(j));
  for (const [from, to] of renames) console.log(`${from} → ${to}`);
  console.log(`Галерея: ${gallery.length} фото, переименовано: ${renames.size}`);
}

function report() {
  const j = readMemorial();
  const gallery = galleryOf(j);
  const onDisk = new Set(existsSync(GALLERY) ? readdirSync(GALLERY).filter((f) => IMAGE.test(f)) : []);
  const bio = new Map();
  paragraphs(j).forEach((p, i) => (p.photos ?? []).forEach((f) => bio.set(f, [...(bio.get(f) ?? []), i + 1])));
  const events = new Map();
  (j.timeline ?? []).forEach((t) =>
    [t.photo].flat().filter(Boolean).forEach((f) => events.set(f, [...(events.get(f) ?? []), `${t.year} ${t.title}`])),
  );

  const portrait = existsSync(join(PORTRAIT, 'portrait.jpg'));
  console.log(`Портрет: ${portrait ? 'portrait.jpg (главное фото)' : 'нет — на странице инициалы'}\n`);
  console.log(`Галерея (${gallery.length} фото):`);
  for (const g of gallery) {
    const where = [bio.has(g.file) && `абзац ${bio.get(g.file).join(', ')}`, events.has(g.file) && `событие «${events.get(g.file).join('», «')}»`]
      .filter(Boolean)
      .join('; ');
    console.log(`${g.file} — «${g.caption ?? 'без подписи'}»${where ? ` → ${where}` : ''}${onDisk.has(g.file) ? '' : '  ⚠ файла нет'}`);
  }
  const extra = [...onDisk].filter((f) => !gallery.some((g) => g.file === f));
  if (extra.length) console.log(`\nВ папке, но не в memorial.json (на странице в конце, без подписи): ${extra.join(', ')}`);

  const linked = (f) => bio.has(f) || events.has(f);
  console.log(`\nПривязано к биографии: ${gallery.filter((g) => bio.has(g.file)).length} фото`);
  console.log(`Привязано к хронологии: ${gallery.filter((g) => events.has(g.file)).length} фото`);
  console.log(`Не привязано: ${gallery.filter((g) => !linked(g.file)).length} фото`);
  const bare = paragraphs(j).flatMap((p, i) => (p.photos?.length ? [] : [i + 1]));
  if (gallery.length && bare.length) console.log(`Абзацы без фото: ${bare.join(', ')}`);
  const noYear = gallery.filter((g) => !yearOf(g));
  if (noYear.length) console.log(`Год не определён: ${noYear.map((g) => g.file).join(', ')}`);
  const approx = gallery.filter((g) => yearOf(g) && !/^\d{4}$/.test(g.year.trim()));
  if (approx.length) console.log(`Без точного года (десятилетие или период): ${approx.map((g) => `${g.file} (${g.year})`).join(', ')}`);
}

const [cmd, ...args] = process.argv.slice(2);
try {
  if (cmd === 'import' && args.length === 2) {
    mkdirSync(GALLERY, { recursive: true });
    const file = `${basename(args[1], extname(args[1]))}.jpg`;
    console.log(compress(args[0], join(GALLERY, file), 2560));
    thumb(GALLERY, file);
  } else if (cmd === 'portrait' && args.length === 1) {
    mkdirSync(PORTRAIT, { recursive: true });
    console.log(compress(args[0], join(PORTRAIT, 'portrait.jpg'), 1600));
    thumb(PORTRAIT, 'portrait.jpg');
  } else if (cmd === 'sync') sync();
  else if (cmd === 'report') report();
  else {
    console.log('node scripts/photos.mjs import <файл> <имя.jpg> | portrait <файл> | sync | report');
    process.exit(1);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
