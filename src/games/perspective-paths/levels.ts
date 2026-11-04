import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import { initialView, type Level, type Point } from './engine';

type Angle = readonly [turn: number, tilt: number];
export interface RandomPath { version: 1; seed: string; difficulty: Difficulty }

function level(id: string, title: string, angles: readonly Angle[]): Level {
  const points: Point[] = [{ x: 0, y: 0, z: .35 }];
  for (const [turn, tilt] of angles) {
    const before = points[points.length - 1];
    const yaw = initialView.yaw + turn * .15;
    const elevation = initialView.tilt + tilt * .1;
    const length = 1.65 / Math.sin(yaw);
    points.push({ x: before.x + 1.65, y: before.y + length * Math.cos(yaw), z: before.z + length * Math.tan(elevation) });
  }
  return { id, title, points };
}

export const levels: Level[] = [
  level('perspective-1', 'First gap', [[-2, 0]]),
  level('perspective-2', 'High step', [[2, 2]]),
  level('perspective-3', 'Two gaps', [[3, -2], [-1, 1]]),
  level('perspective-4', 'Side path', [[6, -2], [1, 1]]),
  level('perspective-5', 'Three ledges', [[-2, -1], [5, 0], [1, 2]]),
  level('perspective-6', 'Turn the corner', [[8, -2], [3, 1], [-1, -1]]),
  level('perspective-7', 'Tall path', [[2, -2], [7, 1], [1, 2], [5, -1]]),
  level('perspective-8', 'Last crossing', [[-2, 1], [6, -2], [1, 0], [8, 1], [3, -1]]),
];

const choices: Angle[] = [[-2, -2], [-2, 0], [-1, 1], [1, -2], [2, 2], [3, -1], [5, 1], [7, -2], [8, 0]];
const sizes: Record<Difficulty, number> = { easy: 2, medium: 3, hard: 5 };

export function randomLevel(spec: RandomPath): Level {
  const random = seededRandom(spec.seed);
  const pool = spec.difficulty === 'easy' ? choices.slice(0, 5) : choices;
  const angles: Angle[] = [];
  for (let i = 0; i < sizes[spec.difficulty]; i++) {
    const previous = angles[i - 1];
    const options = pool.filter(angle => !previous
      || Math.abs(angle[0] - previous[0]) >= 2 || Math.abs(angle[1] - previous[1]) >= 2);
    angles.push(options[Math.floor(random() * options.length)]);
  }
  return level('perspective-random', 'Random path', angles);
}
