import { describe, expect, it } from 'vitest';
import { createGame, move, undo, solve, validateLevel, type Level, type Direction } from './engine';
import { levels } from './levels';

const fixture = (): Level => ({ id: 'fixture', title: 'Test beds', width: 6, height: 6,
  walls: [{ x: 3, y: 3 }], goals: [{ x: 4, y: 2 }], crates: [{ x: 2, y: 2 }], player: { x: 1, y: 2 } });

describe('crate garden rules', () => {
  it('moves and pushes one crate, counts steps/pushes, and clones the starting layout', () => {
    const level = fixture(), original = structuredClone(level), game = createGame(level);
    expect(move(game, 'n')).toBe(true);
    expect(game.player).toEqual({ x: 1, y: 1 }); expect(game.pushes).toBe(0);
    move(game, 's'); move(game, 'e');
    expect(game.crates).toEqual([{ x: 3, y: 2 }]); expect(game.moves).toBe(3); expect(game.pushes).toBe(1);
    expect(game.history[2].direction).toBe('e'); expect(level).toEqual(original); expect(game.level).toEqual(original);
  });

  it('cannot push two crates, push into a wall, walk through walls or leave the board', () => {
    const level = fixture(); level.crates.push({ x: 3, y: 2 }); level.goals.push({ x: 4, y: 4 });
    const game = createGame(level), before = structuredClone(game);
    expect(move(game, 'e')).toBe(false);
    expect(move(game, '__proto__' as Direction)).toBe(false); expect(game).toEqual(before);
    game.player = { x: 3, y: 4 }; expect(move(game, 'n')).toBe(false);
    game.player = { x: 0, y: 0 }; expect(move(game, 'w')).toBe(false); expect(move(game, 'n')).toBe(false);
    const blocked = fixture(); blocked.walls.push({ x: 3, y: 2 });
    expect(move(createGame(blocked), 'e')).toBe(false);
  });

  it('walking away never pulls a crate', () => {
    const game = createGame(fixture());
    move(game, 'w'); expect(game.crates).toEqual(fixture().crates);
  });

  it('wins only when every bed has a crate, freezes play, and supports undo after winning', () => {
    const game = createGame(fixture()); move(game, 'e'); expect(game.status).toBe('playing');
    move(game, 'e'); expect(game.status).toBe('won'); expect(game.moves).toBe(2); expect(game.pushes).toBe(2);
    expect(move(game, 'n')).toBe(false); expect(game.moves).toBe(2);
    expect(undo(game)).toBe(true); expect(game.status).toBe('playing'); expect(game.pushes).toBe(1);
    expect(game.crates).toEqual([{ x: 3, y: 2 }]); expect(game.player).toEqual({ x: 2, y: 2 });
    expect(undo(game)).toBe(true); expect(undo(game)).toBe(false); expect(game.moves).toBe(0);
    expect(game.player).toEqual(game.level.player); expect(game.crates).toEqual(game.level.crates);
  });

  it('recognizes already planted levels and restarts from the exact opening', () => {
    const level = fixture(); level.crates = structuredClone(level.goals);
    expect(createGame(level).status).toBe('won'); expect(solve(createGame(level))).toEqual([]);
    const game = createGame(fixture()); move(game, 'e');
    const restarted = createGame(game.level);
    expect(restarted.history).toEqual([]); expect(restarted.crates).toEqual(fixture().crates);
  });

  it('rejects malformed or overlapping levels at the trust boundary', () => {
    const invalid: unknown[] = [null, {}, { ...fixture(), width: 9 }, { ...fixture(), height: 2 },
      { ...fixture(), id: '<bad>' }, { ...fixture(), title: '' }, { ...fixture(), player: { x: -1, y: 0 } },
      { ...fixture(), goals: [] }, { ...fixture(), crates: [null] }, { ...fixture(), walls: [fixture().player] },
      { ...fixture(), goals: [{ x: 3, y: 3 }] }, { ...fixture(), player: fixture().crates[0] },
      { ...fixture(), walls: [{ x: 3, y: 3 }, { x: 3, y: 3 }] },
      { ...fixture(), crates: Array(5).fill({ x: 1, y: 1 }), goals: Array(5).fill({ x: 1, y: 2 }) }];
    invalid.forEach(value => expect(validateLevel(value)).toBeNull());
    expect(() => createGame({ ...fixture(), width: 0 })).toThrow(RangeError);
    expect(validateLevel(fixture())).toEqual(fixture());
  });
});

describe('crate garden solver and curated levels', () => {
  it('finds a shortest step sequence without changing the current game', () => {
    const game = createGame(fixture()), before = structuredClone(game);
    expect(solve(game)).toEqual(['e', 'e']); expect(game).toEqual(before);
  });

  it('reports deadlocks and exhausted/invalid budgets without mutating progress', () => {
    const level = fixture(); level.crates = [{ x: 0, y: 0 }];
    const game = createGame(level), before = structuredClone(game);
    expect(solve(game, 1000)).toBeNull(); expect(game).toEqual(before);
    expect(solve(createGame(fixture()), 1)).toBeNull();
    for (const limit of [0, -1, NaN, Infinity, 1.2, 100001]) expect(solve(game, limit)).toBeNull();
  });

  it('keeps stable IDs and a strictly increasing minimum solution length', () => {
    expect(levels).toHaveLength(8); expect(new Set(levels.map(level => level.id)).size).toBe(8);
    const lengths = levels.map(level => solve(createGame(level))!.length);
    expect(lengths).toEqual([2, 8, 9, 12, 16, 20, 25, 29]);
  });

  for (const level of levels) it(`solves ${level.id}: ${level.title} with legal replay`, () => {
    const game = createGame(level), solution = solve(game);
    expect(solution).not.toBeNull();
    for (const direction of solution!) expect(move(game, direction)).toBe(true);
    expect(game.status).toBe('won'); expect(game.moves).toBe(solution!.length);
    expect(game.crates.every(crate => level.goals.some(goal => goal.x === crate.x && goal.y === crate.y))).toBe(true);
    expect(undo(game)).toBe(true); expect(game.status).toBe('playing');
    expect(move(game, solution!.at(-1)!)).toBe(true); expect(game.status).toBe('won');
  });
});
