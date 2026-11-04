import { describe, expect, it } from 'vitest';
import { applyMove, complete, createGame, hint, nearestEdges, totals, undo, type Count, type Level } from './engine';
import { levels, randomLevel } from './levels';
import { readSave, writeSave } from './storage';

describe('Bridge Islands', () => {
  it('only offers the nearest island in each row and column', () => {
    expect(nearestEdges([{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 4, y: 0 }, { x: 2, y: 2 }]))
      .toEqual([{ a: 0, b: 1 }, { a: 1, b: 2 }, { a: 1, b: 3 }]);
  });

  it('counts both strands and restores the last count on undo', () => {
    const game = createGame(levels[0]);
    expect(applyMove(game, { edge: 0, count: 1 })).toBe(true);
    expect(applyMove(game, { edge: 1, count: 1 })).toBe(true);
    expect(complete(game)).toBe(false);
    expect(applyMove(game, { edge: 1, count: 2 })).toBe(true);
    expect(totals(game.level, game.bridges)).toEqual([1, 3, 2]);
    expect(complete(game)).toBe(true);
    expect(undo(game)).toBe(true);
    expect(game.bridges).toEqual([1, 1]);
  });

  it('rejects crossed bridges until the blocking pair is cleared', () => {
    const points = [{ x: 0, y: 2 }, { x: 4, y: 2 }, { x: 2, y: 0 }, { x: 2, y: 4 }];
    const level: Level = { id: 'test', title: 'Test', islands: points.map(p => ({ ...p, goal: 2 })),
      edges: nearestEdges(points), solution: [1, 1] };
    const game = createGame(level);
    expect(applyMove(game, { edge: 0, count: 1 })).toBe(true);
    expect(applyMove(game, { edge: 1, count: 1 })).toBe(false);
    expect(applyMove(game, { edge: 0, count: 0 })).toBe(true);
    expect(applyMove(game, { edge: 1, count: 1 })).toBe(true);
  });

  it('requires one connected network even when all island numbers match', () => {
    const points = [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 }, { x: 2, y: 2 }];
    const level: Level = { id: 'test', title: 'Test', islands: points.map(p => ({ ...p, goal: 2 })),
      edges: nearestEdges(points), solution: [1, 1, 1, 1] };
    const game = createGame(level);
    expect(applyMove(game, { edge: 0, count: 2 })).toBe(true);
    expect(applyMove(game, { edge: 3, count: 2 })).toBe(true);
    expect(totals(level, game.bridges)).toEqual([2, 2, 2, 2]);
    expect(complete(game)).toBe(false);
    expect(hint(game)).toEqual({ edge: 0, count: 1 });
  });

  it('solves all authored and seeded layouts through legal hints', () => {
    const generated = (['easy', 'medium', 'hard'] as const).flatMap(difficulty =>
      Array.from({ length: 12 }, (_, i) => randomLevel({ version: 1, seed: `test-${i}`, difficulty })));
    expect(generated[0]).toEqual(randomLevel({ version: 1, seed: 'test-0', difficulty: 'easy' }));
    for (const level of [...levels, ...generated]) {
      const game = createGame(level);
      for (let i = 0; i < level.edges.length * 2 && !complete(game); i++) {
        const next = hint(game);
        expect(next).toBeDefined();
        expect(applyMove(game, next!)).toBe(true);
      }
      expect(complete(game), level.id).toBe(true);
    }
  });

  it('replays a seeded save and rejects invalid edits', () => {
    const random = { version: 1, seed: 'replay', difficulty: 'hard' } as const;
    const game = createGame(randomLevel(random));
    expect(applyMove(game, hint(game)!)).toBe(true);
    const raw = writeSave({ game, completed: ['bridge-1'], random });
    expect(readSave(raw)).toEqual({ game, completed: ['bridge-1'], random });
    const data = JSON.parse(raw);
    for (const bad of [{ edge: -1, count: 1 }, { edge: 0, count: 3 as Count }, null]) {
      expect(readSave(JSON.stringify({ ...data, history: [bad] }))).toBeNull();
    }
  });
});
