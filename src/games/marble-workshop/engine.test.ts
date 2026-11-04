import { describe, expect, it } from 'vitest';
import { createGame, rotate, run, solve, trace, undo, validateLevel } from './engine';
import { levels } from './levels';

describe('marble workshop', () => {
  it('stops at the seam before a track with a closed entry', () => {
    const game = createGame(levels[0]);
    expect(trace(game)).toEqual({ points: [{ x: 0, y: 2 }, { x: 0.5, y: 2 }], reached: false });
    expect(run(game)).toBe(false);
    expect(game.moves).toBe(0);
    expect(game.status).toBe('playing');
  });

  it('follows an open corner out to the edge of a missing track', () => {
    const game = createGame(levels[1]);
    rotate(game, 'track-1');
    for (let i = 0; i < 3; i++) rotate(game, 'track-3');
    expect(trace(game)).toEqual({
      points: [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }, { x: 3, y: 0.5 }],
      reached: false,
    });
  });

  it('requires a successful roll after alignment and lets undo reopen the run', () => {
    const game = createGame(levels[0]);
    expect(solve(game)).toEqual(['track-1']);
    expect(rotate(game, 'missing')).toBe(false);
    expect(rotate(game, 'track-1')).toBe(true);
    expect(trace(game).reached).toBe(true);
    expect(game.status).toBe('playing');
    expect(run(game)).toBe(true);
    expect(game.status).toBe('won');
    expect(rotate(game, 'track-1')).toBe(false);
    expect(undo(game)).toBe(true);
    expect(game.status).toBe('playing');
    expect(game.moves).toBe(0);
    expect(trace(game).reached).toBe(false);
    expect(game.tracks).toEqual(game.level.tracks);
    expect(undo(game)).toBe(false);
  });

  it('rejects blocked, disconnected, malformed and shortcut routes', () => {
    const level = levels[0];
    expect(validateLevel(null)).toBeNull();
    expect(validateLevel({ ...level, goal: { x: 4, y: 3 } })).toBeNull();
    expect(validateLevel({ ...level, goal: level.source })).toBeNull();
    expect(validateLevel({ ...level, tracks: level.tracks.slice(0, 2) })).toBeNull();
    expect(validateLevel({
      ...level, tracks: level.tracks.map(track => ({ ...track, kind: 'elbow' })),
    })).toBeNull();
    expect(validateLevel({
      ...level, tracks: level.tracks.map(track => ({ ...track, id: 'same' })),
    })).toBeNull();
    expect(validateLevel({
      ...level, tracks: [...level.tracks, { x: 1, y: 1, id: 'branch', kind: 'elbow', turn: 0 }],
    })).toBeNull();
  });

  it.each(levels)('solves and runs $title without mutating its original opening', level => {
    const game = createGame(level);
    const before = JSON.stringify(level);
    const solution = solve(game);
    expect(solution.length).toBeGreaterThan(0);
    for (const id of solution) expect(rotate(game, id)).toBe(true);
    const result = trace(game);
    expect(result.reached).toBe(true);
    expect(result.points).toHaveLength(level.tracks.length + 2);
    expect(result.points.at(-1)).toEqual(level.goal);
    expect(run(game)).toBe(true);
    expect(solve(game)).toEqual([]);
    expect(JSON.stringify(level)).toBe(before);
  });
});
