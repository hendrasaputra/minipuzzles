import { isDifficulty, seededRandom, type Difficulty } from '../../shared/random-puzzle';
import { createGame, solve, type Cell, type Direction, type Level } from './engine';

export interface RandomLight {
  version: 1;
  seed: string;
  difficulty: Difficulty;
}

export function isRandomLight(value: unknown): value is RandomLight {
  if (!value || typeof value !== 'object') return false;
  const { version, seed, difficulty } = value as Partial<RandomLight>;
  return version === 1 && typeof seed === 'string' && seed.length > 0 && seed.length <= 128
    && isDifficulty(difficulty);
}

const tiers = {
  easy: { size: 5, bends: 2, min: 1, crystals: 1, decoys: 1, walls: 1 },
  medium: { size: 6, bends: 4, min: 3, crystals: 2, decoys: 2, walls: 2 },
  hard: { size: 7, bends: 6, min: 5, crystals: 3, decoys: 3, walls: 3 },
};
const directions: Direction[] = ['n', 'e', 's', 'w'];
const steps = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
const cellKey = ({ x, y }: Cell) => `${x},${y}`;

interface Route {
  source: Level['source'];
  mirrors: Level['mirrors'];
  through: Cell[];
  end: Cell;
}

function randomRoute(size: number, bends: number, random: () => number): Route | null {
  const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];
  let dir = Math.floor(random() * directions.length);
  let current = { x: Math.floor(random() * size), y: Math.floor(random() * size) };
  const source = { ...current, dir: directions[dir] };
  const occupied = new Set([cellKey(current)]);
  const mirrors: Level['mirrors'] = [];
  const through: Cell[] = [];
  const free = (cell: Cell) => cell.x >= 0 && cell.y >= 0 && cell.x < size && cell.y < size
    && !occupied.has(cellKey(cell));

  for (let bend = 0; bend <= bends; bend++) {
    const step = steps[dir];
    const run: Cell[] = [];
    const options: { length: number; out: number }[] = [];
    for (let cell = { x: current.x + step.x, y: current.y + step.y }; free(cell);
      cell = { x: cell.x + step.x, y: cell.y + step.y }) {
      run.push(cell);
      for (const out of [(dir + 1) % 4, (dir + 3) % 4]) {
        const next = steps[out];
        if (free({ x: cell.x + next.x, y: cell.y + next.y })) options.push({ length: run.length, out });
      }
    }
    if (bend === bends) {
      if (!run.length) return null;
      const end = pick(run);
      through.push(...run.slice(0, run.indexOf(end)));
      return { source, mirrors, through, end };
    }
    if (!options.length) return null;
    const { length, out } = pick(options);
    current = run[length - 1];
    for (const cell of run.slice(0, length)) occupied.add(cellKey(cell));
    through.push(...run.slice(0, length - 1));
    mirrors.push({ ...current, id: `mirror-${bend + 1}`, slash: (dir + out) % 4 === 1 });
    dir = out;
  }
  return null;
}

function buildLevel(route: Route, difficulty: Difficulty, random: () => number, decorate: boolean): Level {
  const tier = tiers[difficulty];
  const take = <T>(items: T[]) => items.splice(Math.floor(random() * items.length), 1)[0];
  const { source, through, end } = route;
  const mirrors = route.mirrors.map(mirror => ({ ...mirror }));
  const candidates = [...mirrors];
  const turns = tier.min + Math.floor(random() * 2);
  for (let i = 0; i < turns; i++) {
    const mirror = take(candidates);
    mirror.slash = !mirror.slash;
  }

  const crystals = [end];
  const spare = [...through];
  while (crystals.length < tier.crystals && spare.length) crystals.push(take(spare));

  const walls: Cell[] = [];
  if (decorate) {
    const occupied = new Set([source, end, ...through, ...mirrors].map(cellKey));
    const free: Cell[] = [];
    for (let y = 0; y < tier.size; y++) for (let x = 0; x < tier.size; x++) {
      if (!occupied.has(cellKey({ x, y }))) free.push({ x, y });
    }
    for (let i = 0; i < tier.decoys && free.length; i++) {
      mirrors.push({ ...take(free), id: `mirror-${mirrors.length + 1}`, slash: random() < .5 });
    }
    for (let i = 0; i < tier.walls && free.length; i++) walls.push(take(free));
  }
  return { id: 'crystal-random', title: 'Random light', width: tier.size, height: tier.size,
    source, mirrors, crystals, walls };
}

function fallbackRoute(size: number, bends: number): Route {
  const source = { x: 0, y: 0, dir: 'e' as const };
  const mirrors: Level['mirrors'] = [];
  const through: Cell[] = [];
  let x = 0, y = 0, horizontal = 1;
  // shortcut: bounded fallback follows the outer edges, expand if random route generation changes.
  for (let i = 0; i < bends; i++) {
    const horizontalRun = i % 2 === 0;
    const distance = horizontalRun ? size - 1 : 2;
    for (let step = 1; step <= distance; step++) {
      x += horizontalRun ? horizontal : 0;
      y += horizontalRun ? 0 : 1;
      if (step < distance) through.push({ x, y });
    }
    mirrors.push({ x, y, id: `mirror-${i + 1}`, slash: horizontalRun ? horizontal < 0 : horizontal > 0 });
    if (!horizontalRun) horizontal = -horizontal;
  }
  return { source, mirrors, through, end: { x: x + horizontal * 2, y } };
}

// Version 1 layouts are regenerated from the seed when loading a saved run.
export function generateRandomLight(spec: RandomLight): Level {
  const { size, bends, min, crystals } = tiers[spec.difficulty];
  const random = seededRandom(spec.seed);
  for (let attempt = 0; attempt < 40; attempt++) {
    const route = randomRoute(size, bends, random);
    if (!route || route.through.length < crystals - 1) continue;
    const level = buildLevel(route, spec.difficulty, random, true);
    const solution = solve(createGame(level));
    if (solution && solution.length >= min && solution.length <= bends) return level;
  }
  return buildLevel(fallbackRoute(size, bends), spec.difficulty, random, false);
}
