import type { ErrorTag } from '@xuexi/shared';
import type { Rng } from '../rng';
import { choiceDiagnosis, defineGenerator, numOf, step } from './base';

/**
 * g2.guess — 数学好玩：猜数游戏（北师大二上第一单元后）。
 *
 * 小明在 1~N 中想一个数，小红提问（“比 x 大吗？”“比 x 小吗？”“是 x 吗？”），
 * 小明只回答“对”或“不对”。根据对话：
 *  min / max   这个数最小 / 最大是几
 *  count       还有几个数可能是小明想的数
 *  which       小明想的数是几（对话已经把范围缩到一个数）
 *  next        下一次问哪个问题最好（choice：从中间问，每次排除大约一半）
 *
 * Difficulty:
 *  1 1~20，一个问题，回答都是“对”，求最小 / 最大
 *  2 1~100，一到两个问题，求最小 / 最大 / 个数
 *  3 1~100，两个问题，出现“不对”，求最小 / 最大 / 个数 / 下一问
 *  4 1~100，两到三个问题，求个数 / 下一问 / 是几
 *  5 1~100，三个问题（可能有“是 x 吗？不对”），求个数 / 下一问 / 是几
 */

export type GuessKind = 'gt' | 'lt' | 'eq';
export type GuessAsk = 'min' | 'max' | 'count' | 'which' | 'next';

export interface GuessParams {
  N: number;
  /** [kind, x, answer is 对] */
  qs: Array<[GuessKind, number, boolean]>;
  ask: GuessAsk;
  /** next: thresholds of the options “比 x 大吗？”, in display order */
  options: number[];
  optionTags: Array<ErrorTag | null>;
}

const holds = (kind: GuessKind, x: number, n: number) =>
  kind === 'gt' ? n > x : kind === 'lt' ? n < x : n === x;

/** Numbers 1..N that agree with every answer. */
export function guessCandidates(N: number, qs: GuessParams['qs']): number[] {
  const out: number[] = [];
  for (let n = 1; n <= N; n++) if (qs.every(([k, x, yes]) => holds(k, x, n) === yes)) out.push(n);
  return out;
}

export function guessQuestionText(kind: GuessKind, x: number): string {
  return kind === 'gt' ? `比 ${x} 大吗？` : kind === 'lt' ? `比 ${x} 小吗？` : `是 ${x} 吗？`;
}

/** The larger part left after asking “比 x 大吗？” about the candidates. */
function worstLeft(cands: number[], x: number): number {
  const big = cands.filter((n) => n > x).length;
  return Math.max(big, cands.length - big);
}

/** A threshold near the middle of [lo, hi] (a multiple of 5 when easy). */
function nearMiddle(rng: Rng, lo: number, hi: number, round: boolean): number {
  const mid = Math.floor((lo + hi) / 2);
  const span = Math.max(1, Math.floor((hi - lo) / 6));
  let x = mid + rng.int(-span, span);
  if (round) {
    const r = Math.round(x / 5) * 5;
    if (r > lo && r < hi) x = r;
  }
  return Math.min(hi - 1, Math.max(lo + 1, x));
}

/** One truthful question that splits [lo, hi] (both parts non-empty). */
function splitQuestion(
  rng: Rng,
  s: number,
  lo: number,
  hi: number,
  round: boolean,
  allowNo: boolean,
): [GuessKind, number, boolean] {
  const x = nearMiddle(rng, lo, hi, round);
  // gt x: {x+1..hi} vs {lo..x}; lt x: {lo..x-1} vs {x..hi}
  let kind: GuessKind = rng.chance(0.5) ? 'gt' : 'lt';
  if (kind === 'lt' && x <= lo) kind = 'gt';
  if (kind === 'gt' && x >= hi) kind = 'lt';
  let q: [GuessKind, number, boolean] = [kind, x, holds(kind, x, s)];
  if (!allowNo && !q[2]) {
    // Ask the opposite way so that the answer is 对.
    q = kind === 'gt' ? ['lt', x + 1, true] : ['gt', x - 1, true];
  }
  return q;
}

function narrow(qs: GuessParams['qs'], N: number): [number, number] {
  const c = guessCandidates(N, qs);
  return [c[0], c[c.length - 1]];
}

