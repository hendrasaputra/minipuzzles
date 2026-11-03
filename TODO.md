# Puzzles progress

Updated: 3 November 2026. Check items only after the relevant implementation and verification exist.

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

## Hosting migration

- [x] Verify `puzzles.hensap.id` CNAME to `hendrasaputra.github.io` (user reports it is configured).
- [ ] Deploy the verified hub build and attach the new Pages custom domain.
- [ ] Confirm trusted HTTPS, enforcement, and live hub/game assets.
- [x] Document that `mines.hensap.id` saves need export/import across origins.

## Next milestone: GPT artwork

- [ ] Generate and approve the Petals reference icon.
- [ ] Record exact generation prompt, date and revision notes.
- [ ] Generate the other 20 icons individually against the approved reference.
- [ ] Review transparency and consistency at 1024px, 128px and 64px.
- [ ] Add approved runtime assets and catalog URLs; verify no broken requests.

- [x] Review Pixel Plays as an alternative and record the per-game renderer decision.
- [x] Adopt Iconfactory-inspired skeuomorphic craft in the saved icon direction.

## Later games

Planned entries describe ideas, not commitments or completed games. Choose the next game before implementing its rules, levels and tests. Suggested first candidates: Traffic Garden, Crate Garden, and Crystal Light. Petals Volume mode remains unimplemented.
