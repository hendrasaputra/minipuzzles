import { describe, expect, it } from 'vitest';
import { createGame, edit, hint, shadows, undo, type Game } from './engine';
import { generateShadow, levels } from './levels';
import { readSave, writeSave } from './storage';

function finish(game: Game) {
  for (let attempt = 0; attempt < game.budget * 2 && !game.won; attempt++) {
    const move = hint(game);
    expect(move && edit(game, move.cell, move.change)).toBe(true);
  }
  expect(game.won).toBe(true);
}

describe('Shadow Blocks', () => {
  it('matches front columns and side rows, accepting alternate stacks', () => {
    const game = createGame(levels[1]);
    expect(shadows([1, 2, 2, 1], 2)).toEqual({ front: [2, 2], side: [2, 2] });
    for (const cell of [0, 1, 1, 2, 2, 3]) expect(edit(game, cell, 1)).toBe(true);
    expect(game.won).toBe(true);
    expect(game.stacks).not.toEqual(game.level.target);
    expect(undo(game)).toBe(true);
    expect(game.won).toBe(false);
  });

  it('requires the block budget and lets hints repair a full mismatched board', () => {
    const game = createGame(levels[1]);
    edit(game, 0, 1);
    edit(game, 0, 1);
    edit(game, 3, 1);
    edit(game, 3, 1);
    expect(game.won).toBe(false);
    const mismatched = createGame(levels[0]);
    for (const cell of [0, 0, 1]) expect(edit(mismatched, cell, 1)).toBe(true);
    expect(edit(mismatched, 3, 1)).toBe(false);
    expect(mismatched.won).toBe(false);
    expect(hint(mismatched)?.change).toBe(-1);
    finish(mismatched);
  });

  it('solves every authored and random level with legal hints', () => {
    expect(levels).toHaveLength(8);
    for (const level of levels) finish(createGame(level));
    for (const [index, difficulty] of (['easy', 'medium', 'hard'] as const).entries()) {
      const spec = { version: 1 as const, seed: 'shadow-test', difficulty };
      const level = generateShadow(spec);
      expect(level).toEqual(generateShadow(spec));
      expect(level.size).toBe(index + 2);
      finish(createGame(level));
    }
  });

  it('replays saved moves and rejects invalid edits or random metadata', () => {
    const random = { version: 1 as const, seed: 'shadow-test', difficulty: 'hard' as const };
    const game = createGame(generateShadow(random));
    expect(edit(game, 0, 1)).toBe(true);
    const save = writeSave(game, 0, [], random);
    expect(readSave(save)).toEqual({ game, selected: 0, completed: [], random });
    const saved = JSON.parse(save);
    expect(readSave(JSON.stringify({ ...saved, history: [{ cell: 99, change: 1 }] }))).toBeNull();
    expect(readSave(JSON.stringify({ ...saved, random: { ...random, difficulty: 'invalid' } }))).toBeNull();
  });
});
