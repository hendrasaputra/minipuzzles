import { alignedTurn, type Cell, type Level, type Track } from './engine';

export function makeWorkshop(
  id: string, title: string, size: number, route: Cell[], backwards: number[] = [],
): Level {
  const tracks = route.slice(1, -1).map((cell, index): Track => {
    const before = route[index];
    const after = route[index + 2];
    const track: Track = {
      ...cell,
      id: `track-${index + 1}`,
      kind: before.x === after.x || before.y === after.y ? 'straight' : 'elbow',
      turn: 0,
    };
    track.turn = (alignedTurn(track, before, after) - (backwards[index] ?? 0) + 4) % 4;
    return track;
  });
  return { id, title, width: size, height: size, source: route[0], goal: route[route.length - 1], tracks };
}

function route(x: number, y: number, steps: string): Cell[] {
  const cells = [{ x, y }];
  for (const direction of steps) {
    if (direction === 'e') x++;
    if (direction === 'w') x--;
    if (direction === 'n') y--;
    if (direction === 's') y++;
    cells.push({ x, y });
  }
  return cells;
}

export const levels: readonly Level[] = [
  makeWorkshop('marble-1', 'First roll', 5, route(0, 2, 'eeee'), [1, 0, 0]),
  makeWorkshop('marble-2', 'Around the bend', 5, route(0, 1, 'eeess'), [1, 0, 2, 0]),
  makeWorkshop('marble-3', 'Side street', 5, route(0, 0, 'eesssee'), [1, 1, 0, 0, 2, 0]),
  makeWorkshop('marble-4', 'Loop back', 6, route(0, 0, 'eeeesswwwss'), [1, 0, 0, 2, 0, 1, 1, 0, 2, 0]),
  makeWorkshop('marble-5', 'Down the steps', 6, route(0, 0, 'eesseesse'), [1, 2, 0, 1, 0, 2, 0, 2]),
  makeWorkshop('marble-6', 'Long shelf', 7, route(1, 0, 'eeeesswwwwsseee'), [1, 1, 0, 1, 0, 2, 0, 1, 0, 2, 0, 1]),
  makeWorkshop('marble-7', 'Return route', 7, route(6, 0, 'sssswwnnnwwsss'), [1, 0, 0, 3, 0, 2, 0, 0, 2, 0, 2]),
  makeWorkshop('marble-8', 'Across the workshop', 7, route(0, 0, 'eeeeeesswwwwwwsseeee'), [1, 1, 0, 1, 0, 3, 0, 2, 1, 0, 0, 0, 0, 2, 0, 1]),
];
