import { useCallback, useEffect, useMemo, useState } from 'react';
import { LessonPlayer } from '@xuexi/player';
import { openDraft, type OpenedLesson } from '../lib/packs';
import { Btn, Card, Empty } from '../components/ui';

/** Mirrors tools/content/src/review-server.ts ReviewLesson. */
interface ReviewLesson {
  lessonId: string;
  bookId: string;
  bookTitle: string;
  unitTitle: string;
  unitIndex: number;
  kpId: string;
  kpTitle: string;
  title: string;
  kind: 'lecture' | 'technique';
  minutes: number;
  focus: string;
  status: string;
  hasDraft: boolean;
  warnings: string[];
  error?: string;
  reviewNote?: string;
  generatedAt?: string;
  packVersion?: number;
}

const STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: '未生成', tone: 'bg-slate-100 text-slate-500' },
  generating: { label: '生成中', tone: 'bg-sky-100 text-sky-700' },
  generated: { label: '待审核', tone: 'bg-amber-100 text-amber-800' },
  approved: { label: '已通过', tone: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '已打回', tone: 'bg-rose-100 text-rose-700' },
  failed: { label: '失败', tone: 'bg-rose-100 text-rose-700' },
};

const FILTERS = [
  { id: 'generated', label: '待审核' },
  { id: 'approved', label: '已通过' },
  { id: 'rejected', label: '已打回' },
  { id: 'failed', label: '失败' },
  { id: 'pending', label: '未生成' },
  { id: 'all', label: '全部' },
];

