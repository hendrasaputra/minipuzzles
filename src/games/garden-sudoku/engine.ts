import { seededRandom, type Difficulty } from '../../shared/random-puzzle';

export type Value = 0 | 1 | 2 | 3 | 4;
export interface Level { id: string; title: string; givens: Value[] }
export interface Move { cell: number; value: Value }
export interface Game { level: Level; cells: Value[]; history: Move[] }

export const values = [1, 2, 3, 4] as const;

const groups = [
  ...values.map((_, row) => values.map((_, col) => row * 4 + col)),
  ...values.map((_, col) => values.map((_, row) => row * 4 + col)),
  ...[0, 2, 8, 10].map(start => [start, start + 1, start + 4, start + 5]),
];
const peers = Array.from({ length: 16 }, (_, cell) =>
  [...new Set(groups.filter(group => group.includes(cell)).flat())].filter(other => other !== cell));

export function conflicts(cells: readonly Value[]): Set<number> {
  return new Set(cells.flatMap((value, cell) =>
    value && peers[cell].some(other => cells[other] === value) ? [cell] : []));
}

/** Search stops as soon as uniqueness is decided. The 16-cell board bounds the search. */
export function solve(cells: readonly Value[]): { count: number; solution?: Value[] } {
  const work = [...cells];
  let count = 0;
  let solution: Value[] | undefined;
  if (conflicts(work).size) return { count };
  function visit() {
    if (count >= 2) return;
    let cell = -1;
    let choices: Value[] = [];
    for (let i = 0; i < work.length; i++) {
      if (work[i]) continue;
      const options = values.filter(value => peers[i].every(other => work[other] !== value));
      if (!options.length) return;
      if (cell === -1 || options.length < choices.length) {
        cell = i;
        choices = options;
      }
    }
    if (cell === -1) {
      solution ??= [...work];
      count++;
      return;
    }
    for (const value of choices) {
      work[cell] = value;
      visit();
      work[cell] = 0;
      if (count >= 2) break;
    }
  }
  visit();
  return { count, solution };
}

const openings = [
  ['First planting', '1204341221434321'],
  ['Four gaps', '0234341021034021'],
  ['Open row', '0004341221034020'],
  ['Cross beds', '1034301220434301'],
  ['Small corners', '1004340020030021'],
  ['Garden path', '1230041201004001'],
  ['Quiet beds', '0034341001430300'],
  ['Last planting', '0000340020034320'],
];

export const levels: Level[] = openings.map(([title, opening], index) => ({
  id: `sudoku-${index + 1}`, title, givens: [...opening].map(Number) as Value[],
}));

export function createGame(level: Level): Game {
  return { level, cells: [...level.givens], history: [] };
}

export function complete(game: Game): boolean {
  return game.cells.every(Boolean) && conflicts(game.cells).size === 0;
}

export function enter(game: Game, cell: number, value: Value): boolean {
  if (!Number.isInteger(cell) || cell < 0 || cell >= 16 || !Number.isInteger(value) || value < 0 || value > 4
    || game.level.givens[cell] || game.cells[cell] === value || complete(game)) return false;
  game.cells[cell] = value;
  game.history.push({ cell, value });
  return true;
}

export function undo(game: Game): number | undefined {
  const move = game.history.pop();
  if (!move) return;
  let previous = game.history.length - 1;
  while (previous >= 0 && game.history[previous].cell !== move.cell) previous--;
  game.cells[move.cell] = previous < 0 ? 0 : game.history[previous].value;
  return move.cell;
}

export function hint(game: Game, preferred: number): Move | undefined {
  const answer = solve(game.level.givens).solution;
  if (!answer) return;
  const cell = [preferred, ...game.cells.keys()].find(i => game.cells[i] !== answer[i]);
  if (cell !== undefined) return { cell, value: answer[cell] };
}

const clueCount = { easy: 11, medium: 8, hard: 6 };

export function randomLevel(seed: string, difficulty: Difficulty): Level {
  const random = seededRandom(seed);
  function shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    return items;
  }
  function order() { return shuffle([shuffle([0, 1]), shuffle([2, 3])]).flat(); }
  const rows = order();
  const columns = order();
  const plants = shuffle([...values]);
  const base = levels[0].givens;
  const answer = solve(base).solution!;
  const givens: Value[] = rows.flatMap(row => columns.map(col => plants[answer[row * 4 + col] - 1]));
  let remaining = 16;
  for (const cell of shuffle([...givens.keys()])) {
    const previous = givens[cell];
    givens[cell] = 0;
    if (solve(givens).count !== 1) givens[cell] = previous;
    else if (--remaining === clueCount[difficulty]) break;
  }
  if (remaining > clueCount[difficulty]) {
    // shortcut: transform a verified six-clue board if greedy removal stalls.
    const opening = '1234000000004001';
    const optional: number[] = [];
    rows.forEach((row, y) => columns.forEach((col, x) => {
      const cell = y * 4 + x;
      const value = Number(opening[row * 4 + col]);
      givens[cell] = value ? plants[value - 1] : 0;
      if (!value) optional.push(cell);
    }));
    for (const cell of shuffle(optional).slice(0, clueCount[difficulty] - 6)) {
      const original = rows[Math.floor(cell / 4)] * 4 + columns[cell % 4];
      givens[cell] = plants[answer[original] - 1];
    }
  }
  return { id: 'sudoku-random', title: 'Random garden', givens };
}
