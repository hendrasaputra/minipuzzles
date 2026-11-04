import { describe, expect, it } from 'vitest';
import { applyMove, complete, createGame, hint, trace, undo, type Level } from './engine';
import { generateRailroad, levels } from './levels';
import { readSave, writeSave } from './storage';

function solve(level: Level) {
  const game = createGame(level);
  const maxMoves = (level.switches.length + 1) * level.trains.length;
  for (let i = 0; !complete(game) && i < maxMoves; i++) {
    const next = hint(game);
    expect(next).toBeDefined();
    expect(applyMove(game, next!)).toBe(true);
  }
  expect(complete(game)).toBe(true);
  return game;
}

describe('Pocket Railroads', () => {
  it('rejects a wrong station without changing the queue, then sends and undoes a correct train', () => {
    const game = createGame(levels[0]);
    expect(trace(game).station).toBe(0);
    expect(applyMove(game, 'send')).toBe(false);
    expect(game.delivered).toBe(0);
    expect(game.history).toEqual([]);
    expect(applyMove(game, 1)).toBe(false);

    expect(hint(game)).toBe(0);
    expect(applyMove(game, 0)).toBe(true);
    expect(trace(game).station).toBe(1);
    expect(applyMove(game, 'send')).toBe(true);
    expect(game.delivered).toBe(1);
    expect(undo(game)).toBe(true);
    expect(game.delivered).toBe(0);
    expect(trace(game).station).toBe(1);
    expect(undo(game)).toBe(true);
    expect(trace(game).station).toBe(0);
  });

  it('routes all eight levels using the available switches', () => {
    expect(levels).toHaveLength(8);
    for (const level of levels) solve(level);
  });

  it.each(['easy', 'medium', 'hard'] as const)('makes solvable, varied %s railroads with repeatable seeds', difficulty => {
    const boards = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const spec = { version: 1 as const, seed: `yard-${i}`, difficulty };
      const level = generateRailroad(spec);
      expect(generateRailroad(spec)).toEqual(level);
      expect(level.stations).toBe({ easy: 2, medium: 3, hard: 4 }[difficulty]);
      boards.add(JSON.stringify([level.root, level.trains, level.switches]));
      solve(level);
    }
    expect(boards.size).toBeGreaterThan(6);
  });

  it('restores legal history and rejects forged sends and unknown switches', () => {
    const game = createGame(levels[0]);
    const initial = JSON.parse(writeSave(game, []));
    expect(readSave(JSON.stringify({ ...initial, history: ['send'] }))).toBeNull();
    expect(readSave(JSON.stringify({ ...initial, history: [3] }))).toBeNull();
    expect(readSave(JSON.stringify({ ...initial, level: 'missing' }))).toBeNull();
    expect(applyMove(game, 0)).toBe(true);
    expect(applyMove(game, 'send')).toBe(true);
    expect(readSave(writeSave(game, []))?.game).toEqual(game);
    const finished = solve(levels[0]);
    expect(readSave(writeSave(finished, []))?.completed).toEqual([levels[0].id]);

    const random = { version: 1 as const, seed: 'saved-yard', difficulty: 'hard' as const };
    const randomGame = solve(generateRailroad(random));
    const restored = readSave(writeSave(randomGame, [], random));
    expect(restored?.game).toEqual(randomGame);
    expect(restored?.random).toEqual(random);
    expect(restored?.completed).toEqual([]);
  });
});
