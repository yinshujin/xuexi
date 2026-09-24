/**
 * Mock OpenMAIC server implementing the subset of the HTTP API the pipeline uses.
 * Lets you try the whole generate → review → build → publish flow without
 * Docker or any model API key:  pnpm content mock
 */
import { createServer, type Server } from 'node:http';
import { crc32, deflateSync } from 'node:zlib';
import { sampleClassroom } from './sample-classroom';

/** Silent 16 kHz mono WAV of the given length (with a soft 50 ms click at start). */
export function makeWav(ms: number): Buffer {
  const rate = 16000;
  const n = Math.max(1, Math.round((rate * ms) / 1000));
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < Math.min(n, rate / 20); i++) {
    buf.writeInt16LE(Math.round(Math.sin((i / rate) * 2 * Math.PI * 660) * 3000), 44 + i * 2);
  }
  return buf;
}

/** Tiny solid-colour PNG. */
export function makePng(w: number, h: number, rgb: [number, number, number]): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td) >>> 0);
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) raw.set(rgb, y * (w * 3 + 1) + 1 + x * 3);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

export interface MockOptions {
  port: number;
  /** Polls needed before a job completes (default 2). */
  pollsToFinish?: number;
  /** Fail jobs whose requirement contains this marker (tests). */
  failMarker?: string;
}

interface Job {
  id: string;
  requirement: string;
  enableTTS: boolean;
  polls: number;
  classroomId: string;
}

export function titleFromRequirement(req: string): string {
  const m = req.match(/「([^」]{1,40})」/);
  return m ? m[1] : req.replace(/\s+/g, ' ').slice(0, 20);
}

export function startMockOpenMaic(opts: MockOptions): Promise<Server> {
  const jobs = new Map<string, Job>();
  const classrooms = new Map<string, ReturnType<typeof sampleClassroom>['classroom']>();
  let seq = 0;

  const server = createServer(async (req, res) => {
    const origin = `http://${req.headers.host}`;
    const url = new URL(req.url ?? '/', origin);
    const json = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };

    if (url.pathname === '/api/health') {
      return json(200, { success: true, status: 'ok', version: 'mock', capabilities: { tts: true } });
    }
    if (url.pathname === '/api/generate-classroom' && req.method === 'POST') {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
      if (!body.requirement) {
        return json(400, { success: false, errorCode: 'MISSING_REQUIRED_FIELD', error: 'Missing required field: requirement' });
      }
      const id = `job${++seq}`;
      jobs.set(id, { id, requirement: body.requirement, enableTTS: Boolean(body.enableTTS), polls: 0, classroomId: `mock${seq}` });
      return json(202, { success: true, jobId: id, status: 'queued', step: 'queued', pollUrl: `${origin}/api/generate-classroom/${id}`, pollIntervalMs: 5000 });
    }
    const jobMatch = url.pathname.match(/^\/api\/generate-classroom\/(\w+)$/);
    if (jobMatch) {
      const job = jobs.get(jobMatch[1]);
      if (!job) return json(404, { success: false, errorCode: 'INVALID_REQUEST', error: 'Classroom generation job not found' });
      job.polls += 1;
      if (opts.failMarker && job.requirement.includes(opts.failMarker)) {
        return json(200, { success: true, jobId: job.id, status: 'failed', step: 'failed', error: 'mock failure', done: true });
      }
      if (job.polls < (opts.pollsToFinish ?? 2)) {
        return json(200, { success: true, jobId: job.id, status: 'running', step: 'generating_scenes', progress: 50, scenesGenerated: 1, totalScenes: 3, done: false });
      }
      if (!classrooms.has(job.classroomId)) {
        const { classroom } = sampleClassroom({
          id: job.classroomId,
          baseUrl: origin,
          title: titleFromRequirement(job.requirement),
          withAudio: job.enableTTS,
        });
        classrooms.set(job.classroomId, classroom);
      }
      return json(200, {
        success: true,
        jobId: job.id,
        status: 'succeeded',
        step: 'completed',
        progress: 100,
        result: { id: job.classroomId, url: `${origin}/classroom/${job.classroomId}` },
        done: true,
      });
    }
    if (url.pathname === '/api/classroom') {
      const c = classrooms.get(url.searchParams.get('id') ?? '');
      return c ? json(200, { success: true, classroom: c }) : json(404, { success: false, errorCode: 'INVALID_REQUEST', error: 'Classroom not found' });
    }
    const media = url.pathname.match(/^\/api\/classroom-media\/(\w+)\/(audio|media)\/(.+)$/);
    if (media) {
      const c = classrooms.get(media[1]);
      if (!c) return json(404, { error: 'not found' });
      if (media[2] === 'audio') {
        const actionId = media[3].replace(/^tts_s\d+_/, '').replace(/\.\w+$/, '');
        const text =
          c.scenes.flatMap((s) => s.actions as Array<{ id: string; text?: string }>).find((a) => a.id === actionId)?.text ?? '';
        const ms = Math.max(1200, Math.round((text.length / 4.2) * 1000));
        res.writeHead(200, { 'content-type': 'audio/wav' });
        return res.end(makeWav(ms));
      }
      res.writeHead(200, { 'content-type': 'image/png' });
      return res.end(makePng(200, 120, [120, 170, 230]));
    }
    json(404, { success: false, error: 'not found' });
  });
  return new Promise((resolve) => server.listen(opts.port, '127.0.0.1', () => resolve(server)));
}
