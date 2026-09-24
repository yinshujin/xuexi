import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export interface Paths {
  root: string;
  content: string;
  state: string;
  work: string;
  out: string;
  packs: string;
  catalog: string;
  site: string;
  openmaicEnv: string;
  publishEnv: string;
  openmaicCheckout: string;
  webDist: string;
}

/** All content pipeline paths, rooted at `contentDir` (default <repo>/content). */
export function getPaths(contentDir = process.env.XUEXI_CONTENT_DIR ?? join(REPO_ROOT, 'content')): Paths {
  const content = resolve(contentDir);
  return {
    root: REPO_ROOT,
    content,
    state: join(content, 'state.json'),
    work: join(content, 'work'),
    out: join(content, 'out'),
    packs: join(content, 'out', 'packs'),
    catalog: join(content, 'out', 'catalog.json'),
    site: join(content, 'site'),
    openmaicEnv: join(content, 'openmaic.env'),
    publishEnv: join(content, 'publish.env'),
    openmaicCheckout: join(REPO_ROOT, '.cache', 'openmaic'),
    webDist: join(REPO_ROOT, 'apps', 'web', 'dist'),
  };
}

export function draftDir(paths: Paths, lessonId: string): string {
  return join(paths.work, lessonId, 'draft');
}
