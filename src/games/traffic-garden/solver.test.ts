import { describe, expect, it } from 'vitest';
import { createGame, moveCar, type Puzzle } from './engine';
import { solve } from './solver';

const puzzle: Puzzle = { seed: 'solver-fixture', difficulty: 'easy', cars: [
  { id: 'coral', x: 0, y: 2, length: 2, axis: 'h', color: '#df8c83' },
  { id: 'sage', x: 3, y: 1, length: 2, axis: 'v', color: '#b7c7a0' },
] };

describe('shortest-slide solver', () => {
  it('finds a shortest legal exit path without changing the input', () => {
    const game = createGame(puzzle), before = structuredClone(game);
    const path = solve(game)!;
    expect(path).toHaveLength(2); expect(game).toEqual(before);
    for (const step of path) expect(moveCar(game, step.id, step.delta)).toBe(true);
    expect(game.status).toBe('won'); expect(solve(game)).toEqual([]);
  });

  it('solves from a changed position rather than replaying a starting solution', () => {
    const game = createGame(puzzle); moveCar(game, 'sage', -1);
    expect(solve(game)).toEqual([{ id: 'coral', delta: 6 }]);
    expect(solve(game, 1)).toEqual([{ id: 'coral', delta: 6 }]);
  });

  it('returns no hint when the search is bounded out or no exit is possible', () => {
    expect(solve(createGame(puzzle), 1)).toBeNull();
    expect(solve(createGame(puzzle), 0)).toBeNull();
    const locked = createGame({ seed: 'locked', difficulty: 'hard', cars: [
      puzzle.cars[0],
      { id: 'wall-a', x: 3, y: 0, length: 2, axis: 'v', color: '#e1c59a' },
      { id: 'wall-b', x: 3, y: 2, length: 2, axis: 'v', color: '#9fc8c6' },
      { id: 'wall-c', x: 3, y: 4, length: 2, axis: 'v', color: '#c0bacb' },
    ] });
    expect(solve(locked)).toBeNull();
  });
});
