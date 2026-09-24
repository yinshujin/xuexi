import { useEffect, useRef, useState } from 'react';
import { LessonPlayer, type LessonProgress } from '@xuexi/player';
import { openPack, type OpenedLesson } from '../lib/packs';
import { useApp } from '../lib/store';
import { navigate } from '../lib/router';
import { uuid } from '../lib/format';
import { Btn } from '../components/ui';

export function LessonPage({ childId, lessonId, back }: { childId: string; lessonId: string; back: string }) {
  const { catalog, addEvent, deviceId } = useApp();
  const entry = catalog?.lessons[lessonId];
  const [opened, setOpened] = useState<OpenedLesson | null>(null);
  const [error, setError] = useState('');
  const progress = useRef<LessonProgress | null>(null);
  const started = useRef(Date.now());
  const recorded = useRef(false);

  useEffect(() => {
    if (!entry) return;
    let cancelled = false;
    let release = () => {};
    openPack(entry).then(
      (o) => {
        if (cancelled) return o.release();
        release = o.release;
        setOpened(o);
      },
      (e: Error) => !cancelled && setError(`打不开这节课：${e.message}。联网后再试，或先在课程页下载。`),
    );
    return () => {
      cancelled = true;
      release();
    };
  }, [entry]);

  const record = async () => {
    const p = progress.current;
    if (!entry || !p || recorded.current || p.played === 0) return;
    recorded.current = true;
    await addEvent({
      type: 'lesson',
      id: uuid(),
      childId,
      at: Date.now(),
      deviceId,
      lessonId,
      packVersion: entry.version,
      progress: p.total ? p.played / p.total : 0,
      completed: p.completed,
      durationMs: Date.now() - started.current,
    });
  };

  // Record partial progress when the page is left in any way.
  useEffect(() => () => void record(), []); // eslint-disable-line react-hooks/exhaustive-deps

  const exit = async () => {
    await record();
    navigate(back);
  };

  if (!entry) {
    return (
      <div className="p-8 text-lg">
        这节课还没有发布。<Btn tone="plain" onClick={() => navigate(back)}>返回</Btn>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-8 text-lg">
        {error} <Btn tone="plain" onClick={() => navigate(back)}>返回</Btn>
      </div>
    );
  }
  if (!opened) return <div className="flex h-full items-center justify-center bg-slate-900 text-white">正在打开课程…</div>;

  return (
    <div className="h-full">
      <LessonPlayer
        lesson={opened.lesson}
        assets={opened.assets}
        title={entry.title}
        onExit={exit}
        onProgress={(p) => {
          progress.current = p;
          if (p.completed) void record();
        }}
      />
    </div>
  );
}
