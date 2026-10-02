import JSZip from 'jszip';
import type { Memorial } from '../types/memorial';
import { EXPORT_FORMAT, type ExportManifest } from './export';
import { storeBlob } from './media';
import { buildQrUrl, getMemorials, isStaticMedia, normalizeMemorial, saveMemorials } from './storage';
import { uid } from './utils';

export interface ImportResult {
  memorials: number;
  media: number;
  replaced: number;
}

type Progress = (percent: number, label: string) => void;

/**
 * Импорт ZIP, созданного экспортом «Наследия» (полная копия или одна страница).
 * mode = 'replace' — страницы с тем же id перезаписываются (восстановление копии);
 * mode = 'copy'    — всем страницам и медиа выдаются новые id (добавить как копии).
 */
export async function importZip(
  file: File,
  mode: 'replace' | 'copy' = 'replace',
  onProgress?: Progress,
): Promise<ImportResult> {
  onProgress?.(2, 'Чтение архива');
  const zip = await JSZip.loadAsync(file);
  const manifestFile = zip.file('data.json') ?? zip.file(/(^|\/)data\.json$/)[0];
  if (!manifestFile) throw new Error('В архиве нет data.json — это не экспорт «Наследия»');

  const root = manifestFile.name.replace(/data\.json$/, '');
  let manifest: ExportManifest;
  try {
    manifest = JSON.parse(await manifestFile.async('string'));
  } catch {
    throw new Error('data.json повреждён');
  }
  if (manifest.format !== EXPORT_FORMAT || !Array.isArray(manifest.memorials)) {
    throw new Error('Неизвестный формат архива');
  }

  const idMap = new Map<string, string>();
  // файлы сайта («/images/…») из архива сохраняются в браузер под обычными id
  const mapId = (id: string) => {
    if (mode === 'replace' && !isStaticMedia(id)) return id;
    if (!idMap.has(id)) idMap.set(id, uid());
    return idMap.get(id)!;
  };

  // 1. Медиа
  const mediaList = manifest.media ?? [];
  let stored = 0;
  for (const [i, meta] of mediaList.entries()) {
    const entry = zip.file(root + meta.file);
    if (!entry) continue;
    const blob = await entry.async('blob');
    const thumbEntry = meta.thumb ? zip.file(root + meta.thumb) : null;
    const thumbRaw = thumbEntry ? await thumbEntry.async('blob') : null;
    const thumb = thumbRaw ? new Blob([thumbRaw], { type: 'image/webp' }) : null;
    await storeBlob(blob, meta.kind, meta.name, {
      id: mapId(meta.id),
      mime: meta.mime,
      thumb,
      width: meta.width,
      height: meta.height,
      duration: meta.duration,
    });
    stored++;
    onProgress?.(5 + Math.round(((i + 1) / mediaList.length) * 90), `Медиа ${i + 1}/${mediaList.length}`);
  }

  // 2. Метаданные
  const existing = new Set(getMemorials().map((m) => m.id));
  let replaced = 0;
  const memorials: Memorial[] = manifest.memorials.map((raw) => {
    const n = normalizeMemorial(raw);
    const remap = (id: string | null | undefined) => (id ? mapId(id) : null);
    const m: Memorial = {
      ...n,
      portraitId: remap(n.portraitId),
      animatedVideoId: remap(n.animatedVideoId),
      narrationId: remap(n.narrationId),
      galleryIds: n.galleryIds.map(mapId),
      biographyPhotos: n.biographyPhotos?.map((list) => list.map(mapId)),
      timeline: n.timeline.map((t) => ({ ...t, photoIds: t.photoIds?.map(mapId) })),
      captions: n.captions && Object.fromEntries(Object.entries(n.captions).map(([id, c]) => [mapId(id), c])),
      videoIds: n.videoIds.map(mapId),
      audioIds: n.audioIds.map(mapId),
    };
    if (mode === 'copy') {
      const newId = uid();
      return { ...m, id: newId, qrUrl: buildQrUrl(newId), builtinRev: undefined };
    }
    if (existing.has(m.id)) replaced++;
    return m;
  });

  // Оставляем только ссылки на реально импортированные медиа
  const available = new Set(mediaList.filter((x) => zip.file(root + x.file)).map((x) => mapId(x.id)));
  const clean = memorials.map((m) => {
    const keep = (id: string) => available.has(id);
    return {
      ...m,
      portraitId: m.portraitId && keep(m.portraitId) ? m.portraitId : null,
      animatedVideoId: m.animatedVideoId && keep(m.animatedVideoId) ? m.animatedVideoId : null,
      narrationId: m.narrationId && keep(m.narrationId) ? m.narrationId : null,
      biographyPhotos: m.biographyPhotos?.map((list) => list.filter(keep)),
      timeline: m.timeline.map((t) => ({ ...t, photoIds: t.photoIds?.filter(keep) })),
      captions: m.captions && Object.fromEntries(Object.entries(m.captions).filter(([id]) => keep(id))),
      galleryIds: m.galleryIds.filter(keep),
      videoIds: m.videoIds.filter(keep),
      audioIds: m.audioIds.filter(keep),
    };
  });

  saveMemorials(clean);
  onProgress?.(100, 'Готово');
  return { memorials: clean.length, media: stored, replaced };
}
