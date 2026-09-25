/**
 * 判断 (five 对 / 错 statements) and ⚡限时挑战 (60 seconds of them):
 * 数学 「7 × 8 = 54」, 语文 「宽广」读作 kuān guǎng, 英语 cat — 猫. The
 * statements are made in advance (fixed per paper) from the unit's material.
 */
import type { KnowledgePoint } from '@xuexi/curriculum';
import type { GameBuilder, GameContext, GameInfo, JudgeGame, JudgeStatement, TimedGame, UnitGame } from './types';
import { mathStatements, mathTopic, topicKp } from './mathfacts';
import { chineseStatements, englishStatements, enWords, ywWords } from './words';

export const JUDGE_COUNT = 5;
/** A 判断 counts as right with at most one statement judged wrong. */
export const JUDGE_SLIPS = 1;

export const TIMED_SECONDS = 60;
export const TIMED_COUNT = 30;
export const TIMED_FULL = { right: 10, wrong: 2 };
export const TIMED_PASS = { right: 6, wrong: 4 };

/** Points of a 限时挑战 run: its weight (2) for TIMED_FULL, 1 for TIMED_PASS, else 0. */
export function timedEarned(g: TimedGame, right: number, wrong: number): number {
  if (right >= g.full.right && wrong <= g.full.wrong) return g.weight ?? 2;
  if (right >= g.pass.right && wrong <= g.pass.wrong) return 1;
  return 0;
}

export const timedRule = (g: TimedGame) =>
  `⭐⭐ 答对 ${g.full.right} 题以上、答错不超过 ${g.full.wrong} 题；⭐ 答对 ${g.pass.right} 题以上、答错不超过 ${g.pass.wrong} 题`;

/** The unit's statements, with the knowledge point they are about; none when the unit has no material. */
function statements(ctx: GameContext, plan: boolean[]): { kp: KnowledgePoint; list: JudgeStatement[]; what: string } | null {
  const { book, unit, rng } = ctx;
  const n = plan.length;
  if (book.subject === 'math') {
    const topic = mathTopic(unit);
    const kp = topic && topicKp(unit, topic);
    const list = mathStatements(unit, rng, plan);
    return kp && list.length === n ? { kp, list, what: '算得对不对？' } : null;
  }
  if (book.subject === 'chinese') {
    const words = ywWords(ctx);
    const list = chineseStatements(words, rng, plan);
    const kp = words.find((w) => w.w === list[0]?.word)?.kp;
    return kp && list.length === n ? { kp, list, what: '拼音对不对？' } : null;
  }
  const words = enWords(ctx);
  const list = englishStatements(words, rng, plan);
  const kp = words.find((w) => list[0]?.text.startsWith(`${w.en} — `))?.kp;
  return kp && list.length === n ? { kp, list, what: '单词的意思对不对？' } : null;
}

export const judgeBuilder: GameBuilder = {
  id: 'judge',
  build(ctx): UnitGame[] {
    // Two or three of the five are wrong: both buttons are needed.
    const plan = ctx.rng.shuffle([true, true, false, false, ctx.rng.chance(0.5)]);
    const s = statements(ctx, plan);
    if (!s) return [];
    const words = [...new Set(s.list.flatMap((x) => (x.word ? [x.word] : [])))];
    const game: JudgeGame = { kind: 'judge', title: `判断：${s.what}`, statements: s.list, ...(words.length ? { words } : {}) };
    return [{ kpId: s.kp.id, kpTitle: s.kp.title, game }];
  },
};

export const timedBuilder: GameBuilder = {
  id: 'timed',
  build(ctx): UnitGame[] {
    const s = statements(ctx, Array.from({ length: TIMED_COUNT }, () => ctx.rng.chance(0.5)));
    if (!s) return [];
    const game: TimedGame = {
      kind: 'timed',
      title: `⚡限时挑战 ${TIMED_SECONDS} 秒：${s.what}`,
      weight: 2,
      seconds: TIMED_SECONDS,
      statements: s.list,
      full: TIMED_FULL,
      pass: TIMED_PASS,
    };
    return [{ kpId: s.kp.id, kpTitle: s.kp.title, game }];
  },
};

const statementAnswer = (x: JudgeStatement) => (x.truth ? `${x.text}（对）` : `${x.text}（错，应该是 ${x.fix}）`);

export const judgeInfo: GameInfo<JudgeGame> = {
  prompt: (g) => `${g.title}${g.statements.map((x) => x.text).join('；')}`,
  answer: (g) => g.statements.map(statementAnswer).join('；'),
};

export const timedInfo: GameInfo<TimedGame> = {
  prompt: (g) => `${g.title}（${g.seconds} 秒内判断对错）`,
  answer: (g) => timedRule(g),
};
