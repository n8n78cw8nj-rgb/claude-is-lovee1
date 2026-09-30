import { Download, FileAudio, Film } from 'lucide-react';
import { useMediaMeta, useMediaUrl } from '../hooks/useStorage';
import { canPlay, formatDuration } from '../lib/media';
import { downloadBlob, formatBytes } from '../lib/utils';
import { getMedia } from '../lib/storage';

async function download(id: string) {
  const rec = await getMedia(id);
  if (rec) downloadBlob(rec.blob, rec.name);
}

function Unsupported({ id, name, size }: { id: string; name: string; size: number }) {
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-2xl bg-bg/80 p-6 text-center">
      <Film className="h-10 w-10 text-gold" />
      <div className="text-sm text-muted">
        Браузер не умеет воспроизводить этот формат ({name.split('.').pop()?.toUpperCase()}).
        <br />
        Файл сохранён — его можно скачать и открыть в плеере.
      </div>
      <button onClick={() => download(id)} className="flex items-center gap-2 rounded-xl bg-field px-4 py-2 text-sm hover:bg-line">
        <Download className="h-4 w-4" /> Скачать ({formatBytes(size)})
      </button>
    </div>
  );
}

interface VideoProps {
  id: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  className?: string;
  showTitle?: boolean;
}

/** Нативный HTML5-плеер для видео из IndexedDB */
export function VideoPlayer({ id, autoPlay, loop, muted, className = '', showTitle }: VideoProps) {
  const meta = useMediaMeta(id);
  const url = useMediaUrl(id, 'full');
  const poster = useMediaUrl(meta?.hasThumb ? id : null, 'thumb');

  if (!meta || !url) return <div className={`aspect-video w-full animate-pulse rounded-2xl bg-field ${className}`} />;
  // Проверяем по MIME, но всё равно пытаемся играть, если браузер «не уверен» и превью получилось
  if (!canPlay(meta.mime) && !meta.hasThumb) return <Unsupported id={id} name={meta.name} size={meta.size} />;

  return (
    <figure className={className}>
      <video
        src={url}
        poster={poster ?? undefined}
        controls
        playsInline
        preload="metadata"
        autoPlay={autoPlay}
        loop={loop}
        muted={muted ?? autoPlay}
        className="w-full rounded-2xl bg-black shadow-deep"
      />
      {showTitle && (
        <figcaption className="mt-2 flex justify-between gap-2 text-sm text-muted">
          <span className="truncate">{meta.name.replace(/\.[^.]+$/, '')}</span>
          <span className="shrink-0">{formatDuration(meta.duration)}</span>
        </figcaption>
      )}
    </figure>
  );
}

export function AudioPlayer({ id }: { id: string }) {
  const meta = useMediaMeta(id);
  const url = useMediaUrl(id, 'full');
  if (!meta || !url) return <div className="h-20 animate-pulse rounded-2xl bg-field" />;
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line/70 bg-field/40 p-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gold/15">
        <FileAudio className="h-6 w-6 text-gold" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex justify-between gap-2 text-sm">
          <span className="truncate">{meta.name.replace(/\.[^.]+$/, '')}</span>
          <span className="shrink-0 text-muted">{formatDuration(meta.duration)}</span>
        </div>
        <audio src={url} controls preload="metadata" className="h-10 w-full" />
      </div>
    </div>
  );
}
