import { describe, expect, it } from 'vitest';
import { BOOKS } from '@xuexi/curriculum';
import { gradeQuestion, makeQuestion } from '../src/lib/learning';
import { examHistory, examUnits, findPaper, PAPER_SIZE, questionIdentity, scoreExam, unitPapers } from '../src/lib/exams';
import type { Answer, Question, Response } from '@xuexi/practice';
import { orderCorrect } from '../src/lib/games';

// Every unit of every book, the hands-on ones (观察物体, 统计 …) included.
const units = BOOKS.flatMap((b) => b.units);

/** The right response to a question (to check the papers grade). */
function rightResponse(q: Question): Response {
  const a: Answer = q.answer;
  switch (a.type) {
    case 'number':
      return q.widget === 'vertical' ? { type: 'vertical', value: a.value } as Response : { type: 'number', value: a.value };
    case 'choice':
      return { type: 'choice', index: a.index };
    case 'compare':
      return { type: 'compare', value: a.value };
    case 'division':
      return { type: 'division', quotient: a.quotient, remainder: a.remainder };
  }
}

describe('单元测试 papers', () => {
  it('every unit of every book has 2 or 3 papers', () => {
    expect(units.length).toBeGreaterThan(40);
    for (const u of units) {
      const n = unitPapers(u.id).length;
      expect(n, u.id).toBeGreaterThanOrEqual(2);
      expect(n, u.id).toBeLessThanOrEqual(3);
    }
  }, 120_000);

  it('each paper covers every knowledge point of its unit (at least twice), ending with 拔高 / 创新', () => {
    for (const u of units) {
      for (const p of unitPapers(u.id)) {
        expect(p.items.length, p.id).toBeGreaterThanOrEqual(PAPER_SIZE);
        const core = p.items.filter((it) => !it.tier && it.ref);
        for (const k of p.kps) expect(core.filter((it) => it.kpId === k.id).length, `${p.id} ${k.id}`).toBeGreaterThanOrEqual(2);
        const tiers = p.items.map((it) => it.tier ?? (it.game ? 'game' : 'core'));
        const firstChallenge = tiers.findIndex((t) => t !== 'core');
        if (firstChallenge >= 0) expect(tiers.slice(firstChallenge).every((t) => t !== 'core'), p.id).toBe(true);
      }
    }
  }, 120_000);

  it('no question twice in a paper, and papers of a unit differ', () => {
    let repeatsAcross = 0;
    let total = 0;
    for (const u of units) {
      const papers = unitPapers(u.id);
      const seen = new Set<string>();
      for (const p of papers) {
        const prompts = p.items.flatMap((it) => (it.ref ? [questionIdentity(makeQuestion(it.ref))] : []));
        const mine = new Set(prompts);
        expect(prompts.length - mine.size, `${p.id} repeats within the paper`).toBe(0);
        for (const x of mine) {
          if (seen.has(x)) repeatsAcross++;
          total++;
        }
        for (const x of mine) seen.add(x);
      }
    }
    expect(repeatsAcross / total).toBeLessThan(0.05);
  }, 120_000);

  it('papers are fixed (same questions every time) and every answer key grades as right', () => {
    const p = unitPapers(units[0].id)[0];
    expect(findPaper(p.id)).toBe(p);
    for (const u of units) {
      for (const paper of unitPapers(u.id)) {
        for (const it of paper.items) {
          if (!it.ref) continue;
          const q = makeQuestion(it.ref);
          expect(gradeQuestion(q, rightResponse(q)).correct, `${paper.id} ${q.prompt}`).toBe(true);
        }
      }
    }
  }, 120_000);

  it('scores out of 100 with a per-knowledge-point breakdown, and keeps the best', () => {
    const p = unitPapers(units[0].id)[0];
    const answers = p.items.map((_, i) => ({ correct: i % 2 === 0, response: null }));
    const r = scoreExam(p, answers);
    expect(r.total).toBe(p.items.length);
    expect(r.score).toBe(Math.round((100 * Math.ceil(p.items.length / 2)) / p.items.length));
    expect(r.byKp.reduce((t, k) => t + k.total, 0)).toBe(p.items.length);
    const ev = (score: number, at: number) => ({
      type: 'lesson' as const, id: `e${at}`, childId: 'c', at, deviceId: 'd', lessonId: `exam:${p.id}`,
      packVersion: 1, progress: 1, completed: true, durationMs: 1, examScore: score,
    });
    expect(examHistory([ev(80, 1), ev(95, 2), ev(70, 3)]).get(p.id)).toEqual({ best: 95, last: 70, times: 3, lastAt: 3 });
  });

  it('lists the units of a child\'s books', () => {
    const list = examUnits(['bsd-g2a', 'yw-g2a', 'en-g2a']);
    expect(new Set(list.map((x) => x.book.id))).toEqual(new Set(['bsd-g2a', 'yw-g2a', 'en-g2a']));
  });
});