async function decide(id: string, action: 'approve' | 'reject', note: string): Promise<ReviewLesson> {
  const res = await fetch(`/api/review/lessons/${id}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action, note }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
  return body.lesson;
}

function Reviewer({
  row,
  onClose,
  onDecided,
}: {
  row: ReviewLesson;
  onClose: () => void;
  onDecided: (r: ReviewLesson) => void;
}) {
  const [opened, setOpened] = useState<OpenedLesson | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState(row.reviewNote ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    openDraft(row.lessonId).then(
      (o) => !cancelled && setOpened(o),
      (e: Error) => !cancelled && setError(e.message),
    );
    return () => {
      cancelled = true;
    };
  }, [row.lessonId]);

  const act = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !note.trim()) {
      setError('打回时请写下修改意见，重新生成时会带上它');
      return;
    }
    setBusy(true);
    try {
      onDecided(await decide(row.lessonId, action, note));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 lg:flex-row">
      <div className="min-h-0 flex-1">
        {opened ? (
          <LessonPlayer lesson={opened.lesson} assets={opened.assets} title={row.title} onExit={onClose} />
        ) : (
          <div className="flex h-full items-center justify-center text-white">{error || '加载中…'}</div>
        )}
      </div>
      <aside className="max-h-[45vh] w-full overflow-y-auto bg-white p-4 lg:max-h-none lg:w-96">
        <div className="mb-1 text-sm text-slate-500">
          {row.bookTitle} · 第 {row.unitIndex} 单元 {row.unitTitle} · {row.kpTitle}
        </div>
        <h2 className="mb-2 text-xl font-bold">
          {row.kind === 'lecture' ? '讲解课' : '技巧课'}：{row.title}
        </h2>
        <p className="mb-3 rounded-xl bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">
          <b>本课要求：</b>
          {row.focus}
        </p>
        {row.warnings.length > 0 && (
          <ul className="mb-3 list-disc rounded-xl bg-amber-50 p-3 pl-7 text-sm text-amber-900">
            {row.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        )}
        <p className="mb-2 text-sm text-slate-600">
          检查要点：知识点与课本一致、没有超纲；计算和答案都正确；语言孩子听得懂；没有不合适的内容。
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="修改意见（打回时必填，例如：第 2 页的例题换成地铁情境；讲慢一点）"
          className="mb-3 h-24 w-full rounded-xl border border-slate-300 p-3 text-base"
        />
        {error && <p className="mb-2 text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <Btn tone="green" className="flex-1" disabled={busy || !opened} onClick={() => act('approve')}>
            ✓ 通过
          </Btn>
          <Btn tone="danger" className="flex-1" disabled={busy} onClick={() => act('reject')}>
            ✗ 打回重做
          </Btn>
        </div>
        <Btn tone="plain" className="mt-2 w-full" onClick={onClose}>
          关闭
        </Btn>
      </aside>
    </div>
  );
}

export function ReviewPage() {
  const [rows, setRows] = useState<ReviewLesson[] | null>(null);
  const [error, setError] = useState('');
  const [book, setBook] = useState('');
  const [filter, setFilter] = useState('generated');
  const [open, setOpen] = useState<ReviewLesson | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/review/lessons', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setRows(body.lessons);
      setBook((b) => b || body.lessons[0]?.bookId || '');
    } catch {
      setError('审核页需要通过 `pnpm content review` 打开。');
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const books = useMemo(() => {
    const m = new Map<string, string>();
    rows?.forEach((r) => m.set(r.bookId, r.bookTitle));
    return [...m];
  }, [rows]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0 };
    rows?.filter((r) => r.bookId === book).forEach((r) => {
      c[r.status] = (c[r.status] ?? 0) + 1;
      c.all += 1;
    });
    return c;
  }, [rows, book]);

  const visible = (rows ?? []).filter((r) => r.bookId === book && (filter === 'all' || r.status === filter));
  const units = new Map<string, ReviewLesson[]>();
  visible.forEach((r) => {
    const key = `第 ${r.unitIndex} 单元 ${r.unitTitle}`;
    units.set(key, [...(units.get(key) ?? []), r]);
  });

  if (error) return <div className="p-8 text-lg">{error}</div>;
  if (!rows) return <div className="p-8">加载中…</div>;

  return (
    <div className="mx-auto max-w-5xl p-4">
      <h1 className="mb-1 text-2xl font-bold">课程审核</h1>
      <p className="mb-4 text-slate-600">
        逐课试播，没问题就通过；有问题写下修改意见打回，再运行 <code>pnpm content gen</code> 会带着意见重新生成。
        全部审完后运行 <code>pnpm content build</code> 和 <code>pnpm content publish</code>。
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        {books.map(([id, title]) => (
          <Btn key={id} tone={id === book ? 'primary' : 'plain'} onClick={() => setBook(id)}>
            {title}
          </Btn>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={`rounded-full px-4 py-1.5 text-base ${f.id === filter ? 'bg-slate-800 text-white' : 'bg-white ring-1 ring-slate-200'}`}
          >
            {f.label} {counts[f.id] ?? 0}
          </button>
        ))}
      </div>
      {visible.length === 0 && <Empty>这里没有课。</Empty>}
      {[...units].map(([unit, list]) => (
        <Card key={unit} className="mb-4">
          <h2 className="mb-3 text-lg font-bold">{unit}</h2>
          <ul className="divide-y divide-slate-100">
            {list.map((r) => (
              <li key={r.lessonId} className="flex flex-wrap items-center gap-2 py-3">
                <span className={`rounded-full px-2 py-0.5 text-sm ${STATUS[r.status]?.tone}`}>{STATUS[r.status]?.label ?? r.status}</span>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-sm">{r.kind === 'lecture' ? '讲解' : '技巧'}</span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{r.title}</span>
                  <span className="ml-2 text-sm text-slate-500">{r.kpTitle}</span>
                  {r.warnings.length > 0 && <span className="ml-2 text-sm text-amber-700">⚠ {r.warnings.length}</span>}
                  {r.error && <span className="ml-2 text-sm text-rose-600">{r.error.slice(0, 60)}</span>}
                  {r.packVersion && <span className="ml-2 text-sm text-slate-400">已发布 v{r.packVersion}</span>}
                </span>
                {r.hasDraft && (
                  <Btn tone="plain" className="!px-4 !py-2 !text-base" onClick={() => setOpen(r)}>
                    试播审核
                  </Btn>
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
      {open && (
        <Reviewer
          row={open}
          onClose={() => setOpen(null)}
          onDecided={(r) => {
            setRows((prev) => prev?.map((x) => (x.lessonId === r.lessonId ? r : x)) ?? null);
            setOpen(null);
          }}
        />
      )}
    </div>
  );
}
