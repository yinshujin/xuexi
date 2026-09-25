import { spawn } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { basename, extname, join, resolve } from 'node:path';
import { assertBook, BOOK_FORMAT, type Book, type BookQuizQuestion } from '@xuexi/course-pack';
import { REPO_ROOT, type Paths } from '../paths';
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
  const title = o.title ?? (/^title:\s*"?(.+?)"?\s*$/m.exec(front)?.[1] ?? slug);
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

/** The sample list in content/books-sample/samples.json. */
export interface SampleList {
  books: Array<{ slug: string; level: string; grade?: number; topic?: string; quiz?: BookQuizQuestion[] }>;
}

/** Import every book of the sample list from a checkout of bookdash/bookdash-books. */
export function importBookDashSamples(paths: Paths, repoDir: string, samplesFile: string): Book[] {
  const list = JSON.parse(readFileSync(samplesFile, 'utf8')) as SampleList;
  return list.books.map((s) =>
    importBookDash(paths, join(repoDir, s.slug, 'en'), { level: s.level, grade: s.grade, topic: s.topic, quiz: s.quiz }),
  );
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
