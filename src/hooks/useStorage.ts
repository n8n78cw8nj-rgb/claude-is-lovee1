import { useEffect, useState } from 'react';
import type { MediaMeta } from '../types/memorial';
import { getMedia, listMediaMeta, mediaUrl, storageEstimate } from '../lib/storage';
import { useMemorials } from './useMemorials';

/** object URL для медиа из IndexedDB */
export function useMediaUrl(id: string | null | undefined, variant: 'full' | 'thumb' = 'full') {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    setUrl(null);
    if (id) mediaUrl(id, variant).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [id, variant]);
  return url;
}

/** Метаданные медиа (имя, размер, длительность) без загрузки Blob в React-состояние */
export function useMediaMeta(id: string | null | undefined) {
  const [meta, setMeta] = useState<(MediaMeta & { hasThumb: boolean }) | null>(null);
  useEffect(() => {
    let alive = true;
    setMeta(null);
    if (id)
      getMedia(id).then((r) => {
        if (!alive || !r) return;
        const { blob: _b, thumb, ...rest } = r;
        setMeta({ ...rest, hasThumb: !!thumb });
      });
    return () => {
      alive = false;
    };
  }, [id]);
  return meta;
}

export interface Stats {
  pages: number;
  photos: number;
  videos: number;
  animated: number;
  audio: number;
  bytes: number;
  usage: number | null;
  quota: number | null;
  orphans: number;
}

export function useStats(refreshKey = 0): Stats | null {
  const { memorials } = useMemorials();
  const [stats, setStats] = useState<Stats | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      const [meta, est] = await Promise.all([listMediaMeta(), storageEstimate()]);
      const byId = new Map<string, MediaMeta>(meta.map((m) => [m.id, m]));
      const used = new Set<string>();
      let photos = 0, videos = 0, animated = 0, audio = 0;
      for (const m of memorials) {
        photos += m.galleryIds.length + (m.portraitId ? 1 : 0);
        videos += m.videoIds.length;
        audio += m.audioIds.length;
        if (m.animatedVideoId) animated++;
        [m.portraitId, m.animatedVideoId, ...m.galleryIds, ...m.videoIds, ...m.audioIds].forEach((x) => x && used.add(x));
      }
      const bytes = [...byId.values()].reduce((s, m) => s + m.size, 0);
      if (alive)
        setStats({
          pages: memorials.length, photos, videos, animated, audio, bytes,
          usage: est?.usage ?? null,
          quota: est?.quota ?? null,
          orphans: meta.filter((m) => !used.has(m.id)).length,
        });
    })();
    return () => {
      alive = false;
    };
  }, [memorials, refreshKey]);
  return stats;
}
