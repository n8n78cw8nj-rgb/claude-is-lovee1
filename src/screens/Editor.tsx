import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  AudioLines,
  BookOpen,
  Clock,
  Eye,
  Image as ImageIcon,
  MessageSquareQuote,
  Phone,
  Plus,
  Save,
  Sparkles,
  Trash2,
  User,
  Video,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Button, IconButton } from '../components/Button';
import { FileUploader, MediaTile } from '../components/FileUploader';
import { Input, Textarea, Toggle } from '../components/Input';
import { Portrait } from '../components/MemorialCard';
import { ConfirmModal, Modal } from '../components/Modal';
import { AudioPlayer, VideoPlayer } from '../components/VideoPlayer';
import { useMemorials } from '../hooks/useMemorials';
import { useNav } from '../hooks/useNav';
import { useMediaUrl } from '../hooks/useStorage';
import { notifyError } from '../hooks/useToast';
import { ACCEPT, LIMITS } from '../lib/media';
import { deleteMedia, emptyMemorial, mediaIdsOf, requestPersistence } from '../lib/storage';
import { lifeYears } from '../lib/utils';
import type { Memorial } from '../types/memorial';

/* ---------------------------------------------------------------- */

function Section({
  icon: Icon,
  title,
  hint,
  children,
  delay = 0,
}: {
  icon: typeof User;
  title: string;
  hint?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: 'easeOut', delay }}
      className="card p-5 sm:p-6"
    >
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-xl font-bold">{title}</h3>
          {hint && <p className="mt-0.5 text-sm text-muted">{hint}</p>}
        </div>
      </div>
      {children}
    </motion.section>
  );
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [x] = next.splice(from, 1);
  next.splice(to, 0, x);
  return next;
}

/* ---------------- превью в реальном времени ---------------- */

function Thumb({ id }: { id: string }) {
  const url = useMediaUrl(id, 'thumb');
  return <div className="aspect-square overflow-hidden rounded-md bg-field">{url && <img src={url} alt="" className="h-full w-full object-cover" />}</div>;
}

