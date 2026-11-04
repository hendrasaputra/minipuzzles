import { describe, expect, it } from 'vitest';
import { canMove, createGame, legalMoves, moveCar, undo, validatePuzzle, type Puzzle } from './engine';

function smallPuzzle(): Puzzle {
  return { seed: 'rules-fixture', difficulty: 'easy', cars: [
    { id: 'coral', x: 0, y: 2, length: 2, axis: 'h', color: '#df8c83' },
    { id: 'sage', x: 3, y: 1, length: 2, axis: 'v', color: '#b7c7a0' },
    { id: 'blue', x: 0, y: 4, length: 2, axis: 'h', color: '#9fc8c6' },
    { id: 'cream', x: 5, y: 3, length: 3, axis: 'v', color: '#e1c59a' },
  ] };
}

describe('traffic rules', () => {
  it('clones validated puzzle data and leaves the starting layout unchanged', () => {
    const puzzle = smallPuzzle(), snapshot = structuredClone(puzzle), game = createGame(puzzle);
    expect(moveCar(game, 'sage', -1)).toBe(true);
    expect(puzzle).toEqual(snapshot); expect(game.puzzle).toEqual(snapshot);
    expect(game.cars[1]).toMatchObject({ x: 3, y: 0, axis: 'v' });
    expect(game.history).toEqual([{ id: 'sage', delta: -1 }]);
  });

  it('rejects collisions, jumping over blockers and off-board non-target moves', () => {
    const game = createGame(smallPuzzle());
    expect(canMove(game, 'coral', 1)).toBe(true);
    expect(canMove(game, 'coral', 2)).toBe(false);
    expect(canMove(game, 'coral', 4)).toBe(false);
    expect(canMove(game, 'coral', 6)).toBe(false);
    expect(canMove(game, 'coral', -1)).toBe(false);
    expect(canMove(game, 'cream', 1)).toBe(false);
    expect(moveCar(game, 'coral', 0)).toBe(false);
    expect(moveCar(game, 'coral', 1.5)).toBe(false);
    expect(moveCar(game, 'missing', 1)).toBe(false);
    expect(game.history).toEqual([]);
  });

  it('allows any clear slide distance as one move and only full target escape', () => {
    const game = createGame(smallPuzzle());
    moveCar(game, 'sage', -1);
    expect(legalMoves(game).filter(move => move.id === 'coral').map(move => move.delta)).toEqual([1,2,3,4,6]);
    expect(moveCar(game, 'coral', 5)).toBe(false);
    expect(moveCar(game, 'coral', 4)).toBe(true);
    expect(game.status).toBe('playing');
    expect(moveCar(game, 'coral', 2)).toBe(true);
    expect(game.status).toBe('won'); expect(game.cars[0].x).toBe(6);
    expect(game.history).toHaveLength(3);
    expect(legalMoves(game)).toEqual([]); expect(moveCar(game, 'blue', 1)).toBe(false);
  });

  it('undoes escape and every preceding move back to the exact start', () => {
    const game = createGame(smallPuzzle()), initial = structuredClone(game);
    expect(undo(game)).toBe(false);
    moveCar(game, 'sage', -1); moveCar(game, 'coral', 6);
    expect(undo(game)).toBe(true); expect(game.status).toBe('playing'); expect(game.cars[0].x).toBe(0);
    expect(undo(game)).toBe(true); expect(game).toEqual(initial);
    expect(createGame(game.puzzle)).toEqual(initial);
  });
});

describe('puzzle validation', () => {
  it('normalizes trusted fields and accepts valid caps', () => {
    const puzzle = smallPuzzle(); puzzle.par = 1000;
    expect(validatePuzzle({ ...puzzle, unexpected: 'ignored' })).toEqual(puzzle);
    expect(validatePuzzle(puzzle)).not.toBe(puzzle);
  });

  it.each([
    (p: Puzzle) => { p.seed = ''; },
    (p: Puzzle) => { p.seed = 'x'.repeat(129); },
    (p: Puzzle) => { p.par = 0; },
    (p: Puzzle) => { p.par = 1001; },
    (p: Puzzle) => { p.cars[1].id = 'coral'; },
    (p: Puzzle) => { p.cars[1].id = '<script>'; },
    (p: Puzzle) => { p.cars[1].color = 'red'; },
    (p: Puzzle) => { p.cars[1].x = 0; p.cars[1].y = 2; },
    (p: Puzzle) => { p.cars[1].y = 5; },
    (p: Puzzle) => { p.cars[0].axis = 'v'; },
    (p: Puzzle) => { p.cars[0].y = 1; },
    (p: Puzzle) => { p.cars = p.cars.filter(car => car.id !== 'coral'); },
  ])('rejects malformed or inconsistent starting layouts', corrupt => {
    const puzzle = smallPuzzle(); corrupt(puzzle);
    expect(validatePuzzle(puzzle)).toBeNull();
    expect(() => createGame(puzzle)).toThrow(RangeError);
  });

  it('rejects non-objects, incomplete data and invalid difficulty', () => {
    for (const value of [null, false, [], {}, { ...smallPuzzle(), difficulty: 'expert' }]) expect(validatePuzzle(value)).toBeNull();
  });
});
