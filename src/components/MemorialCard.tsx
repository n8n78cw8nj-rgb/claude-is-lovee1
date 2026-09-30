import { motion } from 'framer-motion';
import { Check, Copy, Download, Eye, Image, Pencil, QrCode, Sparkles, Trash2, Video } from 'lucide-react';
import { useMediaUrl } from '../hooks/useStorage';
import type { Memorial } from '../types/memorial';
import { initials, lifeYears } from '../lib/utils';
import { IconButton } from './Button';

export function Portrait({
  id,
  name,
  className = '',
  variant = 'thumb',
}: {
  id: string | null;
  name: string;
  className?: string;
  variant?: 'thumb' | 'full';
}) {
  const url = useMediaUrl(id, variant);
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br from-field to-card ${className}`}>
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-serif text-4xl text-gold/70">
          {initials(name) || '✦'}
        </div>
      )}
    </div>
  );
}

interface Props {
  memorial: Memorial;
  index: number;
  onView: () => void;
  onEdit: () => void;
  onQr: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onExport: () => void;
}

export function MemorialCard({ memorial: m, index, onView, onEdit, onQr, onDelete, onDuplicate, onExport }: Props) {
  const photos = m.galleryIds.length + (m.portraitId ? 1 : 0);
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.5, ease: 'easeOut', delay: (index % 3) * 0.08 }}
      whileHover={{ y: -6 }}
      className="card group relative flex flex-col overflow-hidden transition-shadow hover:shadow-gold"
    >
      <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-xl bg-bg/60 p-1 opacity-100 backdrop-blur transition md:opacity-0 md:group-hover:opacity-100">
        <IconButton icon={Copy} label="Дублировать" onClick={onDuplicate} />
        <IconButton icon={Download} label="Экспорт ZIP" onClick={onExport} />
      </div>

      <button onClick={onView} className="relative block aspect-[4/3] w-full overflow-hidden" aria-label={`Открыть ${m.fullName}`}>
        <Portrait id={m.portraitId} name={m.fullName} className="h-full w-full transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
        {m.animatedVideoId && (
          <span className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-gold/90 px-3 py-1 text-xs font-semibold text-bg">
            <Sparkles className="h-3.5 w-3.5" /> Оживлено
          </span>
        )}
      </button>

      <div className="flex flex-1 flex-col p-6 pt-2">
        <h3 className="font-serif text-xl font-bold leading-snug sm:text-2xl">{m.fullName || 'Без имени'}</h3>
        <div className="mt-1 font-serif text-lg text-gold-light">{lifeYears(m.birthDate, m.deathDate)}</div>
        {m.epitaph && <p className="mt-2 line-clamp-2 text-sm italic text-muted">«{m.epitaph}»</p>}

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted">
          <span className="flex items-center gap-1.5" title="Фото">
            <Image className="h-4 w-4 text-gold" /> {photos}
          </span>
          <span className="flex items-center gap-1.5" title="Видео">
            <Video className="h-4 w-4 text-gold" /> {m.videoIds.length}
          </span>
          <span className="flex items-center gap-1.5" title="Оживление">
            <Sparkles className="h-4 w-4 text-gold" />
            {m.animatedVideoId ? <Check className="h-4 w-4 text-success" /> : '—'}
          </span>
        </div>

        <div className="mt-auto grid grid-cols-4 gap-1.5 pt-5">
          {[
            { icon: Eye, label: 'Просмотр', onClick: onView, cls: 'hover:text-gold-light' },
            { icon: Pencil, label: 'Редактор', onClick: onEdit, cls: 'hover:text-gold-light' },
            { icon: QrCode, label: 'QR', onClick: onQr, cls: 'hover:text-gold-light' },
            { icon: Trash2, label: 'Удалить', onClick: onDelete, cls: 'hover:text-danger' },
          ].map((b) => (
            <button
              key={b.label}
              onClick={b.onClick}
              className={`flex flex-col items-center gap-1 rounded-xl bg-field/50 px-1 py-2.5 text-[11px] text-muted transition hover:bg-field sm:text-xs ${b.cls}`}
            >
              <b.icon className="h-4 w-4" />
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </motion.article>
  );
}
