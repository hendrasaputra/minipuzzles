import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import { solve, type Level } from './engine';

export interface RandomBoard { version: 1; seed: string; difficulty: Difficulty }

function layout(id: string, title: string, rows: string[]): Level {
  function locate(marker: string) {
    const y = rows.findIndex(row => row.includes(marker));
    return { x: rows[y].indexOf(marker), y };
  }
  return { id, title, start: locate('S'), goal: locate('G'), tiles: rows.map(row => row.replace(/[SG]/g, '#')) };
}

export const levels = [
  layout('stone-1', 'First roll', ['S##G']),
  layout('stone-2', 'Around the gap', ['####', 'S###', '##.#', '###G']),
  layout('stone-3', 'Short bridge', ['###G', '#.##', 'S##.', '###.']),
  layout('stone-4', 'Two turns', ['##.#.', '#####', '#####', 'S##.#', '####G']),
  layout('stone-5', 'Broken path', ['S####.', '..###.', '#.####', '###..#', '.#.###', '##.#.G']),
  layout('stone-6', 'Across the ledges', ['##.###', '######', '.#.###', '##.#.#', '.####G', 'S###.#']),
  layout('stone-7', 'High crossing', ['####.#G', '###.###', '#######', '#.##.##', 'S...###', '#.#####', '#######']),
  layout('stone-8', 'Long crossing', ['########', '####.###', 'S..#####', '#.##..#.', '#.#..###', '.###.###', '########', '######.G']),
];

export const tiers = {
  easy: { size: 4, min: 3, max: 7, fallback: 1 },
  medium: { size: 6, min: 8, max: 15, fallback: 4 },
  hard: { size: 8, min: 16, max: 32, fallback: 7 },
};

export function randomLevel(spec: RandomBoard): Level {
  const next = seededRandom(spec.seed);
  const { size, min, max, fallback } = tiers[spec.difficulty];
  for (let attempt = 0; attempt < 96; attempt++) {
    const start = { x: 0, y: Math.floor(next() * size) };
    const goal = { x: size - 1, y: Math.floor(next() * size) };
    const tiles = Array.from({ length: size }, (_, y) =>
      Array.from({ length: size }, (_, x) =>
        (x === start.x && y === start.y) || (x === goal.x && y === goal.y) || next() < .81 ? '#' : '.').join(''));
    const level = { id: 'stone-random', title: 'Random path', start, goal, tiles };
    const route = solve(level);
    if (route && route.length >= min && route.length <= max) return level;
  }
  // shortcut: a mirrored authored level keeps the difficulty when bounded search finds no candidate.
  const base = levels[fallback];
  const mirror = (point: { x: number; y: number }) => ({ x: base.tiles[0].length - 1 - point.x, y: point.y });
  return { ...base, id: 'stone-random', title: 'Random path', start: mirror(base.start),
    goal: mirror(base.goal), tiles: base.tiles.map(row => [...row].reverse().join('')) };
}
