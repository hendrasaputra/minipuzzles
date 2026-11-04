# Crystal Light

Guide a warm beam through every lavender crystal. Each brass mirror stays in its socket and alternates between two diagonal orientations. Crystals pass the beam onward; stone blocks stop it. The puzzle completes when every crystal catches the beam at once.

- Tap a mirror to turn it once, or choose a mirror from the selector and press Turn.
- Keyboard: focus the board and press Enter/Space to turn the selected mirror. The native dropdown and Turn button also work with keyboard and screen readers.
- Choose Rotate to drag the camera around or tilt it. Pinch/scroll zooms; ↺ resets the view. Choose Play to turn mirrors again. Camera motion never adds puzzle turns.
- Hint turns one mirror along a shortest solution. Undo reverses any turn, including the winning turn. Retry resets only this light; completed lights keep their marks.
- Menu selects any of eight lights and toggles shared sound. There is no timer.

The eight stable 5×5 to 7×7 layouts require 1, 2, 2, 3, 3, 4, 5 and 5 turns from their openings. Some mirrors already point correctly, and later layouts include decoys. The pure tracer detects loops by visited cell/direction, and crystals remain lit only while the current beam reaches them. The bounded solver explores at most 4,096 binary mirror states without changing the game.

Local saves use `puzzles-crystal-light-v1` on the browser origin. Reads validate the level, mirror-ID history, selection and completed IDs, then replay legal turns instead of trusting saved positions or win flags. Saves are bounded at 5,000 turns / 1MiB; exceeding that retains the last stored save and displays a warning. No export/import UI is included yet. Shared mute uses the existing preference.

Rules and levels remain independent of Three.js. The miniature scene uses faceted lavender crystals, brass mirrors and decorative golden beams with full rotation and actual 3D picking. No new dependency was added. Crystal Light and its animated lasers are live in release 8bfeee8.

## Moving light

Beams have a soft golden halo, bright traveling pulses and small amber particles following the exact reflected route. Turning a mirror replaces the route immediately; animation never changes puzzle state. Effects run at up to 30 updates per second, reuse meshes between frames and stop while the tab is hidden. The system’s reduced-motion preference keeps the effect still. Particle count is capped at 80, and animation reuses existing shadow maps rather than recomputing them each frame.
