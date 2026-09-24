import { useEffect, useMemo, useRef, useState } from 'react';
import { SlideCanvas } from '@openmaic/renderer';
import type { QuizContent, Slide, SlideContent } from '@openmaic/dsl';
import type { InteractiveContent } from '@openmaic/dsl';
import type { PackLesson } from '@xuexi/course-pack';
import { LessonEngine, type AudioPort, type PlayerSnapshot } from './engine';
import { createHtmlAudioPort } from './html-audio';
import { QuizView, type QuizResult } from './QuizView';

export interface LessonProgress {
  played: number;
  total: number;
  sceneIndex: number;
  completed: boolean;
}

export interface LessonPlayerProps {
  lesson: PackLesson;
  /** Pack-relative path → playable URL (blob: or https:). Missing paths are left as-is. */
  assets: ReadonlyMap<string, string>;
  title?: string;
  onProgress?: (p: LessonProgress) => void;
  onQuiz?: (sceneId: string, results: QuizResult[]) => void;
  onExit?: () => void;
  /** Inject an AudioPort (tests); defaults to an HTMLAudioElement. */
  audio?: AudioPort;
}

const RATES = [0.8, 1, 1.25];

/** Replace pack-relative media paths with resolved URLs. */
function resolveMedia<T>(node: T, assets: ReadonlyMap<string, string>): T {
  if (Array.isArray(node)) return node.map((n) => resolveMedia(n, assets)) as T;
  if (node && typeof node === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] =
        (k === 'src' || k === 'poster') && typeof v === 'string' && assets.has(v)
          ? assets.get(v)
          : resolveMedia(v, assets);
    }
    return out as T;
  }
  return node;
}

function whiteboardSlide(snapshot: PlayerSnapshot, theme: Slide['theme'] | undefined): Slide {
  return {
    id: 'whiteboard',
    viewportSize: 1000,
    viewportRatio: 0.5625,
    theme: theme ?? {
      backgroundColor: '#ffffff',
      themeColors: ['#5b9bd5'],
      fontColor: '#333333',
      fontName: 'Microsoft YaHei',
    },
    elements: snapshot.whiteboard.elements,
    background: { type: 'solid', color: '#fffdf5' },
  };
}

