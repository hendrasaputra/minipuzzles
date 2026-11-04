import { seededRandom, type Difficulty } from '../../shared/random-puzzle';

export type SymbolName = 'circle' | 'star' | 'diamond';
export type Clue =
  | { kind: 'count' | 'order'; symbols: SymbolName[]; find: SymbolName }
  | { kind: 'sequence'; start: number; step: number }
  | { kind: 'sum'; first: number; second: number };

export interface Room {
  id: string;
  title: string;
  clues: Clue[];
}

export interface RandomRoom {
  version: 1;
  seed: string;
  difficulty: Difficulty;
}

export const symbols = { circle: '●', star: '★', diamond: '◆' };
const names: SymbolName[] = ['circle', 'star', 'diamond'];

export function digit(room: Room, index: number): number {
  const clue = room.clues[index];
  switch (clue.kind) {
    case 'count': return clue.symbols.filter(symbol => symbol === clue.find).length;
    case 'order': return clue.symbols.indexOf(clue.find) + 1;
    case 'sequence': return clue.start + 2 * clue.step;
    case 'sum': return digit(room, clue.first) + digit(room, clue.second);
  }
}

export function unlock(room: Room, inspected: readonly number[], code: readonly string[]): boolean {
  return code.length === room.clues.length
    && room.clues.every((_, index) => inspected.includes(index) && code[index] === String(digit(room, index)));
}

const count = (find: SymbolName, ...symbols: SymbolName[]): Clue => ({ kind: 'count', find, symbols });
const order = (find: SymbolName, ...symbols: SymbolName[]): Clue => ({ kind: 'order', find, symbols });
const sequence = (start: number, step: number): Clue => ({ kind: 'sequence', start, step });
const sum = (first: number, second: number): Clue => ({ kind: 'sum', first, second });

export const rooms: Room[] = [
  { id: 'escape-1', title: 'First lock', clues: [count('circle', 'circle', 'star', 'circle', 'diamond', 'circle'), sequence(1, 2)] },
  { id: 'escape-2', title: 'Shape shelf', clues: [order('star', 'circle', 'diamond', 'star'), count('diamond', 'star', 'diamond', 'diamond', 'circle')] },
  { id: 'escape-3', title: 'Three clues', clues: [sequence(2, 3), count('star', 'star', 'diamond', 'star', 'star'), order('circle', 'diamond', 'star', 'circle')] },
  { id: 'escape-4', title: 'Count back', clues: [sequence(9, -3), order('diamond', 'circle', 'diamond', 'star'), count('circle', 'circle', 'circle', 'diamond', 'circle', 'star', 'circle')] },
  { id: 'escape-5', title: 'Add two clues', clues: [count('star', 'star', 'circle', 'star'), sequence(0, 2), sum(0, 1)] },
  { id: 'escape-6', title: 'Four digits', clues: [sequence(1, 3), order('star', 'circle', 'star', 'diamond'), count('diamond', 'diamond', 'circle', 'diamond', 'diamond'), sum(1, 2)] },
  { id: 'escape-7', title: 'Two sums', clues: [order('diamond', 'circle', 'star', 'diamond'), sequence(8, -3), sum(0, 1), sum(1, 2)] },
  { id: 'escape-8', title: 'Last lock', clues: [sequence(7, -3), count('circle', 'diamond', 'circle', 'circle', 'star', 'circle'), sum(0, 1), sum(1, 2)] },
];

export function randomRoom(spec: RandomRoom): Room {
  const next = seededRandom(spec.seed);
  const find = names[Math.floor(next() * names.length)];
  const other = names[(names.indexOf(find) + 1) % names.length];
  const first = 1 + Math.floor(next() * 4);
  const tally = [...Array<SymbolName>(first).fill(find), other, other];
  for (let i = tally.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [tally[i], tally[j]] = [tally[j], tally[i]];
  }
  const second = 1 + Math.floor(next() * 4);
  const clues: Clue[] = [count(find, ...tally), sequence(second + 4, -2)];
  if (spec.difficulty === 'medium') {
    const orderSymbols = [...names];
    const shift = Math.floor(next() * 3);
    clues.push(order(find, ...orderSymbols.slice(shift), ...orderSymbols.slice(0, shift)));
  }
  if (spec.difficulty === 'hard') {
    clues.push(sum(0, 1), sequence(3 + Math.floor(next() * 3), 2));
  }
  return { id: 'escape-random', title: 'Random room', clues };
}
