/** Traffic Garden rules: six lanes, no rendering or browser state. */
export type Difficulty = 'easy' | 'medium' | 'hard';
export interface Car { id: string; x: number; y: number; length: 2 | 3; axis: 'h' | 'v'; color: string }
export interface Move { id: string; delta: number }
export interface Puzzle { seed: string; difficulty: Difficulty; cars: Car[]; par?: number }
export interface Game { puzzle: Puzzle; cars: Car[]; history: Move[]; status: 'playing' | 'won' }
export const SIZE = 6;
export const TARGET = 'coral';

function board(cars: Car[]): Int8Array {
  const occupied = new Int8Array(SIZE * SIZE).fill(-1);
  cars.forEach((car, index) => {
    for (let i = 0; i < car.length; i++) {
      const x = car.x + (car.axis === 'h' ? i : 0), y = car.y + (car.axis === 'v' ? i : 0);
      if (x >= 0 && x < SIZE && y >= 0 && y < SIZE) occupied[y * SIZE + x] = index;
    }
  });
  return occupied;
}

export function validatePuzzle(value: unknown): Puzzle | null {
  if (!value || typeof value !== 'object') return null;
  const p = value as Puzzle;
  if (typeof p.seed !== 'string' || !p.seed.length || p.seed.length > 128
    || !['easy', 'medium', 'hard'].includes(p.difficulty)
    || !Array.isArray(p.cars) || p.cars.length < 2 || p.cars.length > 16
    || (p.par !== undefined && (!Number.isInteger(p.par) || p.par < 1 || p.par > 1000))) return null;
  const used = new Set<number>(), ids = new Set<string>();
  const cars: Car[] = [];
  for (const car of p.cars) {
    if (!car || typeof car.id !== 'string' || !/^[a-zA-Z0-9-]{1,24}$/.test(car.id) || ids.has(car.id)
      || !['h', 'v'].includes(car.axis) || (car.length !== 2 && car.length !== 3)
      || !Number.isInteger(car.x) || !Number.isInteger(car.y)
      || typeof car.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(car.color)) return null;
    ids.add(car.id);
    for (let i = 0; i < car.length; i++) {
      const x = car.x + (car.axis === 'h' ? i : 0), y = car.y + (car.axis === 'v' ? i : 0), cell = y * SIZE + x;
      if (x < 0 || x >= SIZE || y < 0 || y >= SIZE || used.has(cell)) return null;
      used.add(cell);
    }
    cars.push({ id: car.id, x: car.x, y: car.y, length: car.length, axis: car.axis, color: car.color });
  }
  const target = cars.find(car => car.id === TARGET);
  if (!target || target.axis !== 'h' || target.y !== 2 || target.length !== 2) return null;
  return { seed: p.seed, difficulty: p.difficulty, cars, ...(p.par === undefined ? {} : { par: p.par }) };
}

export function createGame(puzzle: Puzzle): Game {
  const valid = validatePuzzle(puzzle);
  if (!valid) throw new RangeError('Invalid traffic puzzle');
  return { puzzle: valid, cars: valid.cars.map(car => ({ ...car })), history: [], status: 'playing' };
}

export function legalMoves(game: Game): Move[] {
  if (game.status !== 'playing') return [];
  const occupied = board(game.cars), moves: Move[] = [];
  game.cars.forEach(car => {
    const position = car.axis === 'h' ? car.x : car.y;
    const lane = car.axis === 'h' ? car.y : car.x;
    const at = (p: number) => occupied[car.axis === 'h' ? lane * SIZE + p : p * SIZE + lane];
    for (let p = position - 1; p >= 0 && at(p) === -1; p--) moves.push({ id: car.id, delta: p - position });
    let end = position + car.length;
    while (end < SIZE && at(end) === -1) {
      moves.push({ id: car.id, delta: end - position - car.length + 1 }); end++;
    }
    if (car.id === TARGET && end === SIZE) moves.push({ id: car.id, delta: SIZE - position });
  });
  return moves;
}

export function canMove(game: Game, id: string, delta: number): boolean {
  return Number.isInteger(delta) && delta !== 0 && legalMoves(game).some(move => move.id === id && move.delta === delta);
}

export function moveCar(game: Game, id: string, delta: number): boolean {
  if (!canMove(game, id, delta)) return false;
  const car = game.cars.find(car => car.id === id)!;
  if (car.axis === 'h') car.x += delta; else car.y += delta;
  game.history.push({ id, delta });
  if (car.id === TARGET && car.x === SIZE) game.status = 'won';
  return true;
}

export function undo(game: Game): boolean {
  const move = game.history.pop();
  if (!move) return false;
  const car = game.cars.find(car => car.id === move.id)!;
  if (car.axis === 'h') car.x -= move.delta; else car.y -= move.delta;
  game.status = 'playing';
  return true;
}
