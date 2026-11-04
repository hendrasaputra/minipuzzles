import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import { crosses, nearestEdges, totals, type Count, type Level, type Point } from './engine';

export interface RandomBridge { version: 1; seed: string; difficulty: Difficulty }

function layout(id: string, title: string, points: Point[], counts: Count[]): Level {
  const level: Level = { id, title, islands: points.map(point => ({ ...point, goal: 0 })),
    edges: nearestEdges(points), solution: counts };
  totals(level, counts).forEach((goal, i) => { level.islands[i].goal = goal; });
  return level;
}

function build(id: string, title: string, points: Point[], random: () => number): Level {
  const edges = nearestEdges(points);
  const solution: Count[] = edges.map(() => 0);
  const groups = points.map((_, i) => i);
  const order = edges.map(({ a, b }, i) => ({
    i, weight: Math.abs(points[a].x - points[b].x) + Math.abs(points[a].y - points[b].y) + random(),
  })).sort((a, b) => a.weight - b.weight);
  for (const { i } of order) {
    const { a, b } = edges[i];
    if (groups[a] === groups[b]) continue;
    if (edges.some((edge, j) => solution[j] && crosses(points, edges[i], edge))) continue;
    solution[i] = random() < .35 ? 2 : 1;
    const previous = groups[b];
    const group = groups[a];
    groups.forEach((value, j) => { if (value === previous) groups[j] = group; });
  }
  for (const { i } of order) {
    if (!solution[i] && random() < .35 && !edges.some((edge, j) =>
      solution[j] && crosses(points, edges[i], edge))) solution[i] = 1;
  }
  return layout(id, title, points, solution);
}

const maps = [
  ['###', '#..'],
  ['##.', '.##', '##.'],
  ['###', '#.#', '###'],
  ['.###', '###.', '..##'],
  ['###.', '#.##', '###.', '..##'],
  ['.##.', '####', '.#.#', '####'],
  ['##.##', '.###.', '##.##', '.###.'],
];

export const levels = [
  layout('bridge-1', 'First crossing', [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 2, y: 2 }], [1, 2]),
  ...maps.map((rows, i) => {
    const points = rows.flatMap((row, y) => Array.from(row).flatMap((cell, x) =>
      cell === '#' ? [{ x: x * 2, y: y * 2 }] : []));
    const id = `bridge-${i + 2}`;
    return build(id, `Crossing ${i + 2}`, points, seededRandom(id));
  }),
];

const tiers = {
  easy: { size: 3, count: 5 },
  medium: { size: 4, count: 8 },
  hard: { size: 5, count: 12 },
};

export function randomLevel(spec: RandomBridge): Level {
  const { size, count } = tiers[spec.difficulty];
  const random = seededRandom(spec.seed);
  const occupied = new Set([Math.floor(random() * size ** 2)]);
  while (occupied.size < count) {
    const open = new Set<number>();
    for (const cell of occupied) {
      const x = cell % size;
      for (const neighbor of [x > 0 ? cell - 1 : -1, x < size - 1 ? cell + 1 : -1, cell - size, cell + size]) {
        if (neighbor >= 0 && neighbor < size ** 2 && !occupied.has(neighbor)) open.add(neighbor);
      }
    }
    occupied.add([...open][Math.floor(random() * open.size)]);
  }
  // Adjacent cells form a connected cluster. Their edges are processed before longer edges and never cross.
  const points = [...occupied].sort((a, b) => a - b).map(cell =>
    ({ x: (cell % size) * 2, y: Math.floor(cell / size) * 2 }));
  return build('bridge-random', 'Random crossing', points, random);
}
