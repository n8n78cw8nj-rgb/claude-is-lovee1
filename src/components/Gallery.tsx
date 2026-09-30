import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import Counter from 'yet-another-react-lightbox/plugins/counter';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/counter.css';
import { useMediaUrl } from '../hooks/useStorage';
import { mediaUrl } from '../lib/storage';

function Thumb({ id, onClick, index }: { id: string; onClick: () => void; index: number }) {
  const url = useMediaUrl(id, 'thumb');
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.96 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: Math.min(index, 12) * 0.03 }}
      whileHover={{ scale: 1.03 }}
      onClick={onClick}
      className="aspect-square overflow-hidden rounded-xl bg-field shadow-deep"
    >
      {url && <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" draggable={false} />}
    </motion.button>
  );
}

export function Gallery({ ids }: { ids: string[] }) {
  const [index, setIndex] = useState(-1);
  const [slides, setSlides] = useState<{ src: string }[]>([]);

  const open = index >= 0;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    Promise.all(ids.map((id) => mediaUrl(id, 'full'))).then((urls) => {
      if (alive) setSlides(urls.filter((u): u is string => !!u).map((src) => ({ src })));
    });
    return () => {
      alive = false;
    };
  }, [open, ids]);

  if (!ids.length) return null;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {ids.map((id, i) => (
          <Thumb key={id} id={id} index={i} onClick={() => setIndex(i)} />
        ))}
      </div>
      <Lightbox
        open={open && slides.length > 0}
        index={index}
        close={() => setIndex(-1)}
        slides={slides}
        plugins={[Zoom, Counter]}
        zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
        styles={{ container: { backgroundColor: 'rgba(5,7,14,0.96)' } }}
      />
    </>
  );
}
