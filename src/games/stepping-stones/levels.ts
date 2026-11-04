import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import { neighbors, type Level } from './engine';

export interface RandomPath { version: 1; seed: string; difficulty: Difficulty }

const layouts = [
  { title: 'First steps', size: 3, route: [0, 1, 2, 5, 8] },
  { title: 'Around the pool', size: 3, route: [0, 1, 2, 5, 4, 3, 6] },
  { title: 'Little loop', size: 3, route: [0, 3, 6, 7, 8, 5, 2, 1, 4] },
  { title: 'Two turns', size: 4, route: [0, 1, 5, 4, 8, 12, 13, 9, 10, 14, 15] },
  { title: 'Across the pond', size: 4, route: [0, 4, 8, 12, 13, 9, 5, 1, 2, 6, 10, 14, 15, 11] },
  { title: 'Stone square', size: 4, route: [0, 1, 2, 3, 7, 11, 15, 14, 13, 12, 8, 4, 5, 6, 10, 9] },
  { title: 'The long bend', size: 5, route: [0, 1, 2, 7, 6, 5, 10, 15, 20, 21, 16, 11, 12, 17, 22, 23, 24, 19, 14, 9] },
  { title: 'Pond spiral', size: 5, route: [0, 1, 2, 3, 4, 9, 14, 19, 24, 23, 22, 21, 20, 15, 10, 5, 6, 7, 8, 13, 18, 17, 16, 11, 12] },
];

export const levels: Level[] = layouts.map((layout, index) => ({ ...layout, id: `stones-${index + 1}` }));

const tiers = {
  easy: { size: 3, min: 6, max: 8, fallback: 1 },
  medium: { size: 4, min: 10, max: 14, fallback: 3 },
  hard: { size: 5, min: 16, max: 22, fallback: 6 },
};

export function randomLevel(spec: RandomPath): Level {
  const { size, min, max, fallback } = tiers[spec.difficulty];
  const random = seededRandom(spec.seed);
  const length = min + Math.floor(random() * (max - min + 1));
  const result = (route: number[]): Level => ({ id: 'stones-random', title: 'Random path', size, route });

  for (let attempt = 0; attempt < 60; attempt++) {
    const route = [Math.floor(random() * size ** 2)];
    const visited = new Set(route);
    while (route.length < length) {
      const open = neighbors(size, route.at(-1)!).filter(cell => !visited.has(cell));
      if (!open.length) break;
      const cell = open[Math.floor(random() * open.length)];
      route.push(cell);
      visited.add(cell);
    }
    if (route.length === length) return result(route);
  }
  // shortcut: reflect a verified authored route if the bounded walk cannot reach the chosen length.
  return result(levels[fallback].route.map(cell => Math.floor(cell / size) * size + size - 1 - cell % size));
}