function LivePreview({ m }: { m: Memorial }) {
  const animatedPoster = useMediaUrl(m.animatedVideoId, 'thumb');
  return (
    <div className="overflow-hidden rounded-3xl border border-line/70 bg-bg shadow-deep">
      <div className="relative bg-gradient-to-b from-card to-bg px-5 pb-6 pt-8 text-center">
        <Portrait id={m.portraitId} name={m.fullName} className="mx-auto h-28 w-28 rounded-full border-2 border-gold shadow-gold" />
        <div className="mt-4 font-serif text-2xl font-bold leading-tight">{m.fullName || 'ФИО'}</div>
        <div className="mt-1 font-serif text-gold-light">{lifeYears(m.birthDate, m.deathDate) || '— —'}</div>
        {m.epitaph && <div className="mt-3 font-serif text-sm italic text-gold-light/90">«{m.epitaph}»</div>}
      </div>
      <div className="space-y-4 px-5 pb-6 text-sm">
        {m.animatedVideoId && (
          <div className="relative overflow-hidden rounded-xl bg-field">
            {animatedPoster ? <img src={animatedPoster} alt="" className="aspect-video w-full object-cover" /> : <div className="aspect-video" />}
            <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold text-bg">
              <Sparkles className="h-3 w-3" /> Оживление
            </span>
          </div>
        )}
        {m.biography && <p className="line-clamp-4 text-muted">{m.biography}</p>}
        {m.timeline.length > 0 && (
          <div className="space-y-1 border-l-2 border-gold/40 pl-3">
            {m.timeline.slice(0, 4).map((t, i) => (
              <div key={i} className="truncate">
                <span className="font-semibold text-gold">{t.year}</span> {t.title}
              </div>
            ))}
          </div>
        )}
        {m.galleryIds.length > 0 && (
          <div className="grid grid-cols-4 gap-1.5">
            {m.galleryIds.slice(0, 8).map((id) => (
              <Thumb key={id} id={id} />
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-3 text-xs text-muted">
          <span>📷 {m.galleryIds.length}</span>
          <span>🎬 {m.videoIds.length}</span>
          <span>🎙 {m.audioIds.length}</span>
          <span>💬 {m.words.length}</span>
        </div>
        {m.words[0]?.text && (
          <blockquote className="border-l-2 border-gold pl-3 font-serif italic">
            «{m.words[0].text}»<div className="mt-1 font-sans text-xs not-italic text-muted">{m.words[0].author}</div>
          </blockquote>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */

export function Editor({ id }: { id: string | null }) {
  const { get, save } = useMemorials();
  const { go, goHome } = useNav();
  const [original] = useState(() => (id ? get(id) : undefined));
  const [m, setM] = useState<Memorial>(() => (original ? structuredClone(original) : emptyMemorial()));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  // медиа, загруженные в этой сессии редактора; при отмене — удаляем
  const uploads = useRef(new Set<string>());
  const savedIds = useRef(new Set(original ? mediaIdsOf(original) : []));
  const committed = useRef(false);

  useEffect(() => {
    void requestPersistence();
    return () => {
      // уход без сохранения — чистим загруженное в этой сессии
      if (!committed.current) {
        const orphan = [...uploads.current].filter((x) => !savedIds.current.has(x));
        void deleteMedia(orphan);
      }
    };
  }, []);

  const set = useCallback(<K extends keyof Memorial>(key: K, value: Memorial[K] | ((prev: Memorial[K]) => Memorial[K])) => {
    setDirty(true);
    setM((prev) => ({
      ...prev,
      [key]: typeof value === 'function' ? (value as (p: Memorial[K]) => Memorial[K])(prev[key]) : value,
    }));
  }, []);

  const track = (ids: string[]) => ids.forEach((x) => uploads.current.add(x));

  const onGallery = useCallback((ids: string[]) => { track(ids); set('galleryIds', (p) => [...p, ...ids]); }, [set]);
  const onVideos = useCallback((ids: string[]) => { track(ids); set('videoIds', (p) => [...p, ...ids]); }, [set]);
  const onAudio = useCallback((ids: string[]) => { track(ids); set('audioIds', (p) => [...p, ...ids]); }, [set]);
  const onPortrait = useCallback((ids: string[]) => { track(ids); set('portraitId', ids[0]); }, [set]);
  const onAnimated = useCallback((ids: string[]) => { track(ids); set('animatedVideoId', ids[0]); }, [set]);

  const persist = async (): Promise<boolean> => {
    if (!m.fullName.trim()) {
      toast.error('Укажите ФИО');
      document.getElementById('field-fullname')?.focus();
      return false;
    }
    if (m.birthDate && m.deathDate && m.birthDate > m.deathDate) {
      toast.error('Дата смерти раньше даты рождения');
      return false;
    }
    setSaving(true);
    try {
      const clean: Memorial = {
        ...m,
        fullName: m.fullName.trim(),
        timeline: m.timeline.filter((t) => t.year || t.title || t.text),
        words: m.words.filter((w) => w.text.trim()),
      };
      save(clean);
      // удаляем медиа, которые убрали со страницы
      const now = new Set(mediaIdsOf(clean));
      const removed = [...savedIds.current, ...uploads.current].filter((x) => !now.has(x));
      await deleteMedia(removed);
      savedIds.current = now;
      uploads.current.clear();
      setM(clean);
      setDirty(false);
      return true;
    } catch (e) {
      notifyError(e, 'Не удалось сохранить');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const onSave = async () => {
    if (await persist()) {
      committed.current = true;
      toast.success('Страница сохранена');
      goHome('pages');
    }
  };

  const onPreview = async () => {
    if (await persist()) {
      committed.current = true;
      go({ name: 'viewer', id: m.id, from: 'editor' });
    }
  };

  const onCancel = () => (dirty ? setConfirmLeave(true) : leave());
  const leave = () => (id ? goHome('pages') : goHome('top'));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void onSave();
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('beforeunload', onUnload);
    };
  });

  return (
    <div className="container-page pb-32 pt-24 sm:pt-28">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <button onClick={onCancel} className="mb-2 flex items-center gap-2 text-sm text-muted hover:text-gold-light">
            <ArrowLeft className="h-4 w-4" /> Назад
          </button>
          <h1 className="text-4xl font-bold sm:text-5xl">{id ? 'Редактирование' : 'Новая страница'}</h1>
        </div>
        <Button className="lg:hidden" icon={Eye} onClick={() => setPreviewOpen(true)}>
          Превью
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* ---------------- форма ---------------- */}
        <div className="space-y-6">
          <Section icon={User} title="Основное">
            <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
              <div>
                <div className="label">Портрет</div>
                {m.portraitId ? (
                  <div className="relative">
                    <Portrait id={m.portraitId} name={m.fullName} className="aspect-square w-full rounded-2xl border border-line" />
                    <button
                      onClick={() => set('portraitId', null)}
                      className="absolute right-2 top-2 rounded-lg bg-danger/90 p-1.5 hover:bg-danger"
                      aria-label="Убрать портрет"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <FileUploader kind="image" accept={ACCEPT.image} title="Портрет" hint="JPG, PNG, HEIC, TIFF, WEBP · до 50 МБ" compact onUploaded={onPortrait} />
                )}
              </div>
              <div className="grid gap-4">
                <Input
                  id="field-fullname"
                  label="ФИО *"
                  placeholder="Иванов Иван Иванович"
                  value={m.fullName}
                  onChange={(e) => set('fullName', e.target.value)}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input label="Дата рождения" type="date" value={m.birthDate} max="2100-12-31" onChange={(e) => set('birthDate', e.target.value)} />
                  <Input label="Дата смерти" type="date" value={m.deathDate} max="2100-12-31" onChange={(e) => set('deathDate', e.target.value)} />
                  <Input label="Место рождения" placeholder="Свердловск" value={m.birthPlace} onChange={(e) => set('birthPlace', e.target.value)} />
                  <Input label="Место смерти" placeholder="Москва" value={m.deathPlace} onChange={(e) => set('deathPlace', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_200px]">
              <Textarea
                label="Эпитафия"
                maxLength={200}
                rows={2}
                className="[&_textarea]:min-h-[64px]"
                placeholder="Человек, который всегда шёл вперёд"
                value={m.epitaph}
                onChange={(e) => set('epitaph', e.target.value)}
              />
              <div>
                <label className="label">Символ на QR-карточке</label>
                <select className="field" value={m.symbol} onChange={(e) => set('symbol', e.target.value as Memorial['symbol'])}>
                  <option value="cross">✝ Крест</option>
                  <option value="star">★ Звезда</option>
                  <option value="none">Без символа</option>
                </select>
              </div>
            </div>
          </Section>

          <Section icon={BookOpen} title="Биография" delay={0.05}>
            <Textarea
              rows={8}
              placeholder="Расскажите историю жизни. Пустая строка — новый абзац."
              value={m.biography}
              onChange={(e) => set('biography', e.target.value)}
            />
          </Section>

          <Section icon={Clock} title="Хронология" hint="Ключевые события жизни" delay={0.1}>
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {m.timeline.map((t, i) => (
                  <motion.div
                    key={i}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid gap-2 rounded-2xl bg-field/30 p-3 sm:grid-cols-[90px_1fr_auto]"
                  >
                    <input className="field" placeholder="Год" value={t.year} onChange={(e) => set('timeline', (p) => p.map((x, j) => (j === i ? { ...x, year: e.target.value } : x)))} />
                    <div className="grid gap-2">
                      <input className="field" placeholder="Событие" value={t.title} onChange={(e) => set('timeline', (p) => p.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                      <input className="field" placeholder="Описание (необязательно)" value={t.text} onChange={(e) => set('timeline', (p) => p.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                    </div>
                    <IconButton icon={Trash2} label="Удалить событие" className="hover:!text-danger" onClick={() => set('timeline', (p) => p.filter((_, j) => j !== i))} />
                  </motion.div>
                ))}
              </AnimatePresence>
              <Button size="sm" icon={Plus} onClick={() => set('timeline', (p) => [...p, { year: '', title: '', text: '' }])}>
                Добавить событие
              </Button>
            </div>
          </Section>

          <Section icon={ImageIcon} title="Галерея" hint={`Фотографии сжимаются автоматически · до ${LIMITS.galleryPerPage} шт.`} delay={0.15}>
            <FileUploader
              kind="image"
              accept={ACCEPT.image}
              multiple
              remaining={LIMITS.galleryPerPage - m.galleryIds.length}
              title="Перетащите фотографии или нажмите"
              hint="JPG, PNG, HEIC, TIFF, WEBP · до 50 МБ каждая"
              onUploaded={onGallery}
            />
            {m.galleryIds.length > 0 && (
              <motion.div layout className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
                <AnimatePresence>
                  {m.galleryIds.map((gid, i) => (
                    <MediaTile
                      key={gid}
                      id={gid}
                      className="aspect-square"
                      onRemove={() => set('galleryIds', (p) => p.filter((x) => x !== gid))}
                      onMoveLeft={i > 0 ? () => set('galleryIds', (p) => move(p, i, i - 1)) : undefined}
                      onMoveRight={i < m.galleryIds.length - 1 ? () => set('galleryIds', (p) => move(p, i, i + 1)) : undefined}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </Section>

          <Section icon={Video} title="Видео" hint={`MP4, MOV, AVI, MKV, WEBM · до 2 ГБ · до ${LIMITS.videosPerPage} шт. Не сжимаются.`} delay={0.2}>
            <FileUploader
              kind="video"
              accept={ACCEPT.video}
              multiple
              remaining={LIMITS.videosPerPage - m.videoIds.length}
              title="Перетащите видео или нажмите"
              hint="Миниатюра создаётся автоматически"
              onUploaded={onVideos}
            />
            {m.videoIds.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <AnimatePresence>
                  {m.videoIds.map((vid, i) => (
                    <MediaTile
                      key={vid}
                      id={vid}
                      className="aspect-video"
                      onRemove={() => set('videoIds', (p) => p.filter((x) => x !== vid))}
                      onMoveLeft={i > 0 ? () => set('videoIds', (p) => move(p, i, i - 1)) : undefined}
                      onMoveRight={i < m.videoIds.length - 1 ? () => set('videoIds', (p) => move(p, i, i + 1)) : undefined}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </Section>

          <Section
            icon={Sparkles}
            title="Оживление фото"
            hint="Готовый MP4, созданный в Kling AI, D-ID или HeyGen. Запускается автоматически на странице."
            delay={0.25}
          >
            {m.animatedVideoId ? (
              <div className="relative">
                <VideoPlayer id={m.animatedVideoId} autoPlay loop muted />
                <Button size="sm" variant="danger" icon={Trash2} className="mt-3" onClick={() => set('animatedVideoId', null)}>
                  Убрать оживление
                </Button>
              </div>
            ) : (
              <>
                <FileUploader kind="video" accept={ACCEPT.animated} title="Загрузите оживлённое видео" hint="MP4 / WEBM / MOV · до 2 ГБ" onUploaded={onAnimated} />
                <div className="mt-3 rounded-xl bg-gold/5 p-3 text-xs leading-relaxed text-muted">
                  <b className="text-gold-light">Как сделать:</b> загрузите портрет в Kling AI (режим Image to Video) или D-ID / HeyGen,
                  выберите лёгкое движение («человек улыбается и моргает»), скачайте MP4 и перетащите сюда.
                </div>
              </>
            )}
          </Section>

          <Section icon={AudioLines} title="Аудио" hint="Голос, любимая песня, воспоминания · MP3, WAV, OGG, M4A" delay={0.3}>
            <FileUploader kind="audio" accept={ACCEPT.audio} multiple title="Перетащите аудио или нажмите" onUploaded={onAudio} />
            <div className="mt-4 space-y-2">
              {m.audioIds.map((aid) => (
                <div key={aid} className="flex items-center gap-2">
                  <div className="flex-1">
                    <AudioPlayer id={aid} />
                  </div>
                  <IconButton icon={Trash2} label="Удалить аудио" className="hover:!text-danger" onClick={() => set('audioIds', (p) => p.filter((x) => x !== aid))} />
                </div>
              ))}
            </div>
          </Section>

          <Section icon={MessageSquareQuote} title="Слова близких" delay={0.35}>
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {m.words.map((w, i) => (
                  <motion.div
                    key={i}
                    layout
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="grid gap-2 rounded-2xl bg-field/30 p-3"
                  >
                    <div className="flex gap-2">
                      <textarea className="field min-h-[70px] flex-1" placeholder="Цитата, воспоминание" value={w.text} onChange={(e) => set('words', (p) => p.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))} />
                      <IconButton icon={Trash2} label="Удалить" className="hover:!text-danger" onClick={() => set('words', (p) => p.filter((_, j) => j !== i))} />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <input className="field" placeholder="Автор (Анна)" value={w.author} onChange={(e) => set('words', (p) => p.map((x, j) => (j === i ? { ...x, author: e.target.value } : x)))} />
                      <input className="field" placeholder="Родство (внучка)" value={w.relation} onChange={(e) => set('words', (p) => p.map((x, j) => (j === i ? { ...x, relation: e.target.value } : x)))} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <Button size="sm" icon={Plus} onClick={() => set('words', (p) => [...p, { text: '', author: '', relation: '' }])}>
                Добавить слова
              </Button>
            </div>
          </Section>

          <Section icon={Phone} title="Контакты семьи" delay={0.4}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Email" type="email" placeholder="family@mail.ru" value={m.contacts.email} onChange={(e) => set('contacts', (c) => ({ ...c, email: e.target.value }))} />
              <Input label="Телефон" type="tel" placeholder="+7 900 000-00-00" value={m.contacts.phone} onChange={(e) => set('contacts', (c) => ({ ...c, phone: e.target.value }))} />
            </div>
            <div className="mt-4">
              <Toggle checked={m.contacts.visible} onChange={(v) => set('contacts', (c) => ({ ...c, visible: v }))} label="Показывать контакты посетителям страницы" />
            </div>
          </Section>
        </div>

        {/* ---------------- превью ---------------- */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <div className="mb-3 flex items-center gap-2 text-sm text-muted">
              <Eye className="h-4 w-4" /> Превью в реальном времени
            </div>
            <div className="max-h-[calc(100vh-10rem)] overflow-y-auto rounded-3xl">
              <LivePreview m={m} />
            </div>
          </div>
        </aside>
      </div>

      {/* ---------------- панель действий ---------------- */}
      <div className="glass fixed inset-x-0 bottom-0 z-40 border-x-0 border-b-0">
        <div className="container-page flex items-center justify-between gap-3 py-3">
          <span className="hidden text-sm text-muted sm:block">{dirty ? 'Есть несохранённые изменения · Ctrl+S' : 'Все изменения сохранены'}</span>
          <div className="ml-auto flex gap-2 sm:gap-3">
            <Button variant="ghost" onClick={onCancel}>
              Отмена
            </Button>
            <Button icon={Eye} onClick={onPreview} disabled={saving}>
              <span className="hidden sm:inline">Просмотр</span>
            </Button>
            <Button variant="gold" icon={Save} loading={saving} onClick={onSave}>
              Сохранить
            </Button>
          </div>
        </div>
      </div>

      <Modal open={previewOpen} onClose={() => setPreviewOpen(false)} title="Превью">
        <LivePreview m={m} />
      </Modal>

      <ConfirmModal
        open={confirmLeave}
        onClose={() => setConfirmLeave(false)}
        title="Уйти без сохранения?"
        text="Изменения и загруженные в этот раз файлы будут потеряны."
        confirmLabel="Не сохранять"
        onConfirm={() => {
          setConfirmLeave(false);
          leave();
        }}
      />
    </div>
  );
}
