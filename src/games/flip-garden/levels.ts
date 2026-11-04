import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import { flipMask, type Level } from './engine';

export interface RandomGarden { version: 1; seed: string; difficulty: Difficulty }

function level(id: string, title: string, rows: string[], presses: number[]): Level {
  const size = rows.length;
  const goal = rows.join('').split('').reduce((mask, tile, i) => tile === '#' ? mask | (1 << i) : mask, 0);
  const start = presses.reduce((mask, cell) => mask ^ flipMask(size, cell), goal);
  return { id, title, size, goal, start };
}

export const levels = [
  level('flip-1', 'First bloom', ['.#.', '###', '.#.'], [4]),
  level('flip-2', 'Three flowers', ['#..', '.#.', '..#'], [0, 8]),
  level('flip-3', 'Flower border', ['###', '#.#', '###'], [1, 4, 7]),
  level('flip-4', 'Square bed', ['....', '.##.', '.##.', '....'], [0, 5, 15]),
  level('flip-5', 'Four corners', ['#..#', '....', '....', '#..#'], [2, 4, 9, 12]),
  level('flip-6', 'Garden path', ['#...', '.#..', '..#.', '...#'], [0, 3, 5, 10, 12, 15]),
  level('flip-7', 'Wide cross', ['..#..', '..#..', '#####', '..#..', '..#..'], [0, 4, 7, 12, 17, 20, 24]),
  level('flip-8', 'Two borders', ['#####', '.....', '#.#.#', '.....', '#####'], [0, 2, 5, 9, 11, 13, 15, 17, 22, 24]),
];

const tiers = {
  easy: { size: 3, presses: 3 },
  medium: { size: 4, presses: 5 },
  hard: { size: 5, presses: 8 },
};

export function randomLevel(spec: RandomGarden): Level {
  const { size, presses } = tiers[spec.difficulty];
  const next = seededRandom(spec.seed);
  const rows = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => next() < .5 ? '#' : '.').join(''));
  const cells = Array.from({ length: size ** 2 }, (_, i) => i);
  for (let i = 0; i < presses; i++) {
    const j = i + Math.floor(next() * (cells.length - i));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  const generated = level('flip-random', 'Random garden', rows, cells.slice(0, presses));
  // A sequence in the solver's null space would leave the puzzle solved.
  if (generated.start === generated.goal) generated.start ^= flipMask(size, cells[0]);
  return generated;
}
