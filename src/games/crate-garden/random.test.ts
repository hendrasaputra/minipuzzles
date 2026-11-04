import { describe, expect, it } from 'vitest';
import { createGame, move, solve } from './engine';
import { randomGarden, type RandomGarden } from './random';

describe('random crate gardens', () => {
  it.each([
    { difficulty: 'easy', min: 2, max: 7, crates: 1, walls: 21, minPushes: 1 },
    { difficulty: 'medium', min: 8, max: 17, crates: 2, walls: 22, minPushes: 3 },
    { difficulty: 'hard', min: 18, max: 45, crates: 3, walls: 27, minPushes: 6 },
  ] as const)('generates distinct, solvable $difficulty openings in its difficulty band', tier => {
    const openings = [];
    for (let i = 0; i < 12; i++) {
      const settings: RandomGarden = { seed: i.toString(16).padStart(32, '0'), difficulty: tier.difficulty, generator: 1 };
      const level = randomGarden(settings);
      if (i === 0) expect(randomGarden(settings)).toEqual(level);
      openings.push(level);
      expect(level.crates.length).toBe(tier.crates);
      const game = createGame(level);
      const solution = solve(game);
      expect(solution).not.toBeNull();
      expect(solution!.length).toBeGreaterThanOrEqual(tier.min);
      expect(solution!.length).toBeLessThanOrEqual(tier.max);
      for (const direction of solution!) expect(move(game, direction)).toBe(true);
      expect(game.status).toBe('won');
      expect(game.pushes).toBeGreaterThanOrEqual(tier.minPushes);
    }
    expect(openings.filter(level => level.walls.length === tier.walls).length).toBeGreaterThanOrEqual(8);
    expect(new Set(openings.map(level => JSON.stringify(level))).size).toBeGreaterThanOrEqual(8);
  });
});
