import type { BookSentence, BookWord } from '@xuexi/course-pack';

/**
 * Word timings for a sentence: the ones from the TTS engine when the book has
 * them, otherwise spread over the clip by word length (good enough to follow
 * along; the first and last words stay in place).
 */
export function wordTimings(s: BookSentence, durationMs: number): BookWord[] {
  if (s.words?.length) return s.words;
  const toks = s.text.split(/\s+/).filter(Boolean);
  const lead = Math.min(150, durationMs * 0.05);
  const span = Math.max(0, durationMs - lead * 2);
  const weights = toks.map((t) => t.replace(/[^A-Za-z0-9']/g, '').length + 2);
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  let t = lead;
  return toks.map((w, i) => {
    const d = (span * weights[i]) / total;
    const out = { w, start: Math.round(t), end: Math.round(t + d) };
    t += d;
    return out;
  });
}

/** Index of the word being spoken at `ms`, or -1 before the first / after the last. */
export function wordAt(words: BookWord[], ms: number): number {
  if (words.length === 0 || ms < words[0].start) return -1;
  for (let i = words.length - 1; i >= 0; i--) if (ms >= words[i].start) return ms <= words[i].end + 250 ? i : -1;
  return -1;
}

/** How long the child gets to read a sentence back before recording stops by itself. */
export function recordLimitMs(clipMs: number): number {
  return Math.min(20_000, Math.max(3000, clipMs * 2 + 1500));
}
