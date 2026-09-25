import type { ReadingScore } from './types';

/** After this many tries at one sentence the child may move on (no star for it). */
export const MERCY_AFTER = 3;

export const PASS_SCORE_DEFAULT = 70;

export function passed(s: ReadingScore, passScore: number): boolean {
  return !s.unclear && s.overall >= passScore;
}

/** Stars for a whole book from the share of sentences really passed (mercy moves don't count). */
export function bookStars(cleared: number, total: number, maxStars = 3): number {
  if (total <= 0) return 0;
  return Math.round((maxStars * cleared) / total);
}

export type CheerBand = 'perfect' | 'great' | 'pass' | 'close' | 'retry' | 'mercy' | 'unclear';

/** Grade the reading relative to the pass line, not by absolute score. */
export function cheerBand(s: ReadingScore, passScore: number, o: { mercy?: boolean } = {}): CheerBand {
  if (s.unclear) return 'unclear';
  if (o.mercy) return 'mercy';
  if (s.overall >= 95) return 'perfect';
  if (s.overall >= Math.min(95, passScore + 15)) return 'great';
  if (s.overall >= passScore) return 'pass';
  if (s.overall >= passScore - 10) return 'close';
  return 'retry';
}

export const CHEER: Record<CheerBand, string> = {
  perfect: '太棒了，读得真好听！',
  great: '读得很好！',
  pass: '过关啦，继续加油！',
  close: '就差一点点，再读一遍吧！',
  retry: '听听红色的词，再跟着读一遍。',
  mercy: '已经很努力啦，这一句先过，下次再来挑战！',
  // Only about the recording, never about the child's reading.
  unclear: '没听清楚，靠近一点、大声一点再读一遍。',
};

/** Say the cheer in Chinese with the system voice, when there is one (offline). */
export function sayCheer(text: string): void {
  try {
    const synth = globalThis.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 1.05;
    synth.cancel();
    synth.speak(u);
  } catch {
    /* no voice on this device: the text is on screen */
  }
}

/** Stop the cheer voice (before recording or playing the model reading). */
export function hush(): void {
  try {
    globalThis.speechSynthesis?.cancel();
  } catch {
    /* nothing to stop */
  }
}
