import { describe, expect, it } from 'vitest';
import { BOOKS } from '@xuexi/curriculum';
import { coreSpecs } from '../src/lib/learning';
import { scoreExam, unitPapers } from '../src/lib/exams';
import {
  gameAnswerText,
  gamePrompt,
  isNumberQuestion,
  READING,
  readingAnswerText,
  readingRight,
  readingScore,
  type ReadingGame,
  type ReadingPassage,
} from '../src/lib/games';

/** Han characters (punctuation, digits and spaces not counted). */
const hanCount = (s: string) => (s.match(/\p{Script=Han}/gu) ?? []).length;
/** English words; a blank {n} counts as one. */
const wordCount = (s: string) => s.replace(/\{\d+\}/g, 'X').split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const blanksOf = (s: string) => [...s.matchAll(/\{(\d+)\}/g)].map((m) => Number(m[1]));

const book = (id: string) => BOOKS.find((b) => b.id === id)!;

/** Length and shape rules per book. */
const RULES: Record<string, { min: number; max: number; count: (s: string) => number; questions: [number, number] }> = {
  'yw-g2a': { min: 60, max: 120, count: hanCount, questions: [3, 3] },
  'yw-g4a': { min: 150, max: 300, count: hanCount, questions: [4, 4] },
  'en-g2a': { min: 20, max: 40, count: wordCount, questions: [3, 5] },
  'en-g4a': { min: 50, max: 90, count: wordCount, questions: [3, 5] },
  'bsd-g2a': { min: 20, max: 120, count: hanCount, questions: [3, 3] },
  'bsd-g4a': { min: 20, max: 150, count: hanCount, questions: [3, 3] },
};

/** The math units with 情境题组 (units about shapes and space have none). */
const MATH_UNITS = [
  'bsd-g2a.u1', 'bsd-g2a.u2', 'bsd-g2a.u3', 'bsd-g2a.u4', 'bsd-g2a.u5', 'bsd-g2a.u7', 'bsd-g2a.u8',
  'bsd-g4a.u1', 'bsd-g4a.u3', 'bsd-g4a.u5', 'bsd-g4a.u7', 'bsd-g4a.u8',
];

const all: Array<{ unitId: string; paper: number; p: ReadingPassage }> = Object.entries(READING).flatMap(([unitId, ps]) =>
  ps.map((p, paper) => ({ unitId, paper, p })),
);
const where = (x: { unitId: string; paper: number }) => `${x.unitId}.${'ABC'[x.paper]}`;

