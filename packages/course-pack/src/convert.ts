import type { Action, Stage } from '@openmaic/dsl';
import type { PackLesson, PackScene } from './types';

/** Shape returned by OpenMAIC `GET /api/classroom?id=` (`data.classroom`). */
export interface OpenMaicClassroom {
  id: string;
  stage: Stage;
  scenes: unknown[];
  createdAt?: string;
}

export interface AssetToFetch {
  /** Absolute URL to download from the (local) OpenMAIC server. */
  url: string;
  /** Pack-relative destination path. */
  path: string;
}

export interface ConvertResult {
  lesson: PackLesson;
  assets: AssetToFetch[];
  warnings: string[];
}

const SUPPORTED_SCENES = new Set(['slide', 'quiz', 'interactive']);

/**
 * Actions that need a live model at playback time. Lessons are pre-generated and
 * played back without any model, so these are removed during conversion.
 */
const LIVE_ONLY_ACTIONS = new Set(['discussion']);

const MEDIA_KEYS = new Set(['src', 'poster']);

function isRemote(value: string): boolean {
  return /^https?:\/\//i.test(value) || value.startsWith('/api/');
}

function safeName(url: string, fallback: string): string {
  let name = fallback;
  try {
    const u = new URL(url, 'http://x');
    const last = u.pathname.split('/').filter(Boolean).pop();
    if (last) name = decodeURIComponent(last);
  } catch {
    /* keep fallback */
  }
  name = name.replace(/[^A-Za-z0-9._-]/g, '_');
  return name.length > 0 ? name : fallback;
}

/**
 * Convert a generated OpenMAIC classroom into a pack lesson plus the list of
 * binary assets that must be downloaded into the pack. Pure: no I/O.
 */
export function convertClassroom(classroom: OpenMaicClassroom, baseUrl: string): ConvertResult {
  const warnings: string[] = [];
  const assets: AssetToFetch[] = [];
  const byUrl = new Map<string, string>();
  const usedPaths = new Set<string>();

  const claim = (rawUrl: string, dir: 'audio' | 'media', fallback: string): string => {
    const url = new URL(rawUrl, baseUrl).toString();
    const existing = byUrl.get(url);
    if (existing) return existing;
    let name = safeName(url, fallback);
    let path = `${dir}/${name}`;
    for (let i = 2; usedPaths.has(path); i++) {
      const dot = name.lastIndexOf('.');
      path = dot > 0 ? `${dir}/${name.slice(0, dot)}_${i}${name.slice(dot)}` : `${dir}/${name}_${i}`;
    }
    usedPaths.add(path);
    byUrl.set(url, path);
    assets.push({ url, path });
    return path;
  };

  // Deep-walk scene content, rewriting remote media references.
  const rewriteMedia = (node: unknown, where: string): unknown => {
    if (Array.isArray(node)) return node.map((n, i) => rewriteMedia(n, `${where}[${i}]`));
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) {
        if (MEDIA_KEYS.has(k) && typeof v === 'string' && isRemote(v)) {
          out[k] = claim(v, 'media', `${k}_${assets.length}`);
        } else if (MEDIA_KEYS.has(k) && typeof v === 'string' && /^gen_(img|vid)_/.test(v)) {
          warnings.push(`${where}.${k}: 媒体占位符 ${v} 未生成，已保留原值`);
          out[k] = v;
        } else {
          out[k] = rewriteMedia(v, `${where}.${k}`);
        }
      }
      return out;
    }
    return node;
  };

  const scenes: PackScene[] = [];
  const rawScenes = [...(classroom.scenes as Array<Record<string, unknown>>)].sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0),
  );

  for (const raw of rawScenes) {
    const type = String(raw.type);
    const title = String(raw.title ?? '');
    if (!SUPPORTED_SCENES.has(type)) {
      warnings.push(`场景「${title}」类型 ${type} 不支持，已跳过`);
      continue;
    }
    const actions: Action[] = [];
    for (const a of (raw.actions as Array<Record<string, unknown>> | undefined) ?? []) {
      if (LIVE_ONLY_ACTIONS.has(String(a.type))) {
        warnings.push(`场景「${title}」的 ${a.type} 动作需要实时模型，已移除`);
        continue;
      }
      const action = { ...a } as Record<string, unknown>;
      if (action.type === 'speech') {
        const audioUrl = action.audioUrl;
        delete action.audioUrl;
        delete action.audioInvalidated;
        if (typeof audioUrl === 'string' && audioUrl) {
          action.audioId = claim(audioUrl, 'audio', `${String(action.id)}.mp3`);
        } else {
          if (action.text) warnings.push(`场景「${title}」有一句讲解没有语音：${String(action.text).slice(0, 20)}…`);
          delete action.audioId;
        }
      }
      actions.push(action as unknown as Action);
    }
    const scene = {
      ...raw,
      content: rewriteMedia(raw.content, `scene「${title}」`),
      whiteboards: raw.whiteboards ? rewriteMedia(raw.whiteboards, `scene「${title}」.wb`) : undefined,
      actions,
      order: scenes.length,
    } as unknown as PackScene;
    if (scene.whiteboards === undefined) delete (scene as { whiteboards?: unknown }).whiteboards;
    scenes.push(scene);
  }

  if (scenes.length === 0) warnings.push('没有可用的场景');

  const stage = rewriteMedia(classroom.stage, 'stage') as Stage;
  return { lesson: { stage, scenes }, assets, warnings };
}

/** Rough narration speed for Chinese TTS, characters per second. */
const CHARS_PER_SECOND = 4.2;
/** Time budgeted for each non-speech synchronous action (whiteboard drawing etc.). */
const ACTION_SECONDS = 1.2;

export function estimateSpeechMs(text: string): number {
  const chars = text.replace(/\s+/g, '').length;
  return Math.max(1200, Math.round((chars / CHARS_PER_SECOND) * 1000));
}

export function estimateDurationSec(lesson: PackLesson): number {
  let ms = 0;
  for (const scene of lesson.scenes) {
    for (const a of scene.actions ?? []) {
      if (a.type === 'speech') ms += estimateSpeechMs(a.text);
      else if (a.type !== 'spotlight' && a.type !== 'laser') ms += ACTION_SECONDS * 1000;
    }
    if (scene.type === 'quiz') ms += 60_000;
  }
  return Math.round(ms / 1000);
}
