# GPT icon prompts

These are editable **draft prompts**, saved before image generation. The user requested repository restructuring first; GPT artwork comes next.

## Workflow

1. Review [the shared style](ICON_STYLE.md), then generate [Petals](prompts/petals.md) as the reference icon.
2. Save each raw output and the exact prompt used under `docs/art/iterations/<id>/v01.png` and `v01.prompt.md`. Increment the version for every revision; do not overwrite an approved reference.
3. Record the generation date, requested changes, and review outcome in the prompt's Review notes. Keep the source prompt editable.
4. Inspect at 1024px, 128px and 64px; verify transparency, silhouette, readable subject, camera and lighting consistency.
5. Put only the approved runtime PNG at `public/icons/<id>.png`. Add its relative hub URL (`./icons/<id>.png`) to `src/catalog.ts` only when the file exists. Replace the corresponding monogram treatment, not the card interaction.
6. Update this index, TODO and HANDOFF after approval. A generated icon does not make its planned game playable.

No runtime icon URLs are currently assigned, so the hub does not request nonexistent images. The initial monograms are interim navigation markers, not final art.

## Prompt index

| Game | Catalog ID | Editable source | Status |
| --- | --- | --- | --- |
| Petals | `petals` | [Prompt](prompts/petals.md) | Draft |
| Traffic Garden | `traffic-garden` | [Prompt](prompts/traffic-garden.md) | Draft |
| Crate Garden | `crate-garden` | [Prompt](prompts/crate-garden.md) | Draft |
| Water Garden | `water-garden` | [Prompt](prompts/water-garden.md) | Draft |
| Crystal Light | `crystal-light` | [Prompt](prompts/crystal-light.md) | Draft |
| Frosty Paths | `frosty-paths` | [Prompt](prompts/frosty-paths.md) | Draft |
| Marble Workshop | `marble-workshop` | [Prompt](prompts/marble-workshop.md) | Draft |
| Shadow Blocks | `shadow-blocks` | [Prompt](prompts/shadow-blocks.md) | Draft |
| Picture Islands | `picture-islands` | [Prompt](prompts/picture-islands.md) | Draft |
| Pocket Railroads | `pocket-railroads` | [Prompt](prompts/pocket-railroads.md) | Draft |
| Robot Garden | `robot-garden` | [Prompt](prompts/robot-garden.md) | Draft |
| Bridge Islands | `bridge-islands` | [Prompt](prompts/bridge-islands.md) | Draft |
| Flip Garden | `flip-garden` | [Prompt](prompts/flip-garden.md) | Draft |
| Tiny Tangrams | `tiny-tangrams` | [Prompt](prompts/tiny-tangrams.md) | Draft |
| Color Stacks | `color-stacks` | [Prompt](prompts/color-stacks.md) | Draft |
| Garden Sudoku | `garden-sudoku` | [Prompt](prompts/garden-sudoku.md) | Draft |
| Rolling Stone | `rolling-stone` | [Prompt](prompts/rolling-stone.md) | Draft |
| Stepping Stones | `stepping-stones` | [Prompt](prompts/stepping-stones.md) | Draft |
| Water Balance | `water-balance` | [Prompt](prompts/water-balance.md) | Draft |
| Perspective Paths | `perspective-paths` | [Prompt](prompts/perspective-paths.md) | Draft |
| Pocket Escape | `pocket-escape` | [Prompt](prompts/pocket-escape.md) | Draft |
