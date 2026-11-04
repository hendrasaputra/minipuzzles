import { describe, expect, it } from 'vitest';
import { createGame, rotate, solve } from './engine';
import { generateGarden, type RandomGarden } from './random';

describe('random water gardens', () => {
  const tiers = [
    { difficulty: 'easy', min: 3, max: 4, flowers: 1 },
    { difficulty: 'medium', min: 5, max: 7, flowers: 2 },
    { difficulty: 'hard', min: 8, max: 11, flowers: 3 },
  ] as const;

  it.each(tiers)('produces distinct, solvable $difficulty routes within its turn range', ({ difficulty, min, max, flowers }) => {
    const routes = new Set<string>();
    for (let i = 0; i < 8; i++) {
      const puzzle: RandomGarden = { version: 1, seed: `water-${i}`, difficulty };
      const level = generateGarden(puzzle);
      expect(generateGarden(puzzle)).toEqual(level);
      expect(level.flowers).toHaveLength(flowers);
      const game = createGame(level);
      const solution = solve(game);
      expect(solution).not.toBeNull();
      expect(solution!.length).toBeGreaterThanOrEqual(min);
      expect(solution!.length).toBeLessThanOrEqual(max);
      for (const id of solution!) expect(rotate(game, id)).toBe(true);
      expect(game.status).toBe('won');
      routes.add(JSON.stringify([level.source, level.pipes.map(({ x, y, kind }) => [x, y, kind]), level.flowers]));
    }
    expect(routes.size).toBeGreaterThanOrEqual(7);
  });
});
