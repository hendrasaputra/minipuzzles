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
        crateGarden: fileURLToPath(new URL('./games/crate-garden/index.html', import.meta.url)),
        crystalLight: fileURLToPath(new URL('./games/crystal-light/index.html', import.meta.url)),
        waterGarden: fileURLToPath(new URL('./games/water-garden/index.html', import.meta.url)),
        frostyPaths: fileURLToPath(new URL('./games/frosty-paths/index.html', import.meta.url)),
        marbleWorkshop: fileURLToPath(new URL('./games/marble-workshop/index.html', import.meta.url)),
        shadowBlocks: fileURLToPath(new URL('./games/shadow-blocks/index.html', import.meta.url)),
        pictureIslands: fileURLToPath(new URL('./games/picture-islands/index.html', import.meta.url)),
        pocketRailroads: fileURLToPath(new URL('./games/pocket-railroads/index.html', import.meta.url)),
      },
    },
  },
});
