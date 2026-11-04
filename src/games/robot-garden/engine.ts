export const directions = ['n', 'e', 's', 'w'] as const;
export type Direction = typeof directions[number];
export const maxCommands = 40;

export interface Level {
  id: string;
  title: string;
  size: number;
  start: number;
  dock: number;
  seeds: number[];
  rocks: number[];
}

export interface Position {
  cell: number;
  picked: number;
}

const offsets: Record<Direction, [number, number]> = {
  n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0],
};

export function isDirection(value: unknown): value is Direction {
  return value === 'n' || value === 'e' || value === 's' || value === 'w';
}

export function startPosition(level: Level): Position {
  return { cell: level.start, picked: 0 };
}

function move(level: Level, position: Position, direction: Direction): Position | undefined {
  const [dx, dy] = offsets[direction];
  const x = position.cell % level.size + dx;
  const y = Math.floor(position.cell / level.size) + dy;
  if (x < 0 || x >= level.size || y < 0 || y >= level.size) return;
  const cell = y * level.size + x;
  if (level.rocks.includes(cell)) return;
  const seed = level.seeds.indexOf(cell);
  return { cell, picked: seed === -1 ? position.picked : position.picked | (1 << seed) };
}

export function seedCount(level: Level, position: Position): number {
  return level.seeds.filter((_, i) => position.picked & (1 << i)).length;
}

function atGoal(level: Level, position: Position): boolean {
  return position.cell === level.dock && position.picked === (1 << level.seeds.length) - 1;
}

export function run(level: Level, commands: readonly Direction[]) {
  let position = startPosition(level);
  const path = [position];
  for (const direction of commands) {
    const next = move(level, position, direction);
    if (!next) return { path, position, blocked: true, won: false };
    position = next;
    path.push(position);
  }
  return { path, position, blocked: false, won: atGoal(level, position) };
}

// The search has at most size² × 2^seeds states.
export function solve(level: Level, from = startPosition(level)): Direction[] | undefined {
  const queue: { position: Position; commands: Direction[] }[] = [{ position: from, commands: [] }];
  const key = (position: Position) => position.picked * level.size ** 2 + position.cell;
  const seen = new Set([key(from)]);
  for (let i = 0; i < queue.length; i++) {
    const { position, commands } = queue[i];
    if (atGoal(level, position)) return commands;
    for (const direction of directions) {
      const next = move(level, position, direction);
      if (!next || seen.has(key(next))) continue;
      seen.add(key(next));
      queue.push({ position: next, commands: [...commands, direction] });
    }
  }
}
