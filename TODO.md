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
- [x] Build a tactile fixed-camera Three.js garden with drag, large buttons and keyboard controls.
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
- [ ] Publish the reviewed Crate Garden build in a future release.
- [ ] Test physical iOS/Android input and audio.

## Later games

The remaining 18 planned entries describe ideas, not commitments or completed games. Crystal Light is a possible next candidate. Petals Volume mode remains unimplemented.

## Shared 3D rotation

- [x] Require rotatable 3D boards for all future games.
- [x] Replace the fixed Traffic/Crate Canvas views with real Three.js geometry.
- [x] Add shared Play/Rotate modes, orbit/tilt, pinch/wheel zoom, keyboard camera control and reset.
- [x] Keep puzzle gestures separate and update direction arrows for the current camera.
- [x] Verify rotated car dragging and gardener swipes, unchanged progress during orbit, Petals compatibility, tests and build.
- [ ] Release the local Crate Garden / rotation update after review.
- [ ] Check rotation, pinch and frame cost on physical phones.
