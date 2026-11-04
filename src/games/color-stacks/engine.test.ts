import { describe, expect, it } from 'vitest';
import { applyMove, complete, createGame, solve, undo } from './engine';
import { levels, randomLevel } from './levels';
import { readSave, writeSave } from './storage';

describe('Color Stacks', () => {
  it('moves only the top block and rejects mismatched or full stacks', () => {
    const game = createGame(levels[0]);
    expect(applyMove(game, { from: 0, to: 1 })).toBe(false);
    expect(applyMove(game, { from: 0, to: 2 })).toBe(true);
    expect(game.stacks).toEqual([[0, 0], [1, 1, 0], [1]]);
    expect(applyMove(game, { from: 2, to: 1 })).toBe(false);
    expect(applyMove(game, { from: 1, to: 2 })).toBe(false);
    expect(undo(game)).toBe(true);
    expect(game.stacks).toEqual(levels[0].stacks);
  });

  it('solves all eight authored layouts and can undo a win', () => {
    for (const level of levels) {
      const game = createGame(level);
      const answer = solve(game)!;
      expect(answer?.length).toBeGreaterThan(0);
      for (const move of answer) expect(applyMove(game, move)).toBe(true);
      expect(complete(game)).toBe(true);
      expect(undo(game)).toBe(true);
      expect(complete(game)).toBe(false);
    }
  });

  it.each([['easy', 3], ['medium', 7], ['hard', 12]] as const)('generates varied solvable %s puzzles', (difficulty, minimum) => {
    const layouts = new Set();
    for (let i = 0; i < 8; i++) {
      const spec = { version: 1, seed: `color-test-${i}`, difficulty } as const;
      const level = randomLevel(spec);
      if (i === 0) expect(randomLevel(spec)).toEqual(level);
      layouts.add(JSON.stringify(level.stacks));
      const game = createGame(level);
      const answer = solve(game)!;
      expect(answer?.length).toBeGreaterThanOrEqual(minimum);
      for (const move of answer) expect(applyMove(game, move)).toBe(true);
      expect(complete(game)).toBe(true);
    }
    expect(layouts.size).toBeGreaterThanOrEqual(6);
  });

  it('replays legal edits and rejects an invalid move or tier', () => {
    const game = createGame(levels[0]);
    applyMove(game, { from: 0, to: 2 });
    const raw = writeSave({ game, completed: [] });
    expect(readSave(raw)?.game).toEqual(game);
    expect(readSave(raw.replace('"to":2', '"to":1'))).toBeNull();
    expect(readSave(JSON.stringify({ ...JSON.parse(raw), random: { version: 1, difficulty: 'broken', seed: 'a' } }))).toBeNull();
  });
});
