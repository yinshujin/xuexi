import { PACK_FORMAT, type Catalog, type PackLesson, type PackManifest } from './types';

/** Throws with a readable message when the value is not a usable manifest. */
export function assertManifest(value: unknown): asserts value is PackManifest {
  const m = value as Partial<PackManifest> | null;
  if (!m || typeof m !== 'object') throw new Error('manifest 不是对象');
  if (m.format !== PACK_FORMAT) throw new Error(`不支持的课程包格式: ${String(m.format)}`);
  for (const key of ['lessonId', 'kpId', 'bookId', 'title'] as const) {
    if (typeof m[key] !== 'string' || !m[key]) throw new Error(`manifest.${key} 缺失`);
  }
  if (!Number.isInteger(m.version) || (m.version as number) < 1) throw new Error('manifest.version 无效');
  if (!m.files || typeof m.files !== 'object') throw new Error('manifest.files 缺失');
  if (!('lesson.json' in m.files)) throw new Error('manifest.files 缺少 lesson.json');
  for (const [path, info] of Object.entries(m.files)) {
    if (path.includes('..') || path.startsWith('/')) throw new Error(`非法路径: ${path}`);
    if (!info || typeof info.sha256 !== 'string' || typeof info.bytes !== 'number') {
      throw new Error(`manifest.files[${path}] 无效`);
    }
  }
}

export function assertLesson(value: unknown): asserts value is PackLesson {
  const l = value as Partial<PackLesson> | null;
  if (!l || typeof l !== 'object') throw new Error('lesson 不是对象');
  if (!l.stage || typeof l.stage !== 'object') throw new Error('lesson.stage 缺失');
  if (!Array.isArray(l.scenes) || l.scenes.length === 0) throw new Error('lesson.scenes 为空');
  for (const s of l.scenes) {
    if (!['slide', 'quiz', 'interactive'].includes(s.type)) throw new Error(`不支持的场景类型 ${s.type}`);
    if (!s.content || (s.content as { type?: string }).type !== s.type) {
      throw new Error(`场景 ${s.id} 的 content 与 type 不一致`);
    }
  }
}

export function assertCatalog(value: unknown): asserts value is Catalog {
  const c = value as Partial<Catalog> | null;
  if (!c || c.format !== 'xuexi-catalog@1' || typeof c.lessons !== 'object') {
    throw new Error('catalog.json 格式无效');
  }
}

/** All pack-relative files referenced by a lesson (audio + media). */
export function referencedFiles(lesson: PackLesson): string[] {
  const out = new Set<string>();
  const walk = (node: unknown, key?: string) => {
    if (typeof node === 'string') {
      if ((key === 'src' || key === 'poster' || key === 'audioId') && /^(audio|media)\//.test(node)) {
        out.add(node);
      }
      return;
    }
    if (Array.isArray(node)) node.forEach((n) => walk(n));
    else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, k);
    }
  };
  walk(lesson.scenes);
  return [...out].sort();
}
