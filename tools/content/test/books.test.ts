import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unzipSync, zipSync } from 'fflate';
import { readBundle } from '@xuexi/course-pack';
import { writeBuiltin } from '../src/builtin';
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
        '![Crab hides under a rock.](images/02.jpg)',
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
      ['Crab hides under a rock.'],
      ['"Goodbye, Crab!" says Little Fish.'],
    ]);
    // A picture-only page is described from the picture's own description.
    expect(b.pages[1].sentences[0].kind).toBe('caption');
    expect(b.pages[0].sentences[0].kind).toBeUndefined();
    expect(readFileSync(join(paths().content, 'books', b.id, 'pages', '02.jpg'), 'utf8')).toBe('jpeg 02.jpg');
  });

  it('imports the sample list with its quizzes', () => {
    const list = join(tmp, 'samples.json');
    const quiz = [{ question: 'Who swims?', options: ['Fish', 'Crab'], answer: 0 }];
    writeFileSync(list, JSON.stringify({ books: [{ slug: 'little-fish', level: 'B', grade: 2, topic: '动物', quiz }] }));
    const [b] = importBookDashSamples(paths(), repo, list);
    expect(loadBook(paths(), b.id)).toMatchObject({ quiz, grade: 2, topic: '动物' });
  });

  it('refuses to export a book without narration unless asked', async () => {
    await expect(exportBooks(paths(), { out: join(tmp, 'x.zip') })).rejects.toThrow(/还没有配音/);
  });

  it('narrates sentences with word timings, each word, and the quiz; reuses the cache; exports a bundle the app accepts', async () => {
    const p = paths();
    const cacheDir = join(tmp, 'cache');
    // 4 sentences + 12 different words + 1 question with 2 options.
    expect(await narrateBook(p, loadBook(p, 'bookdash-little-fish'), { voice: fakeVoice, cacheDir })).toBe(19);
    const b = loadBook(p, 'bookdash-little-fish');
    const s = b.pages[2].sentences[0];
    expect(s.audio).toBe('audio/p03-s1.mp3');
    expect(s.words?.map((w) => w.w)).toEqual(['"Goodbye,', 'Crab!"', 'says', 'Little', 'Fish.']);
    expect(Object.keys(b.wordAudio!).sort()).toEqual(
      ['a', 'crab', 'fish', 'goodbye', 'hides', 'little', 'mr', 'rock', 'says', 'swims', 'under', 'waves'],
    );
    expect(b.wordAudio!.crab).toBe('audio/w-crab.mp3');
    expect(b.quiz![0]).toMatchObject({ audio: 'audio/q01.mp3', optionAudio: ['audio/q01-o1.mp3', 'audio/q01-o2.mp3'] });
    expect(readFileSync(join(p.content, 'books', b.id, 'audio/q01-o2.mp3'), 'utf8')).toBe('audio:Crab');
    // Nothing left to do the second time.
    expect(await narrateBook(p, b, { voice: fakeVoice, cacheDir })).toBe(0);

    const out = join(tmp, 'books.zip');
    const r = await exportBooks(p, { out });
    expect(r.books).toHaveLength(1);
    // Captions are not the book's text: not counted as words read.
    expect(r.books[0]).toMatchObject({ id: 'bookdash-little-fish', pages: 3, words: 11, private: false, grade: 2, topic: '动物' });
    const bundle = await readBundle(unzipSync(new Uint8Array(readFileSync(out))));
    expect(bundle.skipped).toEqual([]);
    expect(bundle.packs).toEqual([]);
    expect(bundle.books).toHaveLength(1);
    const files = Object.keys(bundle.books[0].files).sort();
    expect(files).toContain('audio/p02-s1.mp3');
    expect(files).toContain('audio/w-goodbye.mp3');
    expect(files).toContain('audio/q01.mp3');
    expect(files).toContain('pages/cover.jpg');
    expect(files).toHaveLength(1 + 4 + 4 + 12 + 3); // book.json, images, sentences, words, quiz
  });

  it('builds public books into the app, never private ones', async () => {
    const out = join(tmp, 'builtin');
    const r = await writeBuiltin([join(tmp, 'books.zip')], out);
    expect(r.books.map((b) => b.id)).toEqual(['bookdash-little-fish']);
    expect(JSON.parse(readFileSync(join(out, 'books.json'), 'utf8'))[0].path).toBe('books/bookdash-little-fish/v1/');
    expect(readFileSync(join(out, 'books/bookdash-little-fish/v1/audio/w-crab.mp3'), 'utf8')).toBe('audio:crab');

    // A private book (e.g. RAZ) in a bundle is left out.
    const zip = unzipSync(new Uint8Array(readFileSync(join(tmp, 'books.zip'))));
    const index = JSON.parse(new TextDecoder().decode(zip['bundle.json']));
    index.books[0].private = true;
    zip['bundle.json'] = new TextEncoder().encode(JSON.stringify(index));
    writeFileSync(join(tmp, 'private.zip'), zipSync(zip));
    const r2 = await writeBuiltin([join(tmp, 'private.zip')], join(tmp, 'builtin2'));
    expect(r2.books).toEqual([]);
    expect(r2.skipped[0]).toMatch(/私有/);
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

  it.runIf(hasPyMuPdf)('imports a PDF: page images plus text, private by default, pages without text dropped', async () => {
    const pdf = join(tmp, 'book.pdf');
    execFileSync('python3', [
      '-c',
      `import pymupdf, sys
d = pymupdf.open()
for t in ["The Big Cat", "I see a cat. The cat is big!", "", "The cat naps.", ""]:
    p = d.new_page(width=400, height=300)
    if t: p.insert_text((40, 150), t, fontsize=20)
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
