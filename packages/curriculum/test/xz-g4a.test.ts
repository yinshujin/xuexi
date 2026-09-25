import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { findKnowledgePoint, getBook } from '../src/index';

/** 写作 四年级上册: one 方法 and one 练笔 knowledge point per unit, in the order of the 语文 book's 习作. */

const AUTHORED = join(dirname(fileURLToPath(import.meta.url)), '../../../content/authored');
const book = getBook('xz-g4a')!;

/** Characters that count as written: everything but whitespace (incl. the full-width space). */
const written = (s: string) => [...s].filter((ch) => !/\s/.test(ch)).length;
const han = (s: string) => [...s].filter((ch) => /[一-鿿]/.test(ch)).length;

describe('xz-g4a 写作 四年级上册', () => {
  it('is a 统编版 grade-4 写作 book with the eight 习作 units in textbook order', () => {
    expect(book.subject).toBe('writing');
    expect(book.edition).toBe('统编版');
    expect(book.grade).toBe(4);
    expect(book.term).toBe('上');
    expect(book.units.map((u) => u.title)).toEqual([
      '推荐一个好地方',
      '写人抓特点',
      '观察日记',
      '想象作文：我和___过一天',
      '把一件事写清楚',
      '介绍一处世界文化遗产',
      '写心情：我的心儿怦怦跳',
      '写信',
    ]);
  });

  it('every unit has a 方法 knowledge point (lecture) and a 练笔 knowledge point (technique + writing task)', () => {
    for (const u of book.units) {
      expect(u.knowledgePoints.length, u.id).toBe(2);
      const [method, practice] = u.knowledgePoints;
      expect(method.writing, method.id).toBeUndefined();
      expect(method.lessons.map((l) => l.kind), method.id).toEqual(['lecture']);
      expect(practice.title.startsWith('练笔：'), practice.id).toBe(true);
      expect(practice.lessons.filter((l) => l.kind === 'technique').length, practice.id).toBe(1);
      expect(practice.writing, practice.id).toBeDefined();
    }
  });

  it('builds on the 语文 book: each 方法 point follows its 习作 point there, each 练笔 point its 方法 point', () => {
    for (const u of book.units) {
      const [method, practice] = u.knowledgePoints;
      const yw = method.prerequisites.filter((p) => p.startsWith('yw-g4a.'));
      expect(yw.length, method.id).toBe(1);
      const ref = findKnowledgePoint(yw[0])!;
      expect(ref.unit.index, method.id).toBe(u.index);
      expect(ref.kp.title.startsWith('习作'), `${method.id} -> ${yw[0]}`).toBe(true);
      expect(practice.prerequisites, practice.id).toContain(method.id);
    }
  });

  it('writing tasks are complete, at 四年级 length, with an original model text of that length', () => {
    for (const u of book.units) {
      const w = u.knowledgePoints[1].writing!;
      expect(w.id).toBe(`${u.id}.task`);
      expect(w.title.length, w.id).toBeGreaterThan(0);
      expect(w.prompt.length, w.id).toBeGreaterThan(60);
      expect(w.prompt, w.id).toContain(`${w.minChars} 字`);
      expect(w.tips.length, w.id).toBeGreaterThanOrEqual(3);
      expect(w.tips.length, w.id).toBeLessThanOrEqual(5);
      expect(w.outline.length, w.id).toBeGreaterThanOrEqual(3);
      for (const o of w.outline) {
        expect(o.label.trim().length, w.id).toBeGreaterThan(0);
        expect(o.hint.trim().length, w.id).toBeGreaterThan(4);
      }
      expect(new Set(w.outline.map((o) => o.label)).size, w.id).toBe(w.outline.length);
      expect(w.wordBank?.length ?? 0, w.id).toBeGreaterThanOrEqual(6);
      expect(new Set(w.wordBank).size, w.id).toBe(w.wordBank!.length);
      expect(w.checklist.length, w.id).toBeGreaterThanOrEqual(4);
      expect(w.minChars, w.id).toBeGreaterThanOrEqual(300);
      expect(w.minChars, w.id).toBeLessThanOrEqual(450);
      expect(w.maxChars!, w.id).toBeGreaterThan(w.minChars);
      const ex = w.example!;
      expect(written(ex), `${w.id}: model text length`).toBeGreaterThanOrEqual(w.minChars);
      expect(han(ex), `${w.id}: model text Chinese characters`).toBeGreaterThanOrEqual(w.minChars - 20);
      expect(written(ex), `${w.id}: model text length`).toBeLessThanOrEqual(w.maxChars! + 100);
      // Paragraphs start with two full-width spaces (the first line is the title, a date or a salutation).
      for (const line of ex.split('\n').slice(1)) expect(line.trim().length, w.id).toBeGreaterThan(0);
    }
  });

  it('the 方法 lectures and 练笔 technique lessons are authored', () => {
    for (const u of book.units) {
      const [method, practice] = u.knowledgePoints;
      const ids = [method.lessons[0].id, practice.lessons.find((l) => l.kind === 'technique')!.id];
      for (const id of ids) {
        const file = join(AUTHORED, `${id}.json`);
        expect(existsSync(file), id).toBe(true);
        const json = JSON.parse(readFileSync(file, 'utf8')) as { lessonId: string; scenes: Array<{ type: string; title: string }> };
        expect(json.lessonId).toBe(id);
        if (id.endsWith('.lecture')) expect(json.scenes.some((s) => s.title.includes('动笔试一试')), id).toBe(true);
        expect(json.scenes.some((s) => s.title.includes('学法口诀')), id).toBe(true);
      }
    }
  });
});
