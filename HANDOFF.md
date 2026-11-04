# Developer handoff

Updated: 4 November 2026.

## Current state

The repository is now **minipuzzles**, hosting the **Puzzles** collection. Playable locally: **Petals** (Minesweeper) and **Traffic Garden** (sliding cars). The hub has two playable links and 19 planned ideas. Native Vite multi-page entries isolate the hub and game without a client router.

The selection page now uses 21 generated skeuomorphic icons. Petals v03 is the family reference; other subjects use v01. All raw masters, exact requests, reference paths and reviews are in `docs/art/iterations/`; editable prompts and the **Iconfactory-inspired** style contract remain in `docs/art/`. Runtime files are 384px PNGs under `public/icons/`. Their rounded mask/backing bleed is required because the masters are opaque app-icon squares, not transparent cutouts.

The owner explicitly approved publication of the icon batch and Traffic Garden on 4 November 2026. The earlier automatic approval block is resolved by that approval; verify the Pages deployment before marking it live.

## Where to work

- `src/hub/`, `index.html`: lightweight HTML/CSS shelf; no Three.js import.
- `src/catalog.ts`: IDs, labels, status, optional asset URLs and playable routes.
- `src/games/petals/`, `games/petals/index.html`: complete game, rules, UI and tests.
- `src/shared/`: audio, camera math and pointer gestures; runtime helpers remain game-independent.
- `vite.config.ts`: explicit HTML inputs. A new playable game needs an input and catalog link.
- `AGENTS.md`: contributor rules; `TODO.md`: actual progress and pending work.

Petals keeps seeded random presets, connected floors, fixed learning lessons, hold/right-click flags, double-tap chording, zoom/pan, 2D keyboard play, audio/mute and local saves. Legacy keys (`petal-save-v2`, `petal-save-v1`, `mines-sound`), campaign seeds, IDs and generator versions are preserved. Save imports validate before replacing state.

## Renderer decision

[Rendering notes](docs/RENDERING.md) assess Pixel Plays' CPU rasterizer. Petals retains Three.js because it already supports large boards and interactive floor/camera picking. Traffic Garden uses an original lightweight Canvas 2D isometric painter; the hub remains renderer-neutral. Do not add an abstract renderer framework prematurely.

## Verification and hosting

Local result: **152 tests pass**, and the production build creates all three HTML pages with valid relative assets. Browser checks cover hub → Petals → hub, direct refresh, preserved seed/floor/Flag/mute, valid import, malformed-file rejection without mutation, and export roundtrip. See `VALIDATION.md` for evidence.

Repository: https://github.com/hendrasaputra/minipuzzles. The live collection is https://puzzles.hensap.id/ and Petals is https://puzzles.hensap.id/games/petals/. DNS and certificate checks pass, HTTPS enforcement is enabled, and both pages/assets match the tested build. The previous Pages custom-domain binding was replaced; no old-host alias is configured.

Browser saves cannot follow a hostname change automatically. Use Petals' **Menu → Export save** on the old origin, then **Import save** on the new one. The progress export does not include sound preference. Old-origin data is not deleted by this restructure, but cannot be accessed by the new origin. Deployment/migration details: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Next work

1. Review the generated icon family with the owner; use versioned GPT edits for requested changes.
2. Preserve raw outputs/exact prompts and update `docs/art/assets.json` when selecting a new version. Reference Petals v03 unless intentionally versioning the family's style.
3. Keep icon status independent from game status: 19 entries still have no playable implementation.
4. Obtain explicit publication approval for the completed icons and Traffic Garden, then verify the deployed three-page build.
5. Hardware-test Traffic Garden on iOS/Android; extend its verified layout families if more variety is needed.

Volume mode remains future work. Original design history stays in `INITIAL_IDEAS.md`; it is not the current release checklist.

## Traffic Garden implementation

`src/games/traffic-garden/` contains pure rules, bounded BFS solver, seeded generation, validated history-replay storage, fixed-camera Canvas scene and standalone UI. Rules and rendering have no circular dependency. A continuous slide counts once, including the coral car leaving through the right gate. The solver supplies par and one-move hints. Three difficulties draw from 13 validated layout families with legal seeded scrambles; this finite source is an explicit variety limit. Saved state uses `puzzles-traffic-garden-v1`, separately from Petals. Shared mute still uses `mines-sound`.

The browser checked Easy/Hard completion, saved win/reload/undo, Medium generation, direct drag, keyboard selection/movement, responsive layouts and page navigation. See `docs/TRAFFIC_GARDEN.md` and `VALIDATION.md`. Traffic Garden and the icon batch are approved for publication; live verification is in progress.
