import { useCallback, useEffect, useRef, useState } from 'react';
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

  return { state, index, total: chunks.length, rate, setRate, voices, voiceName, setVoiceName, play, pause, stop, skip };
}
