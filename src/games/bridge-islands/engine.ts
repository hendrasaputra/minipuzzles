export interface Point { x: number; y: number }
export interface Island extends Point { goal: number }
export interface Edge { a: number; b: number }
export type Count = 0 | 1 | 2;
export interface Move { edge: number; count: Count }

export interface Level {
  id: string;
  title: string;
  islands: Island[];
  edges: Edge[];
  solution: Count[];
}

export interface Game {
  level: Level;
  bridges: Count[];
  history: Move[];
}

export function nearestEdges(points: readonly Point[]): Edge[] {
  const edges: Edge[] = [];
  points.forEach((from, a) => {
    let right = -1;
    let down = -1;
    points.forEach((to, b) => {
      if (to.y === from.y && to.x > from.x && (right < 0 || to.x < points[right].x)) right = b;
      if (to.x === from.x && to.y > from.y && (down < 0 || to.y < points[down].y)) down = b;
    });
    if (right >= 0) edges.push({ a, b: right });
    if (down >= 0) edges.push({ a, b: down });
  });
  return edges;
}

export function crosses(points: readonly Point[], first: Edge, second: Edge): boolean {
  const a = points[first.a], b = points[first.b];
  const c = points[second.a], d = points[second.b];
  if (a.y !== b.y) return c.y === d.y && crosses(points, second, first);
  return c.x === d.x && c.x > a.x && c.x < b.x && a.y > c.y && a.y < d.y;
}

export function totals(level: Level, bridges: readonly Count[]): number[] {
  const result = level.islands.map(() => 0);
  level.edges.forEach(({ a, b }, i) => {
    result[a] += bridges[i];
    result[b] += bridges[i];
  });
  return result;
}

export function createGame(level: Level): Game {
  return { level, bridges: level.edges.map(() => 0), history: [] };
}

export function complete(game: Game): boolean {
  const { level, bridges } = game;
  if (!totals(level, bridges).every((count, i) => count === level.islands[i].goal)) return false;
  const seen = new Set([0]);
  for (const island of seen) {
    level.edges.forEach(({ a, b }, i) => {
      if (!bridges[i]) return;
      if (a === island) seen.add(b);
      if (b === island) seen.add(a);
    });
  }
  return seen.size === level.islands.length;
}

export function applyMove(game: Game, move: Move): boolean {
  const { edge, count } = move;
  const { level, bridges } = game;
  if (!Number.isInteger(edge) || edge < 0 || edge >= bridges.length
    || (count !== 0 && count !== 1 && count !== 2) || count === bridges[edge] || complete(game)) return false;
  if (count > bridges[edge] && level.edges.some((other, i) =>
    bridges[i] && crosses(level.islands, level.edges[edge], other))) return false;
  bridges[edge] = count;
  game.history.push({ edge, count });
  return true;
}

export function undo(game: Game): boolean {
  const last = game.history.pop();
  if (!last) return false;
  game.bridges[last.edge] = 0;
  for (let i = game.history.length - 1; i >= 0; i--) {
    const previous = game.history[i];
    if (previous.edge !== last.edge) continue;
    game.bridges[last.edge] = previous.count;
    break;
  }
  return true;
}

export function hint(game: Game): Move | undefined {
  if (complete(game)) return;
  const extra = game.bridges.findIndex((count, i) => count > game.level.solution[i]);
  if (extra >= 0) return { edge: extra, count: (game.bridges[extra] - 1) as Count };
  const missing = game.bridges.findIndex((count, i) => count < game.level.solution[i]);
  if (missing >= 0) return { edge: missing, count: (game.bridges[missing] + 1) as Count };
}
