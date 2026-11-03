# Petal · 3D Minesweeper

[Play at mines.hensap.id](https://mines.hensap.id/) · [GitHub](https://github.com/hendrasaputra/petal-mines) · [Deployment and DNS setup](docs/DEPLOYMENT.md)

A standalone, mobile-first Three.js + TypeScript + Vite game. Original procedural pink voxel geometry and a quiet pastel interface; no account, backend, runtime CDN or downloaded assets.

## Run

Use Node.js 22.12+, 24, or 26+. The same commands work in macOS/Linux Terminal and Windows PowerShell:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Deploy `dist/` to a static host. Serve over HTTP(S), rather than opening the HTML file directly. A phone on the same network can use the dev server's printed Network URL. Local saves belong to that browser and URL origin; changing port or device starts a separate save.

## Playable through Step 3

- **Classic:** eight same-floor neighbors.
- **Layered:** two or three independent floors. Clear every safe tile on every floor; one mine ends the attempt.
- **Connected:** local numbers plus ↑ / ↓ clues. Each arrow counts the clipped 3×3 footprint on the immediately adjacent floor, including the aligned tile and excluding its own floor. Top/bottom boundaries never generate an arrow pointing outside the stack.
- The clue neighborhood is shared by counting, zero flood and chording. Wrong flags can make a chord expose a mine. Flagging all mines alone does not win.
- **Volume remains a future chapter.** Adaptive pixelation, expanded campaign content and final release polish are later milestones.

## Campaign and fairness

Seven curated levels introduce local rules, independent floors, upward clues, downward clues and mixed cross-floor deductions. Complete each level to unlock the next. Chapters can be revisited once unlocked. A level's safe openings are already revealed; its seed, coordinates and generator version reproduce its exact layout on Retry.

Every shipped level is solved in tests using visible clues, flags and the displayed mine count per floor. The solver uses basic constraints and overlapping subsets; ambiguity stops the solver rather than causing a guess. Connected tests require deductions involving the direction being taught, including both directions in the mixed lesson. “One logical hint” applies one deduction and identifies its source clue when available; floor-total deductions need no source tile.

Free play has new random seeds, fixed safe openings, 1–3 floors for Classic/Layered, and three floors for Connected. Random free play may require guesses and is labeled accordingly. Retry preserves the layout; New puzzle changes the seed. Pre-v2 saves migrate, and legacy arbitrary-first-click boards recover their original layout for Retry where reproducible.

## Controls

Tap to reveal, hold or right-click to flag. Explicit Reveal / Flag / Inspect modes avoid relying on long press. Tap a revealed clue to inspect it, then choose **Open unflagged neighbors** to chord. **View target floor** selects a vertical clue's destination; outlines and HTML labels identify its exact target cells.

Drag to rotate, pinch/scroll to zoom, or reset the camera. Focus isolates a floor. Exploded shows the stack with inactive floors dimmed; only the selected floor accepts tile input.

Expand **Keyboard & accessible board** for semantic grid controls: arrows move; Enter/Space uses the selected action; F flags; I inspects; C chords. E changes view; 1–3 selects floors. Instructions pause active-play timing, as does a hidden tab. No animation requires motion tolerance.

## Persistence

The v2 local save includes the puzzle, elapsed time, selected floor/view/action, campaign level and completed IDs. It migrates v1 saves, rejects unsupported versions and inconsistent boards, and normalizes metadata. Storage failure leaves the game playable and displays a notice. Retry resets the current attempt while retaining campaign progress. The UI verifies a saved campaign configuration against the shipped level before awarding completion.

## Code and verification

- `src/engine.ts`: pure rules, topology, seeded generation, exact retry and board validation.
- `src/solver.ts`: visible-information deductions on a copy of the game.
- `src/campaign.ts`: fixed, versioned no-guess levels and lessons.
- `src/storage.ts`: versioned save envelopes and migration.
- `src/gestures.ts`: testable pointer state, separated from WebGL.
- `src/scene.ts`: geometry, labels, inspection highlights, camera and active-floor picking.
- `src/main.ts`: UI, progression, hints and browser storage.

Run `npm test` and `npm run build`. See [VALIDATION.md](VALIDATION.md) for test coverage, browser checks and limits. The build has a non-blocking chunk-size warning for Three.js (approximately 134 kB gzip).

[INITIAL_IDEAS.md](INITIAL_IDEAS.md) preserves the original design document verbatim. The current scope ends at Connected. Inspired by the procedural isometric dioramas of [Pixel Plays](https://github.com/amirmushichge/pixel-plays); no source code, music or visual assets were copied.

## GitHub Pages

Pushes to `main` run tests, build the game on Node.js 24, and deploy `dist/` through `.github/workflows/pages.yml`. Pull requests run the same checks without deploying. Vite uses relative asset URLs so both the project URL and a custom domain work without changing the build.

For a custom subdomain under `hensap.id`, first set the chosen hostname in repository **Settings → Pages → Custom domain**. Then create a DNS `CNAME` record for that subdomain pointing to `hendrasaputra.github.io` (no repository path). Once DNS validation and certificate provisioning finish, enable **Enforce HTTPS** in Pages settings. GitHub Actions deployments do not require a repository `CNAME` file.
