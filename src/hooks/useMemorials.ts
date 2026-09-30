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
    const cloneList = async (ids: string[]) =>
      (await Promise.all(ids.map((x) => cloneMedia(x)))).filter((x): x is string => !!x);
    const now = new Date().toISOString();
    const copy: Memorial = {
      ...structuredClone(src),
      id: newId,
      fullName: `${src.fullName} (копия)`,
      qrUrl: buildQrUrl(newId),
      portraitId: await cloneMedia(src.portraitId),
      animatedVideoId: await cloneMedia(src.animatedVideoId),
      galleryIds: await cloneList(src.galleryIds),
      videoIds: await cloneList(src.videoIds),
      audioIds: await cloneList(src.audioIds),
      createdAt: now,
      updatedAt: now,
    };
    saveMemorial(copy);
    return copy;
  }, []);

  return { memorials, get, save, remove, duplicate };
}
