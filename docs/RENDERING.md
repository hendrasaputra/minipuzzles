# Rendering decision

Reviewed 3 November 2026 for the collection restructure.

## Current choice

- **Hub:** HTML/CSS only. It does not import Three.js or load a game renderer.
- **Petals:** retain the working Three.js renderer, with instanced geometry, active-floor picking, 8× zoom/pan, and floor isolation/explosion.
- **Traffic Garden and Crate Garden:** actual Three.js cuboid geometry, shadows and frontmost raycast picking. Shared `src/shared/mini-scene.ts` supplies an orthographic camera, full horizontal orbit, bounded vertical tilt, pinch/wheel zoom and reset. Play/Rotate modes keep game drags/swipes separate from camera motion. Direction buttons follow the current camera. Pure rules and save formats are unchanged.
- **Crystal Light:** uses the same miniature camera, with faceted crystal and diagonal mirror meshes. Game-owned geometry/materials dispose on redraw; decorative beam meshes do not participate in picking.
- **Future games:** the owner requested rotatable 3D boards across the collection on 4 November 2026. Use the existing Three.js dependency and camera helpers. The former fixed Canvas views have been replaced and deployed; a fixed image or CSS transform does not meet this requirement.

Three.js is now shared across the three playable entries (roughly 122kB gzip for the common engine/audio chunk); the hub still does not load it. This increases the new games' download cost compared with the former Canvas views. No package was added. Rendering is event-driven rather than a continuous animation loop.

## Pixel Plays considered

The [Pixel Plays README](https://github.com/amirmushichge/pixel-plays#readme) describes standalone dependency-free games, a small fixed-resolution isometric scene, selective dithering and hard shadows. Its [engine source](https://github.com/amirmushichge/pixel-plays/blob/main/engine.js) uses a 360×280 canvas, a CPU depth buffer and a fixed orthographic projection. Its ground-plane unprojection is not a replacement for Petals' multi-floor picking.

Our assessment: this is a strong visual and architectural reference for compact miniature games. Replacing Petals now would require reimplementing camera interaction, layer picking, readable large-board rendering and their tests. It would be a renderer migration, not removal of an interchangeable dependency. The current instanced renderer already handles Expert multi-floor boards.

## Preserve the visual direction

Keep Pixel Plays as a reference for tactile miniature geometry, warm pastel surfaces and generous whitespace. Rotation needs full geometry, camera-relative game input and depth-correct picking. Compare touch behavior and frame cost on phones when adding a new game. Reuse the shared miniature camera rather than adding another renderer framework.

If reusing Pixel Plays code later, retain its MIT notices; its music has a separate license. No Pixel Plays renderer source or music has been copied.
