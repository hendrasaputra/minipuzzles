# Crate Garden

Push every seed crate onto a green planting spot. Walk around the paths to get behind a crate; push one at a time. Crates cannot be pulled or pushed through other crates, walls, or the edge.

- Swipe along the isometric paths, tap a neighboring ground tile, or use the four large direction buttons.
- Keyboard arrows or WASD always move north/east/south/west on the grid. Button arrows and swipes follow the rotated view.
- Steps count walking and pushing; pushes have their own counter. There is no timer.
- Hint plays one step of a solution, including walking. Search is bounded; if no hint is found, undo a push or retry.
- Undo restores any step, including a winning push. Retry resets only the current garden.
- Menu lets you revisit all eight gardens and toggle shared sound. Completed gardens retain a check mark.

Eight curated gardens progress from one to three crates and from 6×6 to 7×7 boards. They are solver-verified with shortest solutions of 2, 8, 9, 12, 16, 20, 25 and 29 steps. They retain fixed layouts and stable IDs for learning and replay. Crates can get stuck in corners; unlimited undo is the recovery tool.

Progress is local to the browser origin under `puzzles-crate-garden-v1`. Current position is restored by validating and replaying legal moves against the original level. Saves are bounded at 5,000 steps / 1MiB; beyond that, the previous valid save remains and a warning appears. Completed IDs and shared mute persist. No save export/import is included yet.

The Three.js scene and input are separate from pure TypeScript rules, levels and solver. No new dependencies were added. Crate Garden is live with rotatable 3D in release 3e2eef4.

## Look around in 3D

In **Play**, swipe or tap with one finger to move the gardener. Drag two fingers together to turn or tilt the board, and pinch to zoom. Lift both fingers before your next move. With a mouse, choose **Rotate** and drag, then choose **Play** to move again. Scroll to zoom and use **↺** to reset. Camera movement never counts as a puzzle move. While Rotate is selected and the board has keyboard focus, arrows rotate/tilt and Home resets the camera. Switching modes, opening Menu, canceling a touch or leaving the tab cancels any pending move. Camera orientation is temporary; reload returns to the default view without changing saved puzzle progress.

## Random puzzles

Choose **Random difficulty** and **New random puzzle** in Menu. Easy has one crate, Medium has two, and Hard has three. The generator works backward from solved positions and checks solutions before offering a layout.

Retry and reload keep the same opening. Random wins are separate from the eight authored levels.

The burlap sack beside the board is [Grain Sack by Polyfork](https://polyfork.dev/asset/grain-sack-401d96), licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). The game resizes and tints it to match the garden.