export function LessonPlayer({ lesson, assets, title, onProgress, onQuiz, onExit, audio }: LessonPlayerProps) {
  const resolved = useMemo(() => resolveMedia(lesson, assets), [lesson, assets]);
  const [snap, setSnap] = useState<PlayerSnapshot | null>(null);
  const engineRef = useRef<LessonEngine | null>(null);
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;

  useEffect(() => {
    const engine = new LessonEngine(resolved, {
      audio: audio ?? createHtmlAudioPort(),
      resolveAudio: (p) => assets.get(p) ?? null,
      onChange: (s) => {
        setSnap(s);
        progressRef.current?.({
          played: s.played,
          total: s.total,
          sceneIndex: s.sceneIndex,
          completed: s.status === 'ended',
        });
      },
    });
    engineRef.current = engine;
    setSnap(engine.snapshot);
    return () => engine.destroy();
  }, [resolved, assets, audio]);

  const engine = engineRef.current;
  if (!snap || !engine) return null;

  const scene = resolved.scenes[snap.sceneIndex];
  const slideTheme =
    scene.type === 'slide' ? (scene.content as SlideContent).canvas.theme : undefined;
  const playing = snap.status === 'playing';
  const pct = snap.total > 0 ? Math.round((snap.played / snap.total) * 100) : 0;

  return (
    <div className="flex h-full w-full flex-col bg-slate-900 text-white">
      {/* header */}
      <div className="flex items-center gap-3 px-3 py-2">
        {onExit && (
          <button type="button" onClick={onExit} className="rounded-full bg-white/10 px-4 py-2 text-base">
            ← 返回
          </button>
        )}
        <div className="min-w-0 flex-1 truncate text-lg font-bold">{title ?? resolved.stage.name}</div>
        <div className="text-sm text-white/60">
          第 {snap.sceneIndex + 1}/{resolved.scenes.length} 页 · AI 生成、家长审核
        </div>
      </div>

      {/* stage */}
      <div className="relative min-h-0 flex-1 px-2">
        <div className="relative mx-auto aspect-video max-h-full w-full max-w-[1200px] overflow-hidden rounded-xl bg-white text-slate-900">
          {scene.type === 'slide' && (
            <SlideCanvas
              slide={(scene.content as SlideContent).canvas}
              effects={{
                spotlight: snap.effects.spotlight,
                laser: snap.effects.laser,
              }}
              style={{ width: '100%', height: '100%' }}
            />
          )}
          {scene.type === 'quiz' && (
            <QuizView
              key={scene.id}
              content={scene.content as QuizContent}
              onDone={(r) => {
                onQuiz?.(scene.id, r);
                engine.continue();
              }}
            />
          )}
          {scene.type === 'interactive' && (
            <div className="flex h-full flex-col">
              <iframe
                title={scene.title}
                sandbox="allow-scripts"
                srcDoc={(scene.content as InteractiveContent).html ?? ''}
                className="min-h-0 w-full flex-1 border-0"
              />
              {snap.status === 'awaiting-user' && (
                <button
                  type="button"
                  onClick={() => engine.continue()}
                  className="m-3 self-center rounded-full bg-emerald-500 px-8 py-3 text-lg font-bold text-white"
                >
                  玩好了，继续 →
                </button>
              )}
            </div>
          )}
          {snap.whiteboard.open && scene.type !== 'quiz' && (
            <div className="absolute inset-0 bg-white/95">
              <SlideCanvas slide={whiteboardSlide(snap, slideTheme)} style={{ width: '100%', height: '100%' }} />
              <span className="absolute left-3 top-2 rounded bg-amber-100 px-2 py-0.5 text-sm text-amber-800">
                白板
              </span>
            </div>
          )}
          {snap.status === 'idle' && (
            <button
              type="button"
              onClick={() => engine.play()}
              className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/60 text-white"
            >
              <span className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500 text-5xl shadow-lg">
                ▶
              </span>
              <span className="text-2xl font-bold">点我开始上课</span>
            </button>
          )}
          {snap.status === 'ended' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/70 text-white">
              <div className="text-4xl">🎉 这节课学完啦！</div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => engine.goToScene(0, true)}
                  className="rounded-full bg-white/20 px-6 py-3 text-lg"
                >
                  从头再看
                </button>
                {onExit && (
                  <button
                    type="button"
                    onClick={onExit}
                    className="rounded-full bg-emerald-500 px-6 py-3 text-lg font-bold"
                  >
                    去练习
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* subtitle */}
      <div className="mx-auto flex min-h-16 w-full max-w-[1200px] items-center px-4 py-2 text-center text-lg leading-snug sm:text-xl">
        <span className="w-full">{snap.subtitle ?? ' '}</span>
      </div>

      {/* progress */}
      <div className="mx-auto h-1.5 w-full max-w-[1200px] rounded bg-white/10">
        <div className="h-full rounded bg-emerald-400 transition-all" style={{ width: `${pct}%` }} />
      </div>

      {/* controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-3 text-base">
        <button
          type="button"
          onClick={() => engine.goToScene(snap.sceneIndex - 1)}
          disabled={snap.sceneIndex === 0}
          className="rounded-full bg-white/10 px-4 py-3 disabled:opacity-30"
        >
          ⏮ 上一页
        </button>
        <button
          type="button"
          onClick={() => (playing ? engine.pause() : engine.play())}
          className="min-w-28 rounded-full bg-emerald-500 px-6 py-3 text-lg font-bold"
        >
          {playing ? '⏸ 暂停' : '▶ 播放'}
        </button>
        <button
          type="button"
          onClick={() => engine.goToScene(snap.sceneIndex + 1)}
          disabled={snap.sceneIndex >= resolved.scenes.length - 1}
          className="rounded-full bg-white/10 px-4 py-3 disabled:opacity-30"
        >
          下一页 ⏭
        </button>
        <button type="button" onClick={() => engine.replayScene()} className="rounded-full bg-white/10 px-4 py-3">
          🔁 再讲一遍
        </button>
        <button
          type="button"
          onClick={() => engine.setRate(RATES[(RATES.indexOf(snap.rate) + 1) % RATES.length])}
          className="rounded-full bg-white/10 px-4 py-3"
        >
          {snap.rate}×
        </button>
      </div>
    </div>
  );
}
