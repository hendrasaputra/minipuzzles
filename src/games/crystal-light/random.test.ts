import { describe, expect, it, vi } from 'vitest';
import * as randomness from '../../shared/random-puzzle';
import { createGame, rotate, solve } from './engine';
import { generateRandomLight } from './random';

const tiers = [
  { difficulty: 'easy', min: 1, max: 2, crystals: 1 },
  { difficulty: 'medium', min: 3, max: 4, crystals: 2 },
  { difficulty: 'hard', min: 5, max: 6, crystals: 3 },
] as const;

describe('random Crystal Light puzzles', () => {
  it.each(tiers)('generates varied layouts with $min–$max necessary turns on $difficulty', tier => {
    const layouts = new Set<string>();
    for (let i = 0; i < 16; i++) {
      const spec = { version: 1, seed: `light-${i}`, difficulty: tier.difficulty } as const;
      const level = generateRandomLight(spec);
      const game = createGame(level);
      expect(level.crystals).toHaveLength(tier.crystals);
      const solution = solve(game);
      expect(solution?.length).toBeGreaterThanOrEqual(tier.min);
      expect(solution?.length).toBeLessThanOrEqual(tier.max);
      for (const id of solution!) expect(rotate(game, id)).toBe(true);
      expect(game.status).toBe('won');
      layouts.add(JSON.stringify([level.source, level.mirrors.map(({ x, y }) => [x, y])]));
      expect(generateRandomLight(spec)).toEqual(level);
    }
    expect(layouts.size).toBeGreaterThan(12);
  });

  it('keeps every tier solvable if the random route budget is exhausted', () => {
    const rng = vi.spyOn(randomness, 'seededRandom').mockReturnValue(() => 0);
    try {
      for (const tier of tiers) {
        const level = generateRandomLight({ version: 1, seed: 'fallback', difficulty: tier.difficulty });
        expect(solve(createGame(level))).toHaveLength(tier.min);
      }
    } finally {
      rng.mockRestore();
    }
  });
});
