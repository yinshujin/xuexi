import { useEffect, useState } from 'react';
import { BOOKS } from '@xuexi/curriculum';
import type { CatalogEntry } from '@xuexi/course-pack';
import { sha256Hex } from '@xuexi/course-pack';
import { PRACTICE_SIZE_DEFAULT, type ChildProfile, type FamilySettings } from '@xuexi/shared';
import { useApp } from '../lib/store';
import { downloadPack, importBundle, isDownloaded, removePack, type ImportResult } from '../lib/packs';
import { buildBackup, mergeChildren, parseBackup, restoreEvents } from '../lib/backup';
import { openExternal, pickFile, saveFile } from '../lib/files';
import { bytes, uuid } from '../lib/format';
import { Btn, Card, Empty, Page } from '../components/ui';
import { NumberPad } from '../practice/NumberPad';
import { ReportView } from './ReportView';
import { ParentBooks } from './ParentBooks';
import { ParentWritings } from './ParentWritings';
import { ScoringCard } from './ScoringCard';

const AVATARS = ['🐼', '🦊', '🐯', '🐰', '🐬', '🦄', '🐧', '🐻', '🐱', '🐶', '🚀', '⚽'];

export async function hashPin(pin: string): Promise<string> {
  return sha256Hex(new TextEncoder().encode(`xuexi-parent-pin:${pin}`));
}

function PinGate({ onOk }: { onOk: () => void }) {
  const { family, saveFamily } = useApp();
  const hasPin = Boolean(family.settings.parentPinHash);
  const [pin, setPin] = useState('');
  const [first, setFirst] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    if (pin.length < 4) return setError('至少 4 位数字');
    if (hasPin) {
      if ((await hashPin(pin)) === family.settings.parentPinHash) onOk();
      else {
        setError('密码不对');
        setPin('');
      }
      return;
    }
    if (!first) {
      setFirst(pin);
      setPin('');
      setError('');
      return;
    }
    if (first !== pin) {
      setError('两次输入不一致，重新设置');
      setFirst('');
      setPin('');
      return;
    }
    await saveFamily({ settings: { ...family.settings, parentPinHash: await hashPin(pin) } });
    onOk();
  };

  return (
    <Page title="家长模式" back="/">
      <Card className="mx-auto w-full max-w-md">
        <p className="mb-3 text-center text-lg">
          {hasPin ? '请输入家长密码' : first ? '再输入一次确认' : '第一次使用，请设置家长密码（4–8 位数字）'}
        </p>
        <div className="mb-4 flex h-14 items-center justify-center rounded-xl bg-slate-50 text-3xl tracking-[0.5em]">
          {'●'.repeat(pin.length)}
        </div>
        {error && <p className="mb-2 text-center text-rose-600">{error}</p>}
        <NumberPad
          onDigit={(d) => pin.length < 8 && setPin(pin + d)}
          onBackspace={() => setPin(pin.slice(0, -1))}
          onSubmit={submit}
          submitLabel="确定"
        />
      </Card>
    </Page>
  );
}

