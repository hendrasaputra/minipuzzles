# Step 1–3 validation · 3 November 2026

Scope: harden Classic/Layered, establish reproducible no-guess campaign puzzles, and implement Connected. Volume and final release polish remain outside this milestone. `INITIAL_IDEAS.md` is preserved unchanged.

## Automated checks

`npm test`: **59 tests across five files pass**.

| Suite | Coverage |
| --- | --- |
| Engine | Seed determinism; mine totals; safe first reveals; flags; flood fill; correct/incorrect chording; terminal states; floor independence; exact fixed/legacy retries; local/vertical neighborhood fixtures; clipped boundaries; shared directional flood/chord targets; malformed saves; generator versions; 40-seed Connected invariant sweep |
| Solver | Single-clue and overlapping-subset deductions; forced mine/safe actions; ambiguity stops without guessing; contradictions; no mutation; hidden mine getters throw if consulted during deduction |
| Campaign | Every shipped fixed opening is reproducible, resumable and solver-completable; required upward/downward source use; mixed level stalls when either arrow direction is removed |
| Storage | v1 migration, v2 roundtrip, corruption, unsupported versions, normalized metadata, deduplicated known level IDs |
| Gestures | Tap; hold once; right-click; cancel; background tap; drag and drag-back; interrupted pinch; no post-pinch reveal; coincident pinch coordinates |

`npm run build`: TypeScript checking and Vite production build pass. Approximately 134 kB gzip of JavaScript; Vite reports a non-blocking uncompressed chunk-size warning for the Three.js bundle.

## Production browser run

The built `dist/` was served with Vite preview at `http://localhost:4173/`. All levels were completed using only the player-facing **One logical hint** button; unlocks and Next level were exercised in order. No developer-state injection or hidden mine reads were used by the browser test.

| Level | Hint actions | Safe cells cleared |
| --- | ---: | ---: |
| First steps | 4 | 22/22 |
| Clear thinking | 9 | 31/31 |
| Another perspective | 10 | 44/44 |
| Three little worlds | 29 | 93/93 |
| Look up | 14 | 44/44 |
| Look down | 22 | 44/44 |
| Hidden connections | 22 | 66/66 |

The mixed level's solver trace uses both upward and downward clues. Each campaign test requires a nontrivial opening (not an automatic win). These proofs establish solvability under the supported deduction rules, not subjective difficulty or tutorial quality.

## Additional browser checks

- An intentional mine hit showed loss; Retry restored the exact visible opening. Flag and campaign progress survived reload.
- Explicit chord control increased cleared cells from 37/44 to 38/44 with correctly matched target flags.
- An upward interior clue highlighted nine cells on the adjacent floor; a downward edge clue highlighted six cells, including the aligned coordinate and excluding its own floor.
- Active floor, exploded view and Inspect mode survived reload together.
- Hold for 650ms changed mines left from 9 to 8 once, with cleared cells unchanged. Dragging the board and tapping an inactive floor left cleared cells unchanged.
- Keyboard flagging/navigation and HTML board states were exercised. The HTML grid has row/cell semantics and direction-specific labels.
- Responsive checks at 320px, 390px and 768px showed document width equal to viewport width. Focus and exploded views were inspected; inactive layers remain dimmed and cannot intercept active-floor picking.
- Rules dialog kept the active-play timer unchanged while open.
- Free-play Retry retained the displayed seed; New puzzle changed it.
- No browser console warnings/errors in the final production campaign run.

A transient browser approval timeout interrupted one development rerun. Retrying the same action succeeded; the complete production run subsequently passed.

## Limits and handoff

Physical iOS/Android multitouch, screen-reader audio output, cross-browser GPU compatibility and long-session performance were not available in this environment. Pinch interruption is covered by pure gesture tests; physical touch feel is for the user's game-testing pass.

Random free play may require guessing. Hints assume player flags are correct. The curated campaign's no-guess guarantee applies to its fixed openings and supported visible-information deductions. Only seven introductory levels are shipped; this is the Step-3 milestone, not the proposed complete 32-level campaign.

Local saves are browser/origin-specific and can be cleared by the browser. The tested preview has all seven levels unlocked from the validation run so Connected is immediately available. Choose Retry to replay any selected level.

