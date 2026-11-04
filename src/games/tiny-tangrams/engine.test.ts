import { describe, expect, it } from 'vitest';
import { applyMove, complete, createGame, footprint, hint, key, undo, type Level } from './engine';
import { levels, randomLevel } from './levels';
import { readSave, writeSave } from './storage';

function verify(level: Level) {
  expect(new Set(level.target.map(key)).size).toBe(level.target.length);
  const game = createGame(level);
  level.solution.forEach((placement, piece) => expect(applyMove(game, { piece, placement })).toBe(true));
  expect(complete(game)).toBe(true);
  expect(new Set(game.placements.flatMap((placement, i) => footprint(level.pieces[i], placement!).map(key))))
    .toEqual(new Set(level.target.map(key)));
}

describe('Tiny Tangrams', () => {
  it('fills each authored outline exactly', () => {
    expect(levels).toHaveLength(8);
    levels.forEach(verify);
  });

  it.each(['easy', 'medium', 'hard'] as const)('makes reproducible, distinct and solvable %s shapes', difficulty => {
    const layouts = Array.from({ length: 12 }, (_, i) =>
      randomLevel({ version: 1, difficulty, seed: `tangram-${i}` }));
    layouts.forEach(verify);
    expect(layouts[0]).toEqual(randomLevel({ version: 1, difficulty, seed: 'tangram-0' }));
    expect(new Set(layouts.map(level => level.target.map(key).sort().join('|'))).size).toBeGreaterThan(3);
  });

  it('rejects geometric overlaps and outside pieces, then undoes a legal move', () => {
    const game = createGame(levels[0]);
    expect(applyMove(game, { piece: 0, placement: { x: -1, y: 0, turn: 0 } })).toBe(false);
    expect(applyMove(game, { piece: 0, placement: game.level.solution[0] })).toBe(true);
    expect(applyMove(game, { piece: 1, placement: game.level.solution[0] })).toBe(false);
    expect(applyMove(game, hint(game)!)).toBe(true);
    expect(complete(game)).toBe(true);
    expect(undo(game)).toBe(true);
    expect(complete(game)).toBe(false);
  });

  it('makes room for a hint and validates replay', () => {
    const game = createGame(levels[0]);
    expect(applyMove(game, { piece: 0, placement: game.level.solution[1] })).toBe(true);
    expect(hint(game)).toEqual({ piece: 0, placement: null });
    const raw = writeSave({ game, completed: [] });
    expect(readSave(raw)?.game.placements).toEqual(game.placements);
    const data = JSON.parse(raw);
    data.history.push({ piece: 1, placement: game.level.solution[1] });
    expect(readSave(JSON.stringify(data))).toBeNull();
  });
});
