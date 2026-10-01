import { useCallback, useSyncExternalStore } from 'react';
import type { Memorial } from '../types/memorial';
import {
  buildQrUrl,
  cloneMedia,
  getMemorials,
  removeMemorial,
  saveMemorial,
  subscribeMemorials,
} from '../lib/storage';
import { uid } from '../lib/utils';

export function useMemorials() {
  const memorials = useSyncExternalStore(subscribeMemorials, getMemorials, getMemorials);

  const get = useCallback((id: string | null | undefined) => memorials.find((m) => m.id === id), [memorials]);

  const save = useCallback((m: Memorial) => saveMemorial({ ...m, updatedAt: new Date().toISOString() }), []);

  const remove = useCallback((id: string) => removeMemorial(id), []);

  /** Полная копия страницы вместе с медиа */
  const duplicate = useCallback(async (id: string): Promise<Memorial | null> => {
    const src = getMemorials().find((m) => m.id === id);
    if (!src) return null;
    const newId = uid();
    // одно фото может стоять и в галерее, и у абзаца, и у события — копируем его один раз
    const copies = new Map<string, Promise<string | null>>();
    const clone = (id: string | null | undefined) => {
      if (!id) return Promise.resolve(null);
      if (!copies.has(id)) copies.set(id, cloneMedia(id));
      return copies.get(id)!;
    };
    const cloneList = async (ids: string[]) => (await Promise.all(ids.map(clone))).filter((x): x is string => !!x);
    const captions = await Promise.all(Object.entries(src.captions ?? {}).map(async ([id, c]) => [await clone(id), c] as const));
    const now = new Date().toISOString();
    const copy: Memorial = {
      ...structuredClone(src),
      id: newId,
      fullName: `${src.fullName} (копия)`,
      qrUrl: buildQrUrl(newId),
      portraitId: await clone(src.portraitId),
      animatedVideoId: await clone(src.animatedVideoId),
      narrationId: await clone(src.narrationId),
      galleryIds: await cloneList(src.galleryIds),
      biographyPhotos: src.biographyPhotos && (await Promise.all(src.biographyPhotos.map(cloneList))),
      timeline: await Promise.all(src.timeline.map(async (t) => ({ ...t, photoIds: await cloneList(t.photoIds ?? []) }))),
      captions: Object.fromEntries(captions.filter(([id]) => id)),
      videoIds: await cloneList(src.videoIds),
      audioIds: await cloneList(src.audioIds),
      createdAt: now,
      updatedAt: now,
      builtinRev: undefined,
    };
    saveMemorial(copy);
    return copy;
  }, []);

  return { memorials, get, save, remove, duplicate };
}
