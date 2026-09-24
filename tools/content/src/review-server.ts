import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import type { LessonContext } from './generate';
import { draftDir, type Paths } from './paths';
import { type ContentState, updateLesson } from './state';

/** One row of the review list (consumed by apps/web's review page). */
export interface ReviewLesson {
  lessonId: string;
  bookId: string;
  bookTitle: string;
  unitTitle: string;
  unitIndex: number;
  kpId: string;
  kpTitle: string;
  title: string;
  kind: 'lecture' | 'technique';
  minutes: number;
  focus: string;
  status: string;
  hasDraft: boolean;
  warnings: string[];
  error?: string;
  reviewNote?: string;
  generatedAt?: string;
  packVersion?: number;
}

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.mp4': 'video/mp4',
  '.webmanifest': 'application/manifest+json',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}

function sendFile(res: ServerResponse, file: string) {
  if (!existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': MIME[extname(file).toLowerCase()] ?? 'application/octet-stream',
    'content-length': statSync(file).size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
}

/** Resolve `rel` inside `base`, refusing traversal. */
function safeJoin(base: string, rel: string): string | null {
  const p = normalize(join(base, rel));
  return p.startsWith(normalize(base)) ? p : null;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > 64 * 1024) throw new Error('body too large');
    chunks.push(c as Buffer);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}

export function reviewRows(lessons: LessonContext[], state: ContentState, paths: Paths): ReviewLesson[] {
  return lessons.map(({ book, unit, kp, lesson }) => {
    const s = state.lessons[lesson.id];
    return {
      lessonId: lesson.id,
      bookId: book.id,
      bookTitle: book.title,
      unitTitle: unit.title,
      unitIndex: unit.index,
      kpId: kp.id,
      kpTitle: kp.title,
      title: lesson.title,
      kind: lesson.kind,
      minutes: lesson.minutes,
      focus: lesson.focus,
      status: s?.status ?? 'pending',
      hasDraft: existsSync(join(draftDir(paths, lesson.id), 'lesson.json')),
      warnings: s?.warnings ?? [],
      error: s?.error,
      reviewNote: s?.reviewNote,
      generatedAt: s?.generatedAt,
      packVersion: s?.packVersion,
    };
  });
}

export interface ReviewServerOptions {
  paths: Paths;
  state: ContentState;
  lessons: LessonContext[];
  /** Directory of the built web app to serve (apps/web/dist). */
  webDir: string;
  port: number;
  host?: string;
}

export function startReviewServer(opts: ReviewServerOptions): Promise<Server> {
  const { paths, state, lessons, webDir } = opts;
  const known = new Set(lessons.map((l) => l.lesson.id));

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? '/', 'http://localhost');
      const p = decodeURIComponent(url.pathname);

      if (p === '/api/review/lessons' && req.method === 'GET') {
        return sendJson(res, 200, { lessons: reviewRows(lessons, state, paths) });
      }

      const draft = p.match(/^\/api\/review\/draft\/([a-z0-9.-]+)\/(.+)$/);
      if (draft && req.method === 'GET') {
        const [, id, rel] = draft;
        if (!known.has(id)) return sendJson(res, 404, { error: 'unknown lesson' });
        const file = safeJoin(draftDir(paths, id), rel);
        if (!file) return sendJson(res, 400, { error: 'bad path' });
        return sendFile(res, file);
      }

      const decide = p.match(/^\/api\/review\/lessons\/([a-z0-9.-]+)$/);
      if (decide && req.method === 'POST') {
        const id = decide[1];
        if (!known.has(id)) return sendJson(res, 404, { error: 'unknown lesson' });
        const body = (await readBody(req)) as { action?: string; note?: string };
        const s = state.lessons[id];
        if (!s || !existsSync(join(draftDir(paths, id), 'lesson.json'))) {
          return sendJson(res, 409, { error: '这节课还没有生成草稿' });
        }
        const note = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) : '';
        if (body.action === 'approve') {
          updateLesson(paths.state, state, id, {
            status: 'approved',
            reviewedAt: new Date().toISOString(),
            reviewNote: note || undefined,
          });
        } else if (body.action === 'reject') {
          updateLesson(paths.state, state, id, {
            status: 'rejected',
            reviewedAt: new Date().toISOString(),
            reviewNote: note || undefined,
          });
        } else {
          return sendJson(res, 400, { error: 'action 必须是 approve 或 reject' });
        }
        return sendJson(res, 200, { lesson: reviewRows(lessons, state, paths).find((r) => r.lessonId === id) });
      }

      if (p.startsWith('/api/')) return sendJson(res, 404, { error: 'not found' });

      // Static web app with SPA fallback.
      const file = safeJoin(webDir, p === '/' ? 'index.html' : p.slice(1));
      if (file && existsSync(file) && statSync(file).isFile()) return sendFile(res, file);
      const index = join(webDir, 'index.html');
      if (existsSync(index)) {
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(readFileSync(index));
      }
      res.writeHead(404).end('web app not built');
    } catch (e) {
      sendJson(res, 500, { error: (e as Error).message });
    }
  });

  return new Promise((resolve) => server.listen(opts.port, opts.host ?? '127.0.0.1', () => resolve(server)));
}
