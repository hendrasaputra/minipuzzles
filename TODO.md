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
- [x] Build a tactile fixed-camera Canvas garden with drag, large buttons and keyboard controls.
- [x] Validate local saves by replaying legal history; use a separate game key and shared mute preference.
- [x] Add standalone Vite entry and a real playable shelf link.
- [x] Run 152 tests, production build and browser checks; see VALIDATION.md.
- [ ] Verify the approved Traffic Garden/icon deployment live.
- [ ] Check actual iOS/Android touch gestures and speaker loudness.
- [ ] Expand the 13 verified layout families if repeated play needs more variety.

## Later games

The remaining 19 planned entries describe ideas, not commitments or completed games. Crate Garden and Crystal Light are possible next candidates. Petals Volume mode remains unimplemented.
