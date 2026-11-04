import { describe, expect, it } from 'vitest';
import { createGame, move, solve, type Cell } from './engine';
import { generatePath } from './random';

const positions = (cells: Cell[]) => cells.map(cell => `${cell.x},${cell.y}`).sort();

describe('seeded Frosty Paths puzzles', () => {
  it.each([
    ['easy', 2, 4],
    ['medium', 5, 8],
    ['hard', 9, Infinity],
  ] as const)('generates distinct, solvable %s paths in its slide band', (difficulty, min, max) => {
    const layouts = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const selection = { seed: `frost-test-${i}`, difficulty };
      const level = generatePath(selection);
      const game = createGame(level);
      const solution = solve(game)!;
      expect(solution.length).toBeGreaterThanOrEqual(min);
      expect(solution.length).toBeLessThanOrEqual(max);
      for (const direction of solution) expect(move(game, direction)).toBe(true);
      expect(game.status).toBe('won');
      layouts.add(JSON.stringify([level.player, level.goal, positions(level.fish), positions(level.rocks)]));
    }
    expect(layouts.size).toBeGreaterThan(8);
  });

  it('uses the same opening for the same seed and difficulty', () => {
    const selection = { seed: 'same-snow', difficulty: 'hard' } as const;
    expect(generatePath(selection)).toEqual(generatePath(selection));
  });
});
