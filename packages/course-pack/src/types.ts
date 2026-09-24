import type { Action, Scene as DslScene, Stage, SlideContent, QuizContent } from '@openmaic/dsl';
import type { InteractiveContent } from '@openmaic/dsl';

export const PACK_FORMAT = 'xuexi-pack@1' as const;

/** Scene kinds a pack may contain (PBL is not used for primary-school lessons). */
export type PackScene = DslScene<Action, SlideContent | QuizContent | InteractiveContent>;

/**
 * lesson.json inside a pack. Structurally an OpenMAIC Stage + Scenes, except:
 * - speech actions' `audioId` holds a pack-relative path (e.g. "audio/tts_s0_a1.mp3")
 *   or is absent when no narration audio exists (the player then uses a timed pause);
 * - image / video element `src` hold pack-relative paths ("media/...") or data: URIs.
 */
export interface PackLesson {
  stage: Stage;
  scenes: PackScene[];
}

export interface PackFileInfo {
  bytes: number;
  sha256: string;
}

export interface PackManifest {
  format: typeof PACK_FORMAT;
  lessonId: string;
  kpId: string;
  bookId: string;
  kind: 'lecture' | 'technique';
  title: string;
  /** Increments each time the lesson is regenerated and re-approved. */
  version: number;
  createdAt: string;
  source: {
    generator: 'openmaic';
    openmaicVersion: string;
    classroomId: string;
    templateVersion: string;
  };
  review: {
    status: 'approved';
    reviewedAt: string;
    note?: string;
  };
  /** Always true: content is AI generated and parent reviewed. */
  aiGenerated: true;
  /** Estimated duration in seconds (sum of narration / reading time). */
  durationSec: number;
  sceneCount: number;
  /** Every file in the pack except manifest.json, keyed by pack-relative path. */
  files: Record<string, PackFileInfo>;
}

export interface CatalogEntry {
  lessonId: string;
  kpId: string;
  bookId: string;
  kind: 'lecture' | 'technique';
  title: string;
  version: number;
  /** Site-relative directory of the pack, ending with "/", e.g. "packs/<id>/v2/". */
  path: string;
  durationSec: number;
  totalBytes: number;
  /**
   * When the pack was built (manifest.createdAt). Orders two builds of the same
   * lesson whose `version` cannot be compared (CI builds start from v1 each time).
   */
  builtAt?: string;
  /**
   * Set by the app: 'local' = imported from a bundle file (Cache Storage on the
   * device), 'builtin' = shipped inside the installed app.
   */
  origin?: 'local' | 'builtin';
}

/** Whether `a` is a strictly newer build of the same lesson than `b`. */
export function isNewerEntry(a: CatalogEntry, b: CatalogEntry): boolean {
  if (a.builtAt && b.builtAt && a.builtAt !== b.builtAt) return a.builtAt > b.builtAt;
  return a.version > b.version;
}

/** catalog.json at the site root. */
export interface Catalog {
  format: 'xuexi-catalog@1';
  generatedAt: string;
  lessons: Record<string, CatalogEntry>;
}

export const BUNDLE_FORMAT = 'xuexi-bundle@1' as const;

/**
 * bundle.json at the root of a course-bundle zip ("课程包文件"), used to move
 * courses to a device without any server. The zip also contains every pack
 * under the same `packs/<lessonId>/v<n>/` paths as the published site.
 */
export interface BundleIndex {
  format: typeof BUNDLE_FORMAT;
  createdAt: string;
  /** Human title, e.g. "四年级上册 第3单元". */
  title: string;
  lessons: CatalogEntry[];
}
