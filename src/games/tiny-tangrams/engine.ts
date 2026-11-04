export type Turn = 0 | 1 | 2 | 3;
export type Triangle = readonly [x: number, y: number, side: Turn];
export type Point = readonly [x: number, y: number];
export type Shape = 'small' | 'large' | 'square' | 'slant';
export interface Piece { shape: Shape; tiles: readonly Triangle[]; size: number }
export interface Placement { x: number; y: number; turn: Turn }
export interface Level {
  id: string;
  title: string;
  pieces: Piece[];
  solution: Placement[];
  width: number;
  height: number;
  target: Triangle[];
}
export interface Move { piece: number; placement: Placement | null }
export interface Game { level: Level; placements: (Placement | null)[]; history: Move[] }

export const colors = ['#c2755d', '#668c89', '#87719a', '#b48941', '#69865c', '#7590ab', '#b7758b', '#987d62'];
export const shapeNames = { small: 'Small triangle', large: 'Large triangle', square: 'Square', slant: 'Slanted piece' };

export function vertices([x, y, side]: Triangle): [Point, Point, Point] {
  const corners: Point[] = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
  return [corners[side], corners[(side + 1) % 4], [x + .5, y + .5]];
}

const wedges = [0, 1, 2, 3] as const;
function piece(shape: Shape, size: number, inside: (x: number, y: number) => boolean): Piece {
  const tiles: Triangle[] = [];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    for (const side of wedges) {
      const tile: Triangle = [x, y, side];
      if (vertices(tile).every(([px, py]) => inside(px, py))) tiles.push(tile);
    }
  }
  return { shape, size, tiles };
}
const shapes: Record<Shape, Piece> = {
  small: piece('small', 1, (x, y) => x + y <= 1),
  large: piece('large', 2, (x, y) => x + y <= 2),
  square: piece('square', 1, () => true),
  slant: piece('slant', 2, (x, y) => y <= 1 && x >= y && x <= y + 1),
};

export function nextTurn(turn: Turn): Turn {
  return ((turn + 1) % 4) as Turn;
}

export function footprint(piece: Piece, placement: Placement): Triangle[] {
  const rotated: Triangle[] = piece.tiles.map(([x, y, side]) => {
    for (let turn = 0; turn < placement.turn; turn++) {
      [x, y] = [piece.size - 1 - y, x];
      side = nextTurn(side);
    }
    return [x, y, side];
  });
  const minX = Math.min(...rotated.map(tile => tile[0]));
  const minY = Math.min(...rotated.map(tile => tile[1]));
  return rotated.map(([x, y, side]) => [x - minX + placement.x, y - minY + placement.y, side]);
}

export function key(tile: Triangle): string { return tile.join(','); }

export function buildLevel(id: string, title: string, recipe: readonly (readonly [Shape, number, number, Turn])[]): Level {
  const pieces = recipe.map(([shape]) => shapes[shape]);
  const solution = recipe.map(([, x, y, turn]) => ({ x, y, turn }));
  const target = pieces.flatMap((piece, i) => footprint(piece, solution[i]));
  return {
    id, title, pieces, solution, target,
    width: Math.max(...target.map(tile => tile[0])) + 1,
    height: Math.max(...target.map(tile => tile[1])) + 1,
  };
}

export function createGame(level: Level): Game {
  return { level, placements: level.pieces.map(() => null), history: [] };
}

export function complete(game: Game): boolean {
  return game.placements.every(placement => placement !== null);
}

export function canPlace(game: Game, index: number, placement: Placement): boolean {
  const piece = game.level.pieces[index];
  if (!piece || !Number.isInteger(placement.x) || !Number.isInteger(placement.y)
    || !wedges.includes(placement.turn)) return false;
  const target = new Set(game.level.target.map(key));
  const occupied = new Set(game.placements.flatMap((other, i) =>
    i !== index && other ? footprint(game.level.pieces[i], other).map(key) : []));
  return footprint(piece, placement).every(tile => target.has(key(tile)) && !occupied.has(key(tile)));
}

export function applyMove(game: Game, move: Move): boolean {
  const { piece, placement } = move;
  if (!Number.isInteger(piece) || piece < 0 || piece >= game.placements.length) return false;
  const before = game.placements[piece];
  if (placement === null ? before === null : !canPlace(game, piece, placement)
    || before?.x === placement.x && before.y === placement.y && before.turn === placement.turn) return false;
  game.placements[piece] = placement ? { ...placement } : null;
  game.history.push({ piece, placement: game.placements[piece] });
  return true;
}

export function undo(game: Game): boolean {
  const move = game.history.pop();
  if (!move) return false;
  game.placements[move.piece] = null;
  for (let i = game.history.length - 1; i >= 0; i--) {
    const previous = game.history[i];
    if (previous.piece !== move.piece) continue;
    game.placements[move.piece] = previous.placement;
    break;
  }
  return true;
}

export function hint(game: Game): Move | undefined {
  if (complete(game)) return;
  // Clear misplaced pieces first so the verified layout stays reachable.
  const misplaced = game.placements.findIndex((placement, i) => {
    if (!placement) return false;
    const target = new Set(footprint(game.level.pieces[i], game.level.solution[i]).map(key));
    return footprint(game.level.pieces[i], placement).some(tile => !target.has(key(tile)));
  });
  if (misplaced !== -1) return { piece: misplaced, placement: null };
  const missing = game.placements.indexOf(null);
  if (missing !== -1) return { piece: missing, placement: game.level.solution[missing] };
}
