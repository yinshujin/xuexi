import { useState } from 'react';
import { useApp } from '../lib/store';
import { Btn, Card } from '../components/ui';

/** Native shells (APK / desktop) ship the web app locally and need the site address. */
const isNativeShell = !/^https?:$/.test(location.protocol) || location.hostname === 'tauri.localhost';

export function LoginPage() {
  const { login, useLocalOnly } = useApp();
  const [code, setCode] = useState('');
  const [server, setServer] = useState((import.meta.env.VITE_SITE_URL as string | undefined) ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await login(code.trim(), isNativeShell || server ? server : undefined);
    } catch (e) {
      setError((e as Error).message === '网络连接失败' ? '连不上服务器，检查网络或地址' : '家庭口令不对');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="mb-4 text-center text-5xl">🧮</div>
        <h1 className="mb-1 text-center text-2xl font-bold">学数学</h1>
        <p className="mb-6 text-center text-slate-500">北师大版 · 讲解课 + 专项练习</p>
        {isNativeShell && (
          <label className="mb-3 block">
            <span className="mb-1 block text-slate-600">网站地址</span>
            <input
              value={server}
              onChange={(e) => setServer(e.target.value)}
              placeholder="https://xuexi.example.com/"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg"
              inputMode="url"
            />
          </label>
        )}
        <label className="mb-4 block">
          <span className="mb-1 block text-slate-600">家庭口令</span>
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg"
          />
        </label>
        {error && <p className="mb-3 text-rose-600">{error}</p>}
        <Btn className="w-full" disabled={busy || !code} onClick={submit}>
          进入
        </Btn>
        <button type="button" onClick={useLocalOnly} className="mt-4 w-full text-center text-slate-500 underline">
          暂不登录，只在本机使用（记录不会同步）
        </button>
      </Card>
    </div>
  );
}
