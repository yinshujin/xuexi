import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unzipSync } from 'fflate';
import { readBundle } from '@xuexi/course-pack';
import { exportBooks } from '../src/books/export';
import { importBookDash, importBookDashSamples, importPdf } from '../src/books/import';
import { splitSentences } from '../src/books/sentences';
import { loadBook, saveBook } from '../src/books/store';
import { alignWords, narrateBook, type BookVoice } from '../src/books/tts';
import { getPaths } from '../src/paths';

describe('splitSentences', () => {
  it('splits on sentence ends and keeps abbreviations together', () => {
    expect(splitSentences('Mr. Sloth is sleepy.  He  yawns!\nThen he sleeps.')).toEqual([
      'Mr. Sloth is sleepy.',
      'He yawns!',
      'Then he sleeps.',
    ]);
  });

  it('keeps a quoted sentence whole and straightens quotes', () => {
    expect(splitSentences('“Come back, cat!” she said. It’s late.')).toEqual(['"Come back, cat!" she said.', "It's late."]);
  });

  it('does not split before a lowercase word', () => {
    expect(splitSentences('Wait... and see.')).toEqual(['Wait... and see.']);
  });
});

describe('alignWords', () => {
  it('maps spoken words onto the printed tokens with punctuation', () => {
    const w = alignWords('"Come back, cat!"', [
      { text: 'Come', start: 100, end: 300 },
      { text: 'back', start: 300, end: 500 },
      { text: 'cat', start: 600, end: 900 },
    ]);
    expect(w).toEqual([
      { w: '"Come', start: 100, end: 300 },
      { w: 'back,', start: 300, end: 500 },
      { w: 'cat!"', start: 600, end: 900 },
    ]);
  });

  it('fills a skipped word from its neighbours', () => {
    const w = alignWords('one two three four five', [
      { text: 'one', start: 0, end: 100 },
      { text: 'two', start: 100, end: 200 },
      { text: 'four', start: 300, end: 400 },
      { text: 'five', start: 400, end: 500 },
    ])!;
    expect(w[2]).toEqual({ w: 'three', start: 200, end: 300 });
  });

  it('gives up when too few words match', () => {
    expect(alignWords('one two three', [{ text: 'zebra', start: 0, end: 1 }])).toBeUndefined();
  });
});

