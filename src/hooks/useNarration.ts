import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { russianVoices, type NarrationChunk } from '../lib/narration';

export type NarrationState = 'idle' | 'playing' | 'paused';

export const narrationSupported = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

/**
 * Озвучка через Web Speech API. Фрагменты читаются по очереди;
 * пауза = остановка с запоминанием позиции (нативная pause в Chrome ненадёжна).
 */
export function useNarration(chunks: NarrationChunk[]) {
  const [state, setState] = useState<NarrationState>('idle');
  const [index, setIndex] = useState(0);
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceName, setVoiceName] = useState<string>('');

  const indexRef = useRef(0);
  const token = useRef(0); // отменяет колбэки устаревших фраз
  const settings = useRef({ rate, voiceName });
  settings.current = { rate, voiceName };

  useEffect(() => {
    if (!narrationSupported()) return;
    const load = () => {
      const list = russianVoices();
      setVoices(list);
      setVoiceName((cur) => cur || list[0]?.name || '');
    };
    load();
    speechSynthesis.addEventListener('voiceschanged', load);
    return () => {
      speechSynthesis.removeEventListener('voiceschanged', load);
      token.current++;
      speechSynthesis.cancel();
    };
  }, []);

  const speakFrom = useCallback(
    (start: number) => {
      if (!narrationSupported() || !chunks.length) return;
      const my = ++token.current;
      speechSynthesis.cancel();
      const say = (i: number) => {
        if (my !== token.current) return;
        if (i >= chunks.length) {
          indexRef.current = 0;
          setIndex(0);
          setState('idle');
          return;
        }
        indexRef.current = i;
        setIndex(i);
        const u = new SpeechSynthesisUtterance(chunks[i].text);
        u.lang = 'ru-RU';
        u.rate = settings.current.rate;
        const voice = speechSynthesis.getVoices().find((v) => v.name === settings.current.voiceName);
        if (voice) u.voice = voice;
        u.onend = () => say(i + 1);
        u.onerror = (e) => {
          // 'interrupted'/'canceled' — это наша же остановка
          if (e.error !== 'interrupted' && e.error !== 'canceled') say(i + 1);
        };
        speechSynthesis.speak(u);
      };
      setState('playing');
      say(start);
    },
    [chunks],
  );

  const play = useCallback(() => speakFrom(indexRef.current), [speakFrom]);

  const pause = useCallback(() => {
    token.current++;
    speechSynthesis.cancel();
    setState('paused');
  }, []);

  const stop = useCallback(() => {
    token.current++;
    speechSynthesis.cancel();
    indexRef.current = 0;
    setIndex(0);
    setState('idle');
  }, []);

  const skip = useCallback(
    (delta: number) => {
      const next = Math.max(0, Math.min(chunks.length - 1, indexRef.current + delta));
      indexRef.current = next;
      setIndex(next);
      if (state === 'playing') speakFrom(next);
    },
    [chunks.length, speakFrom, state],
  );

  // смена скорости или голоса — продолжаем с текущей фразы уже с новыми настройками
  useEffect(() => {
    if (state === 'playing') speakFrom(indexRef.current);
    // зависим только от настроек: перезапуск при смене state не нужен
  }, [rate, voiceName]);

  return {
    state,
    index,
    progress: chunks.length ? (index + (state === 'idle' ? 0 : 1)) / chunks.length : 0,
    position: `${index + 1} / ${chunks.length}`,
    rate,
    setRate,
    voices,
    voiceName,
    setVoiceName,
    play,
    pause,
    stop,
    skip,
  };
}

export type Narration = Pick<
  ReturnType<typeof useNarration>,
  'state' | 'progress' | 'position' | 'rate' | 'setRate' | 'voices' | 'voiceName' | 'setVoiceName' | 'play' | 'pause' | 'stop' | 'skip'
>;

/** Перемотка готовой озвучки кнопками «назад/вперёд», секунд */
const SKIP_SECONDS = 15;

const clock = (sec: number) => {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Готовая озвучка (MP3 из Yandex SpeechKit и т. п.) с тем же управлением, что и синтез речи.
 * Файл начинает загружаться только по первому нажатию «Послушать».
 */
export function useAudioNarration(src: string | null): Narration {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<NarrationState>('idle');
  const [time, setTime] = useState({ current: 0, duration: 0 });
  const [rate, setRate] = useState(1);

  const element = useCallback(() => {
    if (!src) return null;
    if (!audio.current) {
      const a = new Audio(src);
      a.preload = 'metadata';
      a.playbackRate = rate;
      const sync = () => setTime({ current: a.currentTime, duration: Number.isFinite(a.duration) ? a.duration : 0 });
      a.addEventListener('timeupdate', sync);
      a.addEventListener('loadedmetadata', sync);
      a.addEventListener('play', () => setState('playing'));
      // pause приходит и после stop() (событие асинхронное) — там позиция уже сброшена в 0
      a.addEventListener('pause', () => setState(a.ended || a.currentTime === 0 ? 'idle' : 'paused'));
      a.addEventListener('ended', () => {
        a.currentTime = 0;
        setState('idle');
      });
      a.addEventListener('error', () => {
        setState('idle');
        toast.error('Не удалось воспроизвести озвучку');
      });
      audio.current = a;
    }
    return audio.current;
  }, [src, rate]);

  useEffect(
    () => () => {
      audio.current?.pause();
      audio.current = null;
    },
    [src],
  );

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = rate;
  }, [rate]);

  const play = useCallback(() => {
    element()?.play().catch(() => setState('idle'));
  }, [element]);

  const pause = useCallback(() => audio.current?.pause(), []);

  const stop = useCallback(() => {
    const a = audio.current;
    if (!a) return;
    a.pause();
    a.currentTime = 0;
    setState('idle');
  }, []);

  const skip = useCallback((delta: number) => {
    const a = audio.current;
    if (a) a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + delta * SKIP_SECONDS));
  }, []);

  return {
    state,
    progress: time.duration ? time.current / time.duration : 0,
    position: `${clock(time.current)} / ${clock(time.duration)}`,
    rate,
    setRate,
    voices: [],
    voiceName: '',
    setVoiceName: () => {},
    play,
    pause,
    stop,
    skip,
  };
}
