# Developer handoff

Updated: 4 November 2026.

## Current state

The repository is now **minipuzzles**, hosting the **Puzzles** collection. Live: **Petals**, **Traffic Garden**, **Crate Garden**, **Crystal Light**, **Water Garden** and **Frosty Paths**, all with 3D rotation. Water Garden includes flowing water particles; Crystal Light includes animated lasers. The live shelf has six playable games and 15 planned entries. Native Vite multi-page entries isolate the hub and game without a client router.

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

Local result: **301 tests pass**, and the production build creates all seven HTML pages with valid relative assets. Browser checks cover hub → Petals → hub, direct refresh, preserved seed/floor/Flag/mute, valid import, malformed-file rejection without mutation, and export roundtrip. See `VALIDATION.md` for evidence.

Repository: https://github.com/hendrasaputra/minipuzzles. The live collection is https://puzzles.hensap.id/ and Petals is https://puzzles.hensap.id/games/petals/. DNS and certificate checks pass, HTTPS enforcement is enabled, and both pages/assets match the tested build. The previous Pages custom-domain binding was replaced; no old-host alias is configured.

Browser saves cannot follow a hostname change automatically. Use Petals' **Menu → Export save** on the old origin, then **Import save** on the new one. The progress export does not include sound preference. Old-origin data is not deleted by this restructure, but cannot be accessed by the new origin. Deployment/migration details: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Next work

1. Review the generated icon family with the owner; use versioned GPT edits for requested changes.
2. Preserve raw outputs/exact prompts and update `docs/art/assets.json` when selecting a new version. Reference Petals v03 unless intentionally versioning the family's style.
3. Keep icon status independent from game status: 15 entries still have no playable implementation.
4. Owner-approved icons and Traffic Garden are deployed and verified. Crate Garden and 3D rotation are live at 3e2eef4. Crystal Light is published in 8bfeee8. Water Garden and shared material motion are live in 569cf93. Frosty Paths is live in 5420daf.
5. Hardware-test Traffic Garden on iOS/Android; extend its verified layout families if more variety is needed.

Original design history stays in `INITIAL_IDEAS.md`.

## Traffic Garden implementation

`src/games/traffic-garden/` contains pure rules, bounded BFS solver, seeded generation, validated history-replay storage, rotatable Three.js scene and standalone UI. Rules and rendering have no circular dependency. A continuous slide counts once, including the coral car leaving through the right gate. The solver supplies par and one-move hints. Three difficulties draw from 13 validated layout families with legal seeded scrambles; this finite source is an explicit variety limit. Saved state uses `puzzles-traffic-garden-v1`, separately from Petals. Shared mute still uses `mines-sound`.

The browser checked Easy/Hard completion, saved win/reload/undo, Medium generation, direct drag, keyboard selection/movement, responsive layouts and page navigation. See `docs/TRAFFIC_GARDEN.md` and `VALIDATION.md`. Traffic Garden and the icon batch are live at puzzles.hensap.id (d584e90).

## Crate Garden implementation

`src/games/crate-garden/` owns pure push-only Sokoban rules, a bounded shortest-step BFS solver and eight stable curated levels (`garden-1` through `garden-8`), independent of its Three.js scene. Steps count all walks/pushes; pushes are counted separately. The verified minimum step lengths are 2, 8, 9, 12, 16, 20, 25 and 29. Hints play one step; no auto-deadlock detector or random generator is included. Undo recovers from deadlocks and from wins. Completion marks persist even when retrying an already solved garden.

The separate key `puzzles-crate-garden-v1` stores current level, bounded legal direction history and completed IDs. Reads replay the current level from its stable definition; do not change existing level layouts without save migration/versioning. No file transfer UI yet. Shared sound uses the existing preference. Added tests cover rules/solver, all level solutions, touch projection/cancellation, and saves. Browser checks completed all eight gardens, win reload/undo, buttons, keyboard and swipe, progress restore, phone/landscape fit and navigation. Physical devices remain untested. Crate Garden was published in 3e2eef4; Crystal Light was subsequently published in 8bfeee8.

## Collection-wide 3D rotation

The owner requires rotatable 3D for every game. Both newer games now use real Three.js cuboids with shadows, depth-correct raycasts and the shared `mini-scene.ts` camera. Petals retains its existing rotate/zoom/pan controls; `fitCamera` accepts an optional tilt while preserving Petals' default. The hub still imports no renderer. Camera orientation is transient, and all game save keys/levels/seeds remain compatible.

