import JSZip from 'jszip';
import type { MediaRecord, Memorial } from '../types/memorial';
import { qrPngBlob } from './qr';
import { getStoredMemorials, isStaticMedia, mediaIdsOf, readMedia } from './storage';
import { buildNarration } from './narration';
import { downloadBlob, escapeHtml, extFromMime, formatDate, lifeYears, slugify } from './utils';

export const EXPORT_FORMAT = 'nasledie-export';
export const EXPORT_VERSION = 1;

export interface ExportedMedia {
  id: string;
  kind: MediaRecord['kind'];
  name: string;
  mime: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  file: string;
  thumb?: string;
}

export interface ExportManifest {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  memorials: Memorial[];
  media: ExportedMedia[];
}

type Progress = (percent: number, label: string) => void;

async function addMedia(zip: JSZip, ids: string[], onProgress?: Progress): Promise<Map<string, ExportedMedia>> {
  const out = new Map<string, ExportedMedia>();
  let i = 0;
  for (const id of ids) {
    i++;
    const rec = await readMedia(id);
    if (!rec) continue;
    // файл сайта: «/images/gallery/01_1939_детство.jpg» → media/images_gallery_01_1939_детство.jpg
    const key = isStaticMedia(id) ? id.replace(/^\/+/, '').replace(/\.[^./]+$/, '').replace(/[^\p{L}\p{N}_-]+/gu, '_') : id;
    const file = `media/${key}.${extFromMime(rec.mime, rec.name)}`;
    // медиа уже сжаты — упаковываем без повторного сжатия
    zip.file(file, rec.blob, { compression: 'STORE', binary: true });
    let thumb: string | undefined;
    if (rec.thumb) {
      thumb = `thumbs/${id}.${extFromMime(rec.thumb.type)}`;
      zip.file(thumb, rec.thumb, { compression: 'STORE', binary: true });
    }
    const { blob: _b, thumb: _t, createdAt: _c, ...meta } = rec;
    out.set(id, { ...meta, file, thumb });
    onProgress?.(Math.round((i / ids.length) * 40), `Сбор медиа ${i}/${ids.length}`);
  }
  return out;
}

async function generate(zip: JSZip, onProgress?: Progress): Promise<Blob> {
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', streamFiles: true }, (meta) =>
    onProgress?.(40 + Math.round(meta.percent * 0.6), 'Упаковка ZIP'),
  );
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

/** Резервная копия всех страниц и медиа (встроенные страницы — часть сайта, в копию не входят, если их не правили) */
export async function exportAll(onProgress?: Progress): Promise<void> {
  const memorials = getStoredMemorials();
  const zip = new JSZip();
  const ids = [...new Set(memorials.flatMap(mediaIdsOf))];
  const media = await addMedia(zip, ids, onProgress);
  const manifest: ExportManifest = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    memorials,
    media: [...media.values()],
  };
  zip.file('data.json', JSON.stringify(manifest, null, 2));
  zip.file(
    'README.txt',
    'Резервная копия «Наследие».\nВосстановление: Настройки → Импорт из ZIP.\n' +
      `Страниц: ${memorials.length}, медиафайлов: ${media.size}.\n`,
  );
  downloadBlob(await generate(zip, onProgress), `nasledie-backup-${stamp()}.zip`);
}

/** Одна страница: готовый HTML (открывается без программы) + медиа + data.json для импорта */
export async function exportMemorial(m: Memorial, onProgress?: Progress): Promise<void> {
  const zip = new JSZip();
  const media = await addMedia(zip, mediaIdsOf(m), onProgress);
  const manifest: ExportManifest = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    memorials: [m],
    media: [...media.values()],
  };
  zip.file('data.json', JSON.stringify(manifest, null, 2));
  zip.file('qr.png', await qrPngBlob(m.qrUrl), { binary: true });
  zip.file('index.html', renderStaticPage(m, media));
  downloadBlob(await generate(zip, onProgress), `${slugify(m.fullName)}-${stamp()}.zip`);
}

/* ------------------------------------------------------------------ */
/*  Статичная HTML-страница памяти для публикации на любом хостинге    */
/* ------------------------------------------------------------------ */

