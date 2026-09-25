import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { unzipSync, zipSync } from 'fflate';
import { readBundle } from '@xuexi/course-pack';
import { writeBuiltin } from '../src/builtin';
import { exportBooks } from '../src/books/export';
import { asbAttribution, parseAsbViewer } from '../src/books/asb';
import { importAfricanStorybook, importBookDash, importBookDashSamples, importPdf, importSamples } from '../src/books/import';
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

describe('African Storybook', () => {
  const html = readFileSync(new URL('./fixtures/asb-viewer.html', import.meta.url), 'utf8');
  let tmp: string;
  const paths = () => getPaths(join(tmp, 'content'));
  /** Serves the fixture as the viewer page and "png:<url>" for every picture. */
  const fakeFetch = (page: string) => async (url: string) =>
    new TextEncoder().encode(url.includes('/newviewer/') ? page : `png:${url}`);
  /** Stands in for Pillow: "jpeg:" + the downloaded bytes. */
  const fakeConvert = async (jobs: Array<{ src: string; dest: string }>) => {
    for (const j of jobs) {
      writeFileSync(j.dest, `jpeg:${readFileSync(j.src, 'utf8')}`);
      rmSync(j.src);
    }
  };

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), 'xuexi-asb-'));
  });
  afterAll(() => rmSync(tmp, { recursive: true, force: true }));

  it('parses the viewer page: cover, pages with their lines, credits and licence', () => {
    const b = parseAsbViewer(html);
    expect(b.title).toBe('Where is Lulu?');
    expect(b.cover).toBe('https://www.africanstorybook.org/illustrations/pages/27795.png');
    expect(b.pages.map((p) => p.image.split('/').pop())).toEqual(['27797.png', '27804.png', '27805.png', '28138.png', '27811.png']);
    expect(b.pages.map((p) => p.paragraphs)).toEqual([
      ['"Lulu, it is time to go," calls Ma.'],
      ['"We have to go," says Ma.', '"But I really like this one!"'],
      [],
      ['one apple', 'two apples'],
      [],
    ]);
    expect(b.credits).toEqual({
      Author: 'Mohale Mashigo',
      Illustration: 'Clyde Beech, Nkosingiphile Mazibuko',
      Language: 'English',
      Level: 'First words',
    });
    expect(b.copyright).toBe('© Mohale Mashigo, Clyde Beech, Nkosingiphile Mazibuko and Book Dash');
    expect(b.license).toBe('Creative Commons: Attribution 4.0');
    expect(asbAttribution(b)).toBe(
      '文：Mohale Mashigo；图：Clyde Beech, Nkosingiphile Mazibuko；© Mohale Mashigo, Clyde Beech, Nkosingiphile Mazibuko and Book Dash（African Storybook）',
    );
  });

  it('imports a book: JPEG pages, a sentence per line, wordless pages inside kept and at the end dropped', async () => {
    const quiz = [{ question: 'Who calls Lulu?', options: ['Ma', 'Pa'], answer: 0 }];
    const b = await importAfricanStorybook(paths(), '31988', {
      level: 'C',
      grade: 2,
      topic: '生活与想象',
      quiz,
      fetch: fakeFetch(html),
      convert: fakeConvert,
    });
    expect(b.id).toBe('asb-31988-where-is-lulu');
    expect(b).toMatchObject({ title: 'Where is Lulu?', level: 'C', grade: 2, topic: '生活与想象', private: false, quiz });
    expect(b.source).toEqual({
      name: 'African Storybook',
      url: 'https://www.africanstorybook.org/reader.php?id=31988',
      license: 'CC BY 4.0',
      attribution: expect.stringContaining('文：Mohale Mashigo'),
    });
    expect(b.cover).toBe('pages/cover.jpg');
    expect(b.pages.map((p) => p.image)).toEqual(['pages/01.jpg', 'pages/02.jpg', 'pages/03.jpg', 'pages/04.jpg']);
    expect(b.pages.map((p) => p.sentences.map((s) => s.text))).toEqual([
      ['"Lulu, it is time to go," calls Ma.'],
      ['"We have to go," says Ma.', '"But I really like this one!"'],
      [],
      ['one apple', 'two apples'],
    ]);
    const dir = join(paths().content, 'books', b.id, 'pages');
    expect(readFileSync(join(dir, '04.jpg'), 'utf8')).toBe('jpeg:png:https://www.africanstorybook.org/illustrations/pages/28138.png');
    expect(readFileSync(join(dir, 'cover.jpg'), 'utf8')).toContain('27795.png');
    expect(readdirSync(dir).sort()).toEqual(['01.jpg', '02.jpg', '03.jpg', '04.jpg', 'cover.jpg']);
    expect(loadBook(paths(), b.id).pages).toHaveLength(4);
  });

  it('refuses books that are not CC BY 4.0', async () => {
    const nc = html.replace('Creative Commons: Attribution 4.0', 'Creative Commons: Attribution-Non Commercial 3.0');
    await expect(
      importAfricanStorybook(paths(), '31988', { level: 'C', fetch: fakeFetch(nc), convert: fakeConvert }),
    ).rejects.toThrow(/Non Commercial/);
    await expect(
      importAfricanStorybook(paths(), '31988', { level: 'C', fetch: fakeFetch(html.replace(/<div class="backcover_copyright">[^]*?<\/div>/, '')), convert: fakeConvert }),
    ).rejects.toThrow(/未注明/);
  });

  it('imports a sample list with Book Dash and African Storybook books, in order', async () => {
    const repo = join(tmp, 'bookdash-books');
    const en = join(repo, 'little-fish', 'en');
    mkdirSync(join(en, 'images'), { recursive: true });
    writeFileSync(join(en, 'images', '01.jpg'), 'jpeg');
    writeFileSync(join(en, 'index.md'), '---\ntitle: "Little Fish"\n---\n\n![](images/01.jpg)\n\nLittle Fish swims.\n');
    const list = join(tmp, 'samples.json');
    writeFileSync(
      list,
      JSON.stringify({
        books: [
          { source: 'asb', asbId: '31988', title: 'Where is Lulu?', level: 'C', grade: 2, topic: '生活与想象' },
          { slug: 'little-fish', level: 'A', grade: 2, topic: '动物' },
        ],
      }),
    );
    const books = await importSamples(paths(), repo, list, { fetch: fakeFetch(html), convert: fakeConvert });
    expect(books.map((b) => b.id)).toEqual(['asb-31988-where-is-lulu', 'bookdash-little-fish']);
    expect(loadBook(paths(), 'asb-31988-where-is-lulu')).toMatchObject({ level: 'C', topic: '生活与想象' });
    // The Book Dash-only import leaves the African Storybook books out.
    expect(importBookDashSamples(paths(), repo, list).map((b) => b.id)).toEqual(['bookdash-little-fish']);
  });

  let hasPillow = false;
  try {
    execFileSync('python3', ['-c', 'import PIL'], { stdio: 'ignore' });
    hasPillow = true;
  } catch {
    /* Pillow is needed only to import African Storybook books (the books workflow installs it). */
  }

  it.runIf(hasPillow)('converts the PNG pictures to JPEG on white, at most 1200 pixels wide', async () => {
    const png = join(tmp, 'page.png');
    // 1600 x 400, transparent left half, red right half.
    execFileSync('python3', [
      '-c',
      `from PIL import Image; import sys
im = Image.new("RGBA", (1600, 400), (0, 0, 0, 0))
im.paste((255, 0, 0, 255), (800, 0, 1600, 400))
im.save(sys.argv[1])`,
      png,
    ]);
    const bytes = new Uint8Array(readFileSync(png));
    const b = await importAfricanStorybook(paths(), '31988', { level: 'C', fetch: async (u) => (u.includes('/newviewer/') ? new TextEncoder().encode(html) : bytes) });
    const jpg = join(paths().content, 'books', b.id, b.pages[0].image);
    expect(readFileSync(jpg).subarray(0, 2)).toEqual(Buffer.from([0xff, 0xd8]));
    const info = execFileSync('python3', [
      '-c',
      `from PIL import Image; import sys
im = Image.open(sys.argv[1]); print(im.format, im.size[0], im.size[1], *im.getpixel((100, 100)), *im.getpixel((1100, 100)))`,
      jpg,
    ])
      .toString()
      .trim()
      .split(' ');
    expect(info.slice(0, 3)).toEqual(['JPEG', '1200', '300']);
    const [r1, g1, b1, r2, g2, b2] = info.slice(3).map(Number);
    expect(Math.min(r1, g1, b1)).toBeGreaterThan(245); // transparent → white
    expect(r2).toBeGreaterThan(230);
    expect(Math.max(g2, b2)).toBeLessThan(30);
    expect(readdirSync(join(paths().content, 'books', b.id, 'pages')).filter((f) => !f.endsWith('.jpg'))).toEqual([]);
  });
});
