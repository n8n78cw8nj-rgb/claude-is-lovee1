import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, FileAudio, FileVideo, Loader2, UploadCloud, X } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useDropzone, type Accept } from 'react-dropzone';
import { notifyError } from '../hooks/useToast';
import { useMediaMeta, useMediaUrl } from '../hooks/useStorage';
import { formatDuration, importFile } from '../lib/media';
import { formatBytes } from '../lib/utils';
import type { MediaKind } from '../types/memorial';

interface Job {
  key: string;
  name: string;
  size: number;
  progress: number;
}

interface Props {
  kind: MediaKind;
  accept: Accept;
  multiple?: boolean;
  /** сколько ещё файлов можно добавить */
  remaining?: number;
  title: string;
  hint?: string;
  compact?: boolean;
  onUploaded: (ids: string[]) => void;
}

/** Drag-and-drop зона: обработка файлов по очереди с прогрессом, сохранение в IndexedDB */
export function FileUploader({ kind, accept, multiple = false, remaining = Infinity, title, hint, compact, onUploaded }: Props) {
  const [jobs, setJobs] = useState<Job[]>([]);

  const onDrop = useCallback(
    async (files: File[]) => {
      let list = files;
      if (list.length > remaining) {
        notifyError(new Error(`можно добавить ещё ${remaining}`), 'Слишком много файлов');
        list = list.slice(0, Math.max(0, remaining));
      }
      if (!list.length) return;
      const batch: Job[] = list.map((f, i) => ({ key: `${Date.now()}-${i}-${f.name}`, name: f.name, size: f.size, progress: 0 }));
      setJobs((j) => [...j, ...batch]);
      const ids: string[] = [];
      for (const [i, file] of list.entries()) {
        const key = batch[i].key;
        try {
          const id = await importFile(file, kind, (p) =>
            setJobs((js) => js.map((j) => (j.key === key ? { ...j, progress: p } : j))),
          );
          ids.push(id);
          // выдаём результат сразу, чтобы превью обновлялось по мере загрузки
          onUploaded([id]);
        } catch (e) {
          notifyError(e, `Не удалось загрузить «${file.name}»`);
        } finally {
          setJobs((js) => js.filter((j) => j.key !== key));
        }
      }
    },
    [kind, onUploaded, remaining],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    disabled: remaining <= 0,
    // HEIC/MKV в некоторых ОС приходят без MIME — дополнительно проверяем сами в importFile
    useFsAccessApi: false,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={`group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed text-center transition ${
          compact ? 'px-4 py-5' : 'px-6 py-8'
        } ${
          isDragActive ? 'border-gold bg-gold/10' : 'border-line bg-field/30 hover:border-gold/60 hover:bg-field/50'
        } ${remaining <= 0 ? 'pointer-events-none opacity-40' : ''}`}
      >
        <input {...getInputProps()} />
        <UploadCloud className={`mb-2 h-8 w-8 transition ${isDragActive ? 'text-gold' : 'text-muted group-hover:text-gold'}`} />
        <div className="font-medium">{isDragActive ? 'Отпустите файлы' : title}</div>
        {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
      </div>

      <AnimatePresence>
        {jobs.map((j) => (
          <motion.div
            key={j.key}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 overflow-hidden rounded-xl bg-field/60 px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="flex min-w-0 items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-gold" />
                <span className="truncate">{j.name}</span>
              </span>
              <span className="shrink-0 text-muted">
                {formatBytes(j.size)} · {Math.round(j.progress)}%
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-bg">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-gold to-gold-light"
                animate={{ width: `${Math.max(4, j.progress)}%` }}
                transition={{ ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/** Плитка загруженного медиа в редакторе */
export function MediaTile({
  id,
  onRemove,
  onMoveLeft,
  onMoveRight,
  className = '',
}: {
  id: string;
  onRemove: () => void;
  onMoveLeft?: () => void;
  onMoveRight?: () => void;
  className?: string;
}) {
  const meta = useMediaMeta(id);
  const url = useMediaUrl(meta?.hasThumb || meta?.kind === 'image' ? id : null, 'thumb');
  const Icon = meta?.kind === 'audio' ? FileAudio : FileVideo;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`group relative overflow-hidden rounded-xl border border-line bg-field ${className}`}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 p-2 text-center text-muted">
          <Icon className="h-6 w-6 text-gold" />
          <span className="line-clamp-2 break-all text-[10px] leading-tight">{meta?.name}</span>
        </div>
      )}
      {meta && meta.kind !== 'image' && (
        <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px]">
          {formatDuration(meta.duration) || formatBytes(meta.size)}
        </span>
      )}
      <div className="absolute inset-0 flex items-start justify-between bg-black/0 p-1 opacity-100 transition group-hover:bg-black/40 md:opacity-0 md:group-hover:opacity-100">
        <div className="flex gap-0.5">
          {onMoveLeft && (
            <button type="button" onClick={onMoveLeft} className="rounded-md bg-black/60 p-1 hover:bg-black/80" aria-label="Левее">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
          )}
          {onMoveRight && (
            <button type="button" onClick={onMoveRight} className="rounded-md bg-black/60 p-1 hover:bg-black/80" aria-label="Правее">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <button type="button" onClick={onRemove} className="rounded-md bg-danger/90 p-1 hover:bg-danger" aria-label="Удалить">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </motion.div>
  );
}
