import { AnimatePresence, motion } from 'framer-motion';
import { Headphones, Pause, Play, SkipBack, SkipForward, Square } from 'lucide-react';
import type { useNarration } from '../hooks/useNarration';

type Narration = ReturnType<typeof useNarration>;

/** Большая кнопка в шапке страницы памяти */
export function NarrationButton({ n }: { n: Narration }) {
  const playing = n.state === 'playing';
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => (playing ? n.pause() : n.play())}
      className="mx-auto mt-8 inline-flex items-center gap-3 rounded-full border border-gold/50 bg-gold/10 py-3 pl-3 pr-6 text-gold-light shadow-gold transition hover:bg-gold/20"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold text-bg">
        {playing ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
      </span>
      <span className="text-left">
        <span className="block font-semibold">
          {playing ? 'Пауза' : n.state === 'paused' ? 'Продолжить рассказ' : 'Послушать историю жизни'}
        </span>
        <span className="block text-xs text-muted">Озвучка биографии на русском</span>
      </span>
    </motion.button>
  );
}

/** Панель управления внизу экрана, пока идёт озвучка */
export function NarrationBar({ n }: { n: Narration }) {
  const progress = n.total ? ((n.index + (n.state === 'idle' ? 0 : 1)) / n.total) * 100 : 0;
  return (
    <AnimatePresence>
      {n.state !== 'idle' && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="glass fixed inset-x-0 bottom-0 z-50 border-x-0 border-b-0 pb-[env(safe-area-inset-bottom,0px)]"
        >
          <div className="h-1 bg-field">
            <motion.div className="h-full bg-gradient-to-r from-gold to-gold-light" animate={{ width: `${progress}%` }} />
          </div>
          <div className="container-page flex flex-wrap items-center gap-3 py-3">
            <Headphones className="hidden h-5 w-5 shrink-0 text-gold sm:block" />
            <div className="flex items-center gap-1">
              <button onClick={() => n.skip(-1)} className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-white" aria-label="Назад">
                <SkipBack className="h-5 w-5" />
              </button>
              <button
                onClick={() => (n.state === 'playing' ? n.pause() : n.play())}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-gold text-bg hover:brightness-110"
                aria-label={n.state === 'playing' ? 'Пауза' : 'Продолжить'}
              >
                {n.state === 'playing' ? <Pause className="h-5 w-5" /> : <Play className="ml-0.5 h-5 w-5" />}
              </button>
              <button onClick={() => n.skip(1)} className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-white" aria-label="Вперёд">
                <SkipForward className="h-5 w-5" />
              </button>
              <button onClick={n.stop} className="rounded-lg p-2 text-muted hover:bg-white/5 hover:text-white" aria-label="Остановить">
                <Square className="h-4 w-4" />
              </button>
            </div>
            <span className="text-sm tabular-nums text-muted">
              {n.index + 1} / {n.total}
            </span>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <select
                id="narration-rate"
                className="rounded-lg border border-line bg-field px-2 py-1.5 text-sm"
                value={n.rate}
                onChange={(e) => n.setRate(Number(e.target.value))}
                aria-label="Скорость"
              >
                <option value={0.8}>Медленно</option>
                <option value={1}>Обычно</option>
                <option value={1.2}>Быстрее</option>
              </select>
              {n.voices.length > 1 && (
                <select
                  id="narration-voice"
                  className="max-w-[12rem] rounded-lg border border-line bg-field px-2 py-1.5 text-sm"
                  value={n.voiceName}
                  onChange={(e) => n.setVoiceName(e.target.value)}
                  aria-label="Голос"
                >
                  {n.voices.map((v) => (
                    <option key={v.name} value={v.name}>
                      {v.name.replace(/^(Microsoft|Google)\s*/i, '').replace(/\s*\(.*\)$/, '')}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
