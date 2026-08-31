/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/train-quiz/',
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.ts'],
  },
});