function buildParams(rng: Rng, d: number): GuessParams {
  const N = d <= 1 ? 20 : 100;
  const round = d <= 3;
  const allowNo = d >= 3;
  const ask: GuessAsk = rng.pick(
    (
      [
        ['min', 'max'],
        ['min', 'max', 'count'],
        ['min', 'max', 'count', 'next'],
        ['count', 'next', 'which'],
        ['count', 'next', 'which'],
      ] as GuessAsk[][]
    )[d - 1],
  );
  const nq = d <= 1 ? 1 : d === 2 ? rng.int(1, 2) : d === 3 ? 2 : d === 4 ? rng.int(2, 3) : 3;

  for (;;) {
    const s = rng.int(1, N);
    const qs: GuessParams['qs'] = [];
    if (ask === 'which') {
      // A coarse question or two, then two questions that pin the number down.
      const coarse = nq - 2 + (rng.chance(0.5) ? 1 : 0);
      for (let i = 0; i < coarse; i++) {
        const [lo, hi] = narrow(qs, N);
        if (hi - lo < 8) break;
        qs.push(splitQuestion(rng, s, lo, hi, round, allowNo));
      }
      const low: [GuessKind, number, boolean] = rng.chance(0.5)
        ? ['gt', s - 1, true]
        : ['lt', s, false];
      const high: [GuessKind, number, boolean] = rng.chance(0.5)
        ? ['lt', s + 1, true]
        : ['gt', s, false];
      if (s - 1 < 1 || s + 1 > N) continue;
      qs.push(...(rng.chance(0.5) ? [low, high] : [high, low]));
    } else {
      for (let i = 0; i < nq; i++) {
        const [lo, hi] = narrow(qs, N);
        if (hi - lo < 6) break;
        qs.push(splitQuestion(rng, s, lo, hi, round, allowNo));
      }
      if (d >= 5 && rng.chance(0.5)) {
        // “是 x 吗？不对” at an end of the range: that end is gone.
        const [lo, hi] = narrow(qs, N);
        const end = rng.chance(0.5) ? lo : hi;
        if (end !== s) qs.push(['eq', end, false]);
      }
    }
    const cands = guessCandidates(N, qs);
    if (ask === 'which') {
      if (cands.length !== 1) continue;
    } else if (cands.length < (ask === 'next' ? 6 : 2)) continue;
    // 问“最小 / 最大”时，这一头要被问题挡住过（不是 1 或 N）。
    if ((ask === 'min' && cands[0] === 1) || (ask === 'max' && cands[cands.length - 1] === N))
      continue;
    if (allowNo && d >= 3 && ask !== 'which' && !qs.some(([, , yes]) => !yes) && rng.chance(0.7))
      continue;

    let options: number[] = [];
    let optionTags: Array<ErrorTag | null> = [];
    if (ask === 'next') {
      const lo = cands[0];
      const hi = cands[cands.length - 1];
      const m = cands.length;
      const best = lo + Math.floor(m / 2) - 1 + (m % 2 === 1 && rng.chance(0.5) ? 1 : 0);
      const pool = [lo, lo + 1, hi - 1, hi - 2, lo - rng.int(3, 10), hi + rng.int(3, 10)].filter(
        (x) => x >= 1 && x < N && x !== best && worstLeft(cands, x) > worstLeft(cands, best) + 1,
      );
      const distractors = rng.shuffle([...new Set(pool)]).slice(0, 3);
      if (distractors.length < 3) continue;
      options = rng.shuffle([best, ...distractors]);
      optionTags = options.map((x) => (x === best ? null : 'guess-range'));
    }
    return { N, qs, ask, options, optionTags };
  }
}

function dialog(p: GuessParams): string {
  return p.qs
    .map(([k, x, yes]) => `小红：“${guessQuestionText(k, x)}”小明：“${yes ? '对' : '不对'}。”`)
    .join('\n');
}

/** What each answer tells us, in words. */
function meaning([k, x, yes]: [GuessKind, number, boolean]): string {
  if (k === 'eq') return yes ? `就是 ${x}` : `不是 ${x}`;
  if (k === 'gt')
    return yes ? `比 ${x} 大，最小是 ${x + 1}` : `不比 ${x} 大，可能就是 ${x}，最大是 ${x}`;
  return yes ? `比 ${x} 小，最大是 ${x - 1}` : `不比 ${x} 小，可能就是 ${x}，最小是 ${x}`;
}

