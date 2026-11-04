import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import { buildLevel, type Shape, type Turn } from './engine';

type Recipe = [Shape, number, number, Turn][];
export interface RandomTangram { version: 1; seed: string; difficulty: Difficulty }

const recipes: { title: string; pieces: Recipe }[] = [
  { title: 'First square', pieces: [['large', 0, 0, 0], ['large', 0, 0, 2]] },
  { title: 'Steps', pieces: [['large', 0, 0, 0], ['large', 0, 0, 2], ['square', 2, 1, 0], ['small', 2, 2, 0]] },
  { title: 'Roof', pieces: [['large', 0, 0, 3], ['square', 0, 2, 0], ['small', 1, 2, 0], ['small', 1, 2, 2]] },
  { title: 'Boat', pieces: [['large', 1, 0, 3], ['slant', 0, 2, 0], ['square', 2, 2, 0], ['small', 3, 2, 0]] },
  { title: 'Flag', pieces: [['large', 1, 0, 0], ['square', 0, 0, 0], ['small', 0, 1, 0], ['small', 0, 1, 2], ['square', 0, 2, 0]] },
  { title: 'Corner', pieces: [['large', 0, 0, 0], ['large', 0, 0, 2], ['slant', 1, 2, 0], ['small', 0, 2, 0], ['small', 0, 2, 2]] },
  { title: 'Kite', pieces: [['large', 0, 0, 2], ['large', 2, 0, 3], ['large', 0, 2, 1], ['large', 2, 2, 0]] },
  { title: 'Tower', pieces: [['large', 0, 0, 3], ['large', 0, 2, 0], ['large', 0, 2, 2], ['slant', 0, 4, 0], ['small', 0, 4, 3], ['square', 2, 3, 0]] },
];

export const levels = recipes.map(({ title, pieces }, i) => buildLevel(`tangram-${i + 1}`, title, pieces));

export function randomLevel(spec: RandomTangram) {
  const random = seededRandom(spec.seed);
  const extra = { easy: 1, medium: 2, hard: 3 }[spec.difficulty];
  const pieces: Recipe = [['large', 0, 0, 0], ['large', 0, 0, 2]];
  const cells = new Map<string, [number, number]>();
  function add(x: number, y: number) { cells.set(`${x},${y}`, [x, y]); }
  add(0, 0); add(0, 1); add(1, 0); add(1, 1);
  for (let i = 0; i < extra; i++) {
    const open = new Map<string, [number, number]>();
    for (const [x, y] of cells.values()) {
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const id = `${nx},${ny}`;
        if (!cells.has(id)) open.set(id, [nx, ny]);
      }
    }
    const [x, y] = [...open.values()][Math.floor(random() * open.size)];
    add(x, y);
    if (random() < .5) pieces.push(['square', x, y, 0]);
    else {
      const turn = Math.floor(random() * 4) as Turn;
      pieces.push(['small', x, y, turn], ['small', x, y, ((turn + 2) % 4) as Turn]);
    }
  }
  const minX = Math.min(...pieces.map(([, x]) => x));
  const minY = Math.min(...pieces.map(([, , y]) => y));
  return buildLevel('tangram-random', 'Random shape', pieces.map(([shape, x, y, turn]) => [shape, x - minX, y - minY, turn]));
}