describe('阅读题组 content', () => {
  it('every 语文 and 英语 unit has 3 passages (A, B, C)', () => {
    for (const id of ['yw-g2a', 'yw-g4a', 'en-g2a', 'en-g4a']) {
      for (const u of book(id).units) expect(READING[u.id]?.length, u.id).toBe(3);
    }
  });

  it('the math units claimed have 1–3 情境题组, and no other math unit has any', () => {
    for (const id of MATH_UNITS) {
      expect(READING[id]?.length, id).toBeGreaterThanOrEqual(1);
      expect(READING[id]!.length, id).toBeLessThanOrEqual(3);
    }
    const mathKeys = Object.keys(READING).filter((k) => k.startsWith('bsd-'));
    expect(mathKeys.sort()).toEqual([...MATH_UNITS].sort());
  });

  it('keys are real units, and each passage names a knowledge point of its unit that the papers use', () => {
    for (const { unitId, paper, p } of all) {
      const unit = BOOKS.flatMap((b) => b.units).find((u) => u.id === unitId);
      expect(unit, unitId).toBeTruthy();
      expect(p.kp, where({ unitId, paper })).toBeTruthy();
      const kp = unit!.knowledgePoints.find((k) => k.id === `${unitId}.${p.kp}`);
      expect(kp, `${where({ unitId, paper })} kp ${p.kp}`).toBeTruthy();
      expect(coreSpecs(kp!).length, `${where({ unitId, paper })} kp ${p.kp}`).toBeGreaterThan(0);
    }
  });

  it('passages are within the length limits, with the right number of questions', () => {
    for (const x of all) {
      const bookId = x.unitId.split('.')[0];
      const r = RULES[bookId];
      const n = r.count(x.p.text);
      expect(n, `${where(x)} length`).toBeGreaterThanOrEqual(r.min);
      expect(n, `${where(x)} length`).toBeLessThanOrEqual(r.max);
      expect(x.p.questions.length, `${where(x)} questions`).toBeGreaterThanOrEqual(r.questions[0]);
      expect(x.p.questions.length, `${where(x)} questions`).toBeLessThanOrEqual(r.questions[1]);
      expect(x.p.title.trim().length, where(x)).toBeGreaterThan(0);
    }
  });

  it('each choice question has one answer within its options, and the options are unique', () => {
    for (const x of all) {
      const english = x.unitId.startsWith('en-');
      for (const [i, q] of x.p.questions.entries()) {
        const at = `${where(x)} q${i + 1}`;
        expect(q.explain.trim().length, at).toBeGreaterThan(0);
        if (isNumberQuestion(q)) {
          expect(x.unitId.startsWith('bsd-'), `${at}: number input is for math`).toBe(true);
          expect(Number.isInteger(q.num) && q.num >= 0, at).toBe(true);
          continue;
        }
        expect(Number.isInteger(q.answer), at).toBe(true);
        expect(q.answer, at).toBeGreaterThanOrEqual(0);
        expect(q.answer, at).toBeLessThan(q.options.length);
        expect(q.options.length, at).toBeGreaterThanOrEqual(3);
        expect(q.options.length, at).toBeLessThanOrEqual(english ? 3 : 4);
        expect(new Set(q.options.map((o) => o.trim())).size, `${at} options unique`).toBe(q.options.length);
        for (const o of q.options) expect(o.trim().length, at).toBeGreaterThan(0);
      }
    }
  });

  it('完形填空: the blanks are {1}…{n} in order, one per question; 阅读 passages have no blanks', () => {
    for (const x of all) {
      const b = blanksOf(x.p.text);
      if (x.p.mode === 'cloze') {
        expect(x.unitId.startsWith('en-'), `${where(x)} cloze is for English`).toBe(true);
        expect(b, where(x)).toEqual(x.p.questions.map((_, i) => i + 1));
        expect(b.length, where(x)).toBeGreaterThanOrEqual(3);
        expect(b.length, where(x)).toBeLessThanOrEqual(5);
        for (const q of x.p.questions) expect(q.q, `${where(x)} cloze questions have no text`).toBe('');
      } else {
        expect(b, where(x)).toEqual([]);
        for (const q of x.p.questions) expect(q.q.trim().length, where(x)).toBeGreaterThan(0);
      }
    }
  });

  it('English units mix 阅读理解 and 完形填空; 语文四上 asks 信息提取, 词语理解, 句子理解, 推断感悟 in order', () => {
    for (const id of ['en-g2a', 'en-g4a']) {
      for (const u of book(id).units) {
        const modes = new Set(READING[u.id]!.map((p) => p.mode));
        expect(modes, u.id).toEqual(new Set(['read', 'cloze']));
        for (const p of READING[u.id]!) expect(/\p{Script=Han}/u.test(p.text), `${u.id} ${p.title}: English only`).toBe(false);
      }
    }
    for (const u of book('yw-g4a').units) {
      for (const p of READING[u.id]!) {
        expect(p.questions.map((q) => ('skill' in q ? q.skill : undefined)), `${u.id} ${p.title}`).toEqual(['信息提取', '词语理解', '句子理解', '推断感悟']);
      }
    }
  });

  it('no passage or title is used twice', () => {
    expect(new Set(all.map((x) => x.p.text)).size).toBe(all.length);
    for (const id of Object.keys(RULES)) {
      const titles = all.filter((x) => x.unitId.startsWith(`${id}.`)).map((x) => x.p.title);
      expect(new Set(titles).size, id).toBe(titles.length);
    }
  });
});

