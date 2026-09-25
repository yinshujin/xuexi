import { useEffect, useState } from 'react';
import { loadScoringConfig, parseScoringText, saveScoringConfig, testXfyun, type ScoringConfig } from '../lib/scoring';
import { pickFile } from '../lib/files';
import { Btn, Card } from '../components/ui';

/**
 * 家长设置 → 跟读评分: the parent's 讯飞开放平台 语音评测 credentials. They stay
 * on this device only (not in the app package, not synced, not in backups),
 * so each tablet / phone is set up once.
 */
export function ScoringCard() {
  const [cfg, setCfg] = useState<ScoringConfig | null>(null);
  const [appId, setAppId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [paste, setPaste] = useState('');
  const [status, setStatus] = useState<{ text: string; ok?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadScoringConfig().then((c) => {
      setCfg(c);
      if (c) {
        setAppId(c.xfyun.appId);
        setApiKey(c.xfyun.apiKey);
      }
    });
  }, []);

  const fill = (text: string) => {
    const c = parseScoringText(text);
    if (!c) return setStatus({ text: '没有认出 APPID / APIKey / APISecret，请分别填写' });
    setAppId(c.xfyun.appId);
    setApiKey(c.xfyun.apiKey);
    setApiSecret(c.xfyun.apiSecret);
    setPaste('');
    setStatus({ text: '已识别，点「测试并保存」' });
  };

  const save = async () => {
    const next: ScoringConfig = {
      vendor: 'xfyun',
      xfyun: { appId: appId.trim(), apiKey: apiKey.trim(), apiSecret: apiSecret.trim() || cfg?.xfyun.apiSecret || '' },
    };
    if (!next.xfyun.appId || !next.xfyun.apiKey || !next.xfyun.apiSecret) return setStatus({ text: '三项都要填' });
    setBusy(true);
    setStatus({ text: '正在连接讯飞测试…' });
    try {
      await testXfyun(next.xfyun);
      await saveScoringConfig(next);
      setCfg(next);
      setApiSecret('');
      setStatus({ text: '测试通过，已保存。跟读时会自动评分。', ok: true });
    } catch (e) {
      setStatus({ text: `测试没通过：${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  const input = 'w-full rounded-xl px-3 py-2 ring-1 ring-slate-300 font-mono text-sm';
  return (
    <Card>
      <h3 className="mb-1 text-lg font-bold">跟读评分（讯飞语音评测）</h3>
      <p className="mb-3 text-sm text-slate-500">
        {cfg ? '✅ 已开启：绘本「跟读」时每句自动打分，逐词标出读得好（绿）和没读好（红）的词。' : '未开启：跟读只录音和回放。'}
        密钥只保存在这台设备上，不会上传、不会进备份文件；平板和手机要各设置一次。
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-sm text-slate-600">
          APPID
          <input className={input} value={appId} onChange={(e) => setAppId(e.target.value)} autoComplete="off" />
        </label>
        <label className="text-sm text-slate-600">
          APIKey
          <input className={input} value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" />
        </label>
        <label className="text-sm text-slate-600">
          APISecret
          <input
            className={input}
            type="password"
            value={apiSecret}
            placeholder={cfg ? '已保存（不显示）' : ''}
            onChange={(e) => setApiSecret(e.target.value)}
            autoComplete="off"
          />
        </label>
      </div>
      <textarea
        className="mt-2 w-full rounded-xl px-3 py-2 text-sm ring-1 ring-slate-300"
        rows={2}
        placeholder="也可以把讯飞控制台里的 APPID、APISecret、APIKey 整段粘贴到这里"
        value={paste}
        onChange={(e) => setPaste(e.target.value)}
        onBlur={() => paste.trim() && fill(paste)}
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <Btn disabled={busy} onClick={save}>
          测试并保存
        </Btn>
        <Btn
          tone="plain"
          onClick={async () => {
            const f = await pickFile({ extensions: ['json', 'txt'], label: '评分配置' });
            if (f) fill(new TextDecoder().decode(f.bytes));
          }}
        >
          从文件读取
        </Btn>
        {cfg && (
          <Btn
            tone="plain"
            onClick={async () => {
              if (!confirm('关闭跟读评分并删除这台设备上保存的密钥？')) return;
              await saveScoringConfig(null);
              setCfg(null);
              setAppId('');
              setApiKey('');
              setApiSecret('');
              setStatus({ text: '已关闭并删除' });
            }}
          >
            关闭评分
          </Btn>
        )}
      </div>
      {status && <p className={`mt-2 text-sm ${status.ok ? 'text-emerald-700' : 'text-slate-600'}`}>{status.text}</p>}
    </Card>
  );
}
