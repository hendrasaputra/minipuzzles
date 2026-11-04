# GPT icon prompts

The first generated family is complete: **21 original GPT Image icons**, using **Petals v03** as the visual reference. Only Petals is a playable game; artwork does not change the planned status of the other entries.

## Files and display contract

- `prompts/<id>.md`: editable source for the next revision.
- `iterations/<id>/vNN.prompt.md`: exact request and reference input used for that version.
- `iterations/<id>/vNN.png`: unmodified generated master.
- `iterations/<id>/vNN.review.md`: review notes and known limitations.
- `assets.json`: selected versions, paths, dimensions and SHA-256 hashes.
- `public/icons/<id>.png`: 384×384 runtime resolution export.
- [Review sheet](review.html): 128px/light and 64px/dark views (serve the repository root locally to view it).

The current masters are opaque square app icons. Their 26% rounded mask and 1.025× backing bleed belong to the display contract; they are not standalone transparent cutouts. Transparent Petals v01/v02 trials remain archived, but edge remnants prevented their selection. See [the shared style](ICON_STYLE.md).

## Future modifications

1. Edit the relevant source prompt, then create the next numbered exact request. Do not overwrite an existing generated master or its request.
2. Use Petals v03 as the style/composition reference for a new subject; label references separately from edit targets. For a specific revision, preserve stated invariants and record the actual input image.
3. Generate with built-in GPT Image. Save the raw output first, record its actual dimensions, then review at full size and 128/64px on light/dark surfaces.
4. Make a 384px runtime size export without retouching the master. Preserve original outputs and update `assets.json`, source review notes and the table below.
5. Change a catalog icon URL only after the runtime file exists. A new icon must not turn a planned game into a play link.
6. If changing the family's camera, backing or light, version the style contract/reference and regenerate the affected assets consistently. Collect owner feedback before treating the family as permanently locked.

## Prompt index

| Game | Catalog ID | Editable source | Status |
| --- | --- | --- | --- |
| Petals | `petals` | [Prompt](prompts/petals.md) | Generated |
| Traffic Garden | `traffic-garden` | [Prompt](prompts/traffic-garden.md) | Generated |
| Crate Garden | `crate-garden` | [Prompt](prompts/crate-garden.md) | Generated |
| Water Garden | `water-garden` | [Prompt](prompts/water-garden.md) | Generated |
| Crystal Light | `crystal-light` | [Prompt](prompts/crystal-light.md) | Generated |
| Frosty Paths | `frosty-paths` | [Prompt](prompts/frosty-paths.md) | Generated |
| Marble Workshop | `marble-workshop` | [Prompt](prompts/marble-workshop.md) | Generated |
| Shadow Blocks | `shadow-blocks` | [Prompt](prompts/shadow-blocks.md) | Generated |
| Picture Islands | `picture-islands` | [Prompt](prompts/picture-islands.md) | Generated |
| Pocket Railroads | `pocket-railroads` | [Prompt](prompts/pocket-railroads.md) | Generated |
| Robot Garden | `robot-garden` | [Prompt](prompts/robot-garden.md) | Generated |
| Bridge Islands | `bridge-islands` | [Prompt](prompts/bridge-islands.md) | Generated |
| Flip Garden | `flip-garden` | [Prompt](prompts/flip-garden.md) | Generated |
| Tiny Tangrams | `tiny-tangrams` | [Prompt](prompts/tiny-tangrams.md) | Generated |
| Color Stacks | `color-stacks` | [Prompt](prompts/color-stacks.md) | Generated |
| Garden Sudoku | `garden-sudoku` | [Prompt](prompts/garden-sudoku.md) | Generated |
| Rolling Stone | `rolling-stone` | [Prompt](prompts/rolling-stone.md) | Generated |
| Stepping Stones | `stepping-stones` | [Prompt](prompts/stepping-stones.md) | Generated |
| Water Balance | `water-balance` | [Prompt](prompts/water-balance.md) | Generated |
| Perspective Paths | `perspective-paths` | [Prompt](prompts/perspective-paths.md) | Generated |
| Pocket Escape | `pocket-escape` | [Prompt](prompts/pocket-escape.md) | Generated |
