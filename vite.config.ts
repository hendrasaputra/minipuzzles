import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Cookie-free analytics, added to production builds only so the dev server is never counted.
// Cloudflare Web Analytics counts page views; Umami records play events (src/shared/play-tracking.ts).
// Both ids are public (they ship in every page). Empty means that script is left out.
const CF_BEACON_TOKEN = 'b2a2c2fdddcb4806a4bc69113c87c6b5';
const UMAMI_WEBSITE_ID = '96aba2cf-2728-4919-85ff-db5eaf33ffc0';

export default defineConfig({
  base: './',
  plugins: [{
    name: 'cookie-free-analytics',
    apply: 'build',
    transformIndexHtml: () => [
      ...CF_BEACON_TOKEN ? [{ tag: 'script', injectTo: 'body' as const, attrs: { defer: true, src: 'https://static.cloudflareinsights.com/beacon.min.js', 'data-cf-beacon': JSON.stringify({ token: CF_BEACON_TOKEN }) } }] : [],
      // data-domains keeps local preview runs out of the numbers.
      ...UMAMI_WEBSITE_ID ? [{ tag: 'script', injectTo: 'head' as const, attrs: { defer: true, src: 'https://cloud.umami.is/script.js', 'data-website-id': UMAMI_WEBSITE_ID, 'data-domains': 'puzzles.hensap.id' } }] : [],
    ],
  }],
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
        robotGarden: fileURLToPath(new URL('./games/robot-garden/index.html', import.meta.url)),
        bridgeIslands: fileURLToPath(new URL('./games/bridge-islands/index.html', import.meta.url)),
        flipGarden: fileURLToPath(new URL('./games/flip-garden/index.html', import.meta.url)),
        tinyTangrams: fileURLToPath(new URL('./games/tiny-tangrams/index.html', import.meta.url)),
        colorStacks: fileURLToPath(new URL('./games/color-stacks/index.html', import.meta.url)),
        gardenSudoku: fileURLToPath(new URL('./games/garden-sudoku/index.html', import.meta.url)),
        rollingStone: fileURLToPath(new URL('./games/rolling-stone/index.html', import.meta.url)),
        steppingStones: fileURLToPath(new URL('./games/stepping-stones/index.html', import.meta.url)),
        waterBalance: fileURLToPath(new URL('./games/water-balance/index.html', import.meta.url)),
        perspectivePaths: fileURLToPath(new URL('./games/perspective-paths/index.html', import.meta.url)),
        pocketEscape: fileURLToPath(new URL('./games/pocket-escape/index.html', import.meta.url)),
        gardenKeys: fileURLToPath(new URL('./games/garden-keys/index.html', import.meta.url)),
      },
    },
  },
});
