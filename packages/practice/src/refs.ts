import type { QuestionRef } from '@xuexi/shared';
import { BLANK } from './generators/base';
import { generateQuestion, hasGenerator } from './registry';
import type { Question } from './types';

/** Asia/Shanghai is UTC+8 all year (no DST). */
const SHANGHAI_OFFSET_MS = 8 * 3600 * 1000;
export const DAY_MS = 24 * 3600 * 1000;

/** Calendar day in Asia/Shanghai, e.g. "2026-09-24". */
export function shanghaiDay(at: number): string {
  return new Date(at + SHANGHAI_OFFSET_MS).toISOString().slice(0, 10);
}

/** Epoch ms of 00:00 Asia/Shanghai on the day containing `at`. */
export function shanghaiDayStart(at: number): number {
  return Math.floor((at + SHANGHAI_OFFSET_MS) / DAY_MS) * DAY_MS - SHANGHAI_OFFSET_MS;
}

/** Stable identity of a question reference (includes the variant). */
export function questionRefKey(ref: QuestionRef): string {
  if (ref.source === 'bank') return `bank:${ref.bankId}:${ref.questionId}`;
  return (
    `gen:${ref.generatorId}:${ref.difficulty}:${ref.seed}` +
    (ref.variant !== undefined ? `:${ref.variant}` : '')
  );
}

/** The reference to store in an AttemptEvent for a generated question. */
export function refOfQuestion(q: Question): QuestionRef {
  const ref: QuestionRef = {
    source: 'generator',
    generatorId: q.generatorId,
    difficulty: q.difficulty,
    seed: q.seed,
  };
  if (q.variant !== undefined) ref.variant = q.variant;
  return ref;
}

/**
 * Regenerate a question from a generator reference. Returns null for bank
 * questions, unknown generators or variants that no longer exist.
 */
export function questionFromRef(ref: QuestionRef): Question | null {
  if (ref.source !== 'generator' || !hasGenerator(ref.generatorId)) return null;
  try {
    return generateQuestion(ref.generatorId, {
      difficulty: ref.difficulty,
      seed: ref.seed,
      variant: ref.variant,
    });
  } catch {
    return null;
  }
}

/**
 * One-line plain-text summary for parent reports and the mistake book,
 * e.g. "326 × 48 = ?" or the prompt with blanks shown as "?".
 */
export function describeQuestionForParent(q: Question): string {
  if (q.widget === 'vertical' && q.vertical) {
    return `${q.vertical.operands.join(` ${q.vertical.op === '-' ? '−' : q.vertical.op} `)} = ?（竖式）`;
  }
  if (q.widget === 'angle' && q.angle) return `用量角器量角（这个角是 ${q.angle.degrees}°）`;
  if (q.ruler)
    return `看刻度尺量${q.ruler.item}的长（从刻度 ${q.ruler.from} 到 ${q.ruler.to}${q.ruler.rulerFrom > 0 ? '，断尺' : ''}）`;
  let text = q.prompt
    .replace(/\s*\n\s*/g, ' ')
    .split(BLANK)
    .join('?')
    .replace(/^用竖式计算：/, '');
  if (q.widget === 'choice' && q.options) {
    text += `  选项：${q.options.map((o, i) => `${String.fromCharCode(65 + i)}. ${o}`).join('  ')}`;
  }
  return text;
}
