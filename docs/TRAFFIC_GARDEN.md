# Traffic Garden

Slide the coral car through the garden gate on the right. Cars move along their length and cannot turn, overlap, or jump. The 6×6 board has cars and trucks occupying two or three spaces.

- Drag a car along its length, or choose it from the selector and use the large arrows.
- Keyboard: left/right for horizontal cars, up/down for vertical cars. Shift + arrow slides to the furthest legal position.
- A continuous slide counts as one move, regardless of distance. Driving out counts once. Repeated one-space button taps each count separately.
- Par is the shortest solution. Hint plays its next move. Undo works even after finishing; no timer or penalty applies.
- Menu changes difficulty, retries the exact same puzzle, creates a fresh random seed, or toggles shared sound.

Easy openings require 2–4 moves and at most six cars. Medium requires 5–9 moves; Hard requires at least ten. Puzzles are deterministic for a seed and generated from 13 verified lane families with legal scrambles, then checked by a bounded shortest-path search. They are solvable, but this first version has finite structural variety.

Progress saves automatically on the current browser origin under `puzzles-traffic-garden-v1`. Reload restores the puzzle, selected car and legal move history. Saves validate and replay all moves before use. Storage failures display a warning. History is bounded at 5,000 moves / 1MiB; exceeding that limit leaves the last valid stored save and warns that current play is not being saved. There is no save export/import for this game yet.

The Three.js scene is independent of the pure TypeScript puzzle rules. It uses the same installed renderer as Petals; no dependency was added. Release 3e2eef4 includes the shared 3D rotation controls.

## Look around in 3D

Choose **Rotate**, then drag to orbit horizontally or tilt vertically. Pinch or scroll to zoom; **↺** resets the view. Choose **Play** to move cars or the gardener again. Camera movement never counts as a puzzle move. While Rotate is selected and the board has keyboard focus, arrows rotate/tilt and Home resets the camera. Switching modes, opening Menu, canceling a touch or leaving the tab cancels any pending move. Camera orientation is temporary; reload returns to the default view without changing saved puzzle progress.
