# Puzzles developer handoff

## Analytics — 23 November 2026

Two cookie-free tools, added to production builds only by a small plugin in `vite.config.ts` (empty id = left out):
- **Cloudflare Web Analytics** (`CF_BEACON_TOKEN`) counts page views. Each game is its own page.
- **Umami Cloud** (`UMAMI_WEBSITE_ID`, limited to `puzzles.hensap.id`) records play events from all 22 games through `src/shared/play-tracking.ts`: `level_start`, `level_finish` and `level_quit`, each with `game` and `level`, plus `seconds`, `restarts`, `undos`, `hints`, `fails` and a few game-specific numbers. Level names are `NN-<level id>` for campaigns and the difficulty or mode for random puzzles. A quit is sent once when the page is hidden mid-level; if the player comes back and solves it, the finish carries `returned: 1`.

Events were checked in the local preview with a stand-in tracker: every game sends its start, and a Garden Keys win sent the right counts.

## Marketing image package — 23 November 2026

`docs/marketing/creatives/v01/README.md` documents the generated campaign package:
27 preserved GPT Image masters with exact prompts/reviews and 36 posting PNGs.
The 22 spotlight images use the social kit's exact goals; the eight-slide carousel
includes all 22 real shelf icons. Six game slides fix the spec's five-slide/20-slot
mismatch. Launch exports are 1640×624 and 1080×1350; Story images are 1080×1920.
The manifest includes alt text, sizes and hashes; the contact sheet was visually
reviewed, with representative spotlights/carousel layouts checked at full size.
All output PNGs decoded successfully and game coverage/dimensions were validated.
`npm run build` passed; Vite reported a large-bundle advisory.
The initial artwork pass changed no game code or saves. A follow-up used local
Playwright/Chromium to capture all 22 real games: 88 PNGs across phone, desktop,
board-only and captioned 4:5 formats. See `captures/manifest.json` and its README for
provenance, exact default unsolved states and contact sheets. All 22 games passed
local navigation/overflow checks at 375px and 1600px, with zero page errors or failed
capture requests. The suite passed 564 tests across 69 files. Physical-phone/live
verification and video clips remain open; no posts or deployment were sent.

All 22 game icons were regenerated with the existing Petals v03 style reference:
Petals selects v04 and the remaining games select v02. Runtime paths stay unchanged.
Garden Keys now matches the painted ceramic family. Original masters are preserved;
each new 1254×1254 master has its exact prompt and review, with 384×384 runtime
exports and hashes in `docs/art/assets.json`. The installable app icon also selects
GPT Image v02 with five size exports; the simple P favicon remains intentional.
See `docs/art/reviews/2026-11-23-icon-refresh/README.md` and its comparison sheet.
The campaign carousel and hub captures use the refreshed icons.
Final validation confirmed all 22 icon/master hashes, 92 real-capture PNGs and all
36 original campaign posting images against their manifests. The refreshed build
also passed; the existing large-bundle advisory remains. The icon refresh is published; the
marketing package in `docs/marketing/` stays local and uncommitted by the owner's choice.


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

Later on 19 November 2026, the game pages moved to one shared base stylesheet, [game-base.css](src/shared/game-base.css). On touch-first screens, list controls hide when the board already does the same action (they stay available to screen readers and reappear on focus). A win now turns the status line into a banner. Shadow Blocks and Tiny Tangrams gained board gestures (hold to remove or lift, tap a placed piece to choose and turn it), so all 11 games with list controls hide them on touch. Every game now has optional zen background music generated live by [ambient.ts](src/shared/ambient.ts), with no audio files. Each game has its own mood and key, and the setting is saved as `puzzles-music`. Help is touch-first: each action has an animated finger drawing, keyboard and mouse controls sit in one "Other controls" line, How to play opens on a player's first visit (`puzzles-guide-<game>`), and level 1 shows a finger on the next thing to tap. Each change passed the tests, the build, and a 375 px touch-emulation check.

On 22 November 2026, game 22, **Garden Keys** (`src/games/garden-keys/`), was added locally and not yet published. It is a tile maze inspired by the mechanics of the 1990 game Chip's Challenge: seeds open a gate, there are colored keys and doors, boots, ice, conveyors, crates, buttons, traps, clone machines, teleports, a thief and seven monster types. The name, art and 12 levels are original. The rules are a deterministic tick engine with an ASCII level format (legend at the top of `engine.ts`). Calm speed moves the world only when you act and is the default on touch screens. Classic runs four ticks a second with a timer. Every level ships with a recorded solution that the tests replay in both speeds. The suite passed 525 tests across 69 files and the build. Level wins, the classic timer and the 375 px touch layout were checked in the local preview. It still needs a hand playthrough on a phone and an icon, both waiting on the owner. See its section in [TODO.md](TODO.md).

On 23 November 2026 Garden Keys grew to 50 levels (13–50 in four acts of rising difficulty, up to 15×13). Every level's recorded solution replays to a win in both speeds; the suite passed 564 tests across 69 files and the build. In the local preview, level 50 was won through the on-screen buttons, its hint answered in 6 ms, and level 47 fits a 375 px screen without sideways scroll. A small engine fix stops the player pushing a cloner's crate off from the side. Not yet done: a hand playthrough of the new levels.

The next open check is a physical phone review. Check that two-finger rotation leaves puzzle pieces alone, the next one-finger action works, and props stay readable at different angles. Listen for the action sounds and check motion on the device before expanding the asset trial.

Pushing to `main` triggers the [Pages workflow](.github/workflows/pages.yml), which runs tests, builds, and deploys. Verify the Pages run and the affected live routes after each release. Earlier decisions and releases are available in Git history, [the deployment notes](docs/DEPLOYMENT.md), and [the original design](INITIAL_IDEAS.md).
