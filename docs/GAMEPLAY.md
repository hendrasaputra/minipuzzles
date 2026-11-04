# Playing Petals

## Random puzzles

Random play is the default for a new player. **Menu → New random puzzle** creates a fresh seed and layout. Clues are calculated from those mines; numbers are never randomized independently of the puzzle.

**Retry** and reloading a saved game keep the current layout. The complete seed is shown in Menu. Safe starting areas are already revealed. Random puzzles can require guesses; Hint stops when it cannot find a supported deduction.

## Board sizes

Choose a size in **Menu → Board size**:

| Size | Board | Mines per floor |
| --- | --- | ---: |
| Small | 6×6 | 6 |
| Beginner | 9×9 | 10 |
| Intermediate | 16×16 | 40 |
| Expert | 30×16 | 99 |

Beginner, Intermediate and Expert use the familiar Windows Minesweeper dimensions/counts. Connected games can have two or three floors. Volume games can have three or four. The menu shows the mine count per floor and the total.

## Puzzle modes

- **Classic:** eight neighbors on the same floor.
- **Connected floors:** normal numbers remain local; ↑ and ↓ clues count the clipped 3×3 footprint on the immediately adjacent floor, including the aligned tile and excluding their own floor.

- **Volume:** every number counts the eight surrounding tiles on its own floor plus a 3×3 square on each floor directly above and below. That gives up to 26 neighbors.

Choose Connected floors or Volume from **Menu → Game mode**. Tap a clue to highlight the tiles it counts, then use **View floor** or the floor buttons to inspect them. Flood reveal and chording use the same tiles. Open every safe tile to win.

**Learn the rules** is an optional ten-level campaign with fixed, solver-validated openings. Its independent Layered floors are an introductory lesson before Connected and Volume. Existing learning attempts remain resumable. Old independent-floor random attempts remain playable with a visible legacy label; New random puzzle switches them to Connected without silently replacing an in-progress save.

## Touch and mouse

Use the large **Reveal**, **Flag**, and **Hint** buttons. Tap a hidden tile to use the selected action; hold or right-click a tile to flag it. Tap a revealed clue to inspect its neighborhood.

**Double-click or double-tap a revealed number** to open unflagged targets when the flag count matches. Wrong flags can expose a mine. Hold, drag, pinch and cancellation interrupt a double-tap sequence; revealing a hidden tile does not count as the first tap of a chord.

Drag to rotate at normal zoom. Pinch or scroll to zoom up to 8×; once zoomed in, drag to pan to distant tiles. Zooming back out recenters the board. **Menu → Reset camera** restores the overview.

Floor buttons select the active floor. In Menu, **One floor** isolates it; **All floors** separates the stack and dims inactive floors. Inactive floors do not intercept tile actions.

Selection/callout is disabled on the board and play controls so a long hold does not select page text. Help text and the seed remain selectable.

## 2D and keyboard board

Open **Menu → 2D & keyboard board** for a flat grid with its own action controls, floor selector and clue actions. Cells have at least 48px targets; large boards scroll within the sheet. Tap, hold/right-click to flag, and double-tap to chord also work here.

- Arrow keys move between cells.
- Enter/Space uses the selected action.
- F flags, I inspects, and C chords.
- E changes the 3D view; 1–3 selects a floor.

Win/loss feedback and Next/Retry stay inside the 2D sheet. Menu, instructions and a hidden tab pause timing; the playable 2D board does not. Time played is in Menu.

## Saves and the quiet play screen

The normal screen contains the puzzle title, mines left, safe tiles cleared, the board, and primary actions. Floor controls appear only for multiple floors. Clue details and messages share a reserved row so the board stays still during a double tap. Puzzle settings, camera options, learning instructions, time, seed and save details are in Menu.

A v2 browser-local save stores the puzzle, elapsed time, selected floor/view/action, learning level and completed lessons. Older saves migrate; invalid states are rejected. Storage failure leaves play functional and shows a warning. Saves belong to each browser and origin; localhost progress will not transfer automatically to the public domain.

## Sound

Short original synthesized cues mark reveals, flag changes, wins and mine hits. They start only after user interaction; there is no background loop. **Menu → Sound: on/off** mutes them and remembers the preference on this device. Audio support or device errors leave the game playable.

## Library and save transfer

Petals is part of the Puzzles library at `/games/petals/`. The back arrow returns to the game shelf through native navigation; leaving saves the current session.

Before changing domain/device, use **Menu → Export save**. On the destination, open Petals and choose **Menu → Import save**. JSON imports are limited to 1MiB and validate the puzzle and learning-level configuration before replacing the current session. Invalid imports preserve the current game. The export includes progress, flags, floor, view and action mode; sound preference remains device/origin-specific.
