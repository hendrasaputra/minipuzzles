# Developer handoff

Updated: 4 November 2026.

## Current state

The repository is now **minipuzzles**, hosting the **Puzzles** collection. Live: **Petals** (Minesweeper), **Traffic Garden** (sliding cars) and **Crate Garden** (Sokoban), all with 3D rotation. **Crystal Light** (mirror beams) is implemented locally; the local shelf has four playable links and 17 planned ideas. Native Vite multi-page entries isolate the hub and game without a client router.

The selection page now uses 21 generated skeuomorphic icons. Petals v03 is the family reference; other subjects use v01. All raw masters, exact requests, reference paths and reviews are in `docs/art/iterations/`; editable prompts and the **Iconfactory-inspired** style contract remain in `docs/art/`. Runtime files are 384px PNGs under `public/icons/`. Their rounded mask/backing bleed is required because the masters are opaque app-icon squares, not transparent cutouts.

The owner explicitly approved publication of the icon batch and Traffic Garden on 4 November 2026. The earlier automatic approval block is resolved by that approval; Pages run 41743698825 succeeded for d584e90. Live browser checks confirmed 21 loaded icons and an interactive Traffic Garden.

## Where to work

- `src/hub/`, `index.html`: lightweight HTML/CSS shelf; no Three.js import.
- `src/catalog.ts`: IDs, labels, status, optional asset URLs and playable routes.
- `src/games/petals/`, `games/petals/index.html`: complete game, rules, UI and tests.
- `src/shared/`: audio, camera math and pointer gestures; runtime helpers remain game-independent.
- `vite.config.ts`: explicit HTML inputs. A new playable game needs an input and catalog link.
- `AGENTS.md`: contributor rules; `TODO.md`: actual progress and pending work.

Petals keeps seeded random presets, connected floors, fixed learning lessons, hold/right-click flags, double-tap chording, zoom/pan, 2D keyboard play, audio/mute and local saves. Legacy keys (`petal-save-v2`, `petal-save-v1`, `mines-sound`), campaign seeds, IDs and generator versions are preserved. Save imports validate before replacing state.

## Renderer decision

[Rendering notes](docs/RENDERING.md) assess Pixel Plays' CPU rasterizer. Petals retains Three.js because it already supports large boards and interactive floor/camera picking. Traffic Garden and Crate Garden now use actual Three.js geometry with a shared rotatable miniature camera; the hub remains renderer-neutral. Do not add an abstract renderer framework prematurely.

## Verification and hosting

Local result: **222 tests pass**, and the production build creates all five HTML pages with valid relative assets. Browser checks cover hub → Petals → hub, direct refresh, preserved seed/floor/Flag/mute, valid import, malformed-file rejection without mutation, and export roundtrip. See `VALIDATION.md` for evidence.

Repository: https://github.com/hendrasaputra/minipuzzles. The live collection is https://puzzles.hensap.id/ and Petals is https://puzzles.hensap.id/games/petals/. DNS and certificate checks pass, HTTPS enforcement is enabled, and both pages/assets match the tested build. The previous Pages custom-domain binding was replaced; no old-host alias is configured.

Browser saves cannot follow a hostname change automatically. Use Petals' **Menu → Export save** on the old origin, then **Import save** on the new one. The progress export does not include sound preference. Old-origin data is not deleted by this restructure, but cannot be accessed by the new origin. Deployment/migration details: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Next work

1. Review the generated icon family with the owner; use versioned GPT edits for requested changes.
2. Preserve raw outputs/exact prompts and update `docs/art/assets.json` when selecting a new version. Reference Petals v03 unless intentionally versioning the family's style.
3. Keep icon status independent from game status: 17 entries still have no playable implementation.
4. Owner-approved icons and Traffic Garden are deployed and verified. Crate Garden and 3D rotation are live at 3e2eef4. Crystal Light is local and ready for review before a future release.
5. Hardware-test Traffic Garden on iOS/Android; extend its verified layout families if more variety is needed.

Volume mode remains future work. Original design history stays in `INITIAL_IDEAS.md`; it is not the current release checklist.

## Traffic Garden implementation

`src/games/traffic-garden/` contains pure rules, bounded BFS solver, seeded generation, validated history-replay storage, rotatable Three.js scene and standalone UI. Rules and rendering have no circular dependency. A continuous slide counts once, including the coral car leaving through the right gate. The solver supplies par and one-move hints. Three difficulties draw from 13 validated layout families with legal seeded scrambles; this finite source is an explicit variety limit. Saved state uses `puzzles-traffic-garden-v1`, separately from Petals. Shared mute still uses `mines-sound`.

