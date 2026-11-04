import { describe, expect, it } from 'vitest';
import { createGame, markCell, randomPuzzle } from './engine';
import { readSave, writeSave } from './storage';

describe('Picture Islands replay saves', () => {
  it('restores the seeded board and rejects an invalid replay', () => {
    const random = { seed: 'save-check', difficulty: 'hard' } as const;
    const game = createGame(randomPuzzle(random.seed, random.difficulty));
    markCell(game, 0, -1);
    markCell(game, 1, 1);
    const raw = writeSave(game, ['island-1'], random);
    expect(readSave(raw)).toEqual({ game, finished: ['island-1'], random });
    const value = JSON.parse(raw);
    value.history.push({ cell: 300, mark: 1 });
    expect(readSave(JSON.stringify(value))).toBeUndefined();
  });
});