function renderStaticPage(m: Memorial, media: Map<string, ExportedMedia>): string {
  const e = escapeHtml;
  const src = (id: string | null) => (id && media.get(id)?.file) || '';
  const thumb = (id: string) => media.get(id)?.thumb || src(id);
  const caption = (id: string) => m.captions?.[id] ?? '';
  const figure = (id: string, cls: string) =>
    `<figure class="${cls}"><a href="${src(id)}" target="_blank"><img loading="lazy" src="${thumb(id)}" alt="${e(caption(id))}"></a>${
      caption(id) ? `<figcaption>${e(caption(id))}</figcaption>` : ''
    }</figure>`;
  // абзацы считаем так же, как страница в приложении, — фото привязаны к номеру абзаца
  const para = (t: string) =>
    t
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p, i) => {
        const photos = (m.biographyPhotos?.[i] ?? []).filter((id) => media.has(id));
        const text = `<p>${e(p).replace(/\n/g, '<br>')}</p>`;
        // три фото и больше — лентой под абзацем, как на странице в приложении
        if (photos.length >= 3) return `<div class="para">${text}<div class="strip">${photos.map((id) => figure(id, 'photo')).join('')}</div></div>`;
        return `<div class="para">${photos.map((id) => figure(id, 'bio-photo')).join('')}${text}</div>`;
      })
      .join('');

  const sections: string[] = [];

  if (m.animatedVideoId && src(m.animatedVideoId)) {
    sections.push(`<section><h2>Ожившее фото</h2>
      <video class="alive" src="${src(m.animatedVideoId)}" autoplay muted loop playsinline controls></video></section>`);
  }
  if (m.biography) sections.push(`<section><h2>Биография</h2><div class="bio">${para(m.biography)}</div></section>`);
  if (m.timeline.length) {
    sections.push(`<section><h2>Хронология</h2><ol class="timeline">${m.timeline
      .map(
        (t) =>
          `<li><span class="year">${e(t.year)}</span><h3>${e(t.title)}</h3>${t.text ? `<p>${e(t.text)}</p>` : ''}${
            (t.photoIds ?? [])
              .filter((id) => media.has(id))
              .map((id) => `<a href="${src(id)}" target="_blank"><img class="tl-photo" loading="lazy" src="${thumb(id)}" alt="${e(caption(id))}"></a>`)
              .join('')
          }</li>`,
      )
      .join('')}</ol></section>`);
  }
  const gallery = m.galleryIds.filter((id) => media.has(id));
  if (gallery.length) {
    sections.push(`<section><h2>Фотографии</h2><div class="gallery">${gallery
      .map((id) => figure(id, 'photo'))
      .join('')}</div></section>`);
  }
  const videos = m.videoIds.filter((id) => media.has(id));
  if (videos.length) {
    sections.push(`<section><h2>Видео</h2>${videos
      .map((id) => `<video src="${src(id)}" controls preload="metadata" ${media.get(id)?.thumb ? `poster="${thumb(id)}"` : ''}></video>`)
      .join('')}</section>`);
  }
  const audios = m.audioIds.filter((id) => media.has(id));
  if (audios.length) {
    sections.push(`<section><h2>Голос</h2>${audios
      .map((id) => `<figure><figcaption>${e(media.get(id)!.name)}</figcaption><audio src="${src(id)}" controls preload="metadata"></audio></figure>`)
      .join('')}</section>`);
  }
  if (m.words.length) {
    sections.push(`<section><h2>Слова близких</h2>${m.words
      .map((w) => `<blockquote><p>«${e(w.text)}»</p><cite>${e(w.author)}${w.relation ? `, ${e(w.relation)}` : ''}</cite></blockquote>`)
      .join('')}</section>`);
  }
  if (m.contacts.visible && (m.contacts.email || m.contacts.phone)) {
    sections.push(`<section><h2>Связаться с семьёй</h2><p class="contacts">${[
      m.contacts.email && `<a href="mailto:${e(m.contacts.email)}">${e(m.contacts.email)}</a>`,
      m.contacts.phone && `<a href="tel:${e(m.contacts.phone.replace(/[^\d+]/g, ''))}">${e(m.contacts.phone)}</a>`,
    ]
      .filter(Boolean)
      .join(' · ')}</p></section>`);
  }

  const places = [m.birthPlace, m.deathPlace].filter(Boolean).join(' — ');
  const dates = [m.birthDate && formatDate(m.birthDate), m.deathDate && formatDate(m.deathDate)].filter(Boolean).join(' — ');

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(m.fullName)} — страница памяти</title>
<meta name="description" content="${e(m.epitaph || m.fullName)}">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=PT+Serif:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}body{margin:0;background:#0A0E1A;color:#fff;font:17px/1.7 Inter,system-ui,sans-serif}
main{max-width:860px;margin:0 auto;padding:40px 20px 80px}
.hero{text-align:center;padding:40px 0 20px}
.portrait{width:220px;height:220px;border-radius:50%;object-fit:cover;border:3px solid #B8925A;box-shadow:0 20px 60px -15px #000}
h1{font:700 clamp(32px,6vw,56px)/1.15 'PT Serif',serif;margin:24px 0 8px}
.years{color:#D4B07A;font:400 22px 'PT Serif',serif}.muted{color:#9CA3AF;font-size:15px}
.epitaph{font:italic 22px/1.5 'PT Serif',serif;color:#D4B07A;margin:24px auto 0;max-width:600px}
section{background:#1A1F2E;border:1px solid #3A4050;border-radius:20px;padding:28px;margin-top:28px}
h2{font:700 30px 'PT Serif',serif;margin:0 0 18px;color:#D4B07A}h3{margin:0;font-size:18px}
.timeline{list-style:none;padding:0 0 0 22px;margin:0;border-left:2px solid #B8925A}
.timeline li{position:relative;margin-bottom:22px}.timeline li:before{content:'';position:absolute;left:-30px;top:8px;width:14px;height:14px;border-radius:50%;background:#B8925A}
.year{color:#B8925A;font-weight:600}.timeline p{margin:4px 0 0;color:#9CA3AF}
.gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px}
.gallery img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:12px;display:block}
.gallery figure{margin:0}.gallery figcaption,.bio-photo figcaption{color:#9CA3AF;font-size:13px;line-height:1.4;margin:6px 0 0}
.para{display:flow-root}.bio-photo{float:right;width:220px;margin:6px 0 12px 20px}.bio-photo img{width:100%;border-radius:12px;display:block}
.strip{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.strip figure{margin:0}.strip img{width:100%;aspect-ratio:3/4;object-fit:cover;border-radius:12px;display:block}.strip figcaption{color:#9CA3AF;font-size:13px;line-height:1.4;margin-top:6px}
.tl-photo{display:inline-block;margin:8px 8px 0 0;height:96px;border-radius:10px;object-fit:cover}
@media(max-width:600px){.bio-photo{float:none;width:auto;margin:0 0 12px}}
video{width:100%;border-radius:14px;background:#000;margin-bottom:14px}.alive{max-height:80vh}
audio{width:100%}figure{margin:0 0 14px}figcaption{color:#9CA3AF;font-size:14px;margin-bottom:6px}
blockquote{margin:0 0 20px;padding-left:18px;border-left:3px solid #B8925A}blockquote p{font:italic 20px/1.5 'PT Serif',serif;margin:0}
cite{color:#9CA3AF;font-style:normal;font-size:15px}a{color:#D4B07A}
.qr{text-align:center}.qr img{width:180px;background:#fff;padding:10px;border-radius:12px}
footer{text-align:center;color:#9CA3AF;font-size:14px;margin-top:48px}
#listen{margin-top:28px;display:inline-flex;align-items:center;gap:10px;padding:12px 22px;border-radius:999px;border:1px solid #B8925A;background:rgba(184,146,90,.12);color:#D4B07A;font:600 16px Inter,sans-serif;cursor:pointer}#listen[hidden]{display:none}
</style></head><body><main>
<header class="hero">
${m.portraitId && src(m.portraitId) ? `<img class="portrait" src="${src(m.portraitId)}" alt="${e(m.fullName)}">` : ''}
<h1>${e(m.fullName)}</h1>
<div class="years">${e(lifeYears(m.birthDate, m.deathDate))}</div>
${dates ? `<div class="muted">${e(dates)}</div>` : ''}
${places ? `<div class="muted">${e(places)}</div>` : ''}
${m.epitaph ? `<p class="epitaph">«${e(m.epitaph).replace(/\n/g, '<br>')}»</p>` : ''}
<button id="listen" type="button" hidden>▶ Послушать историю жизни</button>
</header>
${sections.join('\n')}
<section class="qr"><h2>QR-код страницы</h2><img src="qr.png" alt="QR"><p class="muted">${e(m.qrUrl)}</p></section>
<footer>Создано сервисом «Наследие»</footer>
</main>
<script>
// Озвучка биографии: готовый MP3, если он есть, иначе — встроенный синтезатор речи браузера
(function(){
  var parts = ${JSON.stringify(buildNarration(m).map((c) => c.text)).replace(/</g, '\\u003c')};
  var file = ${JSON.stringify(src(m.narrationId ?? null) || null)};
  var btn = document.getElementById('listen');
  if (file){
    var audio = new Audio(file); btn.hidden = false;
    audio.onended = function(){ btn.textContent = '▶ Послушать историю жизни'; };
    btn.onclick = function(){
      if (audio.paused){ audio.play(); btn.textContent = '❚❚ Пауза'; }
      else { audio.pause(); btn.textContent = '▶ Продолжить'; }
    };
    return;
  }
  if (!('speechSynthesis' in window) || !parts.length) return;
  btn.hidden = false;
  var i = 0, playing = false, token = 0;
  function voice(){ var v = speechSynthesis.getVoices().filter(function(x){return /^ru/i.test(x.lang)}); return v[0]; }
  function say(my){
    if (my !== token) return;
    if (i >= parts.length){ i = 0; playing = false; btn.textContent = '▶ Послушать историю жизни'; return; }
    var u = new SpeechSynthesisUtterance(parts[i]); u.lang = 'ru-RU'; var v = voice(); if (v) u.voice = v;
    u.onend = function(){ i++; say(my); };
    speechSynthesis.speak(u);
  }
  btn.onclick = function(){
    token++; speechSynthesis.cancel();
    if (playing){ playing = false; btn.textContent = '▶ Продолжить'; return; }
    playing = true; btn.textContent = '❚❚ Пауза'; say(token);
  };
})();
</script>
</body></html>`;
}
