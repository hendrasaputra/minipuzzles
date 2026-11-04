# Frosty Paths

Slide the penguin across ice, collect every golden fish, and stop at the blue home. A slide continues until a rock or the board edge blocks the next tile. You cannot turn mid-slide. Edges are safe; passing home does not stop you or complete the puzzle.

- Swipe along the ice, tap a neighboring tile, or use the four large direction buttons.
- Keyboard arrows/WASD always follow grid north/east/south/west. Swipes and button glyphs follow the current camera.
- Each slide counts once, however far it travels. Fish collect anywhere along the slide.
- Hint plays one slide of a shortest solution. Undo restores position and collected fish, even after winning. Retry resets the current path; completed paths retain their check marks.
- Menu selects any of eight paths and toggles shared sound. There is no timer.
- Choose Rotate to orbit/tilt, pinch/scroll to zoom, and ↺ to reset the view. Choose Play to slide again. Rotate-mode focused board arrows control the camera; Home resets it.

Eight stable 5×5 to 7×7 paths have 1–3 fish and shortest solutions of 2,3,4,5,6,7,9,11 slides. Pure BFS hints visit penguin-position/fish-mask states with a 50,000-state cap. Rules do not depend on rendering.

The Three.js miniature includes a scarf-wearing penguin, icy tiles, snow-capped rocks, fish and a blue home beacon. Visual slides ease over 0.25s; logical moves/save state update immediately. Ice glints and snow use the shared capped motion controller, pause in hidden tabs and stay still with reduced-motion preference. Reduced motion also skips visual sliding. No dependency was added.

Local saves use `puzzles-frosty-paths-v1`, validate and replay direction history, and retain completed IDs. Saves are bounded at 5,000 slides / 1MiB; failures display a warning and retain the last stored save. There is no save export/import UI yet. Frosty Paths is live at https://puzzles.hensap.id/games/frosty-paths/ in release 5420daf. Live deployment verification is recorded in VALIDATION.md.