A [production screenshot](docs/connected-preview.jpg) records an inspected upward clue in exploded view. Camera fit was also checked after reset; wheel/pinch zoom intentionally permits closer, cropped views.

## Double-click / double-tap chording update

The suite now has **71 passing tests**. Twelve additional cases cover matching revealed-tile taps, distinct touch pointer IDs, timing and tile/floor boundaries, hidden-first-reveal protection, drag/pinch/hold/right-click/cancel interruptions, and Classic/Connected chord integration. The existing chord engine still requires matching target flags and preserves incorrect-flag loss behavior.

Browser checks on the production build confirmed a 3D double-click and an HTML-grid double-click each increased cleared tiles from 17/22 to 18/22 with a correctly flagged neighbor. Without flags, double-clicking left cleared tiles at 17/22 and displayed the flag-count requirement. The HTML-grid check also covered opening a previously closed inspector without moving the number away from the second click. Physical-device double tapping remains for hardware testing; simulated pointer sequences cover that input path.

## Simplified touch UI and random-board update

The current suite has **95 passing tests across eight files**. Added coverage includes Windows-style presets, 30-column validation, different seeded mine/clue layouts, Expert three-floor save/restore, 8× camera zoom/pan math, and active-floor instanced picking. A 30×16×3 hidden board batches 1,440 tiles into nine meshes in the renderer test.

The play screen now has Menu plus large Reveal / Flag / Hint controls, with floor buttons only when needed. Primary controls measure 52–56px; floor/clue controls are at least 44px. The main page fits at 320×568, 390×844 and 844×390 without page scrolling or horizontal overflow. Menu/Rules pause timing; the independently playable 2D sheet retains its own modes, hints, floor selection, clue actions, terminal feedback and focus recovery.

Browser checks verified:

- A fresh origin starts in Random Beginner 9×9. New random puzzle changes the full seed; Retry preserves it.
- Connected floors are available before completing lessons. Small, Beginner, Intermediate and Expert create 6×6, 9×9, 16×16 and 30×16 boards with 6, 10, 40 and 99 mines per floor. Three-floor Expert displays 297 mines and 1,143 safe cells.
- Expert zoom and drag-pan leave revealed counts unchanged. Camera reset restores the overview; unit tests cover fitting and both-axis pan without auto-fit cancelling zoom.
- A 650ms hold flags once without revealing or selecting text on both the 3D and 2D boards. Double-click chording still increases the classic fixture from 17/22 to 18/22 afterward. Selection/callout suppression is scoped to play surfaces and controls; help/seed text remains selectable.
- Connected inspection reaches the adjacent floor and highlights the exact nine-cell footprint. An edge downward clue clips to six targets.
- The entire seven-lesson learning sequence completes through the 2D sheet's visible Hint/Next controls. Keyboard Enter in Flag mode flags a cell; F toggles it back. 2D loss exposes an in-sheet Retry and restores the same opening; completion focuses Continue.
- Saved Flag mode, active floor and all-floor view survive reload. Older independent random attempts are retained until the player requests a new puzzle; new multi-floor random games always use Connected.

Random puzzles may require guesses. Existing learning sessions intentionally keep their fixed layouts, and saved games resume their seed rather than silently regenerating. Physical iOS/Android touch behavior and long-session hardware performance still need device testing.

## Sound update

The suite now has **103 passing tests across nine files**. Audio tests cover lazy gesture unlocking (no page-load playback), all four finite cues and voice cleanup, saved mute and silencing active voices, mute during pending permission, missing audio support, rejected resumes and storage/device failures. The production build passes. Browser checks confirmed Sound on/off, mute persistence after reload, re-enabling and a normal flag/hint action without console warnings/errors. Exported WAV previews use the same note data; waveform checks verify finite, non-silent, unclipped samples. Physical speaker/headphone loudness and mobile audio routing were not checked.

## Collection restructure: Puzzles / Petals

The relocated game and new catalog/transfer checks pass **110 tests across 10 files**. The Vite build emits a standalone hub and `/games/petals/index.html`; the hub's approximately 2kB-gzip JavaScript does not import Three.js. Petals retains its renderer/input/audio behavior and legacy save identifiers.