/** Writes the text as the "audio" and spreads the words evenly: no network needed. */
const fakeVoice: BookVoice = {
  name: 'fake',
  ext: 'mp3',
  cacheKey: 'fake',
  async synthesize(jobs) {
    for (const j of jobs) {
      writeFileSync(j.audio, `audio:${j.text}`);
      const words = j.text.split(/\s+/).map((t, i) => ({ text: t.replace(/[^A-Za-z']/g, ''), start: i * 400, end: i * 400 + 350 }));
      writeFileSync(j.words, JSON.stringify(words));
    }
  },
};

describe('picture books', () => {
  let tmp: string;
  let repo: string;
  const paths = () => getPaths(join(tmp, 'content'));

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xuexi-books-'));
    repo = join(tmp, 'bookdash-books');
    const en = join(repo, 'little-fish', 'en');
    mkdirSync(join(en, 'images'), { recursive: true });
    mkdirSync(join(repo, '_data'), { recursive: true });
    for (const f of ['cover.jpg', '01.jpg', '02.jpg', '03.jpg']) writeFileSync(join(en, 'images', f), `jpeg ${f}`);
    writeFileSync(
      join(en, 'index.md'),
      [
        '---',
        'title: "Little Fish"',
        'layout: book',
        '---',
        '',
        '![](images/01.jpg)',
        '',
        'Little Fish swims.',
        'Mr. Crab waves.',
        '{:.page-text}',
        '',
        '![](images/02.jpg)',
        '',
        '![](images/03.jpg)',
        '',
        '"Goodbye, Crab!" says Little Fish.',
        '',
      ].join('\n'),
    );
    writeFileSync(join(repo, '_data', 'meta.yml'), 'books:\n  little-fish:\n    creator: "Ann Writer, Ben Painter"\n');
  });

  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  it('imports a Book Dash book: one page per picture, the text below it as sentences', () => {
    const b = importBookDash(paths(), join(repo, 'little-fish', 'en'), { level: 'B' });
    expect(b.id).toBe('bookdash-little-fish');
    expect(b.title).toBe('Little Fish');
    expect(b.private).toBe(false);
    expect(b.source).toMatchObject({ name: 'Book Dash', license: 'CC BY 4.0', attribution: 'Ann Writer, Ben Painter（Book Dash）' });
    expect(b.cover).toBe('pages/cover.jpg');
    expect(b.pages.map((p) => p.image)).toEqual(['pages/01.jpg', 'pages/02.jpg', 'pages/03.jpg']);
    expect(b.pages.map((p) => p.sentences.map((s) => s.text))).toEqual([
      ['Little Fish swims.', 'Mr. Crab waves.'],
      [],
      ['"Goodbye, Crab!" says Little Fish.'],
    ]);
    expect(readFileSync(join(paths().content, 'books', b.id, 'pages', '02.jpg'), 'utf8')).toBe('jpeg 02.jpg');
  });

  it('imports the sample list with its quizzes', () => {
    const list = join(tmp, 'samples.json');
    const quiz = [{ question: 'Who swims?', options: ['Fish', 'Crab'], answer: 0 }];
    writeFileSync(list, JSON.stringify({ books: [{ slug: 'little-fish', level: 'B', quiz }] }));
    const [b] = importBookDashSamples(paths(), repo, list);
    expect(loadBook(paths(), b.id).quiz).toEqual(quiz);
  });

  it('refuses to export a book without narration unless asked', async () => {
    await expect(exportBooks(paths(), { out: join(tmp, 'x.zip') })).rejects.toThrow(/还没有配音/);
  });

  it('narrates with word timings, reuses the cache, and exports a bundle the app accepts', async () => {
    const p = paths();
    const cacheDir = join(tmp, 'cache');
    expect(await narrateBook(p, loadBook(p, 'bookdash-little-fish'), { voice: fakeVoice, cacheDir })).toBe(3);
    const b = loadBook(p, 'bookdash-little-fish');
    const s = b.pages[2].sentences[0];
    expect(s.audio).toBe('audio/p03-s1.mp3');
    expect(s.words?.map((w) => w.w)).toEqual(['"Goodbye,', 'Crab!"', 'says', 'Little', 'Fish.']);
    // Nothing left to do the second time.
    expect(await narrateBook(p, b, { voice: fakeVoice, cacheDir })).toBe(0);

    const out = join(tmp, 'books.zip');
    const r = await exportBooks(p, { out });
    expect(r.books).toHaveLength(1);
    expect(r.books[0]).toMatchObject({ id: 'bookdash-little-fish', pages: 3, words: 11, private: false });
    const bundle = await readBundle(unzipSync(new Uint8Array(readFileSync(out))));
    expect(bundle.skipped).toEqual([]);
    expect(bundle.packs).toEqual([]);
    expect(bundle.books).toHaveLength(1);
    expect(Object.keys(bundle.books[0].files).sort()).toEqual([
      'audio/p01-s1.mp3',
      'audio/p01-s2.mp3',
      'audio/p03-s1.mp3',
      'book.json',
      'pages/01.jpg',
      'pages/02.jpg',
      'pages/03.jpg',
      'pages/cover.jpg',
    ]);
  });

  it('a tampered file is rejected by the app', async () => {
    const out = join(tmp, 'books.zip');
    const zip = unzipSync(new Uint8Array(readFileSync(out)));
    zip['books/bookdash-little-fish/v1/pages/01.jpg'] = new TextEncoder().encode('evil');
    const bundle = await readBundle(zip);
    expect(bundle.books).toEqual([]);
    expect(bundle.skipped[0]).toMatch(/pages\/01\.jpg/);
  });

  it('never exports a private book inside GitHub Actions', async () => {
    const p = paths();
    const b = loadBook(p, 'bookdash-little-fish');
    saveBook(p, { ...b, id: 'raz-b-test', private: true });
    const before = process.env.GITHUB_ACTIONS;
    process.env.GITHUB_ACTIONS = 'true';
    try {
      await expect(exportBooks(p, { ids: ['raz-b-test'], out: join(tmp, 'p.zip'), allowSilent: true })).rejects.toThrow(/私有/);
    } finally {
      if (before === undefined) delete process.env.GITHUB_ACTIONS;
      else process.env.GITHUB_ACTIONS = before;
    }
  });

  let hasPyMuPdf = false;
  try {
    execFileSync('python3', ['-c', 'import pymupdf'], { stdio: 'ignore' });
    hasPyMuPdf = true;
  } catch {
    /* PyMuPDF is optional: only the parent's computer imports PDFs. */
  }

  it.runIf(hasPyMuPdf)('imports a PDF: page images plus text, private by default', async () => {
    const pdf = join(tmp, 'book.pdf');
    execFileSync('python3', [
      '-c',
      `import pymupdf, sys
d = pymupdf.open()
for t in ["The Big Cat", "I see a cat. The cat is big!", "The cat naps."]:
    p = d.new_page(width=400, height=300)
    p.insert_text((40, 150), t, fontsize=20)
d.save(sys.argv[1])`,
      pdf,
    ]);
    const b = await importPdf(paths(), pdf, { level: 'C', title: 'The Big Cat', source: 'RAZ', first: 2 });
    expect(b.private).toBe(true);
    expect(b.id).toBe('raz-c-the-big-cat');
    expect(b.pages.map((p) => p.sentences.map((s) => s.text))).toEqual([['I see a cat.', 'The cat is big!'], ['The cat naps.']]);
    expect(readFileSync(join(paths().content, 'books', b.id, b.pages[0].image)).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
  });
});
