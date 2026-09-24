import type { ErrorTag } from '@xuexi/shared';
import { roundTo } from '../arith';
import type { Rng } from '../rng';
import type { SolutionStep } from '../types';
import { BLANK, defineGenerator, sampleUntil, step, type Diagnosis } from './base';

/**
 * g4.div.2d — 除数是两位数的除法（试商、调商），division widget（商 + 余数）。
 *
 * Trial quotient rule (北师大版「四舍五入法试商」): round the divisor to the
 * nearest ten R, trial digit = ⌊P / R⌋ (at most 9), then adjust:
 *   四舍 (divisor rounded down) → the trial may be too big  → 调小
 *   五入 (divisor rounded up)   → the trial may be too small → 调大
 *
 * Difficulty:
 *  1 除数四舍，三位数 ÷ 两位数，商是一位数，不用调商
 *  2 除数五入，三位数被除数，商一两位，不用调商
 *  3 需要调商（三、四位数被除数）
 *  4 商中间或末尾有 0
 *  5 四位数被除数，商有 0，并且需要调商或商是三位数
 */

export interface Div2dParams {
  dividend: number;
  divisor: number;
}

export interface DivTraceStep {
  /** Partial dividend at this step. */
  partial: number;
  /** Place value (power of ten) of this quotient digit. */
  place: number;
  /** Trial digit before adjustment (null when the digit is 0 because partial < divisor). */
  trial: number | null;
  digit: number;
  adjust: 'down' | 'up' | null;
  remainder: number;
}

export interface DivTrace {
  quotient: number;
  remainder: number;
  steps: DivTraceStep[];
  rounded: number;
}

/** Long division as taught, recording trial quotients and adjustments. */
export function longDivide(N: number, D: number): DivTrace {
  const ds = String(N);
  const R = roundTo(D, 10);
  const steps: DivTraceStep[] = [];
  let P = 0;
  let started = false;
  let q = 0;
  for (let i = 0; i < ds.length; i++) {
    P = P * 10 + Number(ds[i]);
    const place = ds.length - 1 - i;
    if (!started && P < D) continue;
    started = true;
    if (P < D) {
      steps.push({ partial: P, place, trial: null, digit: 0, adjust: null, remainder: P });
      q = q * 10;
      continue;
    }
    const trial = Math.min(9, Math.floor(P / R));
    let digit = trial;
    let adjust: DivTraceStep['adjust'] = null;
    while (digit * D > P) {
      digit--;
      adjust = 'down';
    }
    while (P - digit * D >= D) {
      digit++;
      adjust = 'up';
    }
    P -= digit * D;
    q = q * 10 + digit;
    steps.push({ partial: P + digit * D, place, trial, digit, adjust, remainder: P });
  }
  return { quotient: q, remainder: P, steps, rounded: R };
}

function pick(rng: Rng, d: number, target?: ErrorTag): Div2dParams {
  const level =
    target === 'quotient-too-big' || target === 'quotient-too-small'
      ? Math.max(d, 3)
      : target === 'quotient-place'
        ? Math.max(d, 4)
        : d;
  const sample = (): Div2dParams => {
    let divisor: number;
    if (target === 'quotient-too-big') divisor = rng.int(1, 8) * 10 + rng.int(1, 4);
    else if (target === 'quotient-too-small') divisor = rng.int(1, 8) * 10 + rng.int(5, 9);
    else if (level === 1) divisor = rng.int(1, 9) * 10 + rng.int(1, 4);
    else if (level === 2) divisor = rng.int(1, 8) * 10 + rng.int(5, 9);
    else divisor = rng.int(11, 89);
    if (divisor % 10 === 0) divisor += 1;
    const qMax = level === 1 ? 9 : level === 2 ? 39 : level === 3 ? 99 : 909;
    const quotient = rng.int(2, qMax);
    const remainder =
      target === 'remainder-error'
        ? rng.int(Math.min(10, divisor - 1), divisor - 1)
        : rng.chance(0.2)
          ? 0
          : rng.int(1, divisor - 1);
    return { dividend: quotient * divisor + remainder, divisor };
  };
  const accept = ({ dividend: N, divisor: D }: Div2dParams): boolean => {
    if (N < 100 || N > 9999) return false;
    const tr = longDivide(N, D);
    const adjusts = tr.steps.filter((s) => s.adjust).map((s) => s.adjust);
    const hasZero = String(tr.quotient).includes('0');
    if (target === 'quotient-too-big' && !adjusts.includes('down')) return false;
    if (target === 'quotient-too-small' && !adjusts.includes('up')) return false;
    switch (level) {
      case 1:
        return N < 1000 && tr.quotient < 10 && adjusts.length === 0;
      case 2:
        return N < 1000 && adjusts.length === 0 && !hasZero;
      case 3:
        return adjusts.length > 0 && !hasZero;
      case 4:
        return hasZero;
      default:
        return N >= 1000 && hasZero && (adjusts.length > 0 || tr.quotient >= 100);
    }
  };
  return sampleUntil(sample, accept, `div2d d${level}`);
}

