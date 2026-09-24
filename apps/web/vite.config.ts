import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Plugin } from 'vite';

/**
 * Writes dist/version.json with a build id derived from index.html (which
 * references every hashed asset), so the id only changes when the app changes.
 * Native shells compare their bundled version.json with the site's to offer an
 * APK update.
 */
function buildVersion(): Plugin {
  let outDir = 'dist';
  return {
    name: 'xuexi-build-version',
    apply: 'build',
    configResolved(c) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const html = readFileSync(join(outDir, 'index.html'));
      const build = createHash('sha256').update(html).digest('hex').slice(0, 12);
      writeFileSync(join(outDir, 'version.json'), JSON.stringify({ build, builtAt: new Date().toISOString() }));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [
    buildVersion(),
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: '小学数学学习',
        short_name: '学数学',
        description: '北师大版小学数学：讲解课 + 专项练习',
        lang: 'zh-CN',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f0f9ff',
        theme_color: '#0ea5e9',
        start_url: './',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Courses bundled into the native apps are served from the app itself.
        globIgnores: ['builtin/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/packs\//, /^\/builtin\//],
        // Course packs are cached by the app itself (Cache Storage), not by the SW.
        runtimeCaching: [],
      },
    }),
  ],
  resolve: {
    alias: {
      // @openmaic/renderer lazy-loads shiki for code elements; math lessons never
      // use code blocks, so ship a tiny stub instead of the full highlighter.
      shiki: fileURLToPath(new URL('./src/lib/shiki-stub.ts', import.meta.url)),
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
  server: {
    proxy: {
      '/api': process.env.XUEXI_API_PROXY ?? 'http://localhost:8787',
    },
  },
});
