import { describe, expect, it } from 'vitest';
import { GENERATORS, isErrorTag, isGeneratorId } from '@xuexi/shared';
import { getGenerator } from '@xuexi/practice';
import {
  BOOKS,
  allKnowledgePoints,
  allLessons,
  findKnowledgePoint,
  findLesson,
  getBook,
} from '../src/index';

const ID_RE = /^[a-z0-9]+(?:[.-][a-z0-9]+)*$/;

/** Generator variants that exist in @xuexi/practice (generators not listed take no variant). */
const VARIANTS: Record<string, readonly string[]> = {
  'g2.addsub.2d': ['oral', 'vertical'],
  'g2.mul.table': ['tables-2-5', 'tables-6-9', 'all'],
  'g2.addsub.word': ['mixed', 'add', 'sub', 'compare'],
  'g2.measure': ['mixed', 'ruler', 'informal'],
  'g4.lines': ['mixed', 'lines', 'perpendicular', 'parallel'],
  'g4.oral.muldiv': ['mixed', 'mul', 'div'],
  'g4.quantity': ['mixed', 'part-whole', 'unit-price', 'speed', 'meeting'],
  'g4.figures': ['mixed', 'segments', 'angles', 'shapes'],
  // 拔高 / 创新: `${family}#${tier}`, one per template family in challenge-g2*.ts.
  'g2.challenge': [
    'add#stretch',
    'add#creative',
    'sub#stretch',
    'sub#creative',
    'compare#stretch',
    'compare#creative',
    'addsub#stretch',
    'addsub#creative',
    'guess#stretch',
    'guess#creative',
    'informal#stretch',
    'informal#creative',
    'cm#stretch',
    'cm#creative',
    'meter#stretch',
    'meter#creative',
    'mul#stretch',
    'mul#creative',
    'times#stretch',
    'times#creative',
    'table25#stretch',
    'table25#creative',
    'table69#stretch',
    'table69#creative',
    'div#stretch',
    'div#creative',
    'shop#stretch',
    'shop#creative',
  ],
  // 拔高 / 创新: `${family}#${tier}`, one per template family in challenge-g4*.ts.
  'g4.challenge': [
    'bignum#stretch',
    'bignum#creative',
    'approx#stretch',
    'approx#creative',
    'lines#stretch',
    'lines#creative',
    'perp#stretch',
    'perp#creative',
    'angle#stretch',
    'angle#creative',
    'mul#stretch',
    'mul#creative',
    'mulest#stretch',
    'mulest#creative',
    'order#stretch',
    'order#creative',
    'law#stretch',
    'law#creative',
    'lawmul#stretch',
    'lawmul#creative',
    'quantity#stretch',
    'quantity#creative',
    'figures#stretch',
    'figures#creative',
  ],
};

describe('ids', () => {
  const ids: string[] = [];
  for (const book of BOOKS) {
    ids.push(book.id);
    for (const unit of book.units) {
      ids.push(unit.id);
      for (const kp of unit.knowledgePoints) {
        ids.push(kp.id);
        for (const lesson of kp.lessons) ids.push(lesson.id);
      }
    }
  }

  it('are globally unique', () => {
    const dup = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dup).toEqual([]);
  });

  it('are well-formed and filesystem safe', () => {
    for (const id of ids) expect(id, id).toMatch(ID_RE);
  });

  it('follow the hierarchy naming scheme', () => {
    for (const book of BOOKS) {
      book.units.forEach((unit, i) => {
        expect(unit.id).toBe(`${book.id}.u${unit.index}`);
        expect(unit.index).toBe(i + 1);
        for (const kp of unit.knowledgePoints) {
          expect(kp.id.startsWith(`${unit.id}.`), kp.id).toBe(true);
          expect(kp.id.split('.').length, kp.id).toBe(3);
          for (const lesson of kp.lessons) {
            if (lesson.kind === 'lecture') expect(lesson.id).toBe(`${kp.id}.lecture`);
            else
              expect(lesson.id, lesson.id).toMatch(
                new RegExp(`^${kp.id.replace(/\./g, '\\.')}\\.tech-[a-z0-9-]+$`),
              );
          }
        }
      });
    }
  });
});

