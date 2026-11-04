import { describe, expect, it } from 'vitest';
import { complete, conflicts, createGame, enter, hint, levels, randomLevel, solve, undo } from './engine';
import { readSave, writeSave } from './storage';

describe('Garden Sudoku', () => {
  it('gives every authored level one solution', () => {
    expect(levels).toHaveLength(8);
    for (const level of levels) {
      const answer = solve(level.givens);
      expect(answer.count, level.title).toBe(1);
      const game = createGame(level);
      answer.solution!.forEach((value, cell) => { if (!game.cells[cell]) enter(game, cell, value); });
      expect(complete(game)).toBe(true);
    }
  });

  it.each([['easy', 11], ['medium', 8], ['hard', 6]] as const)('generates varied and unique %s boards', (difficulty, clues) => {
    const layouts = Array.from({ length: 40 }, (_, i) => randomLevel(String(i), difficulty));
    expect(new Set(layouts.map(level => level.givens.join(''))).size).toBeGreaterThan(30);
    for (const level of layouts) {
      expect(level.givens.filter(Boolean)).toHaveLength(clues);
      expect(solve(level.givens).count).toBe(1);
    }
    expect(randomLevel('0', difficulty)).toEqual(layouts[0]);
  });

  it('protects clues, marks conflicts, and restores a prior entry', () => {
    const game = createGame(levels[0]);
    expect(enter(game, 0, 2)).toBe(false);
    expect(enter(game, 2, 1)).toBe(true);
    expect(conflicts(game.cells).has(2)).toBe(true);
    expect(complete(game)).toBe(false);
    const move = hint(game, 2)!;
    expect(move).toEqual({ cell: 2, value: 3 });
    expect(enter(game, move.cell, move.value)).toBe(true);
    expect(complete(game)).toBe(true);
    expect(undo(game)).toBe(2);
    expect(game.cells[2]).toBe(1);
  });

  it('replays seeded moves and rejects edits to clues', () => {
    const random = { seed: 'sample', difficulty: 'hard' as const };
    const game = createGame(randomLevel(random.seed, random.difficulty));
    const move = hint(game, game.cells.indexOf(0))!;
    enter(game, move.cell, move.value);
    const encoded = writeSave(game, [], random);
    expect(readSave(encoded)?.game).toEqual(game);
    const parsed = JSON.parse(encoded);
    parsed.history.push({ cell: game.level.givens.findIndex(Boolean), value: 0 });
    expect(readSave(JSON.stringify(parsed))).toBeUndefined();
  });
});
