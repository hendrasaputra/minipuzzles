import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import { createGame, solve, type Cell, type Level } from './engine';
import { levels } from './levels';

export type RandomPath = { seed: string; difficulty: Difficulty };

const tiers = {
  easy: { size: 5, fish: 1, rocks: 4, min: 2, max: 4, fallback: 2 },
  medium: { size: 6, fish: 2, rocks: 7, min: 5, max: 8, fallback: 5 },
  hard: { size: 7, fish: 3, rocks: 10, min: 9, max: Infinity, fallback: 7 },
} as const;

export function randomTitle(difficulty: Difficulty): string {
  return `${difficulty[0].toUpperCase()}${difficulty.slice(1)} random path`;
}

export function fitsDifficulty(level: Level, difficulty: Difficulty): boolean {
  const { size, fish, min, max } = tiers[difficulty];
  if (level.width !== size || level.height !== size || level.fish.length !== fish) return false;
  const solution = solve(createGame(level));
  return solution !== null && solution.length >= min && solution.length <= max;
}

export function generatePath({ seed, difficulty }: RandomPath): Level {
  const random = seededRandom(seed);
  const { size, fish, rocks, fallback } = tiers[difficulty];
  const title = randomTitle(difficulty);
  const board = Array.from({ length: size * size }, (_, index) => ({
    x: index % size,
    y: Math.floor(index / size),
  }));
  for (let attempt = 0; attempt < 128; attempt++) {
    for (let i = board.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [board[i], board[j]] = [board[j], board[i]];
    }
    const level: Level = {
      id: 'frost-random', title, width: size, height: size,
      player: board[0], goal: board[1], fish: board.slice(2, 2 + fish),
      rocks: board.slice(2 + fish, 2 + fish + rocks),
    };
    if (fitsDifficulty(level, difficulty)) return level;
  }

  // shortcut: cap generation time with a verified fallback, expand the pool if it recurs often.
  const opening = levels[fallback];
  const rotation = Math.floor(random() * 4);
  const reflect = random() < 0.5;
  function transform({ x, y }: Cell): Cell {
    if (reflect) x = size - 1 - x;
    for (let i = 0; i < rotation; i++) [x, y] = [size - 1 - y, x];
    return { x, y };
  }
  return {
    ...opening, id: 'frost-random', title, player: transform(opening.player),
    goal: transform(opening.goal), fish: opening.fish.map(transform), rocks: opening.rocks.map(transform),
  };
}
