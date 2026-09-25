import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { assertBook, BOOK_FORMAT, type Book, type BookQuizQuestion } from '@xuexi/course-pack';
import { REPO_ROOT, type Paths } from '../paths';
import { ASB_CC_BY_4, asbAttribution, asbReaderUrl, asbViewerUrl, parseAsbViewer } from './asb';
import { splitSentences } from './sentences';
import { bookDir, saveBook, slugify } from './store';

export interface ImportCommon {
  level: string;
  grade?: number;
  topic?: string;
  id?: string;
  title?: string;
  /** A JSON file with the questions, or the questions themselves. */
  quiz?: string | BookQuizQuestion[];
}

function readQuiz(quiz?: string | BookQuizQuestion[]): BookQuizQuestion[] | undefined {
  if (!quiz) return undefined;
  if (Array.isArray(quiz)) return quiz;
  const q = JSON.parse(readFileSync(quiz, 'utf8'));
  if (!Array.isArray(q)) throw new Error(`${quiz} 应该是题目数组`);
  return q;
}

/**
 * Book Dash book folder (https://github.com/bookdash/bookdash-books, CC BY 4.0):
 * <slug>/en/index.md with "![alt](…/01.jpg)" followed by the page's text, and
 * <slug>/en/images/. Credits come from _data/meta.yml when present.
 */
export function importBookDash(paths: Paths, langDir: string, o: ImportCommon): Book {
  const dir = resolve(langDir);
  const md = readFileSync(join(dir, 'index.md'), 'utf8');
  const [, front = '', body = md] = md.split(/^---$/m);
  const slug = basename(resolve(dir, '..'));
  const title = o.title ?? (/^title:\s*"?(.+?)"?\s*$/m.exec(front)?.[1]?.trim() || slug);
  const id = o.id ?? `bookdash-${slugify(slug)}`;

  let creator = '';
  const meta = join(dir, '..', '..', '_data', 'meta.yml');
  if (existsSync(meta)) {
    const y = readFileSync(meta, 'utf8');
    const i = y.indexOf(`\n  ${slug}:`);
    if (i >= 0) creator = /creator:\s*"([^"]*)"/.exec(y.slice(i, i + 3000))?.[1] ?? '';
  }

  const out = bookDir(paths, id);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'pages'), { recursive: true });

  const pages: Book['pages'] = [];
  const blocks = body.split(/\n\s*\n/);
  const alts: string[] = [];
  for (const block of blocks) {
    const img = /!\[([^\]]*)\]\([^)]*?([A-Za-z0-9_-]+\.(?:jpe?g|png))\)/.exec(block);
    if (img) {
      const src = join(dir, 'images', img[2]);
      const name = `pages/${String(pages.length + 1).padStart(2, '0')}${extname(img[2]).toLowerCase()}`;
      copyFileSync(src, join(out, name));
      pages.push({ image: name, sentences: [] });
      alts.push(img[1].trim());
      continue;
    }
    const text = block.replace(/^#.*$/gm, '').replace(/\{:[^}]*\}/g, '').trim();
    if (!text || pages.length === 0) continue;
    pages.at(-1)!.sentences.push(...splitSentences(text).map((t) => ({ text: t })));
  }
  // A picture-only page gets the book's own description of the picture as 看图说一说.
  pages.forEach((p, i) => {
    if (p.sentences.length === 0 && alts[i]) p.sentences = splitSentences(alts[i]).map((t) => ({ text: t, kind: 'caption' as const }));
  });
  let cover: string | undefined;
  if (existsSync(join(dir, 'images', 'cover.jpg'))) {
    copyFileSync(join(dir, 'images', 'cover.jpg'), join(out, 'pages', 'cover.jpg'));
    cover = 'pages/cover.jpg';
  }
  const quiz = readQuiz(o.quiz);
  const book: Book = {
    format: BOOK_FORMAT,
    id,
    title,
    level: o.level,
    ...(o.grade ? { grade: o.grade } : {}),
    ...(o.topic ? { topic: o.topic } : {}),
    source: {
      name: 'Book Dash',
      url: `https://bookdash.org/books/${slug}/`,
      license: 'CC BY 4.0',
      attribution: creator ? `${creator}（Book Dash）` : 'Book Dash',
    },
    private: false,
    ...(cover ? { cover } : {}),
    // Wordless spreads are kept: the picture tells the story.
    pages,
    ...(quiz ? { quiz } : {}),
  };
  assertBook(book);
  saveBook(paths, book);
  return book;
}

