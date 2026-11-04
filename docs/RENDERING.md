# Rendering decision

Reviewed 3 November 2026 for the collection restructure.

## Current choice

- **Hub:** HTML/CSS only. It does not import Three.js or load a game renderer.
- **Petals:** retain the working Three.js renderer, with instanced geometry, active-floor picking, 8× zoom/pan, and floor isolation/explosion.
- **Traffic Garden and Crate Garden:** actual Three.js cuboid geometry, shadows and frontmost raycast picking. Shared `src/shared/mini-scene.ts` supplies an orthographic camera, full horizontal orbit, bounded vertical tilt, pinch/wheel zoom and reset. Play/Rotate modes keep game drags/swipes separate from camera motion. Direction buttons follow the current camera. Pure rules and save formats are unchanged.
- **Crystal Light:** uses the same miniature camera, with faceted crystal and diagonal mirror meshes. Game-owned geometry/materials dispose on redraw; decorative beam meshes do not participate in picking.
- **Water Garden:** uses the same 3D camera and tap picking with recessed channel tiles, blue wet routes and flower pots. Connected water has flowing foam, surface shimmer, spring ripples and bubbles; connectivity stays entirely in the pure engine.
- **Frosty Paths:** uses the same 3D camera and material controller, with a friendly penguin, eased visual slides, capped ice glints and drifting snow. Effects never affect the sliding/fish engine.
- **Future games:** the owner requested rotatable 3D boards across the collection on 4 November 2026. Use the existing Three.js dependency and camera helpers. The former fixed Canvas views have been replaced and deployed; a fixed image or CSS transform does not meet this requirement.

Three.js is now shared across the playable entries (roughly 122kB gzip for the common engine/audio chunk); the hub still does not load it. This increases the new games' download cost compared with the former Canvas views. No package was added. Static scenes render on input. Material effects use the shared `MaterialMotion` loop, capped at 30fps, paused when hidden and still under reduced motion. Effects redraw with cached shadows.

## Pixel Plays considered

The [Pixel Plays README](https://github.com/amirmushichge/pixel-plays#readme) describes standalone dependency-free games, a small fixed-resolution isometric scene, selective dithering and hard shadows. Its [engine source](https://github.com/amirmushichge/pixel-plays/blob/main/engine.js) uses a 360×280 canvas, a CPU depth buffer and a fixed orthographic projection. Its ground-plane unprojection is not a replacement for Petals' multi-floor picking.

Our assessment: this is a strong visual and architectural reference for compact miniature games. Replacing Petals now would require reimplementing camera interaction, layer picking, readable large-board rendering and their tests. It would be a renderer migration, not removal of an interchangeable dependency. The current instanced renderer already handles Expert multi-floor boards.

## Active materials

Apply effects where the scene actually contains water, laser/energy, fire, ice or a similar material: flowing droplets and ripples for water, traveling pulses/sparks for lasers, embers for fire, restrained glints/snow for ice. Keep each material readable and the game’s pastel miniature style. Particle geometry must be capped/reused, never pickable, and independent of game state. Use `MaterialMotion`; do not add separate unbounded frame loops. Petals, Traffic Garden and Crate Garden currently contain no fluid/fire/laser surfaces needing continuous material effects.

## Preserve the visual direction

Keep Pixel Plays as a reference for tactile miniature geometry, warm pastel surfaces and generous whitespace. Rotation needs full geometry, camera-relative game input and depth-correct picking. Compare touch behavior and frame cost on phones when adding a new game. Reuse the shared miniature camera rather than adding another renderer framework.

If reusing Pixel Plays code later, retain its MIT notices; its music has a separate license. No Pixel Plays renderer source or music has been copied.
