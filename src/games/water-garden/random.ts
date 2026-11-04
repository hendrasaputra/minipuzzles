import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import { pipePorts, type Cell, type Direction, type Level, type Pipe } from './engine';

export interface RandomGarden {
  version: 1;
  seed: string;
  difficulty: Difficulty;
}

const settings = {
  easy: { size: 5, channels: 3, branches: 0, min: 3, max: 4 },
  medium: { size: 6, channels: 5, branches: 1, min: 5, max: 7 },
  hard: { size: 7, channels: 7, branches: 2, min: 8, max: 11 },
};

const steps: ReadonlyArray<Cell & { dir: Direction }> = [
  { x: 0, y: -1, dir: 'n' },
  { x: 1, y: 0, dir: 'e' },
  { x: 0, y: 1, dir: 's' },
  { x: -1, y: 0, dir: 'w' },
];

const adjacent = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const direction = (from: Cell, to: Cell) => steps.find(step => from.x + step.x === to.x && from.y + step.y === to.y)!.dir;
const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;

export function generateGarden(puzzle: RandomGarden): Level {
  const { size, channels, branches, min, max } = settings[puzzle.difficulty];
  const random = seededRandom(`water-v1:${puzzle.difficulty}:${puzzle.seed}`);
  const integer = (limit: number) => Math.floor(random() * limit);
  const pick = <T>(options: T[]) => options[integer(options.length)];

  function extensions(from: Cell, occupied: Cell[]): Cell[] {
    return steps.map(step => ({ x: from.x + step.x, y: from.y + step.y })).filter(cell =>
      cell.x >= 0 && cell.y >= 0 && cell.x < size && cell.y < size &&
      !occupied.some(other => same(cell, other)) &&
      occupied.every(other => same(from, other) || !adjacent(cell, other)),
    );
  }

  function placeBranches(path: Cell[]): Cell[] | null {
    const flowers = [path[path.length - 1]];
    const unused = path.slice(1, -1);
    for (let count = 0; count < branches; count++) {
      const candidates = unused.flatMap(pipe =>
        extensions(pipe, [...path, ...flowers]).map(cell => ({ pipe, cell })));
      if (!candidates.length) return null;
      const { pipe, cell } = pick(candidates);
      flowers.push(cell);
      unused.splice(unused.indexOf(pipe), 1);
    }
    return flowers;
  }

  let path: Cell[] = [];
  let flowers: Cell[] | null = null;
  for (let attempt = 0; attempt < 32 && !flowers; attempt++) {
    path = [{ x: integer(size), y: integer(size) }];
    while (path.length < channels + 2) {
      const options = extensions(path[path.length - 1], path);
      if (!options.length) break;
      path.push(pick(options));
    }
    if (path.length === channels + 2) flowers = placeBranches(path);
  }

  // shortcut: use a known L-shaped route after bounded retries, expand templates if fallback becomes frequent.
  if (!flowers) {
    const corner = (channels + 1) / 2;
    path = Array.from({ length: channels + 2 }, (_, i) => ({
      x: Math.min(i, corner), y: 2 + Math.max(0, i - corner),
    }));
    flowers = [path[path.length - 1]];
    if (branches >= 1) flowers.push({ x: 1, y: 1 });
    if (branches >= 2) flowers.push({ x: corner + 1, y: 4 });
  }

  const occupied = [...path.slice(0, -1), ...flowers];
  const pipes: Pipe[] = path.slice(1, -1).map((cell, i) => {
    const ports = occupied.filter(other => adjacent(cell, other)).map(other => direction(cell, other));
    const opposite = steps.some((step, j) => ports.includes(step.dir) && ports.includes(steps[(j + 2) % 4].dir));
    const kind = ports.length === 3 ? 'tee' : opposite ? 'straight' : 'elbow';
    const pipe: Pipe = { ...cell, id: `pipe-${i + 1}`, kind, turn: 0 };
    pipe.turn = [0, 1, 2, 3].find(turn => pipePorts({ ...pipe, turn }).every(dir => ports.includes(dir)))!;
    return pipe;
  });

  // The induced tree has no shortcuts. Each pipe must expose its tree ports, so their turn costs add up.
  const caps = pipes.map(pipe => pipe.kind === 'straight' ? 1 : 3);
  const target = min + integer(Math.min(max, caps.reduce((sum, cap) => sum + cap, 0)) - min + 1);
  const eligible = pipes.map((_, index) => index);
  for (let turns = 0; turns < target; turns++) {
    const slot = integer(eligible.length);
    const index = eligible[slot];
    pipes[index].turn = (pipes[index].turn + 3) % 4;
    if (--caps[index] === 0) eligible.splice(slot, 1);
  }

  return {
    id: 'water-random', title: 'Random garden', width: size, height: size,
    source: { ...path[0], dir: direction(path[0], path[1]) },
    pipes, flowers, rocks: [],
  };
}