The miniature camera has Play/Rotate buttons and reset (44px targets). Rotate consumes drags, supports tilt and pinch/wheel zoom, and cancels game input. Play uses camera-projected axes for car slides and gardener swipes. Direction glyphs refresh after camera changes. Keyboard camera control works when the Rotate board is focused; game keyboard handlers suppress movement in Rotate. Tests cover full-orbit/tilt fitting, projection/picking, gesture consumption/cancellation and game actions after camera rotation. All 183 tests and the production build pass; browser checks cover both games and existing Petals progress. These rotation changes are deployed in 3e2eef4. Physical mobile input/performance remain pending.

## Latest release and Crystal Light handoff

Owner-authorized publication completed: **3e2eef4**, Pages run **41749026138** succeeded. Live browser checks verified three shelf play links, rotatable Crate Garden/Traffic Garden, Petals loading with preserved progress and no console warnings/errors. `docs/rotation-live.jpg` records the live result.

Crystal Light is implemented under `src/games/crystal-light/` and `/games/crystal-light/`. Pure tracing handles fixed slash/backslash mirrors, transparent target crystals, stone blockers and bounded loops. The BFS solver visits binary mirror orientation states and minimizes turns; eight stable levels (`crystal-1`…`crystal-8`) require 1,2,2,3,3,4,5,5 flips. Save key `puzzles-crystal-light-v1` validates and replays mirror-ID history, retains selection/completion IDs and leaves other games untouched. Do not change published level layouts without migration/versioning.

The scene uses `MiniScene.mesh` for owned disposable faceted/diagonal geometry. Decorative beams cannot block raycasts; actual crystal/mirror objects do. A clean tap selects and turns one mirror, while drag, cancellation, second touch and Rotate mode suppress turns. Native selector/Turn and board Enter/Space provide keyboard play. Shared mute/camera remain unchanged. All eight levels complete in-browser and preserve completion marks after reload. Crystal Light and its shared mesh extension are now live in 8bfeee8. See `docs/CRYSTAL_LIGHT.md` and the latest VALIDATION section.

## Crystal Light laser animation

`src/games/crystal-light/laser.ts` adds warm beam halos, traveling pulses and amber particles. Pure `beamPoint` samples distance along the traced route, turning at mirror corners and wrapping at the source. Meshes/materials are rebuilt only on scene changes and disposed through MiniScene; frame updates move existing particles and adjust halo opacity. CrystalScene owns one throttled requestAnimationFrame loop (up to30fps), pauses for document visibility/pagehide, resumes onpageshow, and honors live reduced-motion changes. `MiniScene.repaint()` redraws without camera fitting or shadow regeneration. Other games retain event-driven rendering.

222 tests pass and production build passes. New checks cover route interpolation/wrapping/blockers, state-independent frame updates, one-loop redraws, hide/resume and reduced-motion lifecycle. Browser screenshots taken without interaction differ only in the beam region while progress remains at 4 turns / 6 of6 crystals; rotation and undo/hint remain compatible. This effect is deployed in 8bfeee8; physical-phone GPU/battery cost remains unmeasured.

## Crystal Light release and Water Garden handoff

Owner explicitly approved **“Yes, publish Crystal Light”** after automatic review initially found the shorter message ambiguous. That approval resolved the block. Commit **8bfeee8** and Pages run **41753843808** succeeded. Live browser checks confirmed first-light completion, animated beams, four shelf play links and no console warnings/errors; `docs/crystal-light-live.jpg` records the result. Do not ask for the same Crystal Light publication approval again.

Water Garden lives in `src/games/water-garden/` and `/games/water-garden/`. Pure rules use clockwise channel turns, reciprocal openings, a fixed spring and terminal flowers. Open ends stop water without a penalty. The solver uses bounded BFS (50,000 states) and merges equivalent straight-channel orientations; eight stable `water-1`…`water-8` levels require 1,2,3,3,4,5,6,7 turns. Maximum eight channels keeps current hints small; increasing complexity requires profiling before expanding search limits.

Save key `puzzles-water-garden-v1` validates/replays pipe-ID history, selection and completed IDs. Keep stable level definitions compatible. The original Three.js scene uses recessed sandy/blue channels, stone spring, terracotta pots and brighter watered blossoms. Taps select/turn once; drags, camera mode and interrupted/multiple touches cannot turn channels. Native selection exposes each channel’s opening directions, with Turn and Enter/Space keyboard alternatives. Shared camera/mute remain unchanged.

261 tests and production build pass. All eight gardens complete through visible browser controls, including branching targets; completion/save/undo/reload and responsive layouts are verified. Water Garden was subsequently published in 569cf93. No new dependency, random generator or file-transfer UI was added; material animation was added in the following release. Physical-phone input/GPU performance remain unchecked. Suggested next game: Frosty Paths.

## Water material release

