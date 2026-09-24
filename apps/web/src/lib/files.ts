/**
 * Picking and saving files, and opening links, in both runtimes:
 * - native shells (Tauri: APK / desktop) use the dialog / fs / opener plugins;
 * - browsers (PWA) use <input type=file>, a download link and window.open.
 * Plugin modules are loaded lazily so the web bundle does not depend on them.
 */

export const inTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

export interface PickedFile {
  name: string;
  bytes: Uint8Array;
}

function baseName(path: string): string {
  return decodeURIComponent(path.split(/[\\/]/).pop() ?? path);
}

export async function pickFile(opts: { extensions: string[]; label: string }): Promise<PickedFile | null> {
  if (inTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const path = await open({ multiple: false, directory: false, filters: [{ name: opts.label, extensions: opts.extensions }] });
    if (!path || Array.isArray(path)) return null;
    return { name: baseName(path), bytes: await readFile(path) };
  }
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = opts.extensions.map((e) => `.${e}`).join(',');
    input.onchange = async () => {
      const f = input.files?.[0];
      resolve(f ? { name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) } : null);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

/** Returns false when the user cancelled. */
export async function saveFile(name: string, bytes: Uint8Array, mime: string, label: string, ext: string): Promise<boolean> {
  if (inTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const path = await save({ defaultPath: name, filters: [{ name: label, extensions: [ext] }] });
    if (!path) return false;
    await writeFile(path, bytes);
    return true;
  }
  const url = URL.createObjectURL(new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return true;
}

export async function openExternal(url: string): Promise<void> {
  if (inTauri) {
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener');
}
