# Puzzles progress

Updated: 4 November 2026. Check items only after the relevant implementation and verification exist.

## Current milestone: collection structure

- [x] Define a stable catalog with Petals plus 20 planned puzzle concepts.
- [x] Keep planned entries non-navigable and avoid missing image URLs.
- [x] Save a shared icon style contract and 21 editable draft GPT prompts.
- [x] Add repository instructions and developer handoff notes.
- [x] Finish the Puzzles selection page and touch-friendly interim icon shelf.
- [x] Move Petals into its own game module and reusable helpers into `src/shared/`.
- [x] Configure Vite to build the hub and standalone Petals page.
- [x] Verify hub → Petals → hub navigation and direct game entry.
- [x] Verify save/audio compatibility after the move and Petals rename.
- [x] Provide validated save export/import before domain cutover.
- [x] Run the final tests, production build and browser checks; record results.

- [x] Rename the GitHub repository to `hendrasaputra/minipuzzles` and update its remote/links.

- [x] Review Pixel Plays as an alternative and record the per-game renderer decision.

## Hosting migration

- [x] Verify `puzzles.hensap.id` CNAME to `hendrasaputra.github.io`.
- [x] Deploy the verified hub build and attach the new Pages custom domain.
- [x] Confirm trusted HTTPS, enforcement, and live hub/game assets.
- [x] Document that `mines.hensap.id` saves need export/import across origins.

## GPT artwork: first family

- [x] Generate and select the Petals reference icon (v03, agent technical/art review).
- [x] Record exact generation/edit prompts, reference inputs and revision notes.
- [x] Generate the other 20 icons individually against the Petals reference.
- [x] Review actual master size and 128/64px masked renders on light/dark backgrounds.
- [x] Add reviewed runtime assets and catalog URLs; verify no broken requests.
- [x] Owner explicitly approved publication of the icon batch and Traffic Garden on 4 November 2026.
- [ ] Collect owner feedback and create targeted v02/v04 revisions if requested.

- [x] Adopt Iconfactory-inspired skeuomorphic craft in the saved icon direction.

## Traffic Garden

- [x] Implement independent sliding-car rules, undo, shortest-slide solver and seeded solvable puzzles.
- [x] Add Easy, Medium and Hard, fresh random seeds, exact retry and solver hints.
- [x] Build a tactile rotatable Three.js garden with drag, large buttons and keyboard controls.
- [x] Validate local saves by replaying legal history; use a separate game key and shared mute preference.
- [x] Add standalone Vite entry and a real playable shelf link.
- [x] Run the initial 152 tests, production build and browser checks; see VALIDATION.md.
- [x] Verify the approved Traffic Garden/icon deployment live (d584e90, successful Pages workflow).
- [ ] Check actual iOS/Android touch gestures and speaker loudness.
- [ ] Expand the 13 verified layout families if repeated play needs more variety.

## Crate Garden

- [x] Add pure push-only Sokoban rules, undo and bounded shortest-step solver.
- [x] Create eight stable solver-verified gardens (6×6 and 7×7).
- [x] Add an original Three.js garden with swipe/tap, large direction buttons and keyboard play.
- [x] Save move history, current garden and completed gardens under a separate validated key.
- [x] Add standalone Vite entry and playable shelf link in the local build.
- [x] Complete all eight gardens in browser, check saved completion/undo, responsive layouts, tests and build.
- [x] Publish Crate Garden with the shared rotation update (3e2eef4, verified live).
- [ ] Test physical iOS/Android input and audio.

## Later games

The collection now has 21 playable games.

## Shared 3D rotation

- [x] Require rotatable 3D boards for all future games.
- [x] Replace the fixed Traffic/Crate Canvas views with real Three.js geometry.
- [x] Add shared Play/Rotate modes, orbit/tilt, pinch/wheel zoom, keyboard camera control and reset.
- [x] Keep puzzle gestures separate and update direction arrows for the current camera.
- [x] Verify rotated car dragging and gardener swipes, unchanged progress during orbit, Petals compatibility, tests and build.
- [x] Release Crate Garden and rotation for all three games (Pages run 41749026138).
- [ ] Check rotation, pinch and frame cost on physical phones.

## Crystal Light

- [x] Add pure mirror reflection/beam tracing, walls, transparent target crystals and bounded loop detection.
- [x] Create eight stable solver-verified lights with shortest solutions of 1–5 turns.
- [x] Add brass mirrors, faceted lavender crystals, warm beams and the shared 3D camera.
- [x] Support mirror taps, dropdown/Turn controls, keyboard, undo, hints and retry.
- [x] Add validated local replay saves and completed-light tracking under a separate key.
- [x] Verify all eight completions, reload/undo, rotation safety, responsive layouts, 222 tests and production build.
- [x] Animate laser glow, traveling pulses and particles with hidden-tab/reduced-motion handling.
- [x] Publish Crystal Light and laser effects after explicit owner approval (8bfeee8; verified live).
- [ ] Test touch/pinch and GPU cost on physical phones.

## Water Garden

