import { describe, expect, it } from 'vitest';
import { createGame, rotate, run, solve } from './engine';
import { generateWorkshop, type RandomWorkshop } from './random';

describe('random marble workshops', () => {
  it.each([
    { difficulty: 'easy', min: 2, max: 4, size: 5 },
    { difficulty: 'medium', min: 5, max: 7, size: 6 },
    { difficulty: 'hard', min: 8, max: 11, size: 7 },
  ] as const)('creates varied $difficulty routes and solvable openings in range', tier => {
    const routes = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const spec: RandomWorkshop = { seed: `route-${i}`, difficulty: tier.difficulty, version: 1 };
      const level = generateWorkshop(spec);
      if (i === 0) expect(generateWorkshop(spec)).toEqual(level);
      expect(level.width).toBe(tier.size);
      routes.add(JSON.stringify([level.source, level.tracks.map(({ x, y }) => [x, y]), level.goal]));
      const game = createGame(level);
      const solution = solve(game);
      expect(solution.length).toBeGreaterThanOrEqual(tier.min);
      expect(solution.length).toBeLessThanOrEqual(tier.max);
      expect(run(game)).toBe(false);
      for (const id of solution) expect(rotate(game, id)).toBe(true);
      expect(run(game)).toBe(true);
    }
    expect(routes.size).toBeGreaterThanOrEqual(18);
  });
});