The browser checked Easy/Hard completion, saved win/reload/undo, Medium generation, direct drag, keyboard selection/movement, responsive layouts and page navigation. See `docs/TRAFFIC_GARDEN.md` and `VALIDATION.md`. Traffic Garden and the icon batch are live at puzzles.hensap.id (d584e90).

## Crate Garden implementation

`src/games/crate-garden/` owns pure push-only Sokoban rules, a bounded shortest-step BFS solver and eight stable curated levels (`garden-1` through `garden-8`), independent of its Three.js scene. Steps count all walks/pushes; pushes are counted separately. The verified minimum step lengths are 2, 8, 9, 12, 16, 20, 25 and 29. Hints play one step; no auto-deadlock detector or random generator is included. Undo recovers from deadlocks and from wins. Completion marks persist even when retrying an already solved garden.

The separate key `puzzles-crate-garden-v1` stores current level, bounded legal direction history and completed IDs. Reads replay the current level from its stable definition; do not change existing level layouts without save migration/versioning. No file transfer UI yet. Shared sound uses the existing preference. Added tests cover rules/solver, all level solutions, touch projection/cancellation, and saves. Browser checks completed all eight gardens, win reload/undo, buttons, keyboard and swipe, progress restore, phone/landscape fit and navigation. Physical devices remain untested. Crate Garden was published in 3e2eef4; the current uncommitted development work is Crystal Light.

## Collection-wide 3D rotation

The owner requires rotatable 3D for every game. Both newer games now use real Three.js cuboids with shadows, depth-correct raycasts and the shared `mini-scene.ts` camera. Petals retains its existing rotate/zoom/pan controls; `fitCamera` accepts an optional tilt while preserving Petals' default. The hub still imports no renderer. Camera orientation is transient, and all game save keys/levels/seeds remain compatible.

The miniature camera has Play/Rotate buttons and reset (44px targets). Rotate consumes drags, supports tilt and pinch/wheel zoom, and cancels game input. Play uses camera-projected axes for car slides and gardener swipes. Direction glyphs refresh after camera changes. Keyboard camera control works when the Rotate board is focused; game keyboard handlers suppress movement in Rotate. Tests cover full-orbit/tilt fitting, projection/picking, gesture consumption/cancellation and game actions after camera rotation. All 183 tests and the production build pass; browser checks cover both games and existing Petals progress. These rotation changes are deployed in 3e2eef4. Physical mobile input/performance remain pending.

## Latest release and Crystal Light handoff

Owner-authorized publication completed: **3e2eef4**, Pages run **41749026138** succeeded. Live browser checks verified three shelf play links, rotatable Crate Garden/Traffic Garden, Petals loading with preserved progress and no console warnings/errors. `docs/rotation-live.jpg` records the live result.

Crystal Light is the next local game, under `src/games/crystal-light/` and `/games/crystal-light/`. Pure tracing handles fixed slash/backslash mirrors, transparent target crystals, stone blockers and bounded loops. The BFS solver visits binary mirror orientation states and minimizes turns; eight stable levels (`crystal-1`…`crystal-8`) require 1,2,2,3,3,4,5,5 flips. Save key `puzzles-crystal-light-v1` validates and replays mirror-ID history, retains selection/completion IDs and leaves other games untouched. Do not change published level layouts without migration/versioning.

The scene uses `MiniScene.mesh` for owned disposable faceted/diagonal geometry. Decorative beams cannot block raycasts; actual crystal/mirror objects do. A clean tap selects and turns one mirror, while drag, cancellation, second touch and Rotate mode suppress turns. Native selector/Turn and board Enter/Space provide keyboard play. Shared mute/camera remain unchanged. All eight levels complete in-browser and preserve completion marks after reload. Crystal Light and its small shared mesh extension are local and uncommitted; they are not in the live release. See `docs/CRYSTAL_LIGHT.md` and the latest VALIDATION section.

## Crystal Light laser animation

`src/games/crystal-light/laser.ts` adds warm beam halos, traveling pulses and amber particles. Pure `beamPoint` samples distance along the traced route, turning at mirror corners and wrapping at the source. Meshes/materials are rebuilt only on scene changes and disposed through MiniScene; frame updates move existing particles and adjust halo opacity. CrystalScene owns one throttled requestAnimationFrame loop (up to30fps), pauses for document visibility/pagehide, resumes onpageshow, and honors live reduced-motion changes. `MiniScene.repaint()` redraws without camera fitting or shadow regeneration. Other games retain event-driven rendering.

222 tests pass and production build passes. New checks cover route interpolation/wrapping/blockers, state-independent frame updates, one-loop redraws, hide/resume and reduced-motion lifecycle. Browser screenshots taken without interaction differ only in the beam region while progress remains at 4 turns / 6 of6 crystals; rotation and undo/hint remain compatible. This effect is local and not deployed; physical-phone GPU/battery cost remains unmeasured.
