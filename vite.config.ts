/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/train-quiz/',
  test: { environment: 'happy-dom' },
});
