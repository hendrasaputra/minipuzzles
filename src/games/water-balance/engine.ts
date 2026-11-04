export type Amounts = readonly [number, number, number];

export interface Level {
  id: string;
  title: string;
  capacities: Amounts;
  start: Amounts;
  goal: Amounts;
}

export interface Pour { from: number; to: number }
export interface Game { level: Level; current: Amounts; history: Pour[] }

export const jugs = [0, 1, 2] as const;
export const names = ['A', 'B', 'C'] as const;

export function poured(capacities: Amounts, current: Amounts, { from, to }: Pour): Amounts | undefined {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > 2
    || to < 0 || to > 2 || from === to) return;
  const amount = Math.min(current[from], capacities[to] - current[to]);
  if (amount <= 0) return;
  const next: [number, number, number] = [...current];
  next[from] -= amount;
  next[to] += amount;
  return next;
}

export function createGame(level: Level): Game {
  return { level, current: level.start, history: [] };
}

export function complete(game: Game): boolean {
  return game.current.every((amount, i) => amount === game.level.goal[i]);
}

export function pour(game: Game, move: Pour): boolean {
  if (complete(game)) return false;
  const next = poured(game.level.capacities, game.current, move);
  if (!next) return false;
  game.current = next;
  game.history.push({ ...move });
  return true;
}

export function undo(game: Game): boolean {
  if (!game.history.pop()) return false;
  game.current = game.history.reduce((current, move) =>
    poured(game.level.capacities, current, move)!, game.level.start);
  return true;
}

// Visiting a state once gives shortest routes. The total water stays fixed.
export function routes(capacities: Amounts, start: Amounts) {
  const queue: { amounts: Amounts; path: Pour[] }[] = [{ amounts: start, path: [] }];
  const seen = new Set([start.join(',')]);
  for (const { amounts, path } of queue) {
    for (const from of jugs) for (const to of jugs) {
      const next = poured(capacities, amounts, { from, to });
      if (!next || seen.has(next.join(','))) continue;
      seen.add(next.join(','));
      queue.push({ amounts: next, path: [...path, { from, to }] });
    }
  }
  return queue;
}

export function solve(game: Game): Pour[] | undefined {
  return routes(game.level.capacities, game.current)
    .find(({ amounts }) => amounts.every((amount, i) => amount === game.level.goal[i]))?.path;
}