The owner explicitly requested water particles/animation, publication, then the next game. WaterEffect now adds connected-route foam, surface shimmer and a bubbling/rippling spring. Crystal Light and Water Garden share `MaterialMotion` for a capped 30fps loop with hidden-tab/page lifecycle/reduced-motion handling. Other existing scenes contain no fluid/fire/laser surfaces needing extra continuous effects. Future active materials must have appropriate effects under AGENTS.md.

269 tests and the production build pass. Water-only effects are decorative and non-pickable. Two unchanged-game browser frames differ by348 pixels above threshold15 within the wet-route/spring bounds; undo/hint immediately rebuild the effect route. That publication completed in 569cf93 as recorded below.

## Verified animated Water Garden release

Commit **569cf93** deployed successfully through Pages run **41755490204**. Live browser checks verified five playable shelf links, Water Garden first-turn completion, moving spring/water effects, and no console warnings/errors. `docs/water-garden-live.jpg` records the result. The shared material controller and Crystal Light refactor are included. The owner explicitly authorized this publication; no further approval is needed for that completed release.

## Frosty Paths implementation

`src/games/frosty-paths/` contains pure slide-to-edge/rock rules, passing fish collection, home-stop win and a bounded BFS solver over penguin position + fish mask. Eight stable `frost-1`…`frost-8` paths require 2,3,4,5,6,7,9,11 slides and use 1–3 fish. Passing home never stops or wins; edges are safe. Undo restores collected fish and position. The separate `puzzles-frosty-paths-v1` key validates/replays direction history plus completed IDs. Keep fixed layouts compatible with saves.

FrostScene uses MiniScene + MaterialMotion. Penguin mesh parts interpolate a straight visual slide over 0.25s while rules/save state advance immediately; reduced motion snaps to the target. IceEffect has at most20 glints +18 drifting snow particles. Effects remain non-pickable, capped and independent of rules. Inputs use camera-projected swipes, neighboring tile taps, large direction buttons and keyboard; glyphs follow the camera. Existing material effects remain unchanged.

301 tests and the production build pass. Browser checks completed all eight paths, restored win/undo/fish, verified rotated swipe and camera isolation, completion persistence, responsive fit and navigation. Frosty Paths is live in the six-game 5420daf release. No new dependency or save transfer UI was added. Physical-device input/GPU/battery checks remain pending. Suggested next game: Marble Workshop.

## Frosty Paths publication

The owner explicitly requested publishing Frosty Paths with its 3D rotation and appropriate animation/particle effects. The existing verified implementation retains smooth 0.25s slides, ice glints, drifting snow, camera orbit/tilt/zoom/reset, hidden-tab pausing and reduced-motion handling. All 301 tests and the production build passed again before publication. Pages completed successfully; live verification is recorded below.

## Verified Frosty Paths release

**4 November 2026:** source commit **5420daf** and Pages run **41758892888** succeeded. All 301 tests and the production build pass locally and in CI. Live browser checks confirmed the six-game shelf, full 3D orbit without changing progress, east/north slides collecting a fish and completing First glide in 2 slides, saved win after reload, native shelf navigation and no console warnings/errors. Smooth slides, ice glints and drifting snow remain included, using MaterialMotion's hidden-tab/reduced-motion handling. `docs/frosty-paths-live.jpg` records the public result. Physical-phone GPU/battery performance remains unchecked.

## Random puzzle modes

Crate Garden, Crystal Light, Water Garden, and Frosty Paths now offer seeded Easy, Medium, and Hard puzzles in Menu. Each keeps its eight authored levels. Retry restores the opening, reload replays the saved moves, and random wins stay separate from campaign completion. Existing save keys and authored level IDs are retained. Petals already offers four sizes and connected floors. Traffic Garden already has three solver-checked tiers. Both retain their existing generation rules.

The random puzzle update shipped in 4f6a396 through Pages run 41780702050. The public menus show all three difficulty options in each of the four updated games.

## Plain interface copy

Use short descriptions and clear goals. The hub lists playable games first and puts planned games under Coming soon. In-game help uses four animated examples with text captions. Petals shows them in its help dialog. The other games show them under How to play in Menu. The shared guide respects reduced motion.

## Marble Workshop

The local build includes eight authored layouts and seeded Easy, Medium, and Hard modes. Track tiles form a single route. Hints compute the shortest number of turns. Roll traces the current connections and stops at the first gap or reaches the cup. Only a successful Roll completes the level.

The scene reuses the 3D camera and animates the marble along the track curves. Small dust and arrival particles use MaterialMotion, which stops after each run. Reduced motion completes the run immediately. Local saves replay track turns and validate wins. The seventh game is live at /games/marble-workshop/. Tap the marble or its launch pad to roll. The Roll button uses the same action.

