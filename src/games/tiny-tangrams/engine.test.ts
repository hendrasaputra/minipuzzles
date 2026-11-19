import { describe, expect, it } from 'vitest';
import { applyMove, centre, complete, createGame, footprint, hint, key, pieceAt, placementAt, undo, type Level } from './engine';
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
  it('finds the placed piece under a tapped point', () => {
    const level = levels[0], game = createGame(level);
    expect(pieceAt(game, .3, .3)).toBe(-1);
    applyMove(game, { piece: 0, placement: level.solution[0] });
    expect(pieceAt(game, .3, .3)).toBe(0);
    expect(pieceAt(game, 1.7, 1.7)).toBe(-1);
    applyMove(game, { piece: 1, placement: level.solution[1] });
    expect(pieceAt(game, 1.7, 1.7)).toBe(1);
    expect(pieceAt(game, 3.5, .5)).toBe(-1);
  });
  it('places a piece from a tap anywhere on its gap', () => {
    const level = levels[0], game = createGame(level);
    applyMove(game, { piece: 0, placement: level.solution[0] });
    const spot = centre(footprint(level.pieces[1], level.solution[1]));
    expect(pieceAt(game, ...spot)).toBe(-1);
    expect(placementAt(game, 1, spot, level.solution[1].turn)).toEqual(level.solution[1]);
    expect(placementAt(game, 1, spot, 1)).toBeUndefined();
  });
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