- [x] Add pure clockwise channel rotation, reciprocal-port flow, terminal flowers and bounded cyclic flow.
- [x] Create eight stable solvable gardens, including branches and a decoy channel.
- [x] Add 3D recessed channels, blue water, spring, flower pots and the shared rotation camera.
- [x] Support channel taps, dropdown/Turn with opening directions, keyboard, hints, undo and retry.
- [x] Validate local replay saves and preserve completed gardens under a separate key.
- [x] Complete all eight gardens in-browser; verify reload, rotation safety, responsive layouts, 261 tests and build.
- [x] Publish and verify animated Water Garden (569cf93; successful Pages run 41755490204).
- [ ] Test physical-phone input and GPU performance.

## Material effects

- [x] Animate connected water with foam/droplets, spring ripples/bubbles and surface shimmer.
- [x] Share the capped, visibility-aware, reduced-motion MaterialMotion controller with laser effects.
- [x] Require fitting water/laser/fire/ice effects as those materials appear in future games.
- [x] Verify 269 tests, production build, route changes and decorative picking safety.

## Frosty Paths

- [x] Add slide-until-blocked rules, fish collection, home-stop win, undo and bounded shortest-slide hints.
- [x] Create eight stable paths with 1–3 fish and verified solutions from 2 to 11 slides.
- [x] Add friendly penguin, snow-capped rocks, ice, fish and home beacon with full 3D rotation.
- [x] Animate visual slides, ice glints and drifting snow through MaterialMotion.
- [x] Add swipe/tap, large direction buttons, camera-relative glyphs and keyboard play.
- [x] Validate separate replay saves and completed paths.
- [x] Verify all eight paths, saved win/undo/fish restoration, rotated swipe, responsive fit, 301 tests and build.
- [x] Publish and verify Frosty Paths (5420daf, Pages run 41758892888), retaining rotation, eased slides, ice glints and snow.
- [ ] Check physical-phone input, GPU and battery cost.

## Random puzzle replayability

- [x] Audit Petals size and floor presets plus Traffic Garden difficulty bands.
- [x] Add seeded Easy, Medium, and Hard puzzles to Crate Garden, Crystal Light, Water Garden, and Frosty Paths.
- [x] Keep authored campaigns and compatible save keys, with random wins separate from campaign progress.

## Easier game instructions

- [x] Use plain descriptions and labels across the game shelf and games.
- [x] Replace long in-game instructions with animated examples and short captions.
- [x] Check all seven help panels at 320 px.

## Marble Workshop

- [x] Add eight levels and three seeded difficulty tiers.
- [x] Add turn, roll, hint, undo, retry, and replay saves.
- [x] Keep 3D camera controls and animate the marble through track curves with particles.
- [x] Add plain labels and visual help.
- [x] Publish Marble Workshop as game seven with tap-to-roll and the Roll button.

## Next two games

- [x] Build Shadow Blocks with two shadow targets, a block budget, 3D rotation, and seeded puzzles.
- [x] Build Picture Islands with unique solutions, 3D rotation, a flat keyboard grid, and seeded puzzles.
- [x] Verify both local shelf links, first-level wins, save restore, and mobile layouts.
- [ ] Review Shadow Blocks and Picture Islands.
- [x] Make Shadow Blocks easier to learn with a guided first level and labeled row and column shadows.
- [x] Add a worked clue example and guided first picture to Picture Islands.
- [x] Publish Shadow Blocks and Picture Islands with their updated guides.
- [x] Build Pocket Railroads with eight levels, seeded difficulty, 3D trains, and a visual guide.
- [x] Verify wrong-route recovery, delivery, reload, and the local shelf link.
- [ ] Review Pocket Railroads.
- [x] Publish Pocket Railroads and verify its live shelf link and guide.
- [x] Build Robot Garden with a rotatable board, command queue, and worked example.
- [x] Verify blocked runs, restored commands, the first dock win, and the local shelf link.
- [ ] Review Robot Garden.
- [x] Publish Robot Garden and verify its shelf link and worked example.
- [x] Build Bridge Islands with a rotatable 3D board and a worked bridge example.
- [x] Verify first-level taps, saved completion, rotation, and the local shelf link.
- [ ] Review Bridge Islands.
- [x] Publish Bridge Islands and verify its live shelf link and example.
- [x] Build Flip Garden and Tiny Tangrams with rotatable boards, worked examples, and seeded puzzles.
- [x] Verify both first-level wins, saved completion, and local shelf links.
- [ ] Review Flip Garden and Tiny Tangrams.

## Full local collection

- [x] Build Color Stacks, Garden Sudoku, Rolling Stone, Stepping Stones, Water Balance, Perspective Paths, and Pocket Escape.
- [x] Open all 21 games from the local shelf.
- [x] Verify the seven new first-level wins, visual examples, rotations, and save restore.
- [x] Verify the seven new Hard modes at 320 px.
- [ ] Review the full collection locally.
- [x] Publish all 21 games and verify every live route.

## Pixel effects rollout

- [x] Export and review the three PixelFX pilots.
- [x] Compare the pilots against the released build.
- [x] Add action feedback and physical motion across all 21 games.
- [x] Run the full suite, build, and browser regression checks.
- [x] Review touch, rotation, and animation performance on a physical phone.
- [ ] Prototype tap to play and two-finger orbit in games that use one-finger swipes.
- [x] Make Bridge Islands labels readable and show the goal on the board.
- [x] Add animated blue ocean waves and water-height bridge splashes.
- [x] Add shoreline spray to every Bridge Islands island and a one-shot win celebration.
- [x] Add Petals Volume with three solver-verified lessons and random puzzles.
