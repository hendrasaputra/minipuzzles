export const directions = ['n', 'e', 's', 'w'] as const;
export type Direction = typeof directions[number];
export type Point = { x: number; y: number };
export type Block = Point & { stance: 'up' | 'x' | 'y' };

export interface Level {
  id: string;
  title: string;
  tiles: string[];
  start: Point;
  goal: Point;
}

export interface Game {
  level: Level;
  block: Block;
  history: Direction[];
}

export const vectors: Record<Direction, readonly [number, number]> = {
  n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0],
};

export function isDirection(value: unknown): value is Direction {
  return directions.some(direction => direction === value);
}

export function createGame(level: Level): Game {
  return { level, block: { ...level.start, stance: 'up' }, history: [] };
}

export function footprint(block: Block): Point[] {
  const { x, y, stance } = block;
  return stance === 'up' ? [{ x, y }] : [{ x, y }, { x: x + Number(stance === 'x'), y: y + Number(stance === 'y') }];
}

export function nextBlock(level: Level, block: Block, direction: Direction): Block | undefined {
  const [dx, dy] = vectors[direction];
  const axis = dx ? 'x' : 'y';
  let distance = 1;
  let stance = block.stance;
  if (stance === 'up') {
    stance = axis;
    if (dx + dy < 0) distance = 2;
  } else if (stance === axis) {
    stance = 'up';
    if (dx + dy > 0) distance = 2;
  }
  const next = { x: block.x + dx * distance, y: block.y + dy * distance, stance };
  if (footprint(next).every(({ x, y }) => level.tiles[y]?.[x] === '#')) return next;
}

export function atGoal(level: Level, block: Block): boolean {
  return block.stance === 'up' && block.x === level.goal.x && block.y === level.goal.y;
}

export function move(game: Game, direction: Direction): boolean {
  if (atGoal(game.level, game.block)) return false;
  const next = nextBlock(game.level, game.block, direction);
  if (!next) return false;
  game.block = next;
  game.history.push(direction);
  return true;
}

export function undo(game: Game): boolean {
  const direction = game.history.pop();
  if (!direction) return false;
  const opposite = directions[(directions.indexOf(direction) + 2) % 4];
  game.block = nextBlock(game.level, game.block, opposite)!;
  return true;
}

// Only three orientations at each tile are possible, so the search is bounded by board area.
export function solve(level: Level, start: Block = { ...level.start, stance: 'up' }): Direction[] | undefined {
  const queue: { block: Block; path: Direction[] }[] = [{ block: start, path: [] }];
  const key = ({ x, y, stance }: Block) => `${x},${y},${stance}`;
  const seen = new Set([key(start)]);
  for (let i = 0; i < queue.length; i++) {
    const { block, path } = queue[i];
    if (atGoal(level, block)) return path;
    for (const direction of directions) {
      const next = nextBlock(level, block, direction);
      if (!next || seen.has(key(next))) continue;
      seen.add(key(next));
      queue.push({ block: next, path: [...path, direction] });
    }
  }
}