function ChildEditor({ child, onDone }: { child?: ChildProfile; onDone: () => void }) {
  const { family, saveFamily } = useApp();
  const [name, setName] = useState(child?.name ?? '');
  const [avatar, setAvatar] = useState(child?.avatar ?? AVATARS[0]);
  const [grade, setGrade] = useState<2 | 4>(child?.grade ?? 2);
  const [books, setBooks] = useState<string[]>(child?.bookIds ?? []);
  const gradeBooks = BOOKS.filter((b) => b.grade === grade);

  useEffect(() => {
    if (!child || child.grade !== grade) setBooks(BOOKS.filter((b) => b.grade === grade).map((b) => b.id));
  }, [grade, child]);

  const save = async () => {
    const profile: ChildProfile = { id: child?.id ?? uuid(), name: name.trim(), avatar, grade, bookIds: books };
    const children = child
      ? family.children.map((c) => (c.id === child.id ? profile : c))
      : [...family.children, profile];
    await saveFamily({ children });
    onDone();
  };

  return (
    <Card>
      <h3 className="mb-3 text-xl font-bold">{child ? '编辑' : '添加孩子'}</h3>
      <label className="mb-3 block">
        <span className="mb-1 block text-slate-600">昵称</span>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg" />
      </label>
      <div className="mb-3">
        <span className="mb-1 block text-slate-600">头像</span>
        <div className="flex flex-wrap gap-2">
          {AVATARS.map((a) => (
            <button key={a} type="button" onClick={() => setAvatar(a)} className={`h-12 w-12 rounded-xl text-3xl ${a === avatar ? 'bg-sky-100 ring-2 ring-sky-400' : 'bg-slate-50'}`}>
              {a}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-3">
        <span className="mb-1 block text-slate-600">年级</span>
        <div className="flex gap-2">
          {([2, 4] as const).map((g) => (
            <Btn key={g} tone={g === grade ? 'primary' : 'plain'} onClick={() => setGrade(g)}>
              {g} 年级
            </Btn>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <span className="mb-1 block text-slate-600">课本</span>
        {gradeBooks.map((b) => (
          <label key={b.id} className="mr-4 inline-flex items-center gap-2 text-lg">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={books.includes(b.id)}
              onChange={(e) => setBooks(e.target.checked ? [...books, b.id] : books.filter((x) => x !== b.id))}
            />
            {b.title}
          </label>
        ))}
      </div>
      <div className="flex gap-2">
        <Btn disabled={!name.trim() || books.length === 0} onClick={save}>
          保存
        </Btn>
        <Btn tone="plain" onClick={onDone}>
          取消
        </Btn>
      </div>
    </Card>
  );
}

function ChildrenTab() {
  const { family, saveFamily } = useApp();
  const [editing, setEditing] = useState<ChildProfile | 'new' | null>(null);
  if (editing) return <ChildEditor child={editing === 'new' ? undefined : editing} onDone={() => setEditing(null)} />;
  return (
    <div className="flex flex-col gap-3">
      {family.children.length === 0 && <Empty>还没有孩子档案</Empty>}
      {family.children.map((c) => (
        <Card key={c.id} className="flex items-center gap-4">
          <span className="text-4xl">{c.avatar}</span>
          <div className="flex-1">
            <div className="text-xl font-bold">{c.name}</div>
            <div className="text-slate-500">
              {c.grade} 年级 · {c.bookIds.map((id) => BOOKS.find((b) => b.id === id)?.title ?? id).join('、')}
            </div>
            {(() => {
              // Books added in an app update (e.g. 语文 / 英语) are not in older profiles.
              const missing = BOOKS.filter((b) => b.grade === c.grade && !c.bookIds.includes(b.id));
              if (missing.length === 0) return null;
              return (
                <button
                  type="button"
                  className="mt-1 text-left text-sm text-sky-600 underline"
                  onClick={() =>
                    saveFamily({
                      children: family.children.map((x) =>
                        x.id === c.id ? { ...x, bookIds: [...x.bookIds, ...missing.map((b) => b.id)] } : x,
                      ),
                    })
                  }
                >
                  ＋ 添加新课本：{missing.map((b) => b.title.split('（')[0]).join('、')}
                </button>
              );
            })()}
          </div>
          <Btn tone="plain" onClick={() => setEditing(c)}>
            编辑
          </Btn>
          <Btn
            tone="plain"
            onClick={() => {
              if (confirm(`删除 ${c.name} 的档案？学习记录会保留在服务器上。`)) {
                saveFamily({ children: family.children.filter((x) => x.id !== c.id) });
              }
            }}
          >
            删除
          </Btn>
        </Card>
      ))}
      <Btn onClick={() => setEditing('new')}>＋ 添加孩子</Btn>
    </div>
  );
}

function ImportCard() {
  const { refreshCatalog } = useApp();
  const [busy, setBusy] = useState<number | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState('');

  const run = async () => {
    setError('');
    setResult(null);
    try {
      const file = await pickFile({ extensions: ['zip'], label: '课程包' });
      if (!file) return;
      setBusy(0);
      const r = await importBundle(file.bytes, (x) => setBusy(x));
      setResult(r);
      await refreshCatalog();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold">从文件导入课程 / 绘本</h3>
          <p className="text-sm text-slate-500">不需要网站：电脑上 pnpm content export 生成 .zip，用微信 / 数据线传到这台设备后导入。</p>
        </div>
        <Btn tone="green" disabled={busy !== null} onClick={run}>
          {busy !== null ? `导入中 ${Math.round(busy * 100)}%` : '选择课程包文件'}
        </Btn>
      </div>
      {error && <p className="mt-3 text-rose-600">{error}</p>}
      {result && (
        <div className="mt-3 text-slate-700">
          <p>
            「{result.title}」导入了
            {[result.imported.length > 0 && ` ${result.imported.length} 节课`, result.books.length > 0 && ` ${result.books.length} 本绘本`]
              .filter(Boolean)
              .join('、') || ' 0 节课'}
            {result.skipped.length > 0 ? `，${result.skipped.length} 项有问题没导入：` : '。'}
            {result.books.length > 0 && '孩子首页点「📚 绘本跟读」就能读。'}
          </p>
          {result.skipped.length > 0 && (
            <ul className="mt-1 list-disc pl-6 text-sm text-rose-600">
              {result.skipped.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

function OfflineTab() {
  const { catalog, family, refreshCatalog } = useApp();
  const [state, setState] = useState<Record<string, number | 'done' | 'error'>>({});
  const bookIds = [...new Set(family.children.flatMap((c) => c.bookIds))];
  const entries = Object.values(catalog?.lessons ?? {}).filter((e) => bookIds.length === 0 || bookIds.includes(e.bookId));

  useEffect(() => {
    (async () => {
      const s: Record<string, 'done'> = {};
      for (const e of entries) if (await isDownloaded(e)) s[e.lessonId] = 'done';
      setState(s);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog]);

  const download = async (e: CatalogEntry) => {
    try {
      await downloadPack(e, (r) => setState((s) => ({ ...s, [e.lessonId]: r })));
      setState((s) => ({ ...s, [e.lessonId]: 'done' }));
    } catch {
      setState((s) => ({ ...s, [e.lessonId]: 'error' }));
    }
  };

  const total = entries.reduce((n, e) => n + e.totalBytes, 0);
  const remote = entries.filter((e) => !e.origin);
  const builtin = entries.filter((e) => e.origin === 'builtin').length;
  return (
    <div className="flex flex-col gap-3">
      <ImportCard />
      <Card className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          共 {entries.length} 节课{builtin > 0 ? `（${builtin} 节 App 自带）` : ''}，{bytes(total)}。
          {remote.length > 0 ? '网站上的课下载后没有网络也能上课。' : ''}
        </div>
        <Btn tone="plain" onClick={() => refreshCatalog()}>
          刷新
        </Btn>
        <Btn
          onClick={async () => {
            for (const e of remote) if (state[e.lessonId] !== 'done') await download(e);
          }}
          disabled={remote.length === 0}
        >
          全部下载
        </Btn>
      </Card>
      {entries.length === 0 && <Empty>还没有课程。在电脑上用 pnpm content export 导出课程包文件，再点上面的「从文件导入」。</Empty>}
      {entries.map((e) => {
        const s = state[e.lessonId];
        return (
          <div key={e.lessonId} className="flex items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
            <span className="rounded bg-slate-100 px-2 text-sm">{e.kind === 'lecture' ? '讲解' : '技巧'}</span>
            <span className="flex-1">
              {e.title}
              {e.origin === 'local' && <span className="ml-2 rounded bg-emerald-50 px-1.5 text-xs text-emerald-700">本机导入</span>}
              {e.origin === 'builtin' && <span className="ml-2 rounded bg-sky-50 px-1.5 text-xs text-sky-700">App 自带</span>}
            </span>
            <span className="text-sm text-slate-500">{bytes(e.totalBytes)}</span>
            {e.origin === 'builtin' ? (
              <span className="text-sm text-slate-400">已内置</span>
            ) : s === 'done' ? (
              <button
                type="button"
                className="text-sm text-slate-500 underline"
                onClick={async () => {
                  if (e.origin === 'local' && !confirm(`删除「${e.title}」？删除后需要重新导入课程包文件。`)) return;
                  await removePack(e);
                  setState((x) => ({ ...x, [e.lessonId]: 0 }));
                  if (e.origin === 'local') await refreshCatalog();
                }}
              >
                {e.origin === 'local' ? '删除' : '已下载 · 删除'}
              </button>
            ) : typeof s === 'number' && s > 0 ? (
              <span className="text-sm text-sky-600">{Math.round(s * 100)}%</span>
            ) : (
              <button type="button" className="text-sky-600 underline" onClick={() => download(e)}>
                {s === 'error' ? '失败，重试' : '下载'}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SettingsTab() {
  const { family, saveFamily, auth, sync, syncNow, logout } = useApp();
  const [s, setS] = useState<FamilySettings>({ practiceSize: PRACTICE_SIZE_DEFAULT, readPassScore: 70, ...family.settings });
  const [saved, setSaved] = useState(false);
  const num = (k: keyof FamilySettings, label: string, min: number, max: number, step = 1, fmt = (v: number) => String(v)) => (
    <label className="mb-4 block">
      <span className="mb-1 block text-slate-600">
        {label}：<b>{fmt(s[k] as number)}</b>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={s[k] as number}
        onChange={(e) => {
          setS({ ...s, [k]: Number(e.target.value) });
          setSaved(false);
        }}
        className="w-full"
      />
    </label>
  );
  return (
    <div className="flex flex-col gap-4">
      <Card>
        {num('dailyMinutes', '每日学习时长上限', 10, 90, 5, (v) => `${v} 分钟`)}
        {num('eyeBreakMinutes', '护眼提醒间隔', 10, 40, 5, (v) => `${v} 分钟`)}
        {num('masteryAccuracy', '掌握标准（最近 10 题正确率）', 0.7, 1, 0.05, (v) => `${Math.round(v * 100)}%`)}
        {num('practiceSize', '专项练习 / 加练每组题数', 10, 30, 5, (v) => `${v} 题`)}
        {num('readPassScore', '绘本跟读评分的过关线', 50, 90, 5, (v) => `${v} 分`)}
        <Btn
          onClick={async () => {
            await saveFamily({ settings: { ...s, parentPinHash: family.settings.parentPinHash } });
            setSaved(true);
          }}
        >
          {saved ? '已保存 ✓' : '保存设置'}
        </Btn>
        <Btn
          tone="plain"
          className="ml-2"
          onClick={async () => {
            if (confirm('清除家长密码？下次进入家长模式时重新设置。')) {
              await saveFamily({ settings: { ...family.settings, parentPinHash: undefined } });
            }
          }}
        >
          重设家长密码
        </Btn>
      </Card>
      <Card>
        <h3 className="mb-2 text-lg font-bold">同步</h3>
        <p className="mb-3 text-slate-600">
          {auth === 'local'
            ? '本机模式：学习记录只保存在这台设备上。'
            : sync.state === 'idle'
              ? `已同步${sync.lastSyncAt ? `（${new Date(sync.lastSyncAt).toLocaleTimeString()}）` : ''}`
              : sync.state === 'syncing'
                ? '同步中…'
                : sync.state === 'offline'
                  ? '离线，联网后自动同步'
                  : sync.state === 'error'
                    ? `同步出错：${sync.message}`
                    : '需要重新登录'}
        </p>
        <div className="flex gap-2">
          {auth === 'ok' && <Btn tone="plain" onClick={() => syncNow()}>立即同步</Btn>}
          <Btn tone="plain" onClick={() => logout()}>
            {auth === 'local' ? '登录家庭账号' : '退出登录'}
          </Btn>
        </div>
      </Card>
      <ScoringCard />
      <BackupCard />
      <VersionCard />
    </div>
  );
}

function BackupCard() {
  const { family, saveFamily, reloadEvents } = useApp();
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const exportIt = async () => {
    setMsg('');
    setError('');
    try {
      const data = await buildBackup(family);
      const name = `xuexi-backup-${new Date().toISOString().slice(0, 10)}.json`;
      if (await saveFile(name, data, 'application/json', '学习记录备份', 'json')) setMsg(`已导出 ${name}`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const restore = async () => {
    setMsg('');
    setError('');
    try {
      const file = await pickFile({ extensions: ['json'], label: '学习记录备份' });
      if (!file) return;
      const backup = parseBackup(file.bytes);
      const added = await restoreEvents(backup.events);
      const children = mergeChildren(family.children, backup.family.children);
      const newKids = children.length - family.children.length;
      if (newKids > 0) {
        await saveFamily({ children, settings: family.children.length ? family.settings : backup.family.settings });
      }
      await reloadEvents();
      setMsg(`恢复完成：新增 ${added} 条学习记录${newKids > 0 ? `、${newKids} 个孩子` : ''}（已有的记录不会重复）。`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Card>
      <h3 className="mb-2 text-lg font-bold">学习记录备份</h3>
      <p className="mb-3 text-slate-600">
        换设备或重装 App 前先导出；在新设备上恢复即可接着学。恢复只会补上缺少的记录，不会覆盖已有的。
      </p>
      <div className="flex flex-wrap gap-2">
        <Btn tone="plain" onClick={exportIt}>
          导出备份
        </Btn>
        <Btn tone="plain" onClick={restore}>
          从备份恢复
        </Btn>
      </div>
      {msg && <p className="mt-3 text-emerald-700">{msg}</p>}
      {error && <p className="mt-3 text-rose-600">{error}</p>}
    </Card>
  );
}

const REPO_URL = (import.meta.env.VITE_REPO_URL as string | undefined) ?? '';

function VersionCard() {
  const [version, setVersion] = useState<{ build: string; builtAt?: string } | null>(null);
  useEffect(() => {
    fetch('./version.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setVersion)
      .catch(() => setVersion(null));
  }, []);
  return (
    <Card>
      <h3 className="mb-2 text-lg font-bold">App 版本</h3>
      <p className="mb-3 text-slate-600">
        {version ? `版本 ${version.build}${version.builtAt ? `（${new Date(version.builtAt).toLocaleDateString()} 构建）` : ''}` : '开发版'}
      </p>
      {REPO_URL && (
        <Btn tone="plain" onClick={() => openExternal(`${REPO_URL}/releases/tag/app-latest`)}>
          检查更新（打开下载页）
        </Btn>
      )}
      <HanziLicence />
    </Card>
  );
}

/** The notice the 写汉字 stroke data (Arphic Public License) asks for, with the licence text. */
function HanziLicence() {
  const [text, setText] = useState<string | null>(null);
  return (
    <div className="mt-4 text-sm text-slate-500">
      写汉字的笔顺数据来自 hanzi-writer-data / Make Me a Hanzi，源自文鼎科技（Arphic）的字体，按 Arphic Public License 分发。
      {text === null ? (
        <button
          type="button"
          className="ml-1 underline"
          onClick={() =>
            void fetch('./hanzi/ARPHICPL.TXT')
              .then((r) => (r.ok ? r.text() : '（这个版本没有带笔顺数据）'))
              .catch(() => '（读取失败）')
              .then(setText)
          }
        >
          查看许可
        </button>
      ) : (
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs">{text}</pre>
      )}
    </div>
  );
}

const TABS = [
  { id: 'report', label: '学习报告' },
  { id: 'writing', label: '作文' },
  { id: 'children', label: '孩子' },
  { id: 'offline', label: '离线课程' },
  { id: 'books', label: '绘本' },
  { id: 'settings', label: '设置' },
] as const;

export function ParentPage({ tab }: { tab?: string }) {
  const [ok, setOk] = useState(false);
  const [current, setCurrent] = useState<string>(tab ?? 'report');
  if (!ok) return <PinGate onOk={() => setOk(true)} />;
  return (
    <Page title="家长模式" back="/">
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Btn key={t.id} tone={t.id === current ? 'primary' : 'plain'} onClick={() => setCurrent(t.id)}>
            {t.label}
          </Btn>
        ))}
      </div>
      {current === 'report' && <ReportView />}
      {current === 'children' && <ChildrenTab />}
      {current === 'offline' && <OfflineTab />}
      {current === 'books' && <ParentBooks />}
      {current === 'writing' && <ParentWritings />}
      {current === 'settings' && <SettingsTab />}
    </Page>
  );
}
