import { motion } from 'framer-motion';
import type { TimelineEvent } from '../types/memorial';

export function Timeline({ items }: { items: TimelineEvent[] }) {
  const list = items.filter((t) => t.year || t.title || t.text);
  if (!list.length) return null;
  return (
    <ol className="relative ml-3 border-l-2 border-gold/40 sm:ml-[7.5rem]">
      {list.map((t, i) => (
        <motion.li
          key={i}
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
          className="relative mb-10 pl-8 last:mb-0"
        >
          <span className="absolute -left-[9px] top-1.5 h-4 w-4 rounded-full border-2 border-bg bg-gold shadow-[0_0_0_4px_rgba(184,146,90,0.2)]" />
          <div className="font-serif text-2xl font-bold text-gold-light sm:absolute sm:-left-[7.5rem] sm:top-0 sm:w-24 sm:text-right">
            {t.year}
          </div>
          <h4 className="text-lg font-semibold sm:text-xl">{t.title}</h4>
          {t.text && <p className="mt-1 text-muted">{t.text}</p>}
        </motion.li>
      ))}
    </ol>
  );
}
