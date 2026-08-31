/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/train-quiz/',
  build: {
    target: 'es2020',
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'でんしゃクイズ',
        short_name: 'でんしゃクイズ',
        display: 'standalone',
        orientation: 'landscape',
        lang: 'ja',
        background_color: '#e7f5ff',
        theme_color: '#1c7ed6',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,webp,wav,mp3,json,webmanifest}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  test: {
    environment: 'happy-dom',
    environmentOptions: {
      'happy-dom': {
        localStorage: true,
      },
    },
    setupFiles: ['tests/setup.ts'],
  },
});
