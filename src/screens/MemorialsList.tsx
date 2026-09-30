import { AnimatePresence, motion } from 'framer-motion';
import { BookHeart, Plus, Search, Wand2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Button } from '../components/Button';
import { MemorialCard } from '../components/MemorialCard';
import { ConfirmModal } from '../components/Modal';
import { useMemorials } from '../hooks/useMemorials';
import { useNav } from '../hooks/useNav';
import { notifyError } from '../hooks/useToast';
import { seedDemo } from '../lib/demo';
import { exportMemorial } from '../lib/export';
import { plural } from '../lib/utils';

type Sort = 'updated' | 'name' | 'birth';

export function useDemoSeeder() {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    const t = toast.loading('Создаём демо-страницы…');
    try {
      const n = await seedDemo((d, total) => toast.loading(`Создаём демо-страницы… ${d}/${total}`, { id: t }));
      toast.success(`Добавлено ${n} демо-страниц`, { id: t });
    } catch (e) {
      toast.dismiss(t);
      notifyError(e, 'Не удалось создать демо');
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

export async function exportWithToast(m: Parameters<typeof exportMemorial>[0]) {
  const t = toast.loading('Готовим ZIP…');
  try {
    await exportMemorial(m, (p, label) => toast.loading(`${label} — ${p}%`, { id: t }));
    toast.success('ZIP со страницей скачан', { id: t });
  } catch (e) {
    toast.dismiss(t);
    notifyError(e, 'Ошибка экспорта');
  }
}

export function MemorialsList() {
  const { memorials, remove, duplicate } = useMemorials();
  const { go } = useNav();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>('updated');
  const [toDelete, setToDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const demo = useDemoSeeder();

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? memorials.filter((m) =>
          [m.fullName, m.birthPlace, m.deathPlace, m.epitaph].some((f) => f.toLowerCase().includes(q)),
        )
      : memorials;
    return [...filtered].sort((a, b) =>
      sort === 'name'
        ? a.fullName.localeCompare(b.fullName, 'ru')
        : sort === 'birth'
          ? (a.birthDate || '9999').localeCompare(b.birthDate || '9999')
          : b.updatedAt.localeCompare(a.updatedAt),
    );
  }, [memorials, query, sort]);

  const target = memorials.find((m) => m.id === toDelete);

  return (
    <section id="pages" className="section scroll-mt-16">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
        >
          <div>
            <h2 className="text-4xl font-bold sm:text-5xl">Мои страницы памяти</h2>
            <p className="mt-3 text-muted">
              {memorials.length
                ? `${memorials.length} ${plural(memorials.length, 'страница', 'страницы', 'страниц')} · хранятся локально в этом браузере`
                : 'Пока нет ни одной страницы'}
            </p>
          </div>
          <Button variant="gold" size="lg" icon={Plus} onClick={() => go({ name: 'editor', id: null })}>
            Создать новую страницу
          </Button>
        </motion.div>

        {memorials.length > 0 && (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                className="field pl-11"
                placeholder="Поиск по имени, месту, эпитафии…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select className="field sm:w-60" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
              <option value="updated">Сначала изменённые</option>
              <option value="name">По алфавиту</option>
              <option value="birth">По году рождения</option>
            </select>
          </div>
        )}

        {memorials.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="card mt-10 flex flex-col items-center px-6 py-16 text-center"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gold/10">
              <BookHeart className="h-10 w-10 text-gold" />
            </div>
            <h3 className="mt-6 font-serif text-3xl font-bold">Создайте первую страницу памяти</h3>
            <p className="mt-3 max-w-lg text-muted">
              Загрузите портрет, фотографии и видео, напишите биографию — и получите QR-табличку для памятника.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button variant="gold" size="lg" icon={Plus} onClick={() => go({ name: 'editor', id: null })}>
                Создать страницу
              </Button>
              <Button size="lg" icon={Wand2} loading={demo.busy} onClick={demo.run}>
                Загрузить 10 примеров
              </Button>
            </div>
          </motion.div>
        ) : list.length === 0 ? (
          <div className="mt-16 text-center text-muted">Ничего не найдено по запросу «{query}»</div>
        ) : (
          <motion.div layout className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {list.map((m, i) => (
                <MemorialCard
                  key={m.id}
                  memorial={m}
                  index={i}
                  onView={() => go({ name: 'viewer', id: m.id, from: 'home' })}
                  onEdit={() => go({ name: 'editor', id: m.id })}
                  onQr={() => go({ name: 'qr', id: m.id })}
                  onDelete={() => setToDelete(m.id)}
                  onDuplicate={async () => {
                    try {
                      const c = await duplicate(m.id);
                      if (c) toast.success('Страница продублирована');
                    } catch (e) {
                      notifyError(e, 'Не удалось дублировать');
                    }
                  }}
                  onExport={() => exportWithToast(m)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        loading={deleting}
        title="Удалить страницу?"
        text={
          <>
            Страница <b className="text-white">«{target?.fullName}»</b> и все её фото, видео и аудио будут удалены из
            браузера без возможности восстановления. Сначала можно сделать экспорт в ZIP.
          </>
        }
        onConfirm={async () => {
          if (!toDelete) return;
          setDeleting(true);
          try {
            await remove(toDelete);
            toast.success('Страница удалена');
          } catch (e) {
            notifyError(e, 'Ошибка удаления');
          } finally {
            setDeleting(false);
            setToDelete(null);
          }
        }}
      />
    </section>
  );
}
