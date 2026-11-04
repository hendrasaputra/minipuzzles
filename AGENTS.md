<!-- AUTONOMY DIRECTIVE — DO NOT REMOVE -->
YOU ARE AN AUTONOMOUS CODING AGENT. EXECUTE TASKS TO COMPLETION WITHOUT ASKING FOR PERMISSION.
DO NOT STOP TO ASK "SHOULD I PROCEED?" — PROCEED. DO NOT WAIT FOR CONFIRMATION ON OBVIOUS NEXT STEPS.
IF BLOCKED, TRY AN ALTERNATIVE APPROACH. ONLY ASK WHEN TRULY AMBIGUOUS OR DESTRUCTIVE.
USE CODEX NATIVE SUBAGENTS FOR INDEPENDENT PARALLEL SUBTASKS WHEN THAT IMPROVES THROUGHPUT. THIS IS COMPLEMENTARY TO OMX TEAM MODE.
<!-- END AUTONOMY DIRECTIVE -->

# Repository guidelines

## Product and layout

Puzzles is a collection of small browser puzzle games. Petals, Traffic Garden, Crate Garden, Crystal Light, Water Garden, Frosty Paths, Marble Workshop, Shadow Blocks and Picture Islands are implemented; planned catalog entries must remain clearly unavailable until implemented. Use TypeScript and Vite without adding a framework. The hub stays renderer-neutral; all playable games use Three.js for rotatable 3D boards. Future games must also support 3D rotation. See `docs/RENDERING.md` before considering a new renderer.

- `src/catalog.ts` owns stable IDs, titles, status and hub links.
- `src/hub/` owns the selection page; avoid loading Three.js there unnecessarily.
- `src/games/petals/` owns Minesweeper rules, scene, entry point and game-specific tests.
- `src/games/traffic-garden/` owns sliding-car rules, solver, seeded puzzles, Three.js scene, UI and validated saves.
- `src/games/crate-garden/` owns Sokoban rules, eight stable levels, solver, Three.js scene and replay saves.
- `src/games/crystal-light/` owns pure beam tracing/mirror rules, eight stable levels, bounded solver, 3D scene and replay saves.
- `src/games/water-garden/` owns pure channel connectivity, eight stable levels, bounded solver, 3D scene and replay saves.
- `src/games/frosty-paths/` owns pure sliding/fish rules, eight stable paths, bounded solver, 3D scene/ice effects and replay saves.
- `src/games/marble-workshop/` owns track layouts, rolling rules, the 3D workshop, and replay saves.
- `src/games/shadow-blocks/` owns stack rules, shadow targets, and the 3D stack board.
- `src/games/picture-islands/` owns picture clues, uniqueness checks, and the 3D and flat boards.
- `src/shared/` contains reusable audio, camera and input helpers. `mini-scene.ts` supplies the shared miniature view for Traffic/Crate Garden, Crystal Light and Water Garden: Play/Rotate, orbit/tilt, zoom, reset and 3D picking. Keep camera gestures separate from puzzle actions and direction cues aligned with the camera. Water, lasers, fire, ice and similar active materials should have fitting motion/particle effects. Reuse `MaterialMotion` for a single capped loop, hidden-tab pausing and reduced-motion support; decorative effects must not block picking or change puzzle rules.
- `games/petals/index.html` is the standalone game page. Native page navigation provides clean game teardown.
- `docs/art/` holds the shared icon direction and editable GPT prompts.

## Player-facing text and help

Use plain words, short labels, and a clear goal on the board. Put the playable games first. Show each main action with a small animated example in the help menu. Keep a short text caption for screen readers and show a still example when reduced motion is enabled.

## Run and verify

Use a supported Node.js version from README. These commands work in macOS/Linux Terminal and Windows PowerShell:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Keep puzzle rules independent of DOM, rendering, audio and storage. Add a small meaningful test for changed logic, then run the relevant tests and production build. Check hub/game navigation and responsive touch targets when changing UI. Do not invent playable pages, generated assets or successful verification results.

## Preserve compatibility

Retain existing save keys, campaign IDs, seeds and generator versions unless implementing an explicit tested migration. A cosmetic rename must not change puzzle layouts. Save imports must validate before replacing progress. Browser saves belong to an origin: a domain change requires export/import, not an assumed automatic transfer.

## Scope and handoff

Use existing helpers and native platform features first. Keep changes focused; avoid speculative abstractions and dependencies. Preserve `INITIAL_IDEAS.md` as the historical source. Update TODO and HANDOFF with actual completed checks, current blockers and next work. Save exact icon prompts and versioned review notes; generate no artwork during a restructure-only task. Coordinate file ownership before parallel edits. Keep primary controls touch friendly and maintain keyboard/screen-reader paths.
