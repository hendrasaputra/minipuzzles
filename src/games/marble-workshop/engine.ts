export interface Cell { x: number; y: number }
export type Direction = 'n' | 'e' | 's' | 'w';
export interface Track extends Cell {
  id: string;
  kind: 'straight' | 'elbow';
  turn: number;
}
export interface Level {
  id: string;
  title: string;
  width: number;
  height: number;
  source: Cell;
  goal: Cell;
  tracks: Track[];
}
export interface Game {
  level: Level;
  tracks: Track[];
  history: string[];
  moves: number;
  status: 'playing' | 'won';
}

const directions = ['n', 'e', 's', 'w'] as const;
const offsets = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];
const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y;
const adjacent = (a: Cell, b: Cell) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) === 1;
const key = ({ x, y }: Cell) => `${x},${y}`;

function directionBetween(from: Cell, to: Cell): Direction {
  return directions[offsets.findIndex(({ x, y }) => to.x === from.x + x && to.y === from.y + y)];
}

export function trackPorts(track: Track): [Direction, Direction] {
  return [directions[track.turn], directions[(track.turn + (track.kind === 'straight' ? 2 : 1)) % 4]];
}

export function alignedTurn(track: Track, before: Cell, after: Cell): number {
  const incoming = directionBetween(track, before);
  const outgoing = directionBetween(track, after);
  return [0, 1, 2, 3].find(turn => {
    const ports = trackPorts({ ...track, turn });
    return ports.includes(incoming) && ports.includes(outgoing);
  }) ?? -1;
}

function orderedTracks(level: Level): Track[] {
  const remaining = [...level.tracks];
  const ordered: Track[] = [];
  let current = level.source;
  while (remaining.length) {
    const index = remaining.findIndex(track => adjacent(current, track));
    if (index < 0) return [];
    const [track] = remaining.splice(index, 1);
    ordered.push(track);
    current = track;
  }
  return adjacent(current, level.goal) ? ordered : [];
}

export function validateLevel(value: unknown): Level | null {
  if (!value || typeof value !== 'object') return null;
  const level = value as Level;
  if (typeof level.id !== 'string' || !/^[a-z0-9-]{1,40}$/.test(level.id)
    || typeof level.title !== 'string' || level.title.length < 1 || level.title.length > 80
    || !Number.isInteger(level.width) || level.width < 4 || level.width > 8
    || !Number.isInteger(level.height) || level.height < 4 || level.height > 8) return null;
  const validCell = (cell: Cell) => cell && Number.isInteger(cell.x) && Number.isInteger(cell.y)
    && cell.x >= 0 && cell.x < level.width && cell.y >= 0 && cell.y < level.height;
  if (!validCell(level.source) || !validCell(level.goal) || !Array.isArray(level.tracks)
    || level.tracks.length < 1 || level.tracks.length > level.width * level.height - 2) return null;
  for (const track of level.tracks) {
    if (!validCell(track) || typeof track.id !== 'string' || !/^[a-z0-9-]{1,24}$/.test(track.id)
      || !['straight', 'elbow'].includes(track.kind)
      || !Number.isInteger(track.turn) || track.turn < 0 || track.turn > 3) return null;
  }
  const occupied = [level.source, ...level.tracks, level.goal];
  if (new Set(occupied.map(key)).size !== occupied.length
    || new Set(level.tracks.map(track => track.id)).size !== level.tracks.length) return null;
  if (occupied.some((cell, index) => occupied.filter(other => adjacent(cell, other)).length
    !== (index === 0 || index === occupied.length - 1 ? 1 : 2))) return null;

  // The track positions form one induced path, so every solution must use every track.
  const ordered = orderedTracks(level);
  if (ordered.length !== level.tracks.length || ordered.some((track, i) =>
    alignedTurn(track, ordered[i - 1] ?? level.source, ordered[i + 1] ?? level.goal) < 0)) return null;
  const { id, title, width, height, source, goal, tracks } = level;
  return {
    id, title, width, height, source: { x: source.x, y: source.y }, goal: { x: goal.x, y: goal.y },
    tracks: tracks.map(({ id, x, y, kind, turn }) => ({ id, x, y, kind, turn })),
  };
}

export function createGame(level: Level): Game {
  const valid = validateLevel(level);
  if (!valid) throw new RangeError('Invalid marble workshop');
  return { level: valid, tracks: valid.tracks.map(track => ({ ...track })), history: [], moves: 0, status: 'playing' };
}

export function rotate(game: Game, id: string): boolean {
  if (game.status === 'won') return false;
  const track = game.tracks.find(track => track.id === id);
  if (!track) return false;
  track.turn = (track.turn + 1) % 4;
  game.history.push(id);
  game.moves = game.history.length;
  return true;
}

export function undo(game: Game): boolean {
  const id = game.history.pop();
  if (!id) return false;
  const track = game.tracks.find(track => track.id === id)!;
  track.turn = (track.turn + 3) % 4;
  game.moves = game.history.length;
  game.status = 'playing';
  return true;
}

export function trace(game: Game): { points: Cell[]; reached: boolean } {
  const { source, goal } = game.level;
  const points: Cell[] = [{ ...source }];
  const first = game.tracks.find(track => adjacent(source, track))!;
  const tracks = new Map(game.tracks.map(track => [key(track), track]));
  const visited = new Set([key(source)]);
  let current = source;
  let direction = directionBetween(source, first);

  for (;;) {
    const offset = offsets[directions.indexOf(direction)];
    const next = { x: current.x + offset.x, y: current.y + offset.y };
    if (same(next, goal)) return { points: [...points, next], reached: true };
    const track = tracks.get(key(next));
    const entry = directionBetween(next, current);
    const ports = track && trackPorts(track);
    if (!ports?.includes(entry) || visited.has(key(next))) {
      points.push({ x: current.x + offset.x / 2, y: current.y + offset.y / 2 });
      return { points, reached: false };
    }
    points.push(next);
    visited.add(key(next));
    current = next;
    direction = ports[0] === entry ? ports[1] : ports[0];
  }
}

export function run(game: Game): boolean {
  const reached = trace(game).reached;
  if (reached) game.status = 'won';
  return reached;
}

export function solve(game: Game): string[] {
  const ordered = orderedTracks({ ...game.level, tracks: game.tracks });
  return ordered.flatMap((track, index) => {
    const target = alignedTurn(track, ordered[index - 1] ?? game.level.source, ordered[index + 1] ?? game.level.goal);
    const period = track.kind === 'straight' ? 2 : 4;
    const turns = (target - track.turn + 4) % period;
    return Array<string>(turns).fill(track.id);
  });
}
