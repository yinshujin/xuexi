/**
 * Thin client for the OpenMAIC HTTP API used by the content pipeline.
 * Endpoints (OpenMAIC v1.1.0):
 *   GET  /api/health
 *   POST /api/generate-classroom            → { success, jobId, pollUrl, pollIntervalMs }
 *   GET  /api/generate-classroom/:jobId     → { success, status, step, progress, message, result, error, done }
 *   GET  /api/classroom?id=                 → { success, classroom: { id, stage, scenes } }
 *   GET  /api/classroom-media/:id/(audio|media)/...
 */
import type { OpenMaicClassroom } from '@xuexi/course-pack';

export interface OpenMaicHealth {
  status: string;
  version?: string;
  capabilities?: { tts?: boolean; imageGeneration?: boolean; webSearch?: boolean };
}

export interface JobStatus {
  jobId: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | string;
  step?: string;
  progress?: number;
  message?: string;
  scenesGenerated?: number;
  totalScenes?: number;
  result?: { id: string; url?: string; warning?: string; ttsCoverage?: { written: number; total: number } };
  error?: string;
  done: boolean;
}

export interface GenerateRequest {
  requirement: string;
  language: 'zh-CN';
  enableTTS: boolean;
  enableImageGeneration?: boolean;
  enableWebSearch?: boolean;
}

export class OpenMaicError extends Error {}

export class OpenMaicClient {
  constructor(
    readonly baseUrl: string,
    private readonly accessCode?: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private headers(json = false): Record<string, string> {
    const h: Record<string, string> = {};
    if (json) h['content-type'] = 'application/json';
    if (this.accessCode) h.authorization = `Bearer ${this.accessCode}`;
    return h;
  }

  private async json<T>(path: string, init?: RequestInit): Promise<T> {
    const url = new URL(path, this.baseUrl).toString();
    let res: Response;
    try {
      res = await this.fetchImpl(url, { ...init, headers: { ...this.headers(Boolean(init?.body)), ...(init?.headers as object) } });
    } catch (e) {
      throw new OpenMaicError(`无法连接 OpenMAIC（${url}）：${(e as Error).message}。先运行 pnpm content openmaic up`);
    }
    const text = await res.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text);
    } catch {
      throw new OpenMaicError(`OpenMAIC 返回了非 JSON（HTTP ${res.status}）：${text.slice(0, 200)}`);
    }
    if (!res.ok || body.success === false) {
      throw new OpenMaicError(
        `OpenMAIC 错误 HTTP ${res.status} ${String(body.errorCode ?? '')}: ${String(body.error ?? '')} ${String(body.details ?? '')}`.trim(),
      );
    }
    return body as T;
  }

  health(): Promise<OpenMaicHealth> {
    return this.json('/api/health');
  }

  async submit(req: GenerateRequest): Promise<{ jobId: string; pollIntervalMs: number }> {
    const r = await this.json<{ jobId: string; pollIntervalMs?: number }>('/api/generate-classroom', {
      method: 'POST',
      body: JSON.stringify(req),
    });
    return { jobId: r.jobId, pollIntervalMs: r.pollIntervalMs ?? 5000 };
  }

  job(jobId: string): Promise<JobStatus> {
    return this.json(`/api/generate-classroom/${encodeURIComponent(jobId)}`);
  }

  async classroom(id: string): Promise<OpenMaicClassroom> {
    const r = await this.json<{ classroom: OpenMaicClassroom }>(`/api/classroom?id=${encodeURIComponent(id)}`);
    return r.classroom;
  }

  async download(url: string, attempts = 3): Promise<Uint8Array> {
    let last: unknown;
    for (let i = 0; i < attempts; i++) {
      try {
        const res = await this.fetchImpl(url, { headers: this.headers() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return new Uint8Array(await res.arrayBuffer());
      } catch (e) {
        last = e;
        await new Promise((r) => setTimeout(r, 500 * (i + 1)));
      }
    }
    throw new OpenMaicError(`下载失败 ${url}: ${(last as Error)?.message}`);
  }
}
