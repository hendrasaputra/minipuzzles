import { describe, expect, it } from 'vitest';
import { atGoal, createGame, directions, footprint, move, nextBlock, solve, undo } from './engine';
import { levels, randomLevel, tiers } from './levels';
import { readSave, writeSave } from './storage';

describe('rolling stone', () => {
  it('requires both halves to land on tiles and only wins upright', () => {
    const game = createGame(levels[0]);
    expect(move(game, 'w')).toBe(false);
    expect(move(game, 'e')).toBe(true);
    expect(footprint(game.block)).toEqual([{ x: 1, y: 0 }, { x: 2, y: 0 }]);
    expect(move(game, 'n')).toBe(false);
    expect(atGoal(game.level, { x: 3, y: 0, stance: 'x' })).toBe(false);
    expect(move(game, 'e')).toBe(true);
    expect(atGoal(game.level, game.block)).toBe(true);
    expect(move(game, 'w')).toBe(false);
    expect(undo(game)).toBe(true);
    expect(game.block).toEqual({ x: 1, y: 0, stance: 'x' });
  });

  it('rolls reversible quarter turns in every orientation', () => {
    const level = { ...levels[0], tiles: Array<string>(7).fill('#######') };
    for (const stance of ['up', 'x', 'y'] as const) {
      for (const [i, direction] of directions.entries()) {
        const block = { x: 3, y: 3, stance };
        const next = nextBlock(level, block, direction)!;
        expect(nextBlock(level, next, directions[(i + 2) % 4])).toEqual(block);
      }
    }
  });

  it('solves all eight levels with increasing shortest routes', () => {
    const lengths = levels.map(level => {
      const game = createGame(level);
      const route = solve(level)!;
      for (const direction of route) expect(move(game, direction)).toBe(true);
      expect(atGoal(level, game.block)).toBe(true);
      return route.length;
    });
    expect(lengths).toEqual([2, 5, 7, 8, 11, 13, 16, 26]);
  });

  it.each(['easy', 'medium', 'hard'] as const)('generates reproducible %s paths within their shortest-route band', difficulty => {
    const boards = Array.from({ length: 12 }, (_, i) => {
      const spec = { version: 1, seed: String(i), difficulty } as const;
      const level = randomLevel(spec);
      expect(randomLevel(spec)).toEqual(level);
      const route = solve(level)!;
      expect(route.length).toBeGreaterThanOrEqual(tiers[difficulty].min);
      expect(route.length).toBeLessThanOrEqual(tiers[difficulty].max);
      return level;
    });
    expect(new Set(boards.map(board => board.tiles.join('/'))).size).toBeGreaterThan(6);
  });

  it('restores a saved win and rejects impossible moves or metadata', () => {
    const game = createGame(levels[0]);
    move(game, 'e');
    move(game, 'e');
    const raw = writeSave({ game, completed: [] });
    expect(readSave(raw)).toEqual({ game, completed: [levels[0].id] });
    expect(readSave(raw.replace('"e","e"', '"e","n"'))).toBeUndefined();
    expect(readSave(raw.replace('"e","e"', '"e","e","w"'))).toBeUndefined();
    expect(readSave(raw.replace('stone-1', 'missing'))).toBeUndefined();
  });
});
