# Complete icon refresh — 23 November 2026

All **22** game icons have new generated versions installed under the same
`public/icons/<id>.png` paths. Petals selects **v04**; the remaining 21 select **v02**.
All new masters are opaque RGB **1254×1254** PNGs, generated individually using the
built-in GPT Image tool and original Petals v03 as the style reference. Runtime
exports are **384×384**, resized without retouching. No catalog ID, route, save key,
campaign seed, level or rule was changed.

The originals remain in `docs/art/iterations/<id>/`. Every new master has its exact
prompt, reference path and individual review alongside it; editable source prompts
were updated too. `previous-assets.json` preserves the selected registry before the
refresh. The current registry records dimensions and SHA-256 hashes for all masters
and runtime exports, plus the refreshed installable app icon and its five exports.

## Improvements and review

The [comparison sheet](comparison.png) shows each previous icon at 80px, new icon at
128px on light, and new icon at 64px on dark, all with production masking/bleed.
The full masters were inspected by the production agents; the combined comparison
was also inspected. The live [review page](../../review.html) now includes all 22
games, including Garden Keys, which the previous review page omitted.

- Larger cars and clearer exit in Traffic Garden; simpler crate/target composition.
- Stronger source/channel/flower sequence for Water Garden and mirror/crystal cues
  for Crystal Light; larger penguin, fish and home silhouette for Frosty Paths.
- Larger marble and cup, simpler shadow stack, recognizable picture reveal, clear
  rail switch, robot route, island connections and tile/piece silhouettes.
- Clearer stacks and plant cells; simpler block/goal and stepping path; distinct
  jug sizes, aligned stairway, locked chest/key, and oversized key/door/hedge cues.
- Garden Keys replaces its earlier procedural rendering with matching tactile
  ceramic, wood and brass. The original is preserved rather than overwritten.

Individual illustrations are mechanic cues, not playable boards or screenshots.
Bridge Islands' decorative pips are not a solvable bridge problem. Perspective
Paths' alignment gap remains subtle at 64px; its review records that limitation.

The collection app icon also selects [v02](../../iterations/app-icon/v02.review.md),
with a matching generated ceramic finish and five runtime size exports. Rounded
and circular mask previews were inspected. The SVG P favicon remains intentionally
simple at 16px. No physical-device home-screen test is claimed.

## Campaign and checks

The campaign carousel was rebuilt from the refreshed real runtime icons, and the
local hub shelf was recaptured after installation. Real gameplay captures for all
22 games live under `docs/marketing/creatives/v01/captures/`, with source screenshots
separate from captioned posters.

Registry checks confirm all 22 runtime hashes changed, each matches its selected
master's export, and all master/prompt/review files exist. The automated suite
passed **564 tests across 69 files**. Local browser checks at **375px and 1600px**
confirmed all 22 hub icons/links, game-to-hub navigation and no horizontal overflow.
No game page errors or failed requests occurred during capture. Production build
results are recorded in the project handoff. No publication or deployment occurred.
