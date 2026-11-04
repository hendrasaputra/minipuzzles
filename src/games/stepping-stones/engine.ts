export interface Level {
  id: string;
  title: string;
  size: number;
  route: readonly number[];
}

export interface Game {
  level: Level;
  path: number[];
}

export const directions = ['n', 'e', 's', 'w'] as const;
export type Direction = typeof directions[number];
export const offsets: Record<Direction, readonly [number, number]> = {
  n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0],
};

export function neighbor(size: number, cell: number, direction: Direction): number | undefined {
  const [dx, dy] = offsets[direction];
  const x = cell % size + dx;
  const y = Math.floor(cell / size) + dy;
  return x >= 0 && x < size && y >= 0 && y < size ? y * size + x : undefined;
}

export function neighbors(size: number, cell: number): number[] {
  return directions.flatMap(direction => {
    const next = neighbor(size, cell, direction);
    return next === undefined ? [] : [next];
  });
}

export function createGame(level: Level): Game {
  return { level, path: [level.route[0]] };
}

export function complete(game: Game): boolean {
  return game.path.length === game.level.route.length && game.path.at(-1) === game.level.route.at(-1);
}

export function undo(game: Game): boolean {
  if (game.path.length < 2) return false;
  game.path.pop();
  return true;
}

export function canStep(game: Game, cell: number): boolean {
  if (game.path.length > 1 && game.path.at(-2) === cell) return true;
  return !complete(game) && game.level.route.includes(cell) && !game.path.includes(cell)
    && neighbors(game.level.size, game.path.at(-1)!).includes(cell)
    && (cell !== game.level.route.at(-1) || game.path.length === game.level.route.length - 1);
}

export function step(game: Game, cell: number): boolean {
  if (!canStep(game, cell)) return false;
  if (game.path.at(-2) === cell) return undo(game);
  game.path.push(cell);
  return true;
}

export function hint(game: Game): { cell: number } | { undo: true } | undefined {
  if (complete(game)) return;
  const { route, size } = game.level;
  if (game.path.every((cell, i) => cell === route[i])) return { cell: route[game.path.length] };

  const target = route.reduce((mask, cell) => mask | (1 << cell), 0);
  const used = game.path.reduce((mask, cell) => mask | (1 << cell), 0);
  const end = route.at(-1)!;
  const dead = new Set<number>();
  let budget = 20000;
  function reachesEnd(cell: number, mask: number): boolean {
    if (mask === target) return cell === end;
    if (--budget < 0) return false;
    const state = mask * 32 + cell;
    if (dead.has(state)) return false;
    for (const next of neighbors(size, cell)) {
      const bit = 1 << next;
      if (!(target & bit) || (mask & bit) || (next === end && (mask | bit) !== target)) continue;
      if (reachesEnd(next, mask | bit)) return true;
    }
    dead.add(state);
    return false;
  }

  for (const cell of neighbors(size, game.path.at(-1)!)) {
    const bit = 1 << cell;
    if (!(target & bit) || (used & bit) || (cell === end && (used | bit) !== target)) continue;
    if (reachesEnd(cell, used | bit)) return { cell };
  }
  // shortcut: backtrack after the search budget, expand search only if larger boards are introduced.
  return { undo: true };
}
