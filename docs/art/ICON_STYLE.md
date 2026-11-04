# Puzzle icon art direction

Status: generated family reference — Petals v03. Originals, exact requests and technical export metadata are preserved in `iterations/` and `assets.json`.

Primary style reference: [Iconfactory](https://iconfactory.com/), particularly the dimensional object craft in [Transmit](https://iconfactory.com/images-v8/portfolio/transmit-artwork.png), [Fantastical](https://iconfactory.com/images-v8/portfolio/fantastical-artwork.png), and the tactile [Apollo alternatives](https://iconfactory.com/images-v8/portfolio/apollo-artwork.png). Use original puzzle subjects, rather than reproducing those icons.

The hub is a quiet shelf of tactile rounded-square app icons: warm ivory ceramic bases, softly beveled isometric miniature worlds, restrained pastel accents, subtle texture and believable shadows. Aim for Iconfactory-inspired skeuomorphic craft: convincing physical materials, carefully modeled edges, a friendly recognizable silhouette, crisp small-size detail, and controlled highlights. Avoid generic glossy cubes, flat logos and excessive ornament.

## Shared contract

- Request one square PNG per game, ideally 1024×1024; record the actual returned dimensions. This batch returned 1254×1254 masters. Production icons use an opaque ivory backing and a 26% rounded display mask with a 1.025× backing bleed, not a standalone transparent cutout.
- Orthographic camera: 30° elevation and 45° yaw. Keep the same camera for all icons.
- One warm upper-left key light; soft lower-right contact shadow and restrained ambient occlusion.
- Ivory ceramic backing fills the square canvas. Keep the miniature comfortably inside the rounded display mask; retain consistent visual weight and perimeter bevels. The opaque masters have dark outer corner mattes that are intentionally excluded by the display mask.
- Materials: satin ceramic, lightly textured painted wood, small brass details, occasional frosted translucent elements. No mirrorlike plastic or heavy glass effects.
- Palette: warm ivory, blush pink, muted sage, dusty blue and brass. Individual catalog accents support the subject without changing the shared visual world.
- Use a few large readable objects. The icon must remain distinct at 64px and recognizable without color alone.
- No text, logos, badges, screenshots, mockup devices, contact sheets or copied commercial game assets.

## Review at three sizes

Inspect the full asset for artifacts, 128px for game recognition, and 64px for silhouette/contrast. Check the rounded silhouette on both light and dark backgrounds. Transparent Petals v01/v02 trials are archived but not selected because of stray edge pixels. Compare every icon against the approved Petals reference before accepting a new one.

Petals v03 was selected after subject/edge review and used as the style/composition reference for the other 20 subjects, each generated separately with the built-in GPT Image tool. If the base/camera/lighting changes, update this contract and all affected prompts before producing another batch.

## Production exports

Keep generated masters unmodified. Runtime assets are 384×384 PNG size exports for 128px display; current production masking is part of the icon contract. The native `sips` resize changes resolution only, without retouching content. Exact prompts and reference inputs remain alongside every master. For future transparent delivery, request a clean-alpha GPT edit and recheck edges; do not use these opaque files as unmasked cutouts.
