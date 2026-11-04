import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import { createGame, move, solve, type Cell, type Level } from './engine';
import { levels } from './levels';

export interface RandomGarden {
  seed: string;
  difficulty: Difficulty;
  generator: 1;
}

const directions: readonly Cell[] = [
  { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
];
const tiers = {
  easy: { size: 6, crates: 1, walls: 1, pulls: 2, min: 2, max: 7, minPushes: 1, fallback: 0 },
  medium: { size: 6, crates: 2, walls: 2, pulls: 5, min: 8, max: 17, minPushes: 3, fallback: 3 },
  hard: { size: 7, crates: 3, walls: 3, pulls: 9, min: 18, max: 45, minPushes: 6, fallback: 7 },
} as const;
const key = (cell: Cell) => `${cell.x},${cell.y}`;
const add = (a: Cell, b: Cell): Cell => ({ x: a.x + b.x, y: a.y + b.y });
const arrangement = (crates: Cell[]) => crates.map(key).sort().join(';');

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function opening(difficulty: Difficulty, random: () => number): Level {
  const tier = tiers[difficulty];
  const walls: Cell[] = [];
  const interior: Cell[] = [];
  for (let y = 0; y < tier.size; y++) for (let x = 0; x < tier.size; x++) {
    const border = x === 0 || y === 0 || x === tier.size - 1 || y === tier.size - 1;
    (border ? walls : interior).push({ x, y });
  }

  const floor = shuffle(interior, random);
  walls.push(...floor.splice(0, tier.walls));
  const goals = floor.slice(0, tier.crates);
  const walkable = new Set(floor.map(key));
  let crates = [...goals];
  let player = floor[tier.crates];
  const seen = new Set([arrangement(crates)]);

  // Reverse play from the finished garden. Walking or pulling a crate is reversible by legal forward play.
  function reachable(): Cell[] {
    const occupied = new Set(crates.map(key));
    const queue = [player];
    const visited = new Set([key(player)]);
    for (const cell of queue) for (const direction of directions) {
      const next = add(cell, direction);
      const id = key(next);
      if (!walkable.has(id) || occupied.has(id) || visited.has(id)) continue;
      visited.add(id);
      queue.push(next);
    }
    return queue;
  }

  for (let i = 0; i < tier.pulls; i++) {
    const occupied = new Map(crates.map((cell, index) => [key(cell), index]));
    const pulls: { player: Cell; crates: Cell[]; id: string }[] = [];
    for (const cell of reachable()) for (const direction of directions) {
      const next = add(cell, direction);
      const behind = { x: cell.x - direction.x, y: cell.y - direction.y };
      const crate = occupied.get(key(behind));
      if (crate === undefined || !walkable.has(key(next)) || occupied.has(key(next))) continue;
      const pulled = [...crates];
      pulled[crate] = cell;
      const id = arrangement(pulled);
      if (!seen.has(id)) pulls.push({ player: next, crates: pulled, id });
    }
    if (!pulls.length) break;
    const pull = pulls[Math.floor(random() * pulls.length)];
    ({ player, crates } = pull);
    seen.add(pull.id);
  }

  const starts = reachable();
  player = starts[Math.floor(random() * starts.length)];
  return { id: 'random-garden', title: 'Random garden', width: tier.size, height: tier.size, walls, goals, crates, player };
}

export function randomGarden({ seed, difficulty }: RandomGarden): Level {
  const random = seededRandom(seed);
  const tier = tiers[difficulty];
  for (let attempt = 0; attempt < 24; attempt++) {
    const level = opening(difficulty, random);
    const game = createGame(level);
    const solution = solve(game, 7000);
    if (!solution || solution.length < tier.min || solution.length > tier.max) continue;
    for (const direction of solution) move(game, direction);
    if (game.pushes >= tier.minPushes) return level;
  }

  // shortcut: bounded search falls back to a transformed curated garden. Add fallback layouts if repeats become common.
  const base = levels[tier.fallback];
  const swapAxes = random() < 0.5;
  const flipX = random() < 0.5;
  const flipY = random() < 0.5;
  const transform = ({ x, y }: Cell): Cell => {
    if (swapAxes) [x, y] = [y, x];
    return { x: flipX ? base.width - 1 - x : x, y: flipY ? base.height - 1 - y : y };
  };
  return {
    ...base, id: 'random-garden', title: 'Random garden',
    walls: base.walls.map(transform), goals: base.goals.map(transform),
    crates: base.crates.map(transform), player: transform(base.player),
  };
}