Browser checks verified one playable and 20 planned catalog cards, native hub → Petals → hub navigation, direct game refresh, retained seed/floor/Flag/mute, and no console warnings/errors on the tested navigation path. A 9×9 Connected transfer fixture restored floor 2, Flag, All floors, elapsed 91 seconds and its seed. A malformed file was rejected without changing that seed; the exported JSON matched the imported game and session metadata.

Icon artwork remains deferred: 21 draft per-game prompts plus shared Iconfactory-inspired direction are saved under `docs/art/`. Current CSS/monogram miniatures are interim artwork. The repository has been renamed to `hendrasaputra/minipuzzles`. Domain cutover is checked separately after deployment.

The collection is deployed from `hendrasaputra/minipuzzles` at **https://puzzles.hensap.id/**. GitHub reports the certificate approved for that hostname and HTTPS enforcement enabled. Live hub and Petals HTML/assets match the tested multi-page build. Hub responsive checks pass at 320/390/1100px without horizontal overflow; Petals still fits 320×568 with a 48px back target and 52px Menu control.

## Generated icon family

All 21 catalog icons were generated with built-in GPT Image, using Petals v03 as the style/composition reference. Petals v01/v02 transparent drafts remain archived; v03 is the selected opaque app-icon master. Every other subject has an unmodified v01 master, exact request and review notes. `docs/art/assets.json` records paths, actual dimensions and SHA-256 hashes. Runtime PNGs are 384×384 exports; originals remain unmodified.

Browser review checked every subject at 128px/light and 64px/dark, with the production rounded mask/backing bleed. All 42 review images and all 21 shelf images loaded at 384px natural size; no console warnings/errors or horizontal overflow at 1100px. The one-playable/20-planned catalog distinction is unchanged. Opaque corner mattes require the documented rounded mask; these are not standalone transparent cutouts.

The existing 110 tests and production build pass. New art does not implement the 20 planned games. Physical-device color checks and owner aesthetic feedback remain outside this batch.

Publication of this generated-icon batch is pending owner approval after automatic review rejected the commit/push. No icon-batch commit was made; the previous live deployment is unchanged.

## Traffic Garden vertical slice

Local verification: **152 tests across 15 files pass**, and `npm run build` emits the hub, Petals and Traffic Garden pages. The 42 new tests cover sliding legality, blockers/edges, win/undo, shortest solutions, deterministic generation/difficulty, projected picking/drag cancellation and snapping, and bounded save validation/history replay. The existing Petals tests remain passing. The only build warning is the existing large Petals/Three.js chunk; Traffic Garden's own entry is 22.02kB / 8.71kB gzip, with no added dependencies.

Production-preview browser checks at localhost:4173 verified:

- Easy completion in 2 moves, saved win after reload, and undo reopening play.
- Hard completion at its 11-move par using visible hints; Medium generation with 9-move par.
- Native car selection, arrow-key movement and direct canvas drag each update legal positions and move count. A Medium car moved from row 4 to row 3 with ArrowUp, then to row 2 with a drag.
- Retry retains the seed; New random puzzle changes it. Difficulty, seed, selected car, progress and shared mute restore after reload. Mute toggles without console warnings/errors.
- No horizontal or vertical page overflow at 320×568, 390×844 or 844×390. Main buttons are 52–56px tall; landscape places controls beside the board. The menu scrolls independently.
- Hub shows two real play links and 19 planned entries. Hub → Petals → hub → Traffic Garden and direct refresh work. Existing Petals Connected progress still loads. The tested browser path has no console warnings/errors.

[Mobile screenshot](docs/traffic-garden-preview.jpg). Puzzle rules, solver and generation stay independent of the Canvas renderer. Generation currently draws from 13 verified layout families with seeded scrambles; this limits structural variety. No physical iOS/Android touch or speaker checks were performed. Traffic Garden has local saves but no file transfer UI.

Traffic Garden and the generated icon batch are local and uncommitted. The live site remains the previous deployment; publication awaits explicit owner approval after the icon commit/push was rejected by automatic approval review.

The owner explicitly authorized publishing Traffic Garden and the icons on 4 November 2026, resolving the earlier approval block. Live deployment verification follows below.

## Published Traffic Garden and icon set

