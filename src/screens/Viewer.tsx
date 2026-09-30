import { motion } from 'framer-motion';
import { ArrowLeft, Download, Mail, MapPin, Pencil, Phone, QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Gallery } from '../components/Gallery';
import { Portrait } from '../components/MemorialCard';
import { Timeline } from '../components/Timeline';
import { AudioPlayer, VideoPlayer } from '../components/VideoPlayer';
import { useMemorials } from '../hooks/useMemorials';
import { useNav } from '../hooks/useNav';
import { qrDataUrl } from '../lib/qr';
import { formatDate, lifeYears } from '../lib/utils';
import { exportWithToast } from './MemorialsList';

function Block({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.6, ease: 'easeOut', delay }}
      className="py-10 md:py-16"
    >
      <h2 className="mb-8 flex items-center gap-4 text-3xl font-bold sm:text-4xl">
        <span className="text-gold-gradient">{title}</span>
        <span className="h-px flex-1 bg-gradient-to-r from-gold/40 to-transparent" />
      </h2>
      {children}
    </motion.section>
  );
}

export function Viewer({ id, from }: { id: string; from?: 'home' | 'editor' }) {
  const { get } = useMemorials();
  const { go, goHome } = useNav();
  const m = get(id);
  const [qr, setQr] = useState<string | null>(null);

  const qrUrl = m?.qrUrl;
  useEffect(() => {
    if (qrUrl) qrDataUrl(qrUrl, 600).then(setQr);
  }, [qrUrl]);

  const back = () => (from === 'editor' ? go({ name: 'editor', id }) : goHome('pages'));

  if (!m) {
    return (
      <div className="container-page pt-40 text-center">
        <h1 className="text-4xl font-bold">Страница не найдена</h1>
        <Button className="mt-8" icon={ArrowLeft} onClick={() => goHome('pages')}>
          К списку
        </Button>
      </div>
    );
  }

  const places = [m.birthPlace, m.deathPlace].filter(Boolean).join(' — ');
  const showContacts = m.contacts.visible && (m.contacts.email || m.contacts.phone);

  return (
    <div className="relative">
      {/* верхняя панель */}
      <div className="fixed right-4 top-20 z-40 flex gap-2 sm:right-6 sm:top-24">
        <Button size="sm" variant="subtle" className="glass" icon={Pencil} onClick={() => go({ name: 'editor', id })}>
          <span className="hidden sm:inline">Редактор</span>
        </Button>
        <Button size="sm" variant="outline" className="glass" icon={ArrowLeft} onClick={back}>
          {from === 'editor' ? 'К редактору' : 'Назад к списку'}
        </Button>
      </div>

      {/* 1. Hero */}
      <header className="relative overflow-hidden pb-16 pt-32 text-center sm:pt-40">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-card/60 via-bg to-bg" />
        <div className="pointer-events-none absolute left-1/2 top-24 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-gold/10 blur-[100px]" />
        <div className="container-page relative">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: 'easeOut' }}>
            <Portrait
              id={m.portraitId}
              name={m.fullName}
              variant="full"
              className="mx-auto h-56 w-56 rounded-full border-4 border-gold/80 shadow-gold sm:h-72 sm:w-72"
            />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-8 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl lg:text-7xl"
          >
            {m.fullName}
          </motion.h1>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}>
            <div className="mt-4 font-serif text-2xl text-gold-light sm:text-3xl">{lifeYears(m.birthDate, m.deathDate)}</div>
            {(m.birthDate || m.deathDate) && (
              <div className="mt-2 text-muted">
                {[m.birthDate && formatDate(m.birthDate), m.deathDate && formatDate(m.deathDate)].filter(Boolean).join(' — ')}
              </div>
            )}
            {places && (
              <div className="mt-1 flex items-center justify-center gap-1.5 text-muted">
                <MapPin className="h-4 w-4 text-gold" /> {places}
              </div>
            )}
          </motion.div>
          {m.epitaph && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mx-auto mt-8 max-w-2xl font-serif text-2xl italic leading-relaxed text-gold-light sm:text-3xl"
            >
              «{m.epitaph}»
            </motion.p>
          )}
        </div>
      </header>

      <div className="container-page max-w-5xl pb-16">
        {/* 6. Оживление — главный экран, сразу после портрета */}
        {m.animatedVideoId && (
          <Block title="Ожившее фото">
            <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-gold/30 shadow-gold">
              <VideoPlayer id={m.animatedVideoId} autoPlay loop muted />
            </div>
          </Block>
        )}

        {m.biography && (
          <Block title="Биография">
            <div className="card space-y-5 p-6 text-lg leading-relaxed text-white/90 sm:p-10 sm:text-xl">
              {m.biography.split(/\n{2,}/).map((p, i) => (
                <p
                  key={i}
                  className={`whitespace-pre-line ${
                    i === 0 ? 'first-letter:float-left first-letter:mr-2 first-letter:font-serif first-letter:text-6xl first-letter:leading-[0.9] first-letter:text-gold' : ''
                  }`}
                >
                  {p}
                </p>
              ))}
            </div>
          </Block>
        )}

        {m.timeline.length > 0 && (
          <Block title="Хронология">
            <Timeline items={m.timeline} />
          </Block>
        )}

        {m.galleryIds.length > 0 && (
          <Block title="Фотографии">
            <Gallery ids={m.galleryIds} />
          </Block>
        )}

        {m.videoIds.length > 0 && (
          <Block title="Видео">
            <div className="grid gap-6 md:grid-cols-2">
              {m.videoIds.map((v) => (
                <VideoPlayer key={v} id={v} showTitle />
              ))}
            </div>
          </Block>
        )}

        {m.audioIds.length > 0 && (
          <Block title="Голос">
            <div className="space-y-3">
              {m.audioIds.map((a) => (
                <AudioPlayer key={a} id={a} />
              ))}
            </div>
          </Block>
        )}

        {m.words.length > 0 && (
          <Block title="Слова близких">
            <div className="grid gap-6 md:grid-cols-2">
              {m.words.map((w, i) => (
                <motion.blockquote
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="card relative p-6 pt-10 sm:p-8 sm:pt-12"
                >
                  <span className="absolute left-6 top-2 font-serif text-7xl leading-none text-gold/30">“</span>
                  <p className="font-serif text-xl italic leading-relaxed">{w.text}</p>
                  <footer className="mt-4 text-sm text-muted">
                    <span className="font-semibold text-gold-light">{w.author}</span>
                    {w.relation && `, ${w.relation}`}
                  </footer>
                </motion.blockquote>
              ))}
            </div>
          </Block>
        )}

        {showContacts && (
          <Block title="Контакты семьи">
            <div className="card flex flex-col gap-4 p-6 sm:flex-row sm:p-8">
              {m.contacts.email && (
                <a href={`mailto:${m.contacts.email}`} className="flex items-center gap-3 text-lg hover:text-gold-light">
                  <Mail className="h-5 w-5 text-gold" /> {m.contacts.email}
                </a>
              )}
              {m.contacts.phone && (
                <a href={`tel:${m.contacts.phone.replace(/[^\d+]/g, '')}`} className="flex items-center gap-3 text-lg hover:text-gold-light sm:ml-10">
                  <Phone className="h-5 w-5 text-gold" /> {m.contacts.phone}
                </a>
              )}
            </div>
          </Block>
        )}

        <Block title="QR-код страницы">
          <div className="card flex flex-col items-center gap-6 p-8 sm:flex-row sm:gap-10">
            <div className="rounded-2xl bg-white p-3 shadow-deep">
              {qr ? <img src={qr} alt="QR-код" className="h-44 w-44" /> : <div className="h-44 w-44" />}
            </div>
            <div className="text-center sm:text-left">
              <p className="text-muted">Отсканируйте, чтобы открыть эту страницу памяти</p>
              <p className="mt-2 break-all font-mono text-sm text-gold-light">{m.qrUrl}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-3 sm:justify-start">
                <Button size="sm" icon={QrCode} onClick={() => go({ name: 'qr', id })}>
                  QR-студия
                </Button>
                <Button size="sm" icon={Download} onClick={() => exportWithToast(m)}>
                  Скачать ZIP
                </Button>
              </div>
            </div>
          </div>
        </Block>
      </div>

      <footer className="border-t border-line/60 py-10 text-center text-sm text-muted">
        Создано сервисом <span className="font-serif text-gold-light">«Наследие»</span>
      </footer>
    </div>
  );
}
