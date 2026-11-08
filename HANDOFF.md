# Puzzles developer handoff

Updated 8 November 2026. Puzzles is a collection of 21 playable browser games in the [minipuzzles repository](https://github.com/hendrasaputra/minipuzzles). The most recent verified release is `33e06ec` on `main`. [Live collection](https://puzzles.hensap.id/) · [GitHub Pages run](https://github.com/hendrasaputra/minipuzzles/actions/runs/42476252596)

## Start from a fresh checkout

Use Node.js 22.12+, 24, or 26+. GitHub Pages uses Node.js 24. These commands work in macOS/Linux Terminal and Windows PowerShell.

```sh
git clone https://github.com/hendrasaputra/minipuzzles.git
cd minipuzzles
npm ci
npm run dev
```

Open the URL Vite prints. Run `npm test` and `npm run build` before shipping. Use `npm run preview` to check the production build in `dist/`. For a phone on the same Wi-Fi, use the Network URL that Vite prints.

## Code map

| Area | Start here |
| --- | --- |
| Game shelf and routing | [Catalog](src/catalog.ts), [hub](src/hub/), and [Vite entries](vite.config.ts). Each game has its own `games/<id>/index.html`. The hub stays free of Three.js. |
| Game rules and saves | `src/games/<id>/` contains each game's rules, levels, scene, UI, and tests. Keep the rules independent of the browser, rendering, and audio. |
| Camera, motion, and sound | [MiniScene](src/shared/mini-scene.ts), [gestures](src/shared/gestures.ts), [MaterialMotion](src/shared/material-motion.ts), and [audio](src/shared/audio.ts). Petals has its own board scene. |
| Visual references | [Rendering decisions](docs/RENDERING.md), [icon workflow](docs/art/README.md), and [Petals v03](docs/art/iterations/petals/v03.png), the icon family reference. |
| Work tracking | [Agent instructions](AGENTS.md), [backlog](TODO.md), [playthrough guide](docs/LOCAL_REVIEW.md), and [validation history](VALIDATION.md). |

## Product decisions to carry forward

- Touch players drag with two fingers to rotate or tilt and pinch to zoom. One-finger puzzle gestures remain available. Touch-first screens show a short hint instead of Play and Rotate. Desktop games that use those buttons still show them.
- Keep the boards' smooth materials, clear clues, and soft shadows. The earlier collection-wide texture pass was rolled back. Preserve the quicker action animations, particles that show contact or completion, and each game's sound palette. Use the shared motion loop and respect reduced motion.
- Petals ships Classic, Layered, Connected, and Volume. Preserve campaign IDs, seeds, generator versions, and save keys. Saves belong to the browser origin. Petals supports export/import for moving progress, and the shared mute setting uses `mines-sound`. [Petals gameplay](docs/GAMEPLAY.md) · [Deployment and save migration](docs/DEPLOYMENT.md)

## Latest release and open checks

| Game | Shipped Polyfork detail |
| --- | --- |
| [Pocket Railroads](docs/POCKET_RAILROADS.md) | The ground disc turns with the switch, and a gold arrow points to the selected branch. |
| [Crate Garden](docs/CRATE_GARDEN.md) | A burlap grain sack sits outside the playable grid. |
| [Crystal Light](docs/CRYSTAL_LIGHT.md) | Recolored optical mounts sit beside the emitter and leave the beam path visible. |
| [Bridge Islands](docs/BRIDGE_ISLANDS.md) | Timber landings appear when a bridge reaches shore and widen for double bridges. |

The four GLBs ship locally under CC BY 4.0. Each game credits the source and describes its edits in the menu and game docs. Keep decorative geometry out of picking and clear of puzzle labels.

The handoff checkout passed **474 tests across 63 files** and the production build. Prior release checks at 390 px in touch emulation confirmed the four models loaded. Pocket Railroads passed switch flip, undo, and delivery. The other three games completed their first levels. The live pages and their four GLB files were verified after deployment.

The next open check is a physical phone review. Check that two-finger rotation leaves puzzle pieces alone, the next one-finger action works, and props stay readable at different angles. Listen for the action sounds and check motion on the device before expanding the asset trial.

Pushing to `main` triggers the [Pages workflow](.github/workflows/pages.yml), which runs tests, builds, and deploys. Verify the Pages run and the affected live routes after each release. Earlier decisions and releases are available in Git history, [the deployment notes](docs/DEPLOYMENT.md), and [the original design](INITIAL_IDEAS.md).
