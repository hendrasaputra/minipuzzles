import { describe, expect, it } from 'vitest';
import { complete, createGame, hint, step, undo, type Level } from './engine';
import { levels, randomLevel } from './levels';
import { readSave, writeSave } from './storage';

function replay(level: Level) {
  const game = createGame(level);
  expect(new Set(level.route).size).toBe(level.route.length);
  expect(level.route.every(cell => cell >= 0 && cell < level.size ** 2)).toBe(true);
  for (const cell of level.route.slice(1)) expect(step(game, cell)).toBe(true);
  expect(complete(game)).toBe(true);
  return game;
}

describe('Stepping Stones', () => {
  it('visits every marked stone and ends on Finish in all eight levels', () => {
    expect(levels).toHaveLength(8);
    for (const level of levels) replay(level);
  });

  it('blocks diagonals, water, repeats, and reaching Finish too early', () => {
    const game = createGame({ id: 'test', title: 'Test', size: 3, route: [0, 1, 4, 3] });
    expect(step(game, 4)).toBe(false);
    expect(step(game, 3)).toBe(false);
    expect(step(game, 1)).toBe(true);
    expect(step(game, 2)).toBe(false);
    expect(step(game, 0)).toBe(true);
    expect(game.path).toEqual([0]);
    expect(step(game, 1)).toBe(true);
    expect(step(game, 4)).toBe(true);
    expect(step(game, 3)).toBe(true);
    expect(step(game, 0)).toBe(false);
    expect(undo(game)).toBe(true);
    expect(complete(game)).toBe(false);
  });

  it('finds a hint after a player takes a different viable path', () => {
    const level = { id: 'test', title: 'Test', size: 3, route: [0, 1, 2, 5, 4, 3, 6, 7, 8] };
    const game = createGame(level);
    expect(step(game, 3)).toBe(true);
    while (!complete(game)) {
      const next = hint(game);
      expect(next).toHaveProperty('cell');
      if (!next || !('cell' in next)) throw new Error('No continuation found');
      expect(step(game, next.cell)).toBe(true);
    }
    expect(game.path).not.toEqual(level.route);
  });

  it('suggests stepping back after reaching a dead end', () => {
    const game = createGame({ id: 'test', title: 'Test', size: 3, route: [0, 1, 2, 5, 4, 3, 6, 7, 8] });
    for (const cell of [1, 4, 7, 6, 3]) expect(step(game, cell)).toBe(true);
    expect(hint(game)).toEqual({ undo: true });
  });

  it.each([
    ['easy', 3, 6, 8], ['medium', 4, 10, 14], ['hard', 5, 16, 22],
  ] as const)('creates deterministic, solvable %s paths', (difficulty, size, min, max) => {
    const paths = new Set<string>();
    for (let i = 0; i < 16; i++) {
      const spec = { seed: `stones-test-${i}`, version: 1, difficulty } as const;
      const level = randomLevel(spec);
      expect(level).toEqual(randomLevel(spec));
      expect(level.size).toBe(size);
      expect(level.route.length).toBeGreaterThanOrEqual(min);
      expect(level.route.length).toBeLessThanOrEqual(max);
      replay(level);
      paths.add(level.route.join(','));
    }
    expect(paths.size).toBeGreaterThan(8);
  });

  it('restores a valid path and rejects illegal saved paths', () => {
    const game = createGame(levels[0]);
    expect(step(game, 1)).toBe(true);
    const raw = writeSave({ game, completed: [] });
    expect(readSave(raw)?.game).toEqual(game);
    const data = JSON.parse(raw);
    for (const path of [[0, 2], [0, 1, 0], [0, 1, 2, 8], [3], []]) {
      expect(readSave(JSON.stringify({ ...data, path }))).toBeNull();
    }
    const win = replay(levels[0]);
    expect(readSave(writeSave({ game: win, completed: [] }))?.completed).toEqual([levels[0].id]);
    const random = { seed: 'save-check', version: 1, difficulty: 'hard' } as const;
    const randomGame = replay(randomLevel(random));
    expect(readSave(writeSave({ game: randomGame, completed: [], random })))
      .toEqual({ game: randomGame, completed: [], random });
  });
});
