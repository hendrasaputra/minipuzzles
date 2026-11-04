import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import type { Level, Node } from './engine';

type Tree = number | [Tree, Tree];

export interface RandomRailroad {
  version: 1;
  seed: string;
  difficulty: Difficulty;
}

function level(id: string, title: string, tree: Tree, trains: number[], switches: boolean[], spacing = 1.3): Level {
  let lane = 0;
  let junction = 0;
  function build(branch: Tree, depth: number): Node {
    if (typeof branch === 'number') return { station: branch, x: 6, y: .8 + lane++ * spacing };
    const index = junction++;
    const upper = build(branch[0], depth + 1);
    const lower = build(branch[1], depth + 1);
    return { junction: index, x: 1.55 + depth * 1.32, y: (upper.y + lower.y) / 2, branches: [upper, lower] };
  }
  const root = build(tree, 0);
  return { id, title, root, yard: { x: .45, y: root.y }, trains, switches, stations: lane };
}

export const levels = [
  level('rail-1', 'First departure', [0, 1], [1, 0], [false]),
  level('rail-2', 'Two stations', [1, 0], [1, 0, 1], [true]),
  level('rail-3', 'Second switch', [0, [1, 2]], [2, 0, 1], [false, false]),
  level('rail-4', 'Three stops', [[2, 0], 1], [0, 1, 2, 0], [true, false]),
  level('rail-5', 'Four stations', [[0, 1], [2, 3]], [3, 1, 2, 0], [false, false, false]),
  level('rail-6', 'Long branch', [3, [0, [2, 1]]], [1, 3, 2, 0, 1], [false, false, false]),
  level('rail-7', 'West junction', [[[1, 3], 2], 0], [3, 0, 2, 1, 3], [true, true, false]),
  level('rail-8', 'Busy yard', [[3, 1], [0, 2]], [1, 2, 3, 0, 1, 2], [true, false, false]),
];

export function generateRailroad(spec: RandomRailroad): Level {
  const random = seededRandom(spec.seed);
  const count = { easy: 2, medium: 3, hard: 4 }[spec.difficulty];
  function shuffle(values: number[]) {
    for (let i = values.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [values[i], values[j]] = [values[j], values[i]];
    }
    return values;
  }
  function branch(stations: number[]): Tree {
    if (stations.length === 1) return stations[0];
    const split = 1 + Math.floor(random() * (stations.length - 1));
    return [branch(stations.slice(0, split)), branch(stations.slice(split))];
  }
  const stations = Array.from({ length: count }, (_, i) => i);
  const tree = branch(shuffle([...stations]));
  const trains = shuffle(stations);
  if (count === 4) {
    const next = (trains[count - 1] + 1 + Math.floor(random() * (count - 1))) % count;
    trains.push(next, (next + 1 + Math.floor(random() * (count - 1))) % count);
  }
  return level('rail-random', 'Random yard', tree, trains,
    Array.from({ length: count - 1 }, () => random() < .5), 1.2 + random() * .22);
}
