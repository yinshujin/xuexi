import type { WordState } from './types';

/**
 * Map the engine's words back onto the printed words. The engine tokenises
 * differently ("Cock-a-doodle-doo" → 4 words, "couldn't" → could + n't), so
 * indexes don't line up. Edit-distance DP that lets up to 4 words on either
 * side merge into one match. Printed words without a match stay uncoloured
 * (undefined): a tokenisation mismatch is not the child's mistake.
 */
const norm = (w: string) => w.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
const MERGE = 4;
const SEVERITY: Record<WordState, number> = { ok: 0, miss: 1, wrong: 2 };
const worse = (a: WordState, b: WordState) => (SEVERITY[b] > SEVERITY[a] ? b : a);

interface Step {
  take: number;
  drop: number;
}

export function alignWords(printed: string[], engine: Array<{ word: string; state: WordState }>): Array<WordState | undefined> {
  const R = printed.length;
  const ref = printed.map(norm);
  const eng = engine.filter((w) => norm(w.word));
  const engN = eng.map((w) => norm(w.word));
  const E = eng.length;
  const out: Array<WordState | undefined> = new Array(R).fill(undefined);
  if (!R || !E) return out;

  const INF = Number.MAX_SAFE_INTEGER;
  const cost: number[][] = Array.from({ length: R + 1 }, () => new Array<number>(E + 1).fill(INF));
  const from: Array<Array<Step | null>> = Array.from({ length: R + 1 }, () => new Array<Step | null>(E + 1).fill(null));
  cost[R][E] = 0;
  for (let i = R; i >= 0; i--) {
    for (let j = E; j >= 0; j--) {
      if (i === R && j === E) continue;
      let best = INF;
      let step: Step | null = null;
      const consider = (c: number, s: Step) => {
        if (c < best) {
          best = c;
          step = s;
        }
      };
      if (i < R && cost[i + 1][j] !== INF) consider(cost[i + 1][j] + 1, { take: 1, drop: 0 });
      if (j < E && cost[i][j + 1] !== INF) consider(cost[i][j + 1] + 1, { take: 0, drop: 1 });
      for (let a = 1; a <= Math.min(MERGE, R - i); a++) {
        const left = ref.slice(i, i + a).join('');
        if (!left) continue;
        for (let b = 1; b <= Math.min(MERGE, E - j); b++) {
          if (left !== engN.slice(j, j + b).join('')) continue;
          const next = cost[i + a][j + b];
          if (next !== INF) consider(next + (a + b - 2) * 0.01, { take: a, drop: b });
        }
      }
      cost[i][j] = best;
      from[i][j] = step;
    }
  }
  let i = 0;
  let j = 0;
  while (i < R || j < E) {
    const step = from[i][j];
    if (!step) break;
    if (step.take && step.drop) {
      let st: WordState = 'ok';
      for (let k = 0; k < step.drop; k++) st = worse(st, eng[j + k].state);
      for (let k = 0; k < step.take; k++) out[i + k] = st;
    }
    i += step.take;
    j += step.drop;
  }
  return out;
}
