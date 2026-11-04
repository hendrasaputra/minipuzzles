export interface Point { x: number; y: number }
export type Node = (Point & { station: number }) | (Point & { junction: number; branches: [Node, Node] });
export type Move = number | 'send';

export interface Level {
  id: string;
  title: string;
  root: Node;
  yard: Point;
  switches: boolean[];
  trains: number[];
  stations: number;
}

export interface Game {
  level: Level;
  switches: boolean[];
  delivered: number;
  history: Move[];
}

export function createGame(level: Level): Game {
  return { level, switches: [...level.switches], delivered: 0, history: [] };
}

export function complete(game: Game): boolean {
  return game.delivered === game.level.trains.length;
}

export function trace(game: Game): { points: Point[]; station: number } {
  let node = game.level.root;
  const points: Point[] = [game.level.yard, node];
  while ('junction' in node) {
    const next: Node = node.branches[Number(game.switches[node.junction])];
    points.push({ x: node.x, y: next.y }, next);
    node = next;
  }
  return { points, station: node.station };
}

export function applyMove(game: Game, move: Move): boolean {
  if (complete(game)) return false;
  if (move === 'send') {
    if (trace(game).station !== game.level.trains[game.delivered]) return false;
    game.delivered++;
  } else {
    if (!Number.isInteger(move) || move < 0 || move >= game.switches.length) return false;
    game.switches[move] = !game.switches[move];
  }
  game.history.push(move);
  return true;
}

export function undo(game: Game): boolean {
  const move = game.history.pop();
  if (move === undefined) return false;
  if (move === 'send') game.delivered--;
  else game.switches[move] = !game.switches[move];
  return true;
}

export function hint(game: Game): Move | undefined {
  if (complete(game)) return;
  const destination = game.level.trains[game.delivered];

  function contains(node: Node): boolean {
    return 'station' in node ? node.station === destination : node.branches.some(contains);
  }

  let node = game.level.root;
  while ('junction' in node) {
    const useLower = !contains(node.branches[0]);
    if (game.switches[node.junction] !== useLower) return node.junction;
    node = node.branches[Number(useLower)];
  }
  return 'send';
}
