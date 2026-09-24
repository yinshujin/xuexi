import { useEffect, useState } from 'react';
import { siteBase } from '../lib/api';
import { openExternal } from '../lib/files';
import { isNativeShell } from '../lib/platform';

interface Version {
  build: string;
}

async function fetchVersion(url: string): Promise<Version | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    return res.ok ? ((await res.json()) as Version) : null;
  } catch {
    return null;
  }
}

/**
 * In the APK / desktop shells the app is bundled, so it can fall behind the
 * website. Compare the bundled version.json with the site's and offer the new
 * APK (the GitHub release "app-latest"; the APK with built-in lessons is too big
 * for the site). The PWA updates itself.
 */
export function UpdateBanner() {
  const [apkUrl, setApkUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!isNativeShell) return;
    (async () => {
      const base = await siteBase();
      if (!/^https?:/.test(base)) return;
      const [mine, live] = await Promise.all([fetchVersion('./version.json'), fetchVersion(new URL('version.json', base).toString())]);
      if (!mine || !live || mine.build === live.build) return;
      const repo = import.meta.env.VITE_REPO_URL as string | undefined;
      if (repo) setApkUrl(`${repo}/releases/download/app-latest/xuexi.apk`);
    })();
  }, []);
  if (!apkUrl) return null;
  return (
    <div className="flex items-center gap-3 bg-amber-100 px-4 py-2 text-amber-900">
      <span className="flex-1">App 有新版本啦。</span>
      <button type="button" onClick={() => openExternal(apkUrl)} className="rounded-full bg-amber-500 px-4 py-1.5 font-bold text-white">
        下载安装
      </button>
      <button type="button" onClick={() => setApkUrl(null)} className="text-amber-700">
        稍后
      </button>
    </div>
  );
}
