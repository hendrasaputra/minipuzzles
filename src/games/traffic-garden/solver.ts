import { legalMoves, SIZE, TARGET, type Car, type Game, type Move } from './engine';

/** Each edge is one car slide of any length, including the final drive out. */
export function solve(game: Game, maxStates = 50000): Move[] | null {
  if (game.status === 'won') return [];
  if (!Number.isInteger(maxStates) || maxStates < 1) return null;
  const cars = game.cars;
  const encode = (cars: Car[]) => cars.map(car => String(car.axis === 'h' ? car.x : car.y)).join('');
  const start = encode(cars), queue = [start];
  const parents = new Map<string, { previous: string; move: Move } | null>([[start, null]]);
  const targetIndex = cars.findIndex(car => car.id === TARGET);
  if (targetIndex < 0) return null;
  for (let head = 0; head < queue.length && head < maxStates; head++) {
    const key = queue[head];
    const state = cars.map((car, i) => ({ ...car, [car.axis === 'h' ? 'x' : 'y']: Number(key[i]) }));
    const moves = legalMoves({ ...game, cars: state, status: 'playing' });
    const exit = moves.find(move => move.id === TARGET && Number(key[targetIndex]) + move.delta === SIZE);
    if (exit) {
      const path: Move[] = [exit];
      let cursor = key;
      while (parents.get(cursor)) {
        const step = parents.get(cursor)!;
        path.push(step.move); cursor = step.previous;
      }
      return path.reverse();
    }
    for (const move of moves) {
      const index = cars.findIndex(car => car.id === move.id);
      const position = Number(key[index]) + move.delta;
      const next = key.slice(0, index) + position + key.slice(index + 1);
      if (parents.has(next) || parents.size >= maxStates) continue;
      parents.set(next, { previous: key, move });
      queue.push(next);
    }
  }
  return null;
}
