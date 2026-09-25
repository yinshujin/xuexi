import { MAX_FRAMES, peakOf, toBase64Frames, toInt16, toPCM16k } from './audio';
import type { ReadingScore, ScoringConfig } from './types';
import { scoreWithXfyun, type SocketFactory } from './xfyun';

export type { ReadingScore, ScoringConfig, WordState } from './types';
export { alignWords } from './align';
export { bookStars, CHEER, cheerBand, MERCY_AFTER, PASS_SCORE_DEFAULT, passed, sayCheer } from './grade';
export { loadScoringConfig, parseScoringText, saveScoringConfig } from './config';
export { testXfyun } from './xfyun';

export type ScoreOutcome =
  | { kind: 'scored'; score: ReadingScore }
  /** Almost nothing was recorded: ask again, don't call the engine. */
  | { kind: 'quiet' }
  /** Offline, credentials wrong, service down … — not the child's fault. */
  | { kind: 'error'; message: string };

/** Score one recorded reading of `text`. Never throws. */
export async function scoreRecording(blob: Blob, text: string, cfg: ScoringConfig, open?: SocketFactory): Promise<ScoreOutcome> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return { kind: 'error', message: '没有网络，这次先不评分' };
  try {
    if (blob.size < 1000) return { kind: 'quiet' };
    const pcm = await toPCM16k(blob);
    if (peakOf(pcm) < 0.03) return { kind: 'quiet' };
    const frames = toBase64Frames(toInt16(pcm));
    if (frames.length > MAX_FRAMES) return { kind: 'error', message: '录音太长了，这次先不评分' };
    return { kind: 'scored', score: await scoreWithXfyun(frames, text, cfg.xfyun, open) };
  } catch (e) {
    return { kind: 'error', message: (e as Error).message || '评分出错了' };
  }
}
