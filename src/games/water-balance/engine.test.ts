import { describe, expect, it } from 'vitest';
import { complete, createGame, pour, poured, solve, undo, type Amounts } from './engine';
import { levels, randomLevel, ranges, type RandomBalance } from './levels';
import { readSave, writeSave } from './storage';

describe('Water Balance', () => {
  it('stops at the receiving capacity or an empty source and keeps the total water', () => {
    const capacities: Amounts = [6, 4, 2];
    expect(poured(capacities, [6, 0, 0], { from: 0, to: 1 })).toEqual([2, 4, 0]);
    expect(poured(capacities, [0, 4, 2], { from: 2, to: 0 })).toEqual([2, 4, 0]);
    expect(poured(capacities, [2, 4, 0], { from: 0, to: 1 })).toBeUndefined();
    expect(poured(capacities, [2, 4, 0], { from: 2, to: 0 })).toBeUndefined();
    expect(poured(capacities, [2, 4, 0], { from: 0, to: 0 })).toBeUndefined();
  });

  it('solves all eight levels with the expected shortest routes', () => {
    const lengths = levels.map(level => {
      const game = createGame(level);
      const solution = solve(game)!;
      for (const move of solution) expect(pour(game, move)).toBe(true);
      expect(complete(game)).toBe(true);
      expect(undo(game)).toBe(true);
      expect(complete(game)).toBe(false);
      return solution.length;
    });
    expect(lengths).toEqual([1, 2, 3, 4, 5, 7, 9, 11]);
  });

  it('computes hints from a detour without mutating state', () => {
    const game = createGame(levels[0]);
    pour(game, { from: 0, to: 2 });
    const before = JSON.stringify(game);
    const solution = solve(game)!;
    expect(solution.length).toBe(2);
    expect(JSON.stringify(game)).toBe(before);
    for (const move of solution) pour(game, move);
    expect(complete(game)).toBe(true);
  });

  it.each(['easy', 'medium', 'hard'] as const)('builds distinct seeded %s puzzles in their shortest-route band', difficulty => {
    const openings = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const spec: RandomBalance = { version: 1, seed: `jugs-${i}`, difficulty };
      const level = randomLevel(spec);
      expect(randomLevel(spec)).toEqual(level);
      openings.add(JSON.stringify([level.capacities, level.goal]));
      const game = createGame(level);
      const solution = solve(game)!;
      expect(solution.length).toBeGreaterThanOrEqual(ranges[difficulty][0]);
      expect(solution.length).toBeLessThanOrEqual(ranges[difficulty][1]);
      for (const move of solution) pour(game, move);
      expect(complete(game)).toBe(true);
    }
    expect(openings.size).toBeGreaterThan(4);
  });

  it('replays a random save and rejects illegal or malformed moves', () => {
    const random: RandomBalance = { version: 1, seed: 'measure-3', difficulty: 'hard' };
    const game = createGame(randomLevel(random));
    const [first, second] = solve(game)!;
    pour(game, first);
    pour(game, second);
    const raw = writeSave(game, [levels[0].id], random);
    expect(readSave(raw)).toEqual({ game, completed: [levels[0].id], random });
    const data = JSON.parse(raw);
    expect(readSave(JSON.stringify({ ...data, history: [{ from: 0, to: 0 }] }))).toBeNull();
    expect(readSave(JSON.stringify({ ...data, history: [{ from: 0, to: 3 }] }))).toBeNull();
    expect(readSave(JSON.stringify({ ...data, random: { ...random, seed: '' } }))).toBeNull();
  });
});
