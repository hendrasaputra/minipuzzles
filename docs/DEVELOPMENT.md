# Development guide

Puzzles uses TypeScript, Three.js and Vite. Native HTML pages keep the hub lightweight and isolate each game's resources. No framework, backend, account, runtime CDN or asset service is required.

## Run and verify

Node.js 22.12+, 24 or 26+. These commands work in macOS/Linux Terminal and Windows PowerShell:

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Open `/` for the library `/games/petals/` for Minesweeper, and `/games/traffic-garden/` for the sliding-car puzzle. Serve `dist/` over HTTP(S), rather than opening files directly.

## Layout

- `index.html`, `src/hub/`: the Puzzles selection page and its styles; no Three.js import.
- `src/catalog.ts`: stable game IDs, status, links and optional reviewed icon URLs.
- `games/petals/index.html`, `src/games/petals/main.ts`: Petals entry points and UI.
- `src/games/petals/engine.ts`: pure Minesweeper rules, topology, seeded generation, exact retry and validation.
- `src/games/petals/solver.ts`, `campaign.ts`: visible-information deductions and fixed learning levels.
- `src/games/petals/presets.ts`, `storage.ts`: board sizes and validated local/file saves.
- `src/games/petals/scene.ts`: instanced geometry, glyphs, highlights and picking.
- `games/traffic-garden/index.html`, `src/games/traffic-garden/`: pure sliding-car engine, bounded BFS solver, seeded generator, Canvas renderer, UI and validated history replay saves.
- `src/shared/`: reusable audio, camera math and pointer gestures. Shared gesture tests also exercise Petals fixtures.
- `vite.config.ts`: explicit HTML inputs for every playable game.
- `docs/art/`: shared icon direction, exact editable prompts and future review iterations.

Styles load per page. Native navigation releases a game's document, timers, listeners and audio; do not introduce a client router without a reason. Shared helpers must stay independent of any game's rule engine.

## Add a game

1. Choose a stable ID and implement its pure rules and meaningful tests under `src/games/<id>/`.
2. Create `games/<id>/index.html` with its game entry, title and a relative `../../` hub link.
3. Add its HTML input to Vite. Check direct load, refresh, hub navigation, touch and keyboard paths.
4. Set the catalog entry to playable with a real relative link only after it works. Planned games have no play links.
5. Use a distinct save key for a new game. Preserve Petals' legacy `petal-save-v2`/`v1`, `mines-sound`, campaign IDs, seeds and generator versions.
6. Follow [the icon workflow](art/README.md); assign an icon URL only after its approved file exists.

## Saves and deployment

Petals' Menu exports/imports a bounded, validated JSON session. Invalid files leave current progress intact. Sound is a shared preference; the progress export does not copy that preference.

Moving the hostname does not move localStorage. Export on the old origin before cutover and import on the new origin. See [deployment](DEPLOYMENT.md) and [validation](../VALIDATION.md).

The [original design](../INITIAL_IDEAS.md) is retained verbatim. Code is under [MIT](../LICENSE); dependencies keep their own licenses.