describe('books', () => {
  it('has the expected books', () => {
    expect(BOOKS.map((b) => b.id)).toEqual(['bsd-g2a', 'bsd-g4a', 'yw-g2a', 'yw-g4a', 'en-g2a', 'en-g4a']);
    expect(BOOKS.map((b) => b.subject)).toEqual(['math', 'math', 'chinese', 'chinese', 'english', 'english']);
    expect(getBook('bsd-g2a')?.grade).toBe(2);
    expect(getBook('bsd-g4a')?.grade).toBe(4);
    expect(getBook('nope')).toBeUndefined();
    for (const b of BOOKS) {
      if (b.subject === 'math') expect(b.edition).toBe('北师大版');
      if (b.subject === 'chinese') expect(b.edition).toBe('统编版');
      expect(b.sourceNote.length).toBeGreaterThan(50);
      expect(b.units.length).toBeGreaterThan(0);
      for (const u of b.units) expect(u.knowledgePoints.length, u.id).toBeGreaterThan(0);
    }
  });
});

describe('knowledge points', () => {
  const kps = allKnowledgePoints();

  it('have 2–4 objectives, key points and at most 3 local contexts', () => {
    for (const { kp } of kps) {
      expect(kp.objectives.length, kp.id).toBeGreaterThanOrEqual(2);
      expect(kp.objectives.length, kp.id).toBeLessThanOrEqual(4);
      expect(kp.keyPoints.length, kp.id).toBeGreaterThan(0);
      expect((kp.localContexts ?? []).length, kp.id).toBeLessThanOrEqual(3);
    }
  });

  it('have exactly one lecture (8–12 min) and 0–3 techniques (3–5 min)', () => {
    for (const { kp } of kps) {
      const lectures = kp.lessons.filter((l) => l.kind === 'lecture');
      const techs = kp.lessons.filter((l) => l.kind === 'technique');
      expect(lectures.length, kp.id).toBe(1);
      expect(techs.length, kp.id).toBeLessThanOrEqual(3);
      expect(lectures[0].minutes, kp.id).toBeGreaterThanOrEqual(8);
      expect(lectures[0].minutes, kp.id).toBeLessThanOrEqual(12);
      expect(lectures[0].remedies, kp.id).toBeUndefined();
      for (const t of techs) {
        expect(t.minutes, t.id).toBeGreaterThanOrEqual(3);
        expect(t.minutes, t.id).toBeLessThanOrEqual(5);
      }
      for (const l of kp.lessons) expect(l.focus.length, l.id).toBeGreaterThan(20);
    }
  });

  it('math technique remedies are non-empty valid ERROR_TAGS', () => {
    for (const { book, lesson } of allLessons()) {
      if (lesson.kind !== 'technique') continue;
      if (book.subject !== 'math') {
        expect(lesson.remedies, lesson.id).toBeUndefined();
        continue;
      }
      expect(lesson.remedies?.length ?? 0, lesson.id).toBeGreaterThan(0);
      for (const tag of lesson.remedies ?? [])
        expect(isErrorTag(tag), `${lesson.id}: ${tag}`).toBe(true);
    }
  });

  it('prerequisites resolve to earlier knowledge points of the same or an earlier book', () => {
    const order = new Map(kps.map((r, i) => [r.kp.id, i]));
    for (const { kp } of kps) {
      for (const pre of kp.prerequisites) {
        expect(order.has(pre), `${kp.id} -> ${pre}`).toBe(true);
        expect(order.get(pre)!, `${kp.id} -> ${pre} must come earlier`).toBeLessThan(
          order.get(kp.id)!,
        );
      }
    }
  });

  it('practice specs reference existing generators with valid variants and difficulty ranges', () => {
    for (const { book, kp } of kps) {
      for (const p of kp.practice) {
        const where = `${kp.id} -> ${p.generatorId}`;
        expect(isGeneratorId(p.generatorId), where).toBe(true);
        const gen = GENERATORS.find((g) => g.id === p.generatorId)!;
        expect(gen.grade, where).toBe(book.grade);
        expect(Number.isInteger(p.minDifficulty) && Number.isInteger(p.maxDifficulty), where).toBe(
          true,
        );
        expect(p.minDifficulty, where).toBeGreaterThanOrEqual(1);
        expect(p.maxDifficulty, where).toBeLessThanOrEqual(5);
        expect(p.minDifficulty, where).toBeLessThanOrEqual(p.maxDifficulty);
        // Item-bank generators (语文 / 英语, 数学 .concepts): variants are the knowledge points found in the bank data.
        const bank = book.subject !== 'math' || p.generatorId.endsWith('.concepts');
        const allowed = VARIANTS[p.generatorId] ?? (bank ? getGenerator(p.generatorId).variants : undefined);
        if (p.variant === undefined) continue;
        expect(allowed, `${where} takes no variant`).toBeDefined();
        expect(allowed).toContain(p.variant);
      }
    }
  });
});

