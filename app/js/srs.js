// Spaced repetition. Pure functions: no DOM, no store.
import { addDays } from './util.js';

export const INTERVALS = [1, 2, 4, 7, 15, 30]; // days, for stages 1..6
export const MASTERED = 6;                     // reached the 30-day interval
export const MAINTENANCE = 90;                 // days between reviews after that
export const NEW_PER_DAY = 10;

export function interval(stage) {
  if (stage <= 0) return 1;
  return stage <= INTERVALS.length ? INTERVALS[stage - 1] : MAINTENANCE;
}

// rating: 'know' | 'unsure' | 'forgot'. Returns the fields to update.
export function grade(word, rating, today) {
  const stage = word.stage || 0;
  const base = { lastReviewed: today, firstSeen: word.firstSeen || today };
  if (rating === 'know') {
    const next = Math.min(stage + 1, MASTERED + 1);
    return { ...base, stage: next, due: addDays(today, interval(next)) };
  }
  if (rating === 'unsure') {
    return { ...base, stage, due: addDays(today, interval(stage)) };
  }
  return { ...base, stage: 0, due: addDays(today, 1), lapses: (word.lapses || 0) + 1 };
}

// Today's review queue: due words first (oldest due first), then new words
// up to the daily cap minus the new words already started today.
export function queue(words, today) {
  const due = words
    .filter((w) => w.firstSeen && w.due <= today)
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));
  const startedToday = words.filter((w) => w.firstSeen === today).length;
  const fresh = words
    .filter((w) => !w.firstSeen)
    .sort((a, b) => ((a.added || '') < (b.added || '') ? -1 : 1))
    .slice(0, Math.max(0, NEW_PER_DAY - startedToday));
  return { due, fresh, all: [...due, ...fresh] };
}

export function stageLabel(word) {
  if (!word.firstSeen) return 'New';
  if ((word.stage || 0) >= MASTERED) return 'Mastered';
  return `Stage ${word.stage || 0}`;
}