describe('连连看 / 拼一拼', () => {
  it('every 语文 and 英语 paper has one of each; math papers a 连连看 where the unit has sums', () => {
    for (const u of units) {
      for (const p of unitPapers(u.id)) {
        const kinds = p.items.flatMap((it) => (it.game ? [it.game.kind] : []));
        const subject = p.subject;
        if (subject !== 'math') expect(kinds.sort(), p.id).toEqual(['match', 'order']);
        else expect(kinds.every((k) => k === 'match'), p.id).toBe(true);
      }
    }
  });

  it('games are well formed and solvable', () => {
    for (const u of units) {
      for (const p of unitPapers(u.id)) {
        for (const it of p.items) {
          const g = it.game;
          if (!g) continue;
          expect(p.kps.some((k) => k.id === it.kpId), p.id).toBe(true);
          if (g.kind === 'match') {
            expect(g.pairs.length).toBeGreaterThanOrEqual(4);
            expect(new Set(g.pairs.map((x) => x[0])).size, p.id).toBe(g.pairs.length);
            expect(new Set(g.pairs.map((x) => x[1])).size, p.id).toBe(g.pairs.length);
            expect([...g.order].sort((a, b) => a - b)).toEqual(g.pairs.map((_, i) => i));
          } else {
            // The answer can be built from the tiles, and the tiles are not already in order.
            const pool = [...g.tiles];
            for (const t of g.answer) {
              const at = pool.indexOf(t);
              expect(at, `${p.id} ${t}`).toBeGreaterThanOrEqual(0);
              pool.splice(at, 1);
            }
            expect(g.tiles.slice(0, g.answer.length).join(g.joiner) === g.answer.join(g.joiner) && pool.length === 0).toBe(false);
            expect(orderCorrect(g, g.answer)).toBe(true);
            expect(orderCorrect(g, [...g.answer].reverse())).toBe(g.answer.length < 2 || g.answer.join() === [...g.answer].reverse().join());
          }
        }
      }
    }
  });
});

describe('game registry', () => {
  it('every game kind in the papers has a view, a prompt and an answer text', async () => {
    const { GAME_VIEWS } = await import('../src/practice/games');
    const { gameAnswerText, gamePrompt } = await import('../src/lib/games');
    const kinds = new Set<string>();
    for (const u of units) {
      for (const p of unitPapers(u.id)) {
        for (const it of p.items) {
          if (!it.game) continue;
          kinds.add(it.game.kind);
          expect(GAME_VIEWS[it.game.kind], it.game.kind).toBeTruthy();
          expect(gamePrompt(it.game).length, `${p.id} ${it.game.kind}`).toBeGreaterThan(0);
          expect(gameAnswerText(it.game).length, `${p.id} ${it.game.kind}`).toBeGreaterThan(0);
          expect(it.game.weight ?? 1).toBeGreaterThan(0);
        }
      }
    }
    expect(kinds.size).toBeGreaterThanOrEqual(2);
  });
});
