import { describe, expect, it } from 'vitest';
import { complete, createGame, hint, levels, markCell, randomPuzzle, runs, solutionCount, undo } from './engine';

describe('picture puzzles', () => {
  it('splits runs on empty tiles', () => expect(runs([true, true, false, true])).toEqual([2, 1]));
  it('rejects ambiguous clues', () => {
    expect(solutionCount({ id: 'test', title: 'Test', size: 2, picture: [true, false, false, true] })).toBe(2);
  });
  it.each(levels)('has a unique solution for $title', puzzle => expect(solutionCount(puzzle)).toBe(1));
  it.each(['easy', 'medium', 'hard'] as const)('generates varied unique %s puzzles', difficulty => {
    const pictures = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const seed = `test-${i}`;
      const puzzle = randomPuzzle(seed, difficulty);
      expect(puzzle).toEqual(randomPuzzle(seed, difficulty));
      expect(solutionCount(puzzle)).toBe(1);
      pictures.add(puzzle.picture.join(','));
    }
    expect(pictures.size).toBeGreaterThan(5);
  });
  it('can fix a wrong fill, undo a mark, and finish with hints', () => {
    const game = createGame(levels[0]);
    expect(markCell(game, 0, 1)).toBe(true);
    expect(hint(game)).toEqual({ cell: 0, mark: -1 });
    expect(markCell(game, 0, -1)).toBe(true);
    undo(game);
    expect(game.marks[0]).toBe(1);
    for (let i = 0; i < game.marks.length; i++) {
      const next = hint(game);
      if (next) markCell(game, next.cell, next.mark);
    }
    expect(complete(game)).toBe(true);
    expect(markCell(game, 0, 1)).toBe(false);
    undo(game);
    expect(complete(game)).toBe(false);
  });
});
