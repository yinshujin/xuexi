import { useState } from 'react';
import { useApp } from '../lib/store';
import { Btn, Card } from '../components/ui';
// Native shells (APK / desktop) ship the web app locally and need the site address.
import { isNativeShell } from '../lib/platform';

function AccountForm({ native }: { native: boolean }) {
  const { login } = useApp();
  const [code, setCode] = useState('');
  const [server, setServer] = useState((import.meta.env.VITE_SITE_URL as string | undefined) ?? '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await login(code.trim(), native || server ? server : undefined);
    } catch (e) {
      setError((e as Error).message === '网络连接失败' ? '连不上服务器，检查网络或地址' : '家庭口令不对');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {native && (
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
      <Btn className="w-full" disabled={busy || !code || (native && !server)} onClick={submit}>
        登录
      </Btn>
    </>
  );
}

export function LoginPage() {
  const { useLocalOnly } = useApp();
  const [showAccount, setShowAccount] = useState(!isNativeShell);

  return (
    <div className="flex min-h-full items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="mb-4 text-center text-5xl">🧮</div>
        <h1 className="mb-1 text-center text-2xl font-bold">学数学</h1>
        <p className="mb-6 text-center text-slate-500">北师大版 · 讲解课 + 专项练习</p>

        {isNativeShell ? (
          <>
            <Btn tone="green" className="mb-2 w-full !py-4 !text-xl" onClick={useLocalOnly}>
              开始使用
            </Btn>
            <p className="mb-6 text-center text-sm text-slate-500">
              不需要网络和服务器：练习、错题本、学习报告都保存在这台设备上；讲解课在家长模式里从课程包文件导入。
            </p>
            {showAccount ? (
              <div className="border-t border-slate-100 pt-4">
                <p className="mb-3 text-sm text-slate-600">已经部署了家庭网站？登录后多台设备自动同步：</p>
                <AccountForm native />
              </div>
            ) : (
              <button type="button" onClick={() => setShowAccount(true)} className="w-full text-center text-slate-500 underline">
                我有家庭网站，登录家庭账号（多设备同步）
              </button>
            )}
          </>
        ) : (
          <>
            <AccountForm native={false} />
            <button type="button" onClick={useLocalOnly} className="mt-4 w-full text-center text-slate-500 underline">
              暂不登录，只在本机使用（记录不会同步）
            </button>
          </>
        )}
      </Card>
    </div>
  );
}