const ASK_TEXT: Record<GuessAsk, string> = {
  min: '这个数最小是几？',
  max: '这个数最大是几？',
  count: '还有几个数可能是小明想的数？',
  which: '小明想的数是几？',
  next: '小红下一次问哪个问题最好？',
};

export const g2Guess = defineGenerator<GuessParams>({
  id: 'g2.guess',
  variants: ['mixed'],
  build({ difficulty: d, rng }) {
    const p = buildParams(rng, d);
    const cands = guessCandidates(p.N, p.qs);
    const lo = cands[0];
    const hi = cands[cands.length - 1];
    const prompt = `猜数游戏：小明在 1~${p.N} 中想了一个数，小红来猜。\n${dialog(p)}\n${ASK_TEXT[p.ask]}`;
    const clues = step(`一句一句地看：${p.qs.map(meaning).join('；')}。`);
    const range = step(
      cands.length === 1
        ? `所以只能是 ${lo}。`
        : `所以这个数在 ${lo}~${hi} 之间${cands.length < hi - lo + 1 ? `（${lo}~${hi} 中去掉已经排除的数）` : ''}。`,
    );
    const common = { params: p, targetSeconds: p.ask === 'next' ? 60 : 45 };
    switch (p.ask) {
      case 'next': {
        const best = p.options[p.optionTags.indexOf(null)];
        const left = worstLeft(cands, best);
        return {
          ...common,
          widget: 'choice',
          prompt,
          options: p.options.map((x) => guessQuestionText('gt', x)),
          answer: { type: 'choice', index: p.optionTags.indexOf(null) },
          hint: '先写出现在可能的范围，再从这个范围的中间问起，不管回答“对”还是“不对”，都能排除大约一半的数。',
          steps: [
            clues,
            range,
            step(
              `还有 ${cands.length} 个数。问“比 ${best} 大吗？”，不管回答什么，最多只剩 ${left} 个数，排除了大约一半。`,
            ),
            step('问靠近两头的数，运气不好时只能排除很少的数；问范围外面的数，一个也排除不了。'),
          ],
        };
      }
      case 'which':
        return {
          ...common,
          widget: 'numeric',
          prompt,
          answer: { type: 'number', value: lo },
          hint: '把每句回答的意思写下来：“比 x 大”不包括 x，“不比 x 大”包括 x。',
          steps: [clues, range],
        };
      case 'count':
        return {
          ...common,
          widget: 'numeric',
          prompt,
          answer: { type: 'number', value: cands.length },
          hint: '先找出这个数最小是几、最大是几，再数一数这中间有几个数（两头的数也要算上）。',
          steps: [
            clues,
            range,
            step(
              cands.length === hi - lo + 1
                ? `从 ${lo} 到 ${hi}，一共有 ${hi} − ${lo} + 1 = ${cands.length}（个）数。`
                : `从 ${lo} 到 ${hi} 有 ${hi - lo + 1} 个数，去掉排除的，还有 ${cands.length} 个。`,
            ),
          ],
        };
      default: {
        const value = p.ask === 'min' ? lo : hi;
        return {
          ...common,
          widget: 'numeric',
          prompt,
          answer: { type: 'number', value },
          hint: '“比 50 大”不包括 50；“比 50 大吗？”回答“不对”，这个数可能就是 50。',
          steps: [clues, range, step(`这个数最${p.ask === 'min' ? '小' : '大'}是 ${value}。`)],
        };
      }
    }
  },
  diagnose(p, r) {
    if (p.ask === 'next') return choiceDiagnosis(p.optionTags, r);
    const x = numOf(r);
    if (x === null) return { tags: [] };
    const cands = guessCandidates(p.N, p.qs);
    const ans =
      p.ask === 'min'
        ? cands[0]
        : p.ask === 'max' || p.ask === 'which'
          ? cands[cands.length - 1]
          : cands.length;
    // Off by one: a bound counted in or left out.
    return { tags: Math.abs(x - ans) === 1 ? ['guess-range'] : [] };
  },
  feedback: {
    'guess-range':
      '想一想边界：“比 50 大”不包括 50，“比 50 大吗？不对”说明可能就是 50。数个数时两头都要算上。',
  },
});
