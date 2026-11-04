import { seededRandom, type Difficulty } from '../../shared/random-puzzle';

export type Mark = 0 | 1 | -1;
export interface Puzzle { id: string; title: string; size: number; picture: boolean[] }
export interface Move { cell: number; mark: Mark }
export interface Game { puzzle: Puzzle; marks: Mark[]; history: Move[] }

export function runs(line: readonly boolean[]): number[] {
  const clues: number[] = [];
  let count = 0;
  for (const filled of line) {
    if (filled) count++;
    else if (count) { clues.push(count); count = 0; }
  }
  if (count) clues.push(count);
  return clues;
}

export function clues(puzzle: Puzzle) {
  const { size, picture } = puzzle;
  return {
    rows: Array.from({ length: size }, (_, row) => runs(picture.slice(row * size, (row + 1) * size))),
    columns: Array.from({ length: size }, (_, col) => runs(Array.from({ length: size }, (_, row) => picture[row * size + col]))),
  };
}

/** Find at most two solutions. A depleted budget is distinct from a verified result. */
export function solutionCount(puzzle: Puzzle): number | null {
  const { size } = puzzle;
  const { rows, columns } = clues(puzzle);
  const patterns = Array.from({ length: 1 << size }, (_, mask) => Array.from({ length: size }, (_, i) => Boolean(mask & (1 << i))));
  const byRuns = new Map<string, boolean[][]>();
  for (const pattern of patterns) {
    const key = runs(pattern).join(',');
    if (!byRuns.has(key)) byRuns.set(key, []);
    byRuns.get(key)!.push(pattern);
  }
  const rowOptions = rows.map(line => byRuns.get(line.join(','))!);
  const columnOptions = columns.map(line => byRuns.get(line.join(','))!);
  let budget = 5000;
  let count = 0;
  function visit(row: number, possible: boolean[][][]) {
    if (row === size) { count++; return; }
    for (const option of rowOptions[row]) {
      if (--budget < 0 || count === 2) return;
      const next = possible.map((choices, col) => choices.filter(line => line[row] === option[col]));
      if (next.every(choices => choices.length > 0)) visit(row + 1, next);
    }
  }
  visit(0, columnOptions);
  return budget < 0 ? null : count;
}

function picture(id: string, title: string, rows: string[]): Puzzle {
  return { id, title, size: rows.length, picture: rows.join('').split('').map(cell => cell === '#') };
}

export const levels = [
  picture('island-1', 'Cross', ['..#..', '..#..', '#####', '..#..', '..#..']),
  picture('island-2', 'Boat', ['..#..', '..#..', '..#..', '#####', '.###.']),
  picture('island-3', 'Heart', ['.#.#.', '#####', '#####', '.###.', '..#..']),
  picture('island-4', 'House', ['..#..', '.###.', '#####', '##.##', '##.##']),
  picture('island-5', 'Arrow', ['...#..', '...##.', '######', '######', '...##.', '...#..']),
  picture('island-6', 'Tree', ['...#...', '..###..', '.#####.', '#######', '..###..', '...#...', '..###..']),
  picture('island-7', 'Diamond', ['...#...', '..###..', '.#####.', '#######', '.#####.', '..###..', '...#...']),
  picture('island-8', 'Castle', ['##.##.##', '########', '.######.', '.######.', '.##..##.', '.##..##.', '.##..##.', '.######.']),
];

export function randomPuzzle(seed: string, difficulty: Difficulty): Puzzle {
  const random = seededRandom(seed);
  const size = { easy: 5, medium: 6, hard: 8 }[difficulty];
  const density = { easy: .70, medium: .60, hard: .54 }[difficulty];
  const make = (cells: boolean[]): Puzzle => ({ id: 'random', title: 'Random picture', size, picture: cells });
  for (let attempt = 0; attempt < 80; attempt++) {
    const cells = Array.from({ length: size * size }, () => random() < density);
    const filled = cells.filter(Boolean).length;
    if (filled < size * 2 || filled > cells.length - size) continue;
    const candidate = make(cells);
    if (solutionCount(candidate) === 1) return candidate;
  }
  // shortcut: a seeded triangle has a unique solution when the random search reaches its budget.
  const flip = random() < .5;
  const turn = random() < .5;
  return make(Array.from({ length: size * size }, (_, i) => {
    const x = i % size;
    const y = Math.floor(i / size);
    return (flip ? size - 1 - x : x) <= (turn ? size - 1 - y : y);
  }));
}

export function createGame(puzzle: Puzzle): Game {
  return { puzzle, marks: Array<Mark>(puzzle.picture.length).fill(0), history: [] };
}

export function complete(game: Game): boolean {
  return game.marks.every((mark, i) => (mark === 1) === game.puzzle.picture[i]);
}

export function markCell(game: Game, cell: number, mark: Mark): boolean {
  if (!Number.isInteger(cell) || cell < 0 || cell >= game.marks.length || ![-1, 0, 1].includes(mark)
    || game.marks[cell] === mark || complete(game)) return false;
  game.history.push({ cell, mark });
  game.marks[cell] = mark;
  return true;
}

export function undo(game: Game) {
  const move = game.history.pop();
  if (!move) return;
  game.marks[move.cell] = 0;
  for (let i = game.history.length - 1; i >= 0; i--) {
    const previous = game.history[i];
    if (previous.cell === move.cell) { game.marks[move.cell] = previous.mark; break; }
  }
}

export function hint(game: Game): Move | undefined {
  const incorrect = game.marks.findIndex((mark, i) => mark === 1 && !game.puzzle.picture[i]);
  if (incorrect >= 0) return { cell: incorrect, mark: -1 };
  const missing = game.marks.findIndex((mark, i) => mark !== 1 && game.puzzle.picture[i]);
  return missing >= 0 ? { cell: missing, mark: 1 } : undefined;
}
