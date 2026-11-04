import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import { routes, type Amounts, type Level } from './engine';

function level(id: string, title: string, capacities: Amounts, goal: Amounts): Level {
  return { id, title, capacities, start: [capacities[0], 0, 0], goal };
}

export const levels = [
  level('balance-1', 'First pour', [6, 4, 2], [2, 4, 0]),
  level('balance-2', 'Fill two jugs', [7, 4, 3], [0, 4, 3]),
  level('balance-3', 'Measure two', [8, 5, 3], [6, 2, 0]),
  level('balance-4', 'Leave one liter', [9, 5, 4], [8, 0, 1]),
  level('balance-5', 'Share the water', [9, 7, 4], [3, 2, 4]),
  level('balance-6', 'Split eight', [8, 5, 3], [4, 4, 0]),
  level('balance-7', 'Split ten', [10, 7, 3], [5, 5, 0]),
  level('balance-8', 'Split twelve', [12, 7, 5], [6, 6, 0]),
];

export interface RandomBalance { version: 1; seed: string; difficulty: Difficulty }

const capacities: Record<Difficulty, Amounts[]> = {
  easy: [[6, 4, 2], [7, 4, 3], [8, 5, 3], [9, 7, 4]],
  medium: [[7, 4, 3], [8, 5, 3], [9, 5, 4], [12, 9, 5]],
  hard: [[10, 7, 3], [12, 7, 5], [13, 8, 5], [13, 9, 4]],
};

export const ranges: Record<Difficulty, readonly [number, number]> = {
  easy: [1, 4], medium: [5, 8], hard: [9, 12],
};

export function randomLevel(spec: RandomBalance): Level {
  const random = seededRandom(spec.seed);
  const options = capacities[spec.difficulty];
  const capacity = options[Math.floor(random() * options.length)];
  const [min, max] = ranges[spec.difficulty];
  const goals = routes(capacity, [capacity[0], 0, 0])
    .filter(({ path }) => path.length >= min && path.length <= max);
  const goal = goals[Math.floor(random() * goals.length)].amounts;
  return level('balance-random', 'Random puzzle', capacity, goal);
}
