import { describe, expect, it } from 'vitest';
import { createGame, moveCar, validatePuzzle, type Difficulty } from './engine';
import { generatePuzzle } from './puzzles';
import { solve } from './solver';

describe('seeded parking jams', () => {
  it.each(['easy', 'medium', 'hard'] as const)('%s boards are deterministic and have verified matching difficulty', difficulty => {
    const minimum = { easy: 2, medium: 5, hard: 10 }[difficulty], maximum = { easy: 4, medium: 9, hard: 30 }[difficulty];
    const seen = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const puzzle = generatePuzzle(`traffic-check-${i}`, difficulty);
      expect(generatePuzzle(`traffic-check-${i}`, difficulty)).toEqual(puzzle);
      expect(validatePuzzle(puzzle)).toEqual(puzzle);
      expect(puzzle.cars.find(car => car.id === 'coral')!.x).toBeLessThanOrEqual(2);
      if (difficulty === 'easy') expect(puzzle.cars.length).toBeLessThanOrEqual(6);
      const game = createGame(puzzle), answer = solve(game)!;
      expect(answer).not.toBeNull(); expect(answer.length).toBe(puzzle.par);
      expect(answer.length).toBeGreaterThanOrEqual(minimum); expect(answer.length).toBeLessThanOrEqual(maximum);
      for (const move of answer) expect(moveCar(game, move.id, move.delta)).toBe(true);
      expect(game.status).toBe('won');
      seen.add(JSON.stringify(puzzle.cars));
    }
    expect(seen.size).toBeGreaterThan(8);
  });

  it('rejects invalid generation parameters', () => {
    expect(() => generatePuzzle('', 'easy')).toThrow(RangeError);
    expect(() => generatePuzzle('x'.repeat(129), 'easy')).toThrow(RangeError);
    expect(() => generatePuzzle('seed', 'unknown' as Difficulty)).toThrow(RangeError);
  });
});
