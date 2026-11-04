# Traffic Garden

Slide the coral car through the garden gate on the right. Cars move along their length and cannot turn, overlap, or jump. The 6×6 board has cars and trucks occupying two or three spaces.

- Drag a car along its length, or choose it from the selector and use the large arrows.
- Keyboard: left/right for horizontal cars, up/down for vertical cars. Shift + arrow slides to the furthest legal position.
- A continuous slide counts as one move, regardless of distance. Driving out counts once. Repeated one-space button taps each count separately.
- Par is the shortest solution. Hint plays its next move. Undo works even after finishing; no timer or penalty applies.
- Menu changes difficulty, retries the exact same puzzle, creates a fresh random seed, or toggles shared sound.

Easy openings require 2–4 moves and at most six cars. Medium requires 5–9 moves; Hard requires at least ten. Puzzles are deterministic for a seed and generated from 13 verified lane families with legal scrambles, then checked by a bounded shortest-path search. They are solvable, but this first version has finite structural variety.

Progress saves automatically on the current browser origin under `puzzles-traffic-garden-v1`. Reload restores the puzzle, selected car and legal move history. Saves validate and replay all moves before use. Storage failures display a warning. History is bounded at 5,000 moves / 1MiB; exceeding that limit leaves the last valid stored save and warns that current play is not being saved. There is no save export/import for this game yet.

The original Canvas 2D isometric scene is independent of the pure TypeScript puzzle rules. Petals keeps Three.js. No new runtime dependencies were added.