/** One book of content/books-sample/samples.json: Book Dash (default) or African Storybook. */
export interface SampleEntry {
  /** "asb": African Storybook, fetched over the network; otherwise Book Dash. */
  source?: 'bookdash' | 'asb';
  /** Book Dash: folder in bookdash/bookdash-books. */
  slug?: string;
  /** African Storybook: the book's id on africanstorybook.org. */
  asbId?: string;
  /** African Storybook: the book's title, for reading the list (the site's own title is used). */
  title?: string;
  level: string;
  grade?: number;
  topic?: string;
  quiz?: BookQuizQuestion[];
}

/** The sample list in content/books-sample/samples.json. */
export interface SampleList {
  books: SampleEntry[];
}

function readSamples(samplesFile: string): SampleEntry[] {
  const list = JSON.parse(readFileSync(samplesFile, 'utf8')) as SampleList;
  for (const s of list.books) {
    if (s.source === 'asb' ? !s.asbId : !s.slug) throw new Error(`${samplesFile}：${JSON.stringify(s).slice(0, 80)} 缺少 ${s.source === 'asb' ? 'asbId' : 'slug'}`);
  }
  return list.books;
}

function importBookDashSample(paths: Paths, repoDir: string, s: SampleEntry): Book {
  return importBookDash(paths, join(repoDir, s.slug!, 'en'), { level: s.level, grade: s.grade, topic: s.topic, quiz: s.quiz });
}

/** Import the Book Dash books of the sample list from a checkout of bookdash/bookdash-books. */
export function importBookDashSamples(paths: Paths, repoDir: string, samplesFile: string): Book[] {
  return readSamples(samplesFile)
    .filter((s) => s.source !== 'asb')
    .map((s) => importBookDashSample(paths, repoDir, s));
}

/**
 * Import every book of the sample list, in its order: Book Dash books from a
 * checkout of bookdash/bookdash-books, African Storybook books over the network.
 */
export async function importSamples(paths: Paths, repoDir: string, samplesFile: string, o: AsbFetchOptions = {}): Promise<Book[]> {
  const out: Book[] = [];
  for (const s of readSamples(samplesFile)) {
    const common = { level: s.level, grade: s.grade, topic: s.topic, quiz: s.quiz };
    const b = s.source === 'asb' ? await importAfricanStorybook(paths, s.asbId!, { ...common, ...o }) : importBookDashSample(paths, repoDir, s);
    o.onBook?.(b);
    out.push(b);
  }
  return out;
}

export interface AsbFetchOptions {
  /** Downloads a URL (default: fetch with retries). Tests pass a fake. */
  fetch?: (url: string) => Promise<Uint8Array>;
  /** Converts the downloaded pictures to JPEG (default: scripts/asb_images.py, needs Pillow). */
  convert?: (jobs: Array<{ src: string; dest: string }>) => Promise<void>;
  onBook?: (b: Book) => void;
}

async function download(url: string): Promise<Uint8Array> {
  let last: unknown;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(60_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    } catch (e) {
      last = e;
      if (attempt < 4) await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }
  throw new Error(`下载失败 ${url}：${(last as Error)?.message ?? last}`);
}

async function convertToJpeg(jobs: Array<{ src: string; dest: string }>, workDir: string): Promise<void> {
  const file = join(workDir, '.jobs.json');
  writeFileSync(file, JSON.stringify(jobs));
  try {
    await python([join(REPO_ROOT, 'tools', 'content', 'scripts', 'asb_images.py'), file, '--max-width', '1200', '--quality', '80']);
  } finally {
    rmSync(file, { force: true });
  }
}

/**
 * An African Storybook book (https://www.africanstorybook.org), fetched from
 * the site: the pictures become JPEG pages, each line of the page text is
 * split into sentences exactly as printed. Only CC BY 4.0 books are accepted;
 * the credits from the back cover go into `source`. Pictures without text at
 * the start or the end (a closing picture) are left out; wordless pages inside
 * the story are kept.
 */
