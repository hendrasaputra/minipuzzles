import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import type { Level } from './engine';

const patterns = [
  ['10', '02'],
  ['21', '12'],
  ['102', '200', '010'],
  ['120', '031', '203'],
  ['020', '323', '101'],
  ['0301', '1200', '2040', '0012'],
  ['2104', '0230', '3021', '0140'],
  ['3021', '2402', '0143', '3200'],
];

export const levels: Level[] = patterns.map((rows, index) => ({
  id: `shadow-${index + 1}`,
  title: index === 0 ? 'First shadow' : `Level ${index + 1}`,
  size: rows.length,
  target: rows.join('').split('').map(Number),
}));

export interface RandomShadow {
  version: 1;
  seed: string;
  difficulty: Difficulty;
}

const tiers = {
  easy: { size: 2, limit: 2 },
  medium: { size: 3, limit: 3 },
  hard: { size: 4, limit: 4 },
};

export function generateShadow(spec: RandomShadow): Level {
  const { size, limit } = tiers[spec.difficulty];
  const random = seededRandom(spec.seed);
  const target = Array.from({ length: size ** 2 }, () => Math.floor(random() * (limit + 1)));
  target[Math.floor(random() * target.length)] = limit;
  return { id: 'shadow-random', title: 'Random puzzle', size, target };
}
