import { motion } from 'framer-motion';
import { ChevronDown, LayoutGrid, PlayCircle, Plus, QrCode, ScanLine, Sparkles, Upload } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { Button } from '../components/Button';
import { Modal } from '../components/Modal';
import { useNav } from '../hooks/useNav';

const Monument3D = lazy(() => import('../three/Monument3D').then((m) => ({ default: m.Monument3D })));

const STEPS = [
  { icon: Upload, title: 'Загрузите память', text: 'Портрет, фотографии, видео, голос, биографию и слова близких. Всё хранится в вашем браузере.' },
  { icon: Sparkles, title: 'Оживите фото', text: 'Сделайте оживление портрета в Kling AI, D-ID или HeyGen и загрузите готовый MP4 — он запустится первым.' },
  { icon: QrCode, title: 'Получите QR', text: 'Сгенерируйте QR-визитку, табличку A6 для памятника или наклейку. Печать или PDF для типографии.' },
  { icon: ScanLine, title: 'Поделитесь', text: 'Посетитель сканирует QR — и видит историю жизни человека. Страницу можно экспортировать в ZIP.' },
];

function HowItWorks({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [videoFailed, setVideoFailed] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title="Как это работает" size="lg">
      <div className="overflow-hidden rounded-2xl bg-black">
        {videoFailed ? (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-gradient-to-br from-field to-bg p-6 text-center text-muted">
            <PlayCircle className="h-12 w-12 text-gold" />
            <div>Видео-инструкция появится здесь.</div>
            <code className="text-xs text-gold-light">public/videos/how-it-works.mp4</code>
          </div>
        ) : (
          <video
            src="./videos/how-it-works.mp4"
            controls
            playsInline
            className="aspect-video w-full"
            onError={() => setVideoFailed(true)}
          />
        )}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {STEPS.map((s, i) => (
          <div key={s.title} className="flex gap-4 rounded-2xl bg-field/40 p-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold">
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-semibold">
                {i + 1}. {s.title}
              </div>
              <div className="mt-1 text-sm text-muted">{s.text}</div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function Hero() {
  const { go, goHome } = useNav();
  const [how, setHow] = useState(false);

  const fade = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: 'easeOut' as const, delay },
  });

  return (
    <section id="top" className="relative flex min-h-[100svh] items-center overflow-hidden pt-20">
      {/* фон */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg via-[#12172a] to-card" />
      <div className="pointer-events-none absolute right-[-10%] top-[10%] h-[60vh] w-[60vh] rounded-full bg-gold/10 blur-[120px]" />

      <div className="container-page relative grid items-center gap-6 lg:grid-cols-2">
        <div className="relative z-10 order-2 text-center lg:order-1 lg:text-left">
          <motion.div {...fade(0.1)} className="mb-5 inline-flex items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 text-sm text-gold-light">
            <Sparkles className="h-4 w-4" /> Цифровая экосистема сохранения памяти
          </motion.div>
          <motion.h1 {...fade(0.2)} className="text-[40px] font-bold leading-[1.08] sm:text-6xl xl:text-[72px]">
            Память не умирает.
            <br />
            <span className="text-gold-gradient">Она переходит в цифру.</span>
          </motion.h1>
          <motion.p {...fade(0.3)} className="mx-auto mt-6 max-w-xl text-lg text-muted lg:mx-0">
            Страницы памяти с фотографиями, видео, голосом и оживлённым портретом. QR-табличка на памятнике ведёт к истории жизни человека.
          </motion.p>
          <motion.div {...fade(0.4)} className="mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            <Button variant="gold" size="lg" icon={Plus} onClick={() => go({ name: 'editor', id: null })}>
              Создать страницу
            </Button>
            <Button size="lg" icon={LayoutGrid} onClick={() => goHome('pages')}>
              Мои страницы
            </Button>
            <Button variant="ghost" size="lg" icon={PlayCircle} onClick={() => setHow(true)}>
              Как это работает
            </Button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="relative order-1 h-[46vh] min-h-[320px] lg:order-2 lg:h-[78vh]"
        >
          <Suspense fallback={<div className="h-full w-full" />}>
            <Monument3D className="h-full w-full" />
          </Suspense>
        </motion.div>
      </div>

      <motion.button
        onClick={() => goHome('pages')}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted hover:text-gold"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        aria-label="К списку страниц"
      >
        <ChevronDown className="h-7 w-7" />
      </motion.button>

      <HowItWorks open={how} onClose={() => setHow(false)} />
    </section>
  );
}
