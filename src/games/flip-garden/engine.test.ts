import { describe, expect, it } from 'vitest';
import { affectedCells, complete, createGame, flip, solve, undo, type Level } from './engine';
import { levels, randomLevel } from './levels';
import { readSave, writeSave } from './storage';

function finish(level: Level) {
  const game = createGame(level);
  expect(complete(game)).toBe(false);
  expect(solve(game)?.length).toBeGreaterThan(0);
  for (const cell of solve(game)!) expect(flip(game, cell)).toBe(true);
  expect(complete(game)).toBe(true);
}

describe('Flip Garden', () => {
  it('flips the center and edge neighbors without wrapping the board', () => {
    expect(affectedCells(3, 4)).toEqual([4, 3, 5, 1, 7]);
    expect(affectedCells(3, 3)).toEqual([3, 4, 0, 6]);
    expect(affectedCells(3, 2)).toEqual([2, 1, 5]);
  });

  it('solves every authored garden and allows undo after a win', () => {
    for (const level of levels) finish(level);
    const first = createGame(levels[0]);
    expect(flip(first, 4)).toBe(true);
    expect(complete(first)).toBe(true);
    expect(flip(first, 0)).toBe(false);
    expect(undo(first)).toBe(true);
    expect(first.current).toBe(levels[0].start);
  });

  it('solves from the actual state after a different move', () => {
    const game = createGame(levels[0]);
    flip(game, 0);
    for (const cell of solve(game)!) flip(game, cell);
    expect(complete(game)).toBe(true);
  });

  it.each(['easy', 'medium', 'hard'] as const)('generates solvable, varied %s gardens', difficulty => {
    const gardens = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const spec = { version: 1 as const, seed: `test-${i}`, difficulty };
      const level = randomLevel(spec);
      expect(randomLevel(spec)).toEqual(level);
      finish(level);
      gardens.add(`${level.start}-${level.goal}`);
    }
    expect(gardens.size).toBeGreaterThan(9);
  });

  it('restores validated moves and rejects invalid edits or metadata', () => {
    const game = createGame(levels[0]);
    flip(game, 4);
    const raw = writeSave({ game, completed: [] });
    expect(readSave(raw)?.game).toEqual(game);
    expect(readSave(raw)?.completed).toEqual([levels[0].id]);
    const save = JSON.parse(raw);
    expect(readSave(JSON.stringify({ ...save, history: [9] }))).toBeNull();
    expect(readSave(JSON.stringify({ ...save, history: [4, 0] }))).toBeNull();
    expect(readSave(JSON.stringify({ ...save, random: { version: 1, seed: '', difficulty: 'hard' } }))).toBeNull();
  });
});