describe('语文 / 英语 practice banks', () => {
  const BANK_BOOK: Record<string, string> = {
    'yw2.words': 'yw-g2a',
    'yw2.dictation': 'yw-g2a',
    'yw4.words': 'yw-g4a',
    'yw4.polyphone': 'yw-g4a',
    'yw4.dictation': 'yw-g4a',
    'en2.words': 'en-g2a',
    'en4.words': 'en-g4a',
    'g2.concepts': 'bsd-g2a',
    'g4.concepts': 'bsd-g4a',
  };
  it('every bank knowledge point exists in its book and every book knowledge point has practice', () => {
    for (const [gid, bookId] of Object.entries(BANK_BOOK)) {
      for (const v of getGenerator(gid as never).variants) {
        // `<kp>#stretch` / `<kp>#creative` serve that knowledge point's 拔高 / 创新 items.
        if (v !== 'mixed') expect(findKnowledgePoint(`${bookId}.${v.split('#')[0]}`), `${gid}: ${v}`).toBeDefined();
      }
    }
    for (const book of BOOKS.filter((b) => b.subject !== 'math')) {
      for (const u of book.units) {
        for (const k of u.knowledgePoints) {
          expect(k.practice.length, `${k.id} has no practice`).toBeGreaterThan(0);
          for (const p of k.practice) {
            expect(BANK_BOOK[p.generatorId], k.id).toBe(book.id);
            if (p.variant !== 'mixed') expect(`${book.id}.${p.variant?.split('#')[0]}`, k.id).toBe(k.id);
            if (p.variant?.includes('#')) expect(p.variant.split('#')[1], k.id).toBe(p.tier);
          }
        }
      }
    }
  });

  it('数学 concept banks: every bank knowledge point links to its routine, 拔高 and 创新 items', () => {
    for (const [gid, bookId] of [['g2.concepts', 'bsd-g2a'], ['g4.concepts', 'bsd-g4a']] as const) {
      const kps = getGenerator(gid).variants.filter((v) => v !== 'mixed' && !v.includes('#'));
      for (const v of kps) {
        const kp = findKnowledgePoint(`${bookId}.${v}`)!.kp;
        const linked = kp.practice.filter((p) => p.generatorId === gid).map((p) => p.variant);
        expect(linked, kp.id).toEqual([v, `${v}#stretch`, `${v}#creative`]);
      }
    }
  });
});

describe('lookup helpers', () => {
  it('findKnowledgePoint / findLesson / allLessons agree', () => {
    const lessons = allLessons();
    expect(lessons.length).toBeGreaterThan(0);
    for (const ref of lessons) {
      const found = findLesson(ref.lesson.id);
      expect(found?.lesson).toBe(ref.lesson);
      expect(found?.kp).toBe(ref.kp);
      expect(found?.unit).toBe(ref.unit);
      expect(found?.book).toBe(ref.book);
      expect(findKnowledgePoint(ref.kp.id)?.kp).toBe(ref.kp);
    }
    expect(findLesson('nope')).toBeUndefined();
    expect(findKnowledgePoint('nope')).toBeUndefined();
  });
});
