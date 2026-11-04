import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import { solve, type Level } from './engine';

export interface RandomGarden { version: 1; seed: string; difficulty: Difficulty }

function layout(id: string, title: string, rows: string[]): Level {
  const cells = rows.join('').split('');
  return {
    id, title, size: rows.length, start: cells.indexOf('R'), dock: cells.indexOf('D'),
    seeds: cells.flatMap((cell, index) => cell === 'S' ? [index] : []),
    rocks: cells.flatMap((cell, index) => cell === '#' ? [index] : []),
  };
}

export const levels = [
  layout('robot-1', 'First steps', ['.D..', 'RS..', '....', '....']),
  layout('robot-2', 'Around a rock', ['R#D.', '..S.', '....', '....']),
  layout('robot-3', 'Two seeds', ['R...D', '..#..', '.S#S.', '..#..', '.....']),
  layout('robot-4', 'Garden path', ['R#..D', '.#.#.', '.S.#S', '.#.#.', '.....']),
  layout('robot-5', 'Three seeds', ['R..#D.', '.#.#..', 'S#....', '.#S#..', '....#S', '......']),
  layout('robot-6', 'Long way round', ['R.#..D', '..#.#.', '.S#.#.', '..#..S', '....#.', '..S...']),
  layout('robot-7', 'Stone beds', ['R..#..D', '.#.#.#.', '.S...#.', '.###.#.', '...S.#.', '.##..S.', '.......']),
  layout('robot-8', 'Full basket', ['R.#...D', '..#.#..', '#S#.#..', '....#S.', '.##....', '..S.##.', '.......']),
];

const tiers = {
  easy: { size: 4, seeds: 1, rocks: 2, min: 3, max: 7, fallback: 1 },
  medium: { size: 5, seeds: 2, rocks: 5, min: 8, max: 14, fallback: 2 },
  hard: { size: 7, seeds: 3, rocks: 11, min: 15, max: 28, fallback: 6 },
};

export function randomLevel(spec: RandomGarden): Level {
  const { size, seeds, rocks, min, max, fallback } = tiers[spec.difficulty];
  const random = seededRandom(spec.seed);
  for (let attempt = 0; attempt < 48; attempt++) {
    const cells = Array.from({ length: size ** 2 }, (_, index) => index);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const level = {
      id: 'robot-random', title: 'Random garden', size, start: cells[0], dock: cells[1],
      seeds: cells.slice(2, 2 + seeds), rocks: cells.slice(2 + seeds, 2 + seeds + rocks),
    };
    const solution = solve(level);
    if (solution && solution.length >= min && solution.length <= max) return level;
  }
  // shortcut: use a mirrored authored route if bounded generation finds no route in the tier.
  const base = levels[fallback];
  const mirror = (cell: number) => Math.floor(cell / base.size) * base.size + base.size - 1 - cell % base.size;
  return { ...base, id: 'robot-random', title: 'Random garden', start: mirror(base.start),
    dock: mirror(base.dock), seeds: base.seeds.map(mirror), rocks: base.rocks.map(mirror) };
}
