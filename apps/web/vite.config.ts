import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  base: './',
  plugins: [
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
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/packs\//],
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
