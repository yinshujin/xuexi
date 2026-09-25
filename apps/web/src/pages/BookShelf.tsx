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

  // Books chosen for this child's grade first (by topic), then the family's own
  // books without a grade (by level), then the other grades' books.
  const sections = useMemo(() => {
    const byLevel = (a: BookEntry, b: BookEntry) =>
      a.level.localeCompare(b.level, 'en', { numeric: true }) || a.title.localeCompare(b.title);
    const group = (list: BookEntry[], key: (b: BookEntry) => string) => {
      const m = new Map<string, BookEntry[]>();
      for (const b of [...list].sort(byLevel)) m.set(key(b), [...(m.get(key(b)) ?? []), b]);
      return [...m.entries()];
    };
    const all = books ?? [];
    return {
      mine: group(
        all.filter((b) => b.grade === child.grade),
        (b) => b.topic ?? '其他',
      ),
      family: group(
        all.filter((b) => !b.grade),
        (b) => `${b.level} 级`,
      ),
      others: group(
        all.filter((b) => b.grade && b.grade !== child.grade),
        (b) => `${b.grade} 年级 · ${b.topic ?? '其他'}`,
      ),
    };
  }, [books, child.grade]);

  const shelf = (list: BookEntry[]) => (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {list.map((b) => (
        <a
          key={b.id}
          href={href(`/c/${child.id}/book/${b.id}`)}
          className="flex flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 transition active:scale-95"
        >
          <div className="relative flex aspect-[4/3] items-center justify-center bg-slate-100">
            {covers[b.id] ? (
              <img src={covers[b.id]} alt="" className="h-full w-full object-contain" />
            ) : (
              <span className="text-5xl">📖</span>
            )}
            <span className="absolute left-2 top-2 rounded-lg bg-violet-500 px-2 text-sm font-bold text-white">
              {b.level}
            </span>
          </div>
          <div className="flex flex-1 flex-col gap-1 p-3">
            <span className="line-clamp-2 text-lg font-bold leading-snug">{b.title}</span>
            <span className="text-sm text-slate-500">
              {b.pages} 页 · {b.words} 词
              {reads.get(b.id) ? (
                <span className="ml-1 text-emerald-600">· 读过 {reads.get(b.id)} 次</span>
              ) : null}
            </span>
            <span className="mt-auto truncate text-xs text-slate-400">
              {b.private ? '家庭自有 · 请勿外传' : b.source}
            </span>
          </div>
        </a>
      ))}
    </div>
  );

  const section = ([name, list]: [string, BookEntry[]]) => (
    <section key={name}>
      <h3 className="mb-3 text-xl font-bold text-slate-700">{name}</h3>
      {shelf(list)}
    </section>
  );

  return (
    <Page title="📚 绘本跟读" back={`/c/${child.id}`}>
      {books === null ? null : books.length === 0 ? (
        <Empty>还没有绘本。请爸爸妈妈在 家长模式 → 离线课程 里导入绘本包（.zip）。</Empty>
      ) : (
        <div className="flex flex-col gap-6">
          {sections.mine.length > 0 && (
            <h2 className="-mb-2 text-2xl font-bold">适合你（{child.grade} 年级）</h2>
          )}
          {sections.mine.map(section)}
          {sections.family.length > 0 && <h2 className="-mb-2 text-2xl font-bold">家里的绘本</h2>}
          {sections.family.map(section)}
          {sections.others.length > 0 && (
            <details open={sections.mine.length === 0 && sections.family.length === 0}>
              <summary className="cursor-pointer text-xl font-bold text-slate-500">
                更多绘本（其他年级）
              </summary>
              <div className="mt-4 flex flex-col gap-6">{sections.others.map(section)}</div>
            </details>
          )}
        </div>
      )}
    </Page>
  );
}
