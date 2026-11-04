import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        hub: fileURLToPath(new URL('./index.html', import.meta.url)),
        petals: fileURLToPath(new URL('./games/petals/index.html', import.meta.url)),
        trafficGarden: fileURLToPath(new URL('./games/traffic-garden/index.html', import.meta.url)),
      },
    },
  },
});
