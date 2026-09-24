import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SlideCanvas } from '@openmaic/renderer';
import type { QuizContent, SlideContent } from '@openmaic/dsl';
import type { InteractiveContent } from '@openmaic/dsl';
import type { PackLesson } from '@xuexi/course-pack';
import { LessonEngine, type AudioPort, type PlayerSnapshot } from './engine';
import { createHtmlAudioPort } from './html-audio';
import { QuizView, type QuizResult } from './QuizView';
import { WhiteboardView } from './WhiteboardView';

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

/** Tall screens (phones held upright) stack the slide and the whiteboard instead of overlaying them. */
function useIsPortrait(): [(el: HTMLDivElement | null) => void, boolean] {
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [portrait, setPortrait] = useState(false);
  useLayoutEffect(() => {
    if (!el) return;
    const check = () => setPortrait(el.clientHeight > el.clientWidth * 1.2);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el]);
  return [setEl, portrait];
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

  // Measured on the whole player, which the chosen layout does not resize (no feedback loop).
  const [rootRef, portrait] = useIsPortrait();
  const engine = engineRef.current;

  if (!snap || !engine) return <div ref={rootRef} className="h-full w-full bg-slate-900" />;

  const scene = resolved.scenes[snap.sceneIndex];
  const slideTheme =
    scene.type === 'slide' ? (scene.content as SlideContent).canvas.theme : undefined;
  const playing = snap.status === 'playing';
  const pct = snap.total > 0 ? Math.round((snap.played / snap.total) * 100) : 0;
  // An empty board (just cleared) is never shown; while the teacher points at the
  // slide, an overlaid board steps aside so the spotlight / laser can be seen.
  const boardHasContent = snap.whiteboard.open && snap.whiteboard.elements.length > 0 && scene.type !== 'quiz';
  const pointing = Boolean(snap.effects.spotlight || snap.effects.laser);
  const quiz = scene.type === 'quiz';

  const board = (
    <>
      <WhiteboardView elements={snap.whiteboard.elements} theme={slideTheme} />
      <span className="pointer-events-none absolute right-2 top-2 rounded bg-amber-100/90 px-2 py-0.5 text-xs text-amber-800">
        白板
      </span>
    </>
  );

  const slideContent = (
    <>
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
    </>
  );

  const quizView = quiz && (
    <QuizView
      key={scene.id}
      content={scene.content as QuizContent}
      onDone={(r) => {
        onQuiz?.(scene.id, r);
        engine.continue();
      }}
    />
  );

  const overlays = (
    <>
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
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900/80 text-white">
          <div className="text-3xl sm:text-4xl">🎉 这节课学完啦！</div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => engine.goToScene(0, true)}
              className="rounded-full bg-white/20 px-6 py-3 text-lg"
            >
              从头再看
            </button>
            {onExit && (
              <button type="button" onClick={onExit} className="rounded-full bg-emerald-500 px-6 py-3 text-lg font-bold">
                去练习
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <div ref={rootRef} className="flex h-full w-full flex-col bg-slate-900 text-white">
      {/* header */}
      <div className="flex items-center gap-3 px-3 py-2">
        {onExit && (
          <button type="button" onClick={onExit} className="rounded-full bg-white/10 px-4 py-2 text-base">
            ← 返回
          </button>
        )}
        <div className="min-w-0 flex-1 truncate text-lg font-bold">{title ?? resolved.stage.name}</div>
        <div className="shrink-0 text-sm text-white/60">
          第 {snap.sceneIndex + 1}/{resolved.scenes.length} 页<span className="hidden sm:inline"> · AI 生成、家长审核</span>
        </div>
      </div>

      {/* stage */}
      <div className="relative flex min-h-0 flex-1 flex-col gap-2 px-2">
        {quiz ? (
          <div className="relative mx-auto min-h-0 w-full max-w-[1200px] flex-1 overflow-hidden rounded-xl bg-white text-slate-900">
            {quizView}
            {overlays}
          </div>
        ) : portrait ? (
          <>
            <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-white text-slate-900">
              {slideContent}
              {overlays}
            </div>
            {boardHasContent && (
              <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-[#fffdf5] text-slate-900">{board}</div>
            )}
          </>
        ) : (
          <div className="relative mx-auto aspect-video max-h-full w-full max-w-[1200px] overflow-hidden rounded-xl bg-white text-slate-900">
            {slideContent}
            {boardHasContent && (
              <div
                className={`absolute inset-0 bg-[#fffdf5] transition-opacity duration-300 ${pointing ? 'pointer-events-none opacity-0' : 'opacity-100'}`}
              >
                {board}
              </div>
            )}
            {overlays}
          </div>
        )}
      </div>

      {/* subtitle: on a tall screen without a board it takes the free space, in big type */}
      <div
        className={`mx-auto flex w-full max-w-[1200px] items-center px-4 py-2 text-center leading-snug ${
          portrait && !quiz && !boardHasContent ? 'min-h-24 flex-[0.6] text-2xl' : 'min-h-16 text-lg sm:text-xl'
        }`}
      >
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
