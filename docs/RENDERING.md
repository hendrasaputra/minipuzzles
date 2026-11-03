# Rendering decision

Reviewed 3 November 2026 for the collection restructure.

## Current choice

- **Hub:** HTML/CSS only. It does not import Three.js or load a game renderer.
- **Petals:** retain the working Three.js renderer, with instanced geometry, active-floor picking, 8× zoom/pan, and floor isolation/explosion.
- **Future games:** choose a renderer per game. A small fixed-camera puzzle is a good candidate for a Canvas/software-renderer prototype. The page boundary does not require every game to use Three.js.

## Pixel Plays considered

The [Pixel Plays README](https://github.com/amirmushichge/pixel-plays#readme) describes standalone dependency-free games, a small fixed-resolution isometric scene, selective dithering and hard shadows. Its [engine source](https://github.com/amirmushichge/pixel-plays/blob/main/engine.js) uses a 360×280 canvas, a CPU depth buffer and a fixed orthographic projection. Its ground-plane unprojection is not a replacement for Petals' multi-floor picking.

Our assessment: this is a strong visual and architectural reference for compact miniature games. Replacing Petals now would require reimplementing camera interaction, layer picking, readable large-board rendering and their tests. It would be a renderer migration, not removal of an interchangeable dependency. The current instanced renderer already handles Expert multi-floor boards.

## Next experiment

If choosing the software approach for a new game, prototype one small fixed-camera board first. Compare touch picking, number/shape readability, frame cost and bundle size on a phone before standardizing it. Keep its puzzle rules pure. Do not build an abstract renderer interface until a second implementation actually needs one.

If reusing Pixel Plays code later, retain its MIT notices; its music has a separate license. No Pixel Plays renderer code or music is copied in this restructure.
