# Local review

The local shelf includes all 21 games. Use Node.js 22.12+, 24, or 26+.

```sh
npm ci
npm run build
npm run preview
```

Open http://127.0.0.1:4173/ and choose a game. Use Menu to switch levels and start a random puzzle. See example shows the rules on each of the seven new games. Rotate turns the board. Play returns to the game controls on boards where you tap pieces.

| New game | Goal | First puzzle |
| --- | --- | --- |
| Color Stacks | Sort the blocks by color | Move A to C, B to A, then C to B |
| Garden Sudoku | Place each plant once in each row, column, and box | Plant the sunflower in the selected square |
| Rolling Stone | Roll the block and stand it upright on the goal | Roll east twice |
| Stepping Stones | Visit every stone once and finish on F | Step east twice, then south twice |
| Water Balance | Match the target amount in each jug | Pour from A into B |
| Perspective Paths | Turn the board until the blue dot and gold ring overlap | Turn right twice, then press Join |
| Pocket Escape | Read the clues and unlock the door | Inspect the desk and shelf, enter 3 and 5, then press Unlock |

Each new game has eight authored levels, three seeded difficulty tiers, a rotatable board, a visual example, and browser saves. Saves are tied to the browser address, so the preview on port 4173 has separate progress from development on port 5173.
