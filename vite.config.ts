import { defineConfig } from 'vite';

export default defineConfig({
  base: '/eras/',
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
