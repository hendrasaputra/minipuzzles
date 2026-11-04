export interface Level {
  id: string;
  title: string;
  size: number;
  target: number[];
}

export interface Edit {
  cell: number;
  change: 1 | -1;
}

export interface Game {
  level: Level;
  stacks: number[];
  front: number[];
  side: number[];
  limit: number;
  budget: number;
  used: number;
  history: Edit[];
  won: boolean;
}

export function shadows(stacks: number[], size: number) {
  const front = Array<number>(size).fill(0);
  const side = Array<number>(size).fill(0);
  stacks.forEach((height, index) => {
    const x = index % size;
    const y = Math.floor(index / size);
    front[x] = Math.max(front[x], height);
    side[y] = Math.max(side[y], height);
  });
  return { front, side };
}

export function createGame(level: Level): Game {
  const { size, target } = level;
  return {
    level, stacks: target.map(() => 0), ...shadows(target, size),
    limit: Math.max(...target), budget: target.reduce((sum, n) => sum + n, 0),
    used: 0, history: [], won: false,
  };
}

export function canEdit(game: Game, cell: number, change: 1 | -1) {
  if (game.won || !Number.isInteger(cell) || cell < 0 || cell >= game.stacks.length) return false;
  return change === 1
    ? game.used < game.budget && game.stacks[cell] < game.limit
    : change === -1 && game.stacks[cell] > 0;
}

export function edit(game: Game, cell: number, change: 1 | -1) {
  if (!canEdit(game, cell, change)) return false;
  game.stacks[cell] += change;
  game.used += change;
  game.history.push({ cell, change });
  const { front, side } = shadows(game.stacks, game.level.size);
  game.won = game.used === game.budget && front.every((n, i) => n === game.front[i])
    && side.every((n, i) => n === game.side[i]);
  return true;
}

export function undo(game: Game) {
  const last = game.history.pop();
  if (!last) return false;
  game.stacks[last.cell] -= last.change;
  game.used -= last.change;
  game.won = false;
  return true;
}

export function hint(game: Game): Edit | undefined {
  if (game.won) return;
  const target = game.level.target;
  const extra = game.stacks.findIndex((n, i) => n > target[i]);
  if (extra !== -1) return { cell: extra, change: -1 };
  const missing = game.stacks.findIndex((n, i) => n < target[i]);
  if (missing !== -1) return { cell: missing, change: 1 };
}
