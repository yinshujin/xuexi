import { useEffect, useMemo, useRef, useState } from 'react';
import type { BookEntry } from '@xuexi/course-pack';
import { BOOK_EVENT_PREFIX, type LessonEvent } from '@xuexi/shared';
import {
  deleteRecordings,
  listBooks,
  recordingsOf,
  removeBook,
  type Recording,
} from '../lib/books';
import { useApp } from '../lib/store';
import { bytes, dayKey } from '../lib/format';
import { Btn, Card, Empty } from '../components/ui';

const MODE_LABEL = { listen: '听读', repeat: '跟读', self: '自己读' } as const;

/** 家长模式 → 绘本: what each child read, quiz results, and their recorded reading. */
export function ParentBooks() {
  const { family, eventsOf, loadChild } = useApp();
  const [childId, setChildId] = useState(family.children[0]?.id ?? '');
  const [books, setBooks] = useState<BookEntry[]>([]);
  const [recs, setRecs] = useState<Recording[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (childId) loadChild(childId);
  }, [childId, loadChild]);
  useEffect(() => {
    listBooks().then(setBooks);
  }, [version]);
  useEffect(() => {
    if (childId) recordingsOf(childId).then(setRecs);
  }, [childId, version]);

  const events = eventsOf(childId);
  const reads = useMemo(() => {
    const m = new Map<string, LessonEvent[]>();
    for (const e of events) {
      if (e.type !== 'lesson' || !e.lessonId.startsWith(BOOK_EVENT_PREFIX)) continue;
      const id = e.lessonId.slice(BOOK_EVENT_PREFIX.length);
      m.set(id, [...(m.get(id) ?? []), e]);
    }
    return m;
  }, [events]);

  if (books.length === 0) {
    return <Empty>还没有绘本。在 离线课程 → 选择课程包文件 导入绘本包（.zip）。</Empty>;
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {family.children.map((c) => (
          <Btn
            key={c.id}
            tone={c.id === childId ? 'primary' : 'plain'}
            onClick={() => setChildId(c.id)}
          >
            {c.avatar} {c.name}
          </Btn>
        ))}
      </div>
      {books.map((b) => {
        const r = reads.get(b.id) ?? [];
        const finished = r.filter((e) => e.completed);
        const lastQuiz = [...finished].reverse().find((e) => e.quizTotal);
        const mine = recs.filter((x) => x.bookId === b.id);
        return (
          <Card key={b.id} className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-violet-500 px-2 text-white">{b.level}</span>
              <span className="flex-1 text-lg font-bold">{b.title}</span>
              <span className="text-sm text-slate-500">
                {b.pages} 页 · {b.words} 词 · {bytes(b.totalBytes)}
              </span>
            </div>
            <div className="text-slate-600">
              {finished.length > 0
                ? `读完 ${finished.length} 次（${[...new Set(finished.map((e) => MODE_LABEL[e.readMode ?? 'listen']))].join('、')}），最近 ${dayKey(finished.at(-1)!.at)}`
                : r.length > 0
                  ? `读到 ${Math.round(Math.max(...r.map((e) => e.progress)) * 100)}%，还没读完`
                  : '还没读过'}
              {lastQuiz && `；小测 ${lastQuiz.quizCorrect}/${lastQuiz.quizTotal}`}
              {(() => {
                const scored = [...finished].reverse().find((e) => e.readTotal);
                return scored
                  ? `；跟读${scored.readScore !== undefined ? `总分 ${scored.readScore}，` : ''}过关 ${scored.readPassed}/${scored.readTotal} 页`
                  : '';
              })()}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-slate-400">{b.private ? '家庭自有 · 请勿外传' : b.source}</span>
              <span className="flex-1" />
              {mine.length > 0 && (
                <button
                  type="button"
                  className="text-sky-600 underline"
                  onClick={() => setOpen(open === b.id ? null : b.id)}
                >
                  跟读录音 {mine.length} 句
                </button>
              )}
              {b.origin === 'builtin' ? (
                <span className="rounded bg-sky-50 px-1.5 text-xs text-sky-700">App 自带</span>
              ) : (
                <button
                  type="button"
                  className="text-slate-500 underline"
                  onClick={async () => {
                    if (!confirm(`删除绘本「${b.title}」和孩子们的跟读录音？删除后需要重新导入。`))
                      return;
                    await removeBook(b);
                    setVersion((v) => v + 1);
                  }}
                >
                  删除绘本
                </button>
              )}
            </div>
            {open === b.id && (
              <Recordings
                list={mine}
                onClear={async () => {
                  if (!confirm('删除这本书的全部跟读录音？')) return;
                  await deleteRecordings(childId, b.id);
                  setVersion((v) => v + 1);
                }}
              />
            )}
          </Card>
        );
      })}
      <p className="text-sm text-slate-400">跟读录音只保存在这台设备上，不会上传。</p>
    </div>
  );
}

function Recordings({ list, onClear }: { list: Recording[]; onClear: () => void }) {
  const [playing, setPlaying] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  useEffect(() => () => audio.current?.pause(), []);
  const play = (r: Recording) => {
    audio.current?.pause();
    const a = new Audio(URL.createObjectURL(r.blob));
    audio.current = a;
    setPlaying(r.id);
    a.onended = a.onerror = () => {
      URL.revokeObjectURL(a.src);
      setPlaying(null);
    };
    a.play().catch(() => setPlaying(null));
  };
  return (
    <div className="flex flex-col gap-1 rounded-2xl bg-slate-50 p-3">
      {list.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => play(r)}
          className={`flex items-center gap-2 rounded-xl px-2 py-1 text-left ${playing === r.id ? 'bg-emerald-100' : 'hover:bg-white'}`}
        >
          <span>{playing === r.id ? '🔊' : '▶'}</span>
          <span className="w-12 shrink-0 text-sm text-slate-400">第{r.page + 1}页</span>
          <span className="flex-1">{r.text}</span>
          {r.score !== undefined && (
            <span className={`rounded-lg px-1.5 text-sm ${r.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
              {r.score} 分
            </span>
          )}
        </button>
      ))}
      <button
        type="button"
        className="mt-1 self-end text-sm text-rose-600 underline"
        onClick={onClear}
      >
        删除这些录音
      </button>
    </div>
  );
}