export async function importAfricanStorybook(
  paths: Paths,
  asbId: string,
  o: ImportCommon & AsbFetchOptions,
): Promise<Book> {
  if (!/^\d+$/.test(asbId)) throw new Error(`African Storybook 的书号应该是数字：${asbId}`);
  const get = o.fetch ?? download;
  const parsed = parseAsbViewer(new TextDecoder().decode(await get(asbViewerUrl(asbId))));
  if (parsed.license !== ASB_CC_BY_4) {
    throw new Error(`《${parsed.title}》（${asbId}）的许可是「${parsed.license || '未注明'}」，只导入 ${ASB_CC_BY_4}`);
  }
  if (parsed.credits.Language && parsed.credits.Language !== 'English') {
    throw new Error(`《${parsed.title}》（${asbId}）不是英文书：${parsed.credits.Language}`);
  }
  const text = parsed.pages.map((p) => p.paragraphs.join(' ').trim() !== '');
  const first = text.indexOf(true);
  const last = text.lastIndexOf(true);
  if (first < 0) throw new Error(`《${parsed.title}》（${asbId}）没有文字页`);
  const kept = parsed.pages.slice(first, last + 1);

  const title = o.title ?? parsed.title;
  const id = o.id ?? `asb-${asbId}-${slugify(title)}`;
  const out = bookDir(paths, id);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(join(out, 'pages'), { recursive: true });

  const jobs: Array<{ src: string; dest: string }> = [];
  const fetchPicture = async (url: string, name: string) => {
    const src = join(out, 'pages', `.${name}.src`);
    writeFileSync(src, await get(url));
    jobs.push({ src, dest: join(out, 'pages', `${name}.jpg`) });
  };
  const pages: Book['pages'] = [];
  for (const [i, p] of kept.entries()) {
    const name = String(i + 1).padStart(2, '0');
    await fetchPicture(p.image, name);
    pages.push({ image: `pages/${name}.jpg`, sentences: p.paragraphs.flatMap((t) => splitSentences(t)).map((t) => ({ text: t })) });
  }
  if (parsed.cover) await fetchPicture(parsed.cover, 'cover');
  await (o.convert ?? ((j) => convertToJpeg(j, out)))(jobs);

  const quiz = readQuiz(o.quiz);
  const book: Book = {
    format: BOOK_FORMAT,
    id,
    title,
    level: o.level,
    ...(o.grade ? { grade: o.grade } : {}),
    ...(o.topic ? { topic: o.topic } : {}),
    source: { name: 'African Storybook', url: asbReaderUrl(asbId), license: 'CC BY 4.0', attribution: asbAttribution(parsed) },
    private: false,
    ...(parsed.cover ? { cover: 'pages/cover.jpg' } : {}),
    pages,
    ...(quiz ? { quiz } : {}),
  };
  assertBook(book);
  saveBook(paths, book);
  return book;
}

function python(args: string[]): Promise<string> {
  return new Promise((resolveOut, reject) => {
    const child = spawn(process.env.PYTHON ?? 'python3', args, { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (d) => (out += d));
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolveOut(out) : reject(new Error(`python3 ${args[0]} 退出码 ${code}`))));
  });
}

export interface PdfImportOptions extends ImportCommon {
  private?: boolean;
  source?: string;
  license?: string;
  split?: 1 | 2;
  first?: number;
  last?: number;
  dpi?: number;
  /** Keep pages without text (by default they are dropped: cover, title and copyright pages). */
  keepBlank?: boolean;
}

/**
 * A picture-book PDF you own (e.g. a RAZ Plus printable book): each page is
 * kept as an image; the text layer becomes the sentences. Check book.json
 * afterwards — remove cover / back-matter pages and fix any text before `book tts`.
 */
export async function importPdf(paths: Paths, pdf: string, o: PdfImportOptions): Promise<Book> {
  const title = o.title ?? basename(pdf, extname(pdf)).replace(/[_-]+/g, ' ');
  const id = o.id ?? slugify(`${o.source ?? 'book'}-${o.level}-${title}`);
  const out = bookDir(paths, id);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const script = join(REPO_ROOT, 'tools', 'content', 'scripts', 'pdf_pages.py');
  const args = [script, resolve(pdf), out, '--dpi', String(o.dpi ?? 150), '--split', String(o.split ?? 1)];
  if (o.first) args.push('--first', String(o.first));
  if (o.last) args.push('--last', String(o.last));
  const pages = JSON.parse(await python(args)) as Array<{ image: string; text: string }>;
  if (pages.length === 0) throw new Error(`${pdf} 里没有页面`);
  const quiz = readQuiz(o.quiz);
  const all = pages.map((p) => ({ image: p.image, sentences: splitSentences(p.text).map((t) => ({ text: t })) }));
  const withText = all.filter((p) => p.sentences.length > 0);
  const book: Book = {
    format: BOOK_FORMAT,
    id,
    title,
    level: o.level,
    ...(o.grade ? { grade: o.grade } : {}),
    ...(o.topic ? { topic: o.topic } : {}),
    source: { name: o.source ?? '家庭自有', license: o.license ?? '仅限家庭自用，请勿分享' },
    private: o.private ?? true,
    cover: pages[0]?.image,
    // A scanned PDF has no text layer at all: keep every page, the text is typed into book.json.
    pages: o.keepBlank || !withText.length ? all : withText,
    ...(quiz ? { quiz } : {}),
  };
  assertBook(book);
  saveBook(paths, book);
  return book;
}