const PLACE = ['个', '十', '百', '千'];

function divSteps(N: number, D: number, tr: DivTrace): SolutionStep[] {
  const out: SolutionStep[] = [];
  const first = tr.steps[0];
  const head = String(N).slice(0, String(N).length - first.place);
  out.push(
    step(
      head.length === 2
        ? `被除数前两位 ${head} ≥ ${D}，商写在${PLACE[first.place]}位上。`
        : `被除数前两位 ${head.slice(0, 2)} 比 ${D} 小，要看前三位 ${head}，商写在${PLACE[first.place]}位上。`,
    ),
  );
  out.push(step(`把 ${D} 看作 ${tr.rounded} 来试商（${D % 10 < 5 ? '四舍' : '五入'}）。`));
  for (const s of tr.steps) {
    if (s.trial === null) {
      out.push(step(`${s.partial} 比 ${D} 小，不够商 1，在${PLACE[s.place]}位上商 0。`));
      continue;
    }
    let text = `${s.partial} ÷ ${tr.rounded} ≈ ${s.trial}`;
    if (s.adjust === 'down')
      text += `，但 ${D} × ${s.trial} = ${D * s.trial} > ${s.partial}，商大了，调小为 ${s.digit}`;
    if (s.adjust === 'up')
      text += `，但余数 ${s.partial - D * s.trial} ≥ ${D}，商小了，调大为 ${s.digit}`;
    out.push(
      step(
        `${text}。`,
        `${D} × ${s.digit} = ${D * s.digit}，${s.partial} − ${D * s.digit} = ${s.remainder}`,
      ),
    );
  }
  out.push(step('所以', `${N} ÷ ${D} = ${tr.quotient}……${tr.remainder}`));
  out.push(step('验算：', `${tr.quotient} × ${D} + ${tr.remainder} = ${N}`));
  return out;
}

/** Quotients obtained by deleting one or more (non-leading) zeros from q. */
function zerosDropped(q: number): number[] {
  const s = String(q);
  const idx = [...s].map((c, i) => (c === '0' && i > 0 ? i : -1)).filter((i) => i >= 0);
  const out: number[] = [];
  for (let mask = 1; mask < 1 << idx.length; mask++) {
    const drop = new Set(idx.filter((_, k) => mask & (1 << k)));
    const t = [...s].filter((_, i) => !drop.has(i)).join('');
    if (t) out.push(Number(t));
  }
  return out;
}

export const g4Div2d = defineGenerator<Div2dParams>({
  id: 'g4.div.2d',
  variants: ['default'],
  targets: ['quotient-too-big', 'quotient-too-small', 'quotient-place', 'remainder-error'],
  build({ difficulty: d, target, rng }) {
    const p = pick(rng, d, target);
    const tr = longDivide(p.dividend, p.divisor);
    return {
      widget: 'division',
      prompt: `${p.dividend} ÷ ${p.divisor} = ${BLANK}……${BLANK}`,
      answer: { type: 'division', quotient: tr.quotient, remainder: tr.remainder },
      hint: `把 ${p.divisor} 看作接近的整十数 ${tr.rounded} 来试商，余数要比除数小。`,
      steps: divSteps(p.dividend, p.divisor, tr),
      targetSeconds: 40 + 10 * d,
      params: p,
    };
  },
  diagnose({ dividend: N, divisor: D }, r) {
    if (r.type !== 'division' || r.quotient === null) return { tags: [] };
    const Q = r.quotient;
    const R = r.remainder ?? 0;
    const q = Math.floor(N / D);
    const tags: Diagnosis['tags'] = [];
    if (Q === q)
      return {
        tags: ['remainder-error'],
        feedback: `商 ${q} 是对的，余数再算一算：${N} − ${q} × ${D}。`,
      };
    if (zerosDropped(q).includes(Q) || Q === q * 10 || (q % 10 === 0 && Q === q / 10)) {
      tags.push('quotient-place');
    } else if (Q > q || R < 0) {
      tags.push('quotient-too-big');
    } else {
      tags.push('quotient-too-small'); // Q < q ⇒ the true remainder N − Q·D is ≥ D
    }
    if (R >= D && !tags.includes('quotient-too-small')) tags.push('quotient-too-small');
    return { tags };
  },
});
