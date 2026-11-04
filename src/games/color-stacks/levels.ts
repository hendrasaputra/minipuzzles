import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import { createGame, solve, type Level } from './engine';

export interface RandomStacks { version: 1; seed: string; difficulty: Difficulty }

function level(id: string, title: string, capacity: number, rows: string[]): Level {
  return { id, title, capacity, stacks: rows.map(row => Array.from(row, Number)) };
}

export const levels = [
  level('stacks-1', 'First sort', 3, ['001', '110', '']),
  level('stacks-2', 'Two spaces', 3, ['001', '', '101', '']),
  level('stacks-3', 'Three colors', 3, ['', '110', '21', '02', '02']),
  level('stacks-4', 'Tall stacks', 4, ['', '110', '2210', '210', '20']),
  level('stacks-5', 'Mixed tops', 4, ['0021', '', '', '2021', '2101']),
  level('stacks-6', 'Four colors', 4, ['', '00', '2313', '10', '2313', '1220']),
  level('stacks-7', 'Take your time', 4, ['', '1300', '2330', '', '1230', '2121']),
  level('stacks-8', 'Five colors', 4, ['0331', '', '2013', '', '4401', '4212', '4023']),
];

const tiers = {
  easy: { colors: 2, capacity: 3, minimum: 3, fallback: 1 },
  medium: { colors: 3, capacity: 4, minimum: 7, fallback: 4 },
  hard: { colors: 5, capacity: 4, minimum: 12, fallback: 7 },
};

function shuffle<T>(items: T[], random: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function randomLevel(spec: RandomStacks): Level {
  const { colors, capacity, minimum, fallback } = tiers[spec.difficulty];
  const random = seededRandom(spec.seed);
  const base = { id: 'stacks-random', title: 'Random stacks', capacity };
  for (let attempt = 0; attempt < 16; attempt++) {
    const blocks = shuffle(Array.from({ length: colors * capacity }, (_, i) => Math.floor(i / capacity)), random);
    const stacks = Array.from({ length: colors }, (_, i) => blocks.slice(i * capacity, (i + 1) * capacity));
    const candidate = { ...base, stacks: [...stacks, [], []] };
    const answer = solve(createGame(candidate), 6000);
    if (answer && answer.length >= minimum) return candidate;
  }
  // shortcut: permute a verified board when bounded random generation misses the tier.
  const palette = shuffle(Array.from({ length: colors }, (_, i) => i), random);
  return { ...base, stacks: shuffle(levels[fallback].stacks.map(stack => stack.map(color => palette[color])), random) };
}