The simpler shelf and help for the six live games shipped in 4edaea3 through Pages run 41781709537. Marble Workshop later shipped as the seventh game in 34b1411. Final local verification passed 344 tests and the production build.

## Shadow Blocks and Picture Islands

The local shelf now opens nine games. Shadow Blocks uses two shadow outlines and an exact block count. Picture Islands uses row and column clues on a 3D board and offers a flat keyboard board. Both have eight authored levels, three random difficulty tiers, hints, undo, saved progress, and visual help. These two games are ready for local review.

Shadow Blocks now guides the first level one tap at a time. Gold highlights show the next square. The row and column shadow labels use the same letters and numbers as the board, and How to play opens directly from the target cards.

Shadow Blocks now shows Goal and Your shadow separately for both axes. See example opens an illustration of one placed block creating one square in each current shadow.

Picture Islands now puts See example beside the board and highlights the first picture's full middle column and row. The highlight works on both boards.

Shadow Blocks and Picture Islands are live as games eight and nine in 81dd22e. The next local game is Pocket Railroads.

Pocket Railroads is game ten on the local shelf. Its rules live in src/games/pocket-railroads. Trains follow a fixed branching network with player-controlled switches. The two station cards show the target and current route. Replay saves restore switches and deliveries. Shadow Blocks and Picture Islands are live. Pocket Railroads is ready for local review.

Pocket Railroads is live as game ten in 1901a78. Pages run 41794817158 succeeded. Robot Garden is the next local game.

Robot Garden is game eleven in local preview. Queue board-relative arrows and Run to collect all seeds and finish on the blue dock. The example shows the first level's East then North route. The pure engine checks blocked moves and solves authored and seeded layouts. Saves restore the command list and validated wins.

Robot Garden is live as game eleven in e735483. Pages run 41796026790 succeeded, and the public shelf and worked example were verified. Bridge Islands is the next local game.

Bridge Islands is game twelve on the local shelf. Match each island’s bridge count and connect all islands into one network. The visual example shows a single bridge and a double bridge meeting at an island that needs three. The game has eight levels, seeded puzzles, 3D rotation, and replay saves.

Bridge Islands is live as game twelve in 2313c34. Pages run 41797797533 succeeded. Flip Garden and Tiny Tangrams are the next local games.

Flip Garden and Tiny Tangrams are games thirteen and fourteen on the local shelf. Flip Garden compares the goal pattern with your current flowers. Tiny Tangrams previews piece placement and checks exact outline coverage. Both have rotatable 3D views, worked examples, eight levels, seeded difficulty tiers, and replay saves.

The local shelf includes all 21 games. The seven final additions are Color Stacks, Garden Sudoku, Rolling Stone, Stepping Stones, Water Balance, Perspective Paths, and Pocket Escape. Each has eight authored levels, seeded Easy, Medium, and Hard modes, visual help, and validated saves. The local review guide lists their goals and first puzzle steps. All 21 games are now live in release 3149d6f. Pages run 41819062553 succeeded and all 21 public game boards loaded in the browser.

The approved PLAN effects are implemented locally across all 21 games. PixelBurst reuses a bounded pool and can play the three pinned PixelFX strips. Scene clocks drive visual motion and the pure puzzle engines remain authoritative. See docs/FX_REVIEW.md for pilot comparisons and VALIDATION.md for the browser check scope. The effects build is ready at http://127.0.0.1:4175/.

Bridge Islands now has upright letter and built/needed badges on the islands, a visible goal, and explicit Goal and Current cards. The ocean shader animates a bounded wave surface. Bridge arrival starts a capped water burst at water height. The local preview is on port 4175.

Bridge Islands now has staggered shoreline spray and a PixelFX confetti burst after the winning bridge settles. The production preview confirmed the win, confetti playback, and a quiet reload of the solved board. All 454 tests and the production build passed. Physical phone review is still open.

The Bridge Islands update shipped separately in commit 17f1656 through Pages run 41839736682. The release passed 442 tests and the production build. The public Bridge Islands bundle and confetti asset match the release. The other games' pending effects remain local for review.

Petals Volume adds three solver-verified lessons and three- or four-floor random puzzles. Use Menu → Game mode → Volume to try it. Clues share one count across the current slice and its immediate neighbors. The inspector highlights that footprint as you switch floors. The user tested the effects on a physical phone and identified the Play/Rotate switch as the main touch issue. Prototype two-finger orbit for swipe-based games and direct drag for tap-based games. The release passed 460 tests and the production build. The browser tool timed out before the new Volume UI could be checked visually.
