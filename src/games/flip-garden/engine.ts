export interface Level {
  id: string;
  title: string;
  size: number;
  start: number;
  goal: number;
}

export interface Game {
  level: Level;
  current: number;
  history: number[];
}

export function affectedCells(size: number, cell: number): number[] {
  const x = cell % size;
  const result = [cell];
  if (x > 0) result.push(cell - 1);
  if (x < size - 1) result.push(cell + 1);
  if (cell >= size) result.push(cell - size);
  if (cell < size * (size - 1)) result.push(cell + size);
  return result;
}

export function flipMask(size: number, cell: number): number {
  return affectedCells(size, cell).reduce((mask, index) => mask | (1 << index), 0);
}

export function createGame(level: Level): Game {
  return { level, current: level.start, history: [] };
}

export function complete(game: Game): boolean {
  return game.current === game.level.goal;
}

export function flip(game: Game, cell: number): boolean {
  if (!Number.isInteger(cell) || cell < 0 || cell >= game.level.size ** 2 || complete(game)) return false;
  game.current ^= flipMask(game.level.size, cell);
  game.history.push(cell);
  return true;
}

export function undo(game: Game): boolean {
  const cell = game.history.pop();
  if (cell === undefined) return false;
  game.current ^= flipMask(game.level.size, cell);
  return true;
}

/** Eliminate at most 25 equations over GF(2), one per tile. */
export function solve(game: Game): number[] | undefined {
  const { size, goal } = game.level;
  const cells = size ** 2;
  const target = 1 << cells;
  const difference = game.current ^ goal;
  const rows = Array.from({ length: cells }, (_, i) =>
    flipMask(size, i) | ((difference & (1 << i)) ? target : 0));
  const pivots: number[] = [];
  for (let col = 0; col < cells; col++) {
    const row = rows.findIndex((value, i) => i >= pivots.length && (value & (1 << col)) !== 0);
    if (row < 0) continue;
    const i = pivots.length;
    [rows[i], rows[row]] = [rows[row], rows[i]];
    for (let j = 0; j < cells; j++) {
      if (j !== i && (rows[j] & (1 << col))) rows[j] ^= rows[i];
    }
    pivots.push(col);
  }
  if (rows.includes(target)) return;
  return pivots.filter((_, i) => (rows[i] & target) !== 0);
}
