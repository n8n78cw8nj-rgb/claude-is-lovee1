import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/captions.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import { useMediaUrl } from '../hooks/useStorage';
import { mediaUrl } from '../lib/storage';

type Captions = Record<string, string> | undefined;

function Thumb({ id, caption, onClick, index }: { id: string; caption?: string; onClick: () => void; index: number }) {
  const url = useMediaUrl(id, 'thumb');
  return (
    <motion.figure
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: Math.min(index, 12) * 0.03 }}
      className="min-w-0"
    >
      <motion.button
        whileHover={{ scale: 1.03 }}
        onClick={onClick}
        aria-label={caption || 'Открыть фото'}
        className="block aspect-square w-full overflow-hidden rounded-xl bg-field shadow-deep"
      >
        {url && <img src={url} alt={caption ?? ''} loading="lazy" className="h-full w-full object-cover" draggable={false} />}
      </motion.button>
      {caption && <figcaption className="mt-2 line-clamp-2 text-sm leading-snug text-muted">{caption}</figcaption>}
    </motion.figure>
  );
}

/** Сетка миниатюр с подписями; клик открывает фото крупно */
export function Gallery({ ids, captions, onOpen }: { ids: string[]; captions: Captions; onOpen: (index: number) => void }) {
  if (!ids.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {ids.map((id, i) => (
        <Thumb key={id} id={id} index={i} caption={captions?.[id]} onClick={() => onOpen(i)} />
      ))}
    </div>
  );
}

/** Фото крупно, с зумом и подписью; листаются все фото страницы */
export function PhotoLightbox({ ids, captions, index, onClose }: { ids: string[]; captions: Captions; index: number; onClose: () => void }) {
  const [slides, setSlides] = useState<{ id: string; src: string; description?: string }[]>([]);
  const open = index >= 0;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    Promise.all(ids.map((id) => mediaUrl(id, 'full'))).then((urls) => {
      if (alive) setSlides(ids.flatMap((id, i) => (urls[i] ? [{ id, src: urls[i]!, description: captions?.[id] }] : [])));
    });
    return () => {
      alive = false;
    };
  }, [open, ids, captions]);

  return (
    <Lightbox
      open={open && slides.length > 0}
      index={Math.max(0, slides.findIndex((s) => s.id === ids[index]))}
      close={onClose}
      slides={slides}
      plugins={[Zoom, Counter, Captions]}
      zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
      captions={{ descriptionTextAlign: 'center', descriptionMaxLines: 4 }}
      styles={{ container: { backgroundColor: 'rgba(5,7,14,0.96)' } }}
    />
  );
}

/** Фото у абзаца или события: миниатюра-кнопка, размер картинки задаёт imgClassName */
export function PhotoButton({
  id,
  caption,
  onOpen,
  className = 'block',
  imgClassName = 'h-full w-full object-cover',
}: {
  id: string;
  caption?: string;
  onOpen: () => void;
  className?: string;
  imgClassName?: string;
}) {
  const url = useMediaUrl(id, 'thumb');
  return (
    <button onClick={onOpen} aria-label={caption || 'Открыть фото'} className={`overflow-hidden rounded-xl bg-field shadow-deep ${className}`}>
      {url ? (
        <img src={url} alt={caption ?? ''} loading="lazy" className={`transition-transform duration-500 hover:scale-105 ${imgClassName}`} draggable={false} />
      ) : (
        <div className="aspect-[4/3] w-full" />
      )}
    </button>
  );
}
