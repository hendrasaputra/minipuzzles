# Developer handoff

Updated: 3 November 2026.

## Current state

The repository is now **minipuzzles**, hosting the **Puzzles** collection. The first playable game is **Petals** (Minesweeper). The hub lists Petals plus 20 planned puzzle ideas; only Petals is a play link. Native Vite multi-page entries isolate the hub and game without a client router.

The selection page uses tactile skeuomorphic icon placeholders. Final artwork is deliberately deferred. All 21 editable GPT prompts and a shared **Iconfactory-inspired** art direction are in `docs/art/`. Generate and approve Petals as the family reference before generating other icons.

## Where to work

- `src/hub/`, `index.html`: lightweight HTML/CSS shelf; no Three.js import.
- `src/catalog.ts`: IDs, labels, status, optional asset URLs and playable routes.
- `src/games/petals/`, `games/petals/index.html`: complete game, rules, UI and tests.
- `src/shared/`: audio, camera math and pointer gestures; runtime helpers remain game-independent.
- `vite.config.ts`: explicit HTML inputs. A new playable game needs an input and catalog link.
- `AGENTS.md`: contributor rules; `TODO.md`: actual progress and pending work.

Petals keeps seeded random presets, connected floors, fixed learning lessons, hold/right-click flags, double-tap chording, zoom/pan, 2D keyboard play, audio/mute and local saves. Legacy keys (`petal-save-v2`, `petal-save-v1`, `mines-sound`), campaign seeds, IDs and generator versions are preserved. Save imports validate before replacing state.

## Renderer decision

[Rendering notes](docs/RENDERING.md) assess Pixel Plays' CPU rasterizer. Petals retains Three.js because it already supports large boards and interactive floor/camera picking. The hub is renderer-neutral, and a future fixed-camera game can prototype the lighter approach. Do not add an abstract renderer framework prematurely.

## Verification and hosting

Local result: **110 tests pass**, and the production build creates both HTML pages with valid relative assets. Browser checks cover hub → Petals → hub, direct refresh, preserved seed/floor/Flag/mute, valid import, malformed-file rejection without mutation, and export roundtrip. See `VALIDATION.md` for evidence.

Repository: https://github.com/hendrasaputra/minipuzzles. DNS for `puzzles.hensap.id` is verified. Pages cutover/live HTTPS verification is the remaining deployment step at this snapshot; update this paragraph after it completes.

Browser saves cannot follow a hostname change automatically. Use Petals' **Menu → Export save** on the old origin, then **Import save** on the new one. The progress export does not include sound preference. Old-origin data is not deleted by this restructure, but cannot be accessed by the new origin. Deployment/migration details: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Next work

1. Finish and verify the domain cutover, then mark the hosting checks in TODO.
2. Generate the first Petals icon from [its saved prompt](docs/art/prompts/petals.md). Retain raw output and exact versioned prompt/review notes.
3. Approve silhouette, alpha edges, camera and materials at 1024/128/64px; then generate the remaining 20 icons individually.
4. Add approved PNGs to `public/icons/` before assigning catalog URLs. No images have been generated in this restructure.
5. Choose the next game—Traffic Garden, Crate Garden or Crystal Light are good candidates—before implementing its pure rules/levels/tests.

Volume mode remains future work. Original design history stays in `INITIAL_IDEAS.md`; it is not the current release checklist.
