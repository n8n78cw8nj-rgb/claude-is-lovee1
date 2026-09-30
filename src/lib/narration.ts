import type { Memorial } from '../types/memorial';

/** Раздел страницы, к которому относится фрагмент — чтобы подсветить его при чтении */
export type NarrationSection = 'intro' | 'epitaph' | `bio-${number}` | 'timeline';

export interface NarrationChunk {
  text: string;
  section: NarrationSection;
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/** «1923-05-15» → «15 мая 1923 года»; «1923» → «1923 год» */
function spokenDate(date: string): string {
  const full = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (full) return `${Number(full[3])} ${MONTHS[Number(full[2]) - 1]} ${full[1]} года`;
  const year = /^(\d{3,4})/.exec(date);
  return year ? `${year[1]} год` : date;
}

/** Чистим текст от символов, которые синтезатор читает вслух или спотыкается */
function clean(s: string): string {
  return s
    .replace(/[«»"„“”]/g, '')
    .replace(/\s+—\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentence(s: string): string {
  const t = clean(s);
  return !t ? '' : /[.!?…]$/.test(t) ? t : `${t}.`;
}

/**
 * Длинные фразы Chrome обрывает примерно через 15 секунд,
 * поэтому режем текст по предложениям в куски до ~220 символов.
 */
function split(text: string, max = 220): string[] {
  const sentences = clean(text).match(/[^.!?…]+[.!?…]*/g) ?? [];
  const out: string[] = [];
  let buf = '';
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (s.length > max) {
      if (buf) out.push(buf), (buf = '');
      // очень длинное предложение — режем по запятым
      let part = '';
      const pieces = s.split(/,\s+/).map((p, i, a) => (i < a.length - 1 ? `${p},` : p));
      for (const piece of pieces) {
        if ((part + ' ' + piece).length > max && part) out.push(part), (part = '');
        part = part ? `${part} ${piece}` : piece;
      }
      if (part) out.push(part);
    } else if ((buf + ' ' + s).length > max) {
      out.push(buf);
      buf = s;
    } else {
      buf = buf ? `${buf} ${s}` : s;
    }
  }
  if (buf) out.push(buf);
  return out;
}

/** Текст озвучки: имя и даты, эпитафия, биография, основные события */
export function buildNarration(m: Memorial): NarrationChunk[] {
  const chunks: NarrationChunk[] = [];
  const push = (text: string, section: NarrationSection) => split(text).forEach((t) => chunks.push({ text: t, section }));

  const intro = [sentence(m.fullName)];
  if (m.birthDate && m.deathDate) intro.push(`Годы жизни: с ${spokenDate(m.birthDate)} по ${spokenDate(m.deathDate)}.`);
  else if (m.birthDate) intro.push(`Дата рождения: ${spokenDate(m.birthDate)}.`);
  if (m.birthPlace) intro.push(`Место рождения: ${sentence(m.birthPlace)}`);
  if (m.deathPlace && m.deathPlace !== m.birthPlace) intro.push(`Место смерти: ${sentence(m.deathPlace)}`);
  push(intro.join(' '), 'intro');

  if (m.epitaph) push(sentence(m.epitaph), 'epitaph');

  m.biography
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((p, i) => push(p.replace(/\n/g, ' '), `bio-${i}`));

  const events = m.timeline.filter((t) => t.year || t.title);
  if (events.length) {
    push('Основные события жизни.', 'timeline');
    for (const t of events) {
      const year = /^\d{3,4}$/.test(t.year.trim()) ? `${t.year.trim()} год` : t.year;
      push([year && `${year}.`, sentence(t.title), t.text && sentence(t.text)].filter(Boolean).join(' '), 'timeline');
    }
  }
  return chunks;
}

/** Русские голоса, лучшие — первыми (нейросетевые голоса Google/Microsoft звучат естественнее) */
export function russianVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return [];
  const score = (v: SpeechSynthesisVoice) =>
    (/natural|online|neural/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 3 : 0) + (/milena|svetlana|dariya|irina|pavel|dmitry/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1);
  return speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith('ru'))
    .sort((a, b) => score(b) - score(a));
}