describe('阅读题组 in the papers', () => {
  const units = BOOKS.flatMap((b) => b.units);
  const readingOf = (items: ReturnType<typeof unitPapers>[number]['items']) =>
    items.filter((it) => it.game?.kind === 'reading').map((it) => it.game as ReadingGame);

  it('every paper with a passage has exactly one, on top of the rotating games; papers of a unit get different ones', () => {
    let total = 0;
    for (const u of units) {
      const papers = unitPapers(u.id);
      const seen = new Set<string>();
      for (const p of papers) {
        const games = readingOf(p.items);
        const passage = READING[u.id]?.[p.paper];
        expect(games.length, p.id).toBe(passage ? 1 : 0);
        if (!passage) continue;
        total++;
        const g = games[0];
        expect(g.passageTitle, p.id).toBe(passage.title);
        expect(g.text).toBe(passage.text);
        expect(g.weight, p.id).toBe(passage.questions.length);
        expect(seen.has(g.text), `${p.id} repeats a passage`).toBe(false);
        seen.add(g.text);
        expect(g.large, p.id).toBe(p.bookId.includes('g2'));
      }
    }
    // 16 语文 units + 14 英语 units, 3 papers each where made, and the math ones.
    expect(total).toBeGreaterThan(100);
  }, 120_000);

  it('shuffled options keep their answers, and grading counts the right ones', () => {
    for (const u of units) {
      for (const p of unitPapers(u.id)) {
        const g = readingOf(p.items)[0];
        if (!g) continue;
        const src = READING[u.id]![p.paper];
        g.questions.forEach((q, i) => {
          expect(readingAnswerText(q), `${p.id} q${i + 1}`).toBe(readingAnswerText(src.questions[i]));
          if (!isNumberQuestion(q)) expect([...q.options].sort()).toEqual([...(src.questions[i] as { options: string[] }).options].sort());
        });
        const right = g.questions.map((q) => (isNumberQuestion(q) ? q.num : q.answer));
        expect(readingScore(g, right), p.id).toBe(g.questions.length);
        const wrong = g.questions.map((q) => (isNumberQuestion(q) ? q.num + 1 : (q.answer + 1) % q.options.length));
        expect(readingScore(g, wrong), p.id).toBe(0);
        expect(readingScore(g, g.questions.map(() => null)), p.id).toBe(0);
        expect(gamePrompt(g)).toContain(g.passageTitle);
        for (const q of g.questions) expect(gameAnswerText(g)).toContain(readingAnswerText(q));
      }
    }
  }, 120_000);

  it('the answer positions are not all the same within a book', () => {
    for (const id of ['yw-g2a', 'yw-g4a', 'en-g2a', 'en-g4a']) {
      const firsts = new Set<number>();
      for (const u of book(id).units) {
        for (const p of unitPapers(u.id)) {
          for (const q of readingOf(p.items)[0]?.questions ?? []) if (!isNumberQuestion(q)) firsts.add(q.answer);
        }
      }
      expect(firsts.size, id).toBeGreaterThanOrEqual(3);
    }
  }, 120_000);

  it('scores a passage by the questions answered right (earned out of its weight)', () => {
    const p = unitPapers('yw-g4a.u1')[0];
    const at = p.items.findIndex((it) => it.game?.kind === 'reading');
    expect(at).toBeGreaterThanOrEqual(0);
    const g = p.items[at].game as ReadingGame;
    const allRight = p.items.map(() => ({ correct: true, response: null }));
    const full = scoreExam(p, allRight);
    expect(full.score).toBe(100);
    expect(full.total).toBe(p.items.length - 1 + g.questions.length);
    const partial = allRight.map((a, i) => (i === at ? { correct: false, response: null, earned: 2 } : a));
    expect(scoreExam(p, partial).correct).toBe(full.total - (g.questions.length - 2));
    expect(readingRight(g.questions[0], null)).toBe(false);
  }, 120_000);
});
