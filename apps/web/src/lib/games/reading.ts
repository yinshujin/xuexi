/**
 * 阅读题组: a short passage with several questions — 语文 读短文答问题,
 * 英语 阅读理解 / 完形填空, 数学 情境题组. Always in the paper when the unit
 * has a passage for it (A, B and C get different passages); worth one point
 * per question.
 */
import type { Rng } from '@xuexi/practice';
import { coreSpecs } from '../learning';
import { isNumberQuestion, READING, type ReadingPassage, type ReadingQuestion } from './reading-data';
import type { GameBuilder, GameInfo, ReadingGame, UnitGame } from './types';
import { variantOf } from './util';

/** What the child gave for a question: an option index, a number, or nothing. */
export type ReadingAnswer = number | null;

const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩';
/** ① ② … for 完形填空 blanks, 1. 2. … for questions. */
export const readingLabel = (g: Pick<ReadingGame, 'mode'>, i: number) => (g.mode === 'cloze' ? CIRCLED[i] : `${i + 1}.`);
export const circled = (n: number) => CIRCLED[n - 1] ?? `(${n})`;

export function readingRight(q: ReadingQuestion, a: ReadingAnswer): boolean {
  if (a === null) return false;
  return isNumberQuestion(q) ? a === q.num : a === q.answer;
}

export function readingAnswerText(q: ReadingQuestion): string {
  return isNumberQuestion(q) ? `${q.num}${q.unit ? ` ${q.unit}` : ''}` : q.options[q.answer];
}

export function readingGivenText(q: ReadingQuestion, a: ReadingAnswer): string {
  if (a === null) return '没有作答';
  return isNumberQuestion(q) ? `${a}${q.unit ? ` ${q.unit}` : ''}` : (q.options[a] ?? '没有作答');
}

/** Right answers out of the questions. */
export function readingScore(g: ReadingGame, answers: ReadingAnswer[]): number {
  return g.questions.reduce((n, q, i) => n + (readingRight(q, answers[i] ?? null) ? 1 : 0), 0);
}

function titleOf(subject: string, p: ReadingPassage): string {
  if (subject === 'math') return '情境题组：读一读，算一算';
  if (subject === 'english') return p.mode === 'cloze' ? '完形填空：读短文，选词填空' : '阅读理解：读短文，选答案';
  return '阅读小天地：读短文，答问题';
}

/** The options in another order for this paper (the answer follows its option). */
function shuffled(rng: Rng, q: ReadingQuestion): ReadingQuestion {
  if (isNumberQuestion(q)) return q;
  const order = rng.shuffle(q.options.map((_, i) => i));
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}

export const readingBuilder: GameBuilder = {
  id: 'reading',
  always: true,
  build({ book, unit, paper, rng, kpOf }): UnitGame[] {
    const p = READING[unit.id]?.[paper];
    if (!p) return [];
    // The passage's knowledge point, or the unit's first one that is in the papers.
    const wanted = p.kp ? kpOf(`${variantOf(unit.id)}.${p.kp}`) : undefined;
    const kp = wanted && coreSpecs(wanted).length ? wanted : unit.knowledgePoints.find((k) => coreSpecs(k).length > 0);
    if (!kp) return [];
    const game: ReadingGame = {
      kind: 'reading',
      title: titleOf(book.subject, p),
      weight: p.questions.length,
      mode: p.mode,
      passageTitle: p.title,
      text: p.text,
      questions: p.questions.map((q) => shuffled(rng, q)),
      large: book.grade <= 2,
    };
    return [{ kpId: kp.id, kpTitle: kp.title, game }];
  },
};

export const readingInfo: GameInfo<ReadingGame> = {
  prompt: (g) => `${g.title}《${g.passageTitle}》`,
  answer: (g) => g.questions.map((q, i) => `${readingLabel(g, i)} ${readingAnswerText(q)}`).join('；'),
};
