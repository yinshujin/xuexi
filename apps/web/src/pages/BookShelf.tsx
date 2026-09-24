import { useEffect, useMemo, useState } from 'react';
import type { BookEntry } from '@xuexi/course-pack';
import { BOOK_EVENT_PREFIX, type ChildProfile } from '@xuexi/shared';
import { coverUrls, listBooks } from '../lib/books';
import { useApp } from '../lib/store';
import { href } from '../lib/router';
import { Empty, Page } from '../components/ui';

export function BookShelf({ child }: { child: ChildProfile }) {
  const { eventsOf } = useApp();
  const [books, setBooks] = useState<BookEntry[] | null>(null);
  const [covers, setCovers] = useState<Record<string, string>>({});

  useEffect(() => {
    let release = () => {};
    let cancelled = false;
    (async () => {
      const list = await listBooks();
      if (cancelled) return;
      setBooks(list);
      const c = await coverUrls(list);
      if (cancelled) return c.release();
      release = c.release;
      setCovers(c.urls);
    })();
    return () => {
      cancelled = true;
      release();
    };
  }, []);

  const reads = useMemo(() => {
    const n = new Map<string, number>();
    for (const e of eventsOf(child.id)) {
      if (e.type === 'lesson' && e.completed && e.lessonId.startsWith(BOOK_EVENT_PREFIX)) {
        const id = e.lessonId.slice(BOOK_EVENT_PREFIX.length);
        n.set(id, (n.get(id) ?? 0) + 1);
      }
    }
    return n;
  }, [eventsOf, child.id]);

  const levels = useMemo(() => {
    const m = new Map<string, BookEntry[]>();
    for (const b of books ?? []) m.set(b.level, [...(m.get(b.level) ?? []), b]);
    return [...m.entries()];
  }, [books]);

  return (
    <Page title="📚 绘本跟读" back={`/c/${child.id}`}>
      {books === null ? null : books.length === 0 ? (
        <Empty>
          还没有绘本。请爸爸妈妈在 家长模式 → 离线课程 里导入绘本包（.zip）。
        </Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {levels.map(([level, list]) => (
            <section key={level}>
              <h2 className="mb-3 text-xl font-bold text-slate-700">
                <span className="mr-2 rounded-xl bg-violet-500 px-3 py-1 text-white">{level}</span>级
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {list.map((b) => (
                  <a
                    key={b.id}
                    href={href(`/c/${child.id}/book/${b.id}`)}
                    className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition active:scale-95"
                  >
                    <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
                      {covers[b.id] ? (
                        <img src={covers[b.id]} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <span className="text-5xl">📖</span>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-3">
                      <span className="line-clamp-2 text-lg font-bold leading-snug">{b.title}</span>
                      <span className="text-sm text-slate-500">
                        {b.pages} 页 · {b.words} 词
                        {reads.get(b.id) ? <span className="ml-1 text-emerald-600">· 读过 {reads.get(b.id)} 次</span> : null}
                      </span>
                      <span className="mt-auto truncate text-xs text-slate-400">{b.private ? '家庭自有 · 请勿外传' : b.source}</span>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