On 4 November 2026 the owner explicitly requested publication. Commit **d584e90** was pushed to main. [Pages run 41743698825](https://github.com/hendrasaputra/minipuzzles/actions/runs/41743698825) completed successfully. Live HTTPS browser checks confirmed two playable shelf entries, all 21 icons loaded at natural width 384, native navigation to `/games/traffic-garden/`, and a Hint changing the displayed move count from 0 to 1. [Live screenshot](docs/traffic-garden-live.jpg). The earlier approval block is resolved.

## Crate Garden local vertical slice

**179 tests across 18 files pass**; the production build emits four HTML pages. The 27 new tests cover pure push/walk legality, no pulling or double pushing, boundaries, undo/win, validated level definitions, every curated solution, solver non-mutation/budget, input projection/swipe/tap/cancel/multiple pointers and bounded save replay. Existing Petals and Traffic Garden tests remain passing. Only the pre-existing Petals/Three.js large-chunk build warning remains. Crate Garden's own entry is about 15.7kB / 6.4kB gzip, with no new dependencies.

Browser checks on the production preview:

- First garden completed using a large east button and ArrowRight in 2 steps/2 pushes. Reload restored the win; Undo restored 1 step/1 push; an isometric east swipe completed it again.
- Gardens 2–8 completed through visible Hint/Next controls in 8, 9, 12, 16, 20, 25 and 29 steps. The last completion exposes Choose a garden. Menu displays all eight completed check marks; these survive reload.
- Level selection returns to a fresh chosen garden while retaining completion marks. The independent save key restores the selected garden after direct refresh. Shared mute remains off from the earlier game setting.
- No page overflow at 320×568, 390×844 or 844×390. Walk controls are at least 52px high; primary actions are 52–56px. The 7×7 board remains contained in portrait and landscape.
- The local shelf has three real playable links and 18 planned entries. Hub → Crate Garden, back, and direct refresh work. No console warnings/errors on the tested path.

[Crate Garden phone screenshot](docs/crate-garden-preview.jpg). Crate Garden remains local and uncommitted for review; the live release is d584e90 (Petals, Traffic Garden and icons). Physical iOS/Android touch/audio checks were not performed. The first version has eight fixed gardens, bounded solver hints, unlimited undo and no save transfer UI or automatic deadlock detection.

## Shared 3D rotation (local)

On 4 November 2026, Traffic Garden and Crate Garden were migrated from fixed Canvas views to actual Three.js geometry using the shared miniature camera. **183 tests across 19 files pass**, and the production build succeeds without warnings. New camera checks fit the board and roundtrip picking through a full horizontal orbit and the supported tilt range, exercise zoom/cancel/mode isolation, and pick the actual frontmost geometry. Game input tests use arbitrary rotated projected axes and verify cancellation/blocked moves. Earlier Canvas-only tests were replaced with camera-relative input checks. Existing engine/save tests and Petals camera tests remain passing.

Browser evidence:

- Crate Garden orbit/tilt changed the visible side of the garden while preserving 12 steps / 4 pushes. Rotate-mode keyboard control likewise left progress unchanged. Play-mode downward swipe after rotation changed 12 to 13 steps, then Undo restored 12.
- Traffic Garden orbit preserved 0 moves. After switching to Play, dragging the rotated Car 9 moved it from row 5, column 4 to column 3 and incremented moves once. Undo restored the original position/count. Reset camera restored the default isometric view.
- Button direction glyphs follow the current projected axes. Rotate, Play and reset controls measure at least 44×44px. Mobile 320×568 and landscape 844×390 fit without page overflow. The full rotated board remains visible at default zoom; zoom intentionally allows cropping.
- Existing Petals Connected progress (floor 2, Flag, 92/142 cleared, 20 mines left) still loads. A drag rotates its board without changing progress. Hub/game navigation continues working. No console warnings/errors were observed on the tested path.

[Rotated Crate Garden screenshot](docs/crate-garden-rotation.jpg). Camera orientation/mode are transient and do not alter save schemas, seeds or level layouts. The shared Three.js engine increases Traffic/Crate downloads by roughly 122kB gzip versus the former Canvas implementation; it is cached across games and excluded from the hub. No dependency was added.

This update is local and uncommitted; d584e90 remains the live release. Physical iOS/Android pinch behavior, GPU frame cost and unsupported-WebGL fallback were not hardware-tested.

## Published three-game 3D rotation release

Owner-authorized publication on 4 November 2026: commit **3e2eef4**, [successful Pages run 41749026138](https://github.com/hendrasaputra/minipuzzles/actions/runs/41749026138). Live HTTPS checks verified the three playable shelf links, Crate Garden and Traffic Garden Play/Rotate/reset controls, visible camera orbit without puzzle progress changes, and Petals loading with its existing progress. No console warnings/errors occurred on the tested navigation. [Live rotation screenshot](docs/rotation-live.jpg). This supersedes the earlier local-only rotation status.

## Crystal Light local vertical slice

**218 tests across 22 files pass**, and the production build emits five HTML pages without warnings. New tests cover all eight reflection cases, transparent targets, wall/edge stopping, loop bounds, validation, undo/win, solver minimality/non-mutation/budget, all eight level solutions, tap/drag/cancel/multitouch/mode isolation, bounded save replay and disposal/non-picking of decorative shared meshes. Earlier game suites remain passing. Crystal Light's own entry is about 15.8kB / 6.2kB gzip plus the existing shared Three.js/camera/audio chunks; no new dependency was added.

Browser checks on the production preview verified:

- A direct tap on the first brass mirror turns it exactly once and completes the first puzzle (1 turn, 1/1 crystals). Reload restores the win; Undo reopens it; board Enter turns it to win again.
- The other seven levels complete via visible Hint/Next controls in 2,2,3,3,4,5,5 turns, lighting every required crystal. Final Choose a light opens the picker; all eight check marks and completion total survive reload.
- The mirror dropdown + Turn changes the chosen mirror. Rotation/orbit/tilt leaves the turn count unchanged. Shared mute remains restored. Native selector/keyboard controls remain available when a mirror is visually edge-on.
- 320×568, 390×844 and 844×390 fit without horizontal or vertical page overflow. Camera controls are at least 44px; Turn/actions are 52–56px. The landscape layout places the board beside controls.
- The local shelf has four playable links and 17 planned entries. Hub → Crystal Light → hub and direct refresh restore the chosen completed light and selection. No console warnings/errors were observed.

[Crystal Light mobile screenshot](docs/crystal-light-preview.jpg). Crystal Light and its shared shape helper are local and uncommitted, while the live site remains the verified three-game 3e2eef4 release. Physical iOS/Android touch/pinch, speaker output and GPU performance have not been hardware-tested. The first version uses eight fixed lights and has no save transfer UI.

## Crystal Light flowing lasers (local)

222 tests across23 files pass; production build passes. Four new checks cover route interpolation at mirror corners/endpoints, bounded wrapping at blockers, animation without engine mutation, single frame-loop ownership, visibility/page lifecycle and reduced motion. Effects use at most80 meshes, update up to30fps, allocate no frame geometry, and redraw with cached shadow maps.

Browser review confirmed motion between two otherwise unchanged screenshots:1,727 pixels changed above threshold15, all confined to beam-region bounds (479,223)–(817,449) in the1280×720 view. Outer orbit stayed at4 turns/6 of6 crystals, and camera rotation remained functional with no console warnings/errors. No real-device GPU/battery or reduced-motion hardware setting was checked; unit tests cover the motion-preference path. Effects remain local with Crystal Light.

## Published Crystal Light and animated lasers

After explicit owner approval, **8bfeee8** was pushed and [Pages run 41753843808](https://github.com/hendrasaputra/minipuzzles/actions/runs/41753843808) succeeded. Live HTTPS browser checks confirmed the four-game shelf, Crystal Light entry, first mirror turn completing at 1 turn / 1 crystal, animated laser assets and no console warnings/errors. [Live screenshot](docs/crystal-light-live.jpg). The earlier automatic approval rejection is resolved.

## Water Garden local vertical slice

**261 tests across 26 files pass** and the production build emits six HTML pages without warnings. The 39 new tests cover rotations/ports, reciprocal flow, branches and terminal flowers, blocked/dry/cyclic routes, validation, all eight solver solutions, solver bounds/non-mutation, undo/win, gesture isolation, wet/dry geometry and validated save replay. Existing four-game tests remain passing. Water Garden's own entry is about 16.8kB / 6.7kB gzip plus existing shared engine/camera/audio assets; no new dependency was added.

Browser checks on production preview:

- Direct channel tap completes First sip at 1 turn / 1 flower. Reload preserves the win; Undo reopens it; board Enter completes it again.
- The remaining seven gardens complete via visible Hint/Next controls in 2, 3, 3, 4, 5, 6, 7 turns. Branching gardens water all two/three targets, visibly turn channels blue and brighten blossoms. All eight completion marks survive reload.
- Picking another garden resets its opening while retaining completed marks. Camera orbit/tilt leaves 0 turns unchanged. Dropdown + Turn rotates the selected channel, with its opening directions exposed in the native options. Shared mute remains restored.
- 320×568, 390×844 and 844×390 fit without page overflow. Shared camera targets remain 44px; primary controls are 52–56px. Landscape places the board beside controls.
- Local shelf shows five real play links and 16 planned entries. Hub → Water Garden and direct refresh restore the chosen level/selection/progress. No console warnings/errors on the tested path.

[Water Garden mobile preview](docs/water-garden-preview.jpg). Water Garden remains local and uncommitted; the published release is 8bfeee8 with four games. Physical iOS/Android input/GPU performance was not tested. The first version uses eight fixed gardens, static water surfaces and local saves without export/import.

## Animated water and shared material controller

269 tests across28 files pass; production build passes without warnings. Shared MaterialMotion tests verify one capped30fps loop, hidden/page lifecycle pausing, resumption and live reduced-motion preferences. Water tests verify particles stay within valid wet segments, cap64foam particles plus6bubbles/3rings, ignore raycasting and shadows, retain picking/input safety and rebuild with changed routes. Crystal laser tests remain passing after sharing the controller.

Browser review found348 changed pixels above threshold15 between two no-input frames, confined to the spring/wet-region bounds (479,287)–(737,353) at1280×720. Blooming network stays at7turns/3flowers; undo restores6turns/1flower and Hint returns7/3 without stale water routes or console errors. [Animated water screenshot](docs/water-garden-motion.jpg). Physical-phone GPU/battery performance remains unmeasured. Owner explicitly authorized publication of this Water Garden/material-effects release.

## Published animated Water Garden

Commit **569cf93** and [Pages run 41755490204](https://github.com/hendrasaputra/minipuzzles/actions/runs/41755490204) completed successfully. Live HTTPS browser checks verified five playable shelf links, animated spring/water surfaces, Water Garden first-turn completion and no console warnings/errors. [Live water screenshot](docs/water-garden-live.jpg). This supersedes earlier local-only Water Garden status.

## Frosty Paths local vertical slice

**301 tests across32 files pass** and production build emits seven HTML pages without warnings. The32 new checks cover slide boundaries/rocks, blocked/no-count moves, passing fish pickup, stopping-only home completion, validation, undo/win, all eight solutions, bounded/non-mutating hints, saved fish/direction replay, camera-relative input/cancellation, eased axis-aligned slides and capped non-pickable ice effects. Existing five-game suites remain passing. Frosty Paths' own entry is about17.4kB /7.0kB gzip plus existing shared renderer/material/audio assets; no dependencies were added.

Browser checks verified:

- First glide collects its fish with Slide east, then ArrowUp wins in2 slides. Reload restores the win. Undo reopens it at1slide/1fish; a second Undo restores0slides/0fish.
- The other seven paths complete through visible Hint/Next in3,4,5,6,7,9,11 slides, each with every fish and a final stop at home. All eight completion marks survive reload.
- Camera orbit preserves0slides/0fish. A rotated up-right swipe plays the east slide, reaches1slide/1fish, and Undo restores the opening. Button glyphs follow the camera. Shared mute stays restored.
- 320×568,390×844 and844×390 fit without page overflow. Shared camera controls are44px; slide/action controls are52–56px. The board and controls adapt to landscape.
- Local shelf has six real play links and15 planned entries. Hub → Frosty Paths, back and direct refresh restore the selected path/progress. No console warnings/errors on the tested path.

[Frosty Paths mobile preview](docs/frosty-paths-preview.jpg). Frosty Paths is local and uncommitted; the live release remains569cf93 with five games and animated water/lasers. Physical iOS/Android input, GPU/battery performance and hardware motion-preference behavior remain untested.

## Published Frosty Paths

On 4 November 2026, source commit **5420daf** deployed through [successful Pages run 41758892888](https://github.com/hendrasaputra/minipuzzles/actions/runs/41758892888). **301 tests pass** and the production build passes locally and in CI. Live HTTPS browser checks verified:

- The hub lists six playable games, including Frosty Paths, with real native links.
- Rotate mode orbits the full 3D board and changes direction glyphs while preserving 0 slides / 0 fish.
- Play mode east then north collects the fish and wins First glide at 2 slides / 1 fish. Reload preserves that win; hub navigation returns to the saved game.
- Ice glints, snow and eased sliding remain in the published build. The prior unit checks cover capped decorative meshes, interpolation and reduced-motion/visibility handling. No console warnings/errors appeared on the tested route.

[Live Frosty Paths screenshot](docs/frosty-paths-live.jpg). This supersedes the earlier local-only status. Physical-device touch, GPU and battery checks remain pending.

## Random puzzle release checks

- Petals preset and campaign tests pass. Traffic Garden's seeded difficulty tests pass.
- Generated puzzles are checked for deterministic openings, variety, solvability, and difficulty. Save tests cover authored and random runs.
- Browser checks completed Hard puzzles with hints in Crate Garden, Crystal Light, Water Garden, and Frosty Paths. All four restored a move after reload. Crate Garden's random controls fit a 320 px viewport.

Pages run 41780702050 deployed the random puzzle update from 4f6a396. Public browser checks found Easy, Medium, and Hard controls in all four updated menus.

## Plain language and visual help

Browser checks at 320 × 568 opened four help examples in each game, including the local Marble Workshop. The guide animations were active and no page had horizontal overflow. The production build passes with a shared bundle size warning.

## Marble Workshop local preview

Browser checks covered a failed roll, a successful first level, camera orbit, and a generated Hard route completed in 9 turns. Reload preserved that win. A 320 × 568 viewport fit the board and controls with 44 px camera buttons and 52 px action buttons. Engine tests verify all eight authored layouts and 60 random seeds. Animation tests cover curves, rolling rotation, stopping at gaps, and reduced motion. Physical phone performance remains untested.

Pages run 41781709537 deployed the simpler shelf and animated help from 4edaea3. The live shelf shows six playable games and groups planned games under Coming soon. The live Crystal Light menu opens four animated examples. The local shelf opens Marble Workshop as its seventh game. The final local build passed all 344 tests.

Marble Workshop passed 345 tests and the production build before publication. At 390 × 844, a tap on the marble stopped at a gap before the track was fixed and reached the cup after one turn. The Roll button completed the same path. Camera rotation preserved the win and the page fit the viewport.

Pages run 41782249698 deployed Marble Workshop from 34b1411. The public page shows tap-to-roll instructions and the Roll button. The shelf contains seven playable links and opens the Marble Workshop page.

Shadow Blocks and Picture Islands passed local browser checks. Shadow Blocks completed its first level with three hints and restored the win. Picture Islands supported arrow navigation on the flat board, completed its first picture, and restored the win. Both opened from the nine-game local shelf, generated Hard puzzles, and fit a 320 px viewport without horizontal overflow. All 364 tests and the production build passed. The build retains the shared bundle size warning. Physical phone testing remains open.

At 320 × 568, the updated Shadow Blocks tutorial highlighted A1 and then B2. Three direct taps completed the first level. Both outlines updated with each edit. The camera controls cleared the board, and How to play opened the visual guide without horizontal overflow.

The separate Shadow Blocks diagrams fit a 320 × 568 viewport. One direct tap on A1 added one square to Your shadow in each panel. Both Goal diagrams stayed fixed. See example opened the placed-block illustration.

The 81dd22e release passed 364 tests and the production build. Live browser checks confirmed nine playable links, separate Goal and Your shadow panels in Shadow Blocks, and the illustrated 2 1 clue in Picture Islands.

Pocket Railroads passed the 370-test suite and production build. On a 390 × 844 viewport, a wrong send returned the train, Station B delivery persisted across reload, and Station A completed the level. The local shelf link and visual guide work. The build retains the shared bundle size warning. Physical phone performance remains untested.
