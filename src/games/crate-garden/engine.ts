/** Sokoban rules and shortest-step hints, independent of the browser. */
export type Direction = 'n' | 'e' | 's' | 'w';
export interface Cell { x: number; y: number }
export interface Level { id: string; title: string; width: number; height: number; walls: Cell[]; goals: Cell[]; crates: Cell[]; player: Cell }
export interface Snapshot { player: Cell; crates: Cell[]; pushes: number; direction: Direction }
export interface Game { level: Level; player: Cell; crates: Cell[]; history: Snapshot[]; status: 'playing' | 'won'; moves: number; pushes: number }
export const DIRECTIONS: readonly Direction[] = ['n', 'e', 's', 'w'];
const vectors: Record<Direction, Cell> = { n: { x: 0, y: -1 }, e: { x: 1, y: 0 }, s: { x: 0, y: 1 }, w: { x: -1, y: 0 } };
const key = (cell: Cell) => `${cell.x},${cell.y}`;
const equal = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
const copy = (cells: Cell[]) => cells.map(cell => ({ ...cell }));
const blocked = (level: Level, cell: Cell) => cell.x < 0 || cell.x >= level.width || cell.y < 0 || cell.y >= level.height
  || level.walls.some(wall => equal(wall, cell));
const completed = (level: Level, crates: Cell[]) => crates.every(crate => level.goals.some(goal => equal(crate, goal)));

export function validateLevel(value: unknown): Level | null {
  if (!value || typeof value !== 'object') return null;
  const level = value as Level;
  if (typeof level.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(level.id)
    || typeof level.title !== 'string' || !level.title.length || level.title.length > 80
    || !Number.isInteger(level.width) || !Number.isInteger(level.height)
    || level.width < 3 || level.width > 8 || level.height < 3 || level.height > 8) return null;
  const validCell = (cell: Cell) => !!cell && Number.isInteger(cell.x) && Number.isInteger(cell.y)
    && cell.x >= 0 && cell.x < level.width && cell.y >= 0 && cell.y < level.height;
  for (const cells of [level.walls, level.goals, level.crates]) {
    if (!Array.isArray(cells) || cells.length > level.width * level.height || !cells.every(validCell)
      || new Set(cells.map(key)).size !== cells.length) return null;
  }
  if (level.crates.length < 1 || level.crates.length > 4 || level.goals.length !== level.crates.length
    || !validCell(level.player) || level.crates.some(crate => equal(crate, level.player))) return null;
  const walls = new Set(level.walls.map(key));
  if ([...level.goals, ...level.crates, level.player].some(cell => walls.has(key(cell)))) return null;
  return { id: level.id, title: level.title, width: level.width, height: level.height,
    walls: copy(level.walls), goals: copy(level.goals), crates: copy(level.crates), player: { ...level.player } };
}

export function createGame(level: Level): Game {
  const valid = validateLevel(level);
  if (!valid) throw new RangeError('Invalid crate garden');
  return { level: valid, player: { ...valid.player }, crates: copy(valid.crates), history: [],
    status: completed(valid, valid.crates) ? 'won' : 'playing', moves: 0, pushes: 0 };
}

function step(level: Level, player: Cell, crates: Cell[], direction: Direction): { player: Cell; crates: Cell[]; pushed: boolean } | null {
  if (!DIRECTIONS.includes(direction)) return null;
  const delta = vectors[direction];
  const next = { x: player.x + delta.x, y: player.y + delta.y };
  if (blocked(level, next)) return null;
  const crateIndex = crates.findIndex(crate => equal(crate, next));
  if (crateIndex < 0) return { player: next, crates, pushed: false };
  const destination = { x: next.x + delta.x, y: next.y + delta.y };
  if (blocked(level, destination) || crates.some(crate => equal(crate, destination))) return null;
  const moved = crates.slice(); moved[crateIndex] = destination;
  return { player: next, crates: moved, pushed: true };
}

export function move(game: Game, direction: Direction): boolean {
  if (game.status === 'won') return false;
  const next = step(game.level, game.player, game.crates, direction);
  if (!next) return false;
  game.history.push({ player: { ...game.player }, crates: copy(game.crates), pushes: game.pushes, direction });
  game.player = next.player; game.crates = next.crates; game.moves++;
  if (next.pushed) game.pushes++;
  if (completed(game.level, game.crates)) game.status = 'won';
  return true;
}

export function undo(game: Game): boolean {
  const previous = game.history.pop();
  if (!previous) return false;
  game.player = { ...previous.player }; game.crates = copy(previous.crates); game.pushes = previous.pushes;
  game.moves = game.history.length;
  game.status = completed(game.level, game.crates) ? 'won' : 'playing';
  return true;
}

/** BFS counts each player step, with a fixed state budget and no game mutation. */
export function solve(game: Game, maxStates = 30000): Direction[] | null {
  if (completed(game.level, game.crates)) return [];
  if (!Number.isInteger(maxStates) || maxStates < 1 || maxStates > 100000) return null;
  const { level } = game;
  const possible = new Set(level.goals.map(key));
  const destinations = [...level.goals];
  // A crate that cannot reach any bed even on an otherwise empty board cannot be part of a solution.
  for (const destination of destinations) for (const delta of Object.values(vectors)) {
    const previous = { x: destination.x - delta.x, y: destination.y - delta.y };
    const pusher = { x: previous.x - delta.x, y: previous.y - delta.y };
    const id = key(previous);
    if (possible.has(id) || blocked(level, previous) || blocked(level, pusher)) continue;
    possible.add(id);
    destinations.push(previous);
  }
  if (game.crates.some(crate => !possible.has(key(crate)))) return null;

  const stateKey = (player: Cell, crates: Cell[]) => `${key(player)}:${crates.map(key).sort().join(';')}`;
  type Node = { player: Cell; crates: Cell[]; parent: number; direction?: Direction };
  const nodes: Node[] = [{ player: game.player, crates: game.crates, parent: -1 }];
  const visited = new Set([stateKey(game.player, game.crates)]);
  for (let head = 0; head < nodes.length; head++) {
    const node = nodes[head];
    for (const direction of DIRECTIONS) {
      const next = step(game.level, node.player, node.crates, direction);
      if (!next || (next.pushed && next.crates.some(crate => !possible.has(key(crate))))) continue;
      const id = stateKey(next.player, next.crates);
      if (visited.has(id)) continue;
      if (nodes.length >= maxStates) return null;
      visited.add(id); nodes.push({ player: next.player, crates: next.crates, parent: head, direction });
      if (completed(game.level, next.crates)) {
        const path: Direction[] = [];
        for (let index = nodes.length - 1; nodes[index].parent !== -1; index = nodes[index].parent) path.push(nodes[index].direction!);
        return path.reverse();
      }
    }
  }
  return null;
}
