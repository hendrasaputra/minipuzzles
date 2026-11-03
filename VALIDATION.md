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
