// Minimal stand-in for `shiki` (see vite.config.ts). Code elements fall back to plain text.
export async function codeToHtml(code: string): Promise<string> {
  const esc = code.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);
  return `<pre><code>${esc}</code></pre>`;
}
export async function createHighlighter() {
  return { codeToHtml: (code: string) => `<pre><code>${code}</code></pre>`, loadLanguage: async () => {}, getLoadedLanguages: () => [] };
}
export const bundledLanguages = {};
export default { codeToHtml, createHighlighter, bundledLanguages };
