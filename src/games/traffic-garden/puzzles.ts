import { createGame, legalMoves, moveCar, type Difficulty, type Move, type Puzzle } from './engine';
import { solve } from './solver';

type Layout = readonly (readonly [number, number, 2 | 3, 'h' | 'v'])[];
// shortcut: scrambles use thirteen verified lane families; add families when puzzle variety needs expanding.
const LAYOUTS: Record<Difficulty, readonly Layout[]> = {
  easy: [
    [[0,2,2,"h"],[3,1,2,"v"],[1,4,3,"h"],[5,3,2,"v"],[0,0,2,"h"],[0,4,2,"v"]],
    [[1,2,2,"h"],[4,0,3,"v"],[3,5,3,"h"],[0,0,2,"v"],[0,3,2,"h"],[2,4,2,"h"]],
    [[0,2,2,"h"],[2,1,2,"v"],[4,2,2,"v"],[0,0,2,"h"],[1,4,3,"h"],[5,4,2,"v"]],
  ],
  medium: [
    [[0,2,2,"h"],[3,3,2,"v"],[2,4,2,"v"],[2,1,2,"v"],[1,3,2,"h"],[4,3,2,"v"],[5,0,2,"v"],[4,5,2,"h"],[5,3,2,"v"],[0,0,3,"h"]],
    [[1,2,2,"h"],[4,3,2,"h"],[4,0,2,"h"],[3,0,3,"v"],[5,1,2,"v"],[0,1,2,"v"],[2,0,2,"v"],[4,1,2,"v"],[1,3,3,"v"],[4,4,2,"h"],[1,0,2,"v"]],
    [[1,2,2,"h"],[4,0,2,"v"],[1,3,3,"h"],[0,0,3,"h"],[2,4,2,"h"],[0,4,2,"v"],[3,0,3,"v"],[2,5,3,"h"]],
  ],
  hard: [
    [[0,2,2,"h"],[3,3,2,"v"],[2,4,2,"v"],[2,2,2,"v"],[4,3,2,"h"],[4,1,2,"v"],[5,0,2,"v"],[3,5,2,"h"],[5,4,2,"v"],[0,0,3,"h"]],
    [[1,2,2,"h"],[3,3,2,"h"],[4,0,2,"h"],[3,0,3,"v"],[5,2,2,"v"],[0,4,2,"v"],[2,0,2,"v"],[4,1,2,"v"],[1,3,3,"v"],[2,4,2,"h"],[1,0,2,"v"]],
    [[2,2,2,"h"],[3,0,2,"v"],[4,1,2,"h"],[4,2,3,"v"],[5,2,2,"v"],[0,3,3,"v"],[1,4,2,"h"],[5,4,2,"v"],[0,1,2,"h"],[4,0,2,"h"],[1,3,3,"h"],[0,0,3,"h"]],
    [[0,2,2,"h"],[4,2,2,"v"],[0,3,3,"h"],[1,0,3,"h"],[1,4,2,"h"],[0,4,2,"v"],[3,1,3,"v"],[1,5,3,"h"]],
    [[0,2,2,"h"],[4,2,2,"v"],[5,1,2,"v"],[0,3,3,"h"],[3,5,2,"h"],[3,1,3,"v"],[2,1,2,"v"],[1,5,2,"h"],[1,4,3,"h"],[0,0,2,"h"],[0,4,2,"v"]],
    [[2,2,2,"h"],[2,3,3,"v"],[1,1,3,"h"],[4,5,2,"h"],[0,4,2,"v"],[0,0,2,"h"],[0,1,2,"v"],[1,4,2,"v"],[2,0,2,"h"],[4,0,3,"v"]],
    [[0,2,2,"h"],[4,4,2,"h"],[4,1,2,"v"],[3,1,2,"v"],[2,2,2,"v"],[2,4,2,"h"],[0,3,2,"v"],[3,5,2,"h"],[1,1,2,"h"],[0,0,2,"v"],[1,3,2,"v"]],
  ],
};
const COLORS = ['#df8c83','#b7c7a0','#9fc8c6','#b5add7','#e1c59a','#a9c8cc','#d9abc0','#c0bacb','#d9b998','#c4c9ad','#b4cddc','#d4bba4'];
const RANGES: Record<Difficulty, readonly [number, number]> = { easy: [2,4], medium: [5,9], hard: [10,30] };

function random(seed: string): () => number {
  let state = 2166136261;
  for (let i = 0; i < seed.length; i++) state = Math.imul(state ^ seed.charCodeAt(i), 16777619);
  return () => {
    state += 0x6d2b79f5;
    let n = Math.imul(state ^ (state >>> 15), state | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
function puzzle(layout: Layout, seed: string, difficulty: Difficulty): Puzzle {
  return { seed, difficulty, cars: layout.map(([x,y,length,axis], i) => ({ id: i === 0 ? 'coral' : `car-${i}`, x,y,length,axis,color:COLORS[i] })) };
}

/** Bounded seeded scrambles with solver-verified difficulty, never unsolvable random parking. */
export function generatePuzzle(seed: string, difficulty: Difficulty): Puzzle {
  if (typeof seed !== 'string' || !seed.length || seed.length > 128 || !Object.hasOwn(LAYOUTS, difficulty)) throw new RangeError('Invalid traffic generation settings');
  const next = random(seed), layouts = LAYOUTS[difficulty], [minimum, maximum] = RANGES[difficulty];
  let fallback: Puzzle | undefined;
  for (let attempt = 0; attempt < 24; attempt++) {
    const base = puzzle(layouts[Math.floor(next() * layouts.length)], seed, difficulty);
    fallback ??= base;
    const game = createGame(base);
    const steps = difficulty === 'hard' ? 2 + Math.floor(next() * 15) : 12 + Math.floor(next() * 65);
    let last: Move | undefined;
    for (let i = 0; i < steps; i++) {
      const moves = legalMoves(game).filter(move => !(move.id === 'coral' && game.cars[0].x + move.delta === 6)
        && !(last && move.id === last.id && move.delta === -last.delta));
      if (!moves.length) break;
      const move = moves[Math.floor(next() * moves.length)];
      moveCar(game, move.id, move.delta); last = move;
    }
    if (game.cars[0].x > 2) continue;
    const solution = solve(game, 30000);
    if (solution && solution.length >= minimum && solution.length <= maximum) {
      return { seed, difficulty, cars: game.cars.map(car => ({ ...car })), par: solution.length };
    }
  }
  // A bounded search must keep the advertised difficulty when a scramble misses its range.
  const verified = createGame(fallback!);
  const solution = solve(verified, 50000);
  if (!solution || solution.length < minimum || solution.length > maximum) throw new Error('Traffic template failed validation');
  return { ...fallback!, par: solution.length };
}
