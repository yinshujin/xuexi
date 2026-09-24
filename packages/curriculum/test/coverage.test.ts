import { describe, expect, it } from 'vitest';
import { GENERATORS, type ErrorTag } from '@xuexi/shared';
import { BOOKS, type Book } from '../src/index';

/**
 * Error tags that a book's linked generators can emit but that no technique
 * lesson in that book remedies. Keep this minimal and documented.
 * (Currently every emitted tag is covered.)
 */
const DOCUMENTED_UNCOVERED: Record<string, ErrorTag[]> = {
  'bsd-g2a': [],
  'bsd-g4a': [],
};

function coverage(book: Book) {
  const emitted = new Set<ErrorTag>();
  const remedied = new Set<ErrorTag>();
  for (const unit of book.units) {
    for (const kp of unit.knowledgePoints) {
      for (const p of kp.practice) {
        const gen = GENERATORS.find((g) => g.id === p.generatorId);
        for (const tag of gen?.errorTags ?? []) emitted.add(tag);
      }
      for (const l of kp.lessons) for (const t of l.remedies ?? []) remedied.add(t);
    }
  }
  const uncovered = [...emitted].filter((t) => !remedied.has(t)).sort();
  return { emitted: [...emitted].sort(), uncovered };
}

describe('error tag coverage by technique lessons', () => {
  // Only math technique lessons carry `remedies`; 语文 / 英语 errors are fixed by the item explanations.
  for (const book of BOOKS.filter((b) => b.subject === 'math')) {
    it(`${book.id}: every tag emitted by linked generators has a remedy (or is documented)`, () => {
      const { emitted, uncovered } = coverage(book);
      // Report for humans running the tests.
      console.info(
        `[coverage] ${book.id}: ${emitted.length} emitted tags; uncovered: ${uncovered.length ? uncovered.join(', ') : '(none)'}`,
      );
      expect(uncovered).toEqual([...(DOCUMENTED_UNCOVERED[book.id] ?? [])].sort());
    });
  }

  it('reports generators not linked from any book', () => {
    const linked = new Set(
      BOOKS.flatMap((b) =>
        b.units.flatMap((u) =>
          u.knowledgePoints.flatMap((k) => k.practice.map((p) => p.generatorId)),
        ),
      ),
    );
    const unlinked = GENERATORS.map((g) => g.id).filter((id) => !linked.has(id));
    console.info(
      `[coverage] generators not linked from any book: ${unlinked.join(', ') || '(none)'}`,
    );
    // g2.unit.money: 人民币 is not in the 2024-revised 二年级上册.
    expect(unlinked).toEqual(['g2.unit.money']);
  });
});
