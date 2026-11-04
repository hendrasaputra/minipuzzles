import { isDifficulty } from '../../shared/random-puzzle';
import { createGame, DIRECTIONS, move, validateLevel, type Direction, type Game } from './engine';
import { levels } from './levels';
import type { RandomGarden } from './random';

const MAX_BYTES = 1024 * 1024;
const MAX_MOVES = 5000;

export function writeSave(index: number, game: Game, completed: string[], random?: RandomGarden): string {
  const raw = JSON.stringify({
    version: random ? 2 : 1,
    level: random ? game.level.id : levels[index].id,
    history: game.history.map(step => step.direction),
    completed,
    random,
    opening: random ? game.level : undefined,
  });
  if (game.history.length > MAX_MOVES || new TextEncoder().encode(raw).byteLength > MAX_BYTES) {
    throw new RangeError('Save too large');
  }
  return raw;
}

export function readSave(raw: string | null): { index: number; game: Game; completed: string[]; random?: RandomGarden } | null {
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BYTES) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || (data.version !== 1 && data.version !== 2)
      || !Array.isArray(data.history) || data.history.length > MAX_MOVES
      || !Array.isArray(data.completed) || data.completed.length > levels.length) return null;
    if (data.completed.some((id: unknown) => typeof id !== 'string' || !levels.some(level => level.id === id))) return null;
    if (data.history.some((dir: unknown) => !DIRECTIONS.includes(dir as Direction))) return null;

    let random: RandomGarden | undefined;
    let index = levels.findIndex(level => level.id === data.level);
    if (data.version === 2) {
      const saved = data.random;
      if (data.level !== 'random-garden' || !saved || saved.generator !== 1 || !isDifficulty(saved.difficulty)
        || typeof saved.seed !== 'string' || !/^[a-f0-9]{32}$/.test(saved.seed)) return null;
      random = { seed: saved.seed, difficulty: saved.difficulty, generator: 1 };
      index = -1;
    } else if (index < 0) return null;

    const opening = random ? validateLevel(data.opening) : levels[index];
    if (!opening || (random && (opening.id !== 'random-garden' || opening.title !== 'Random garden'
      || opening.crates.length !== { easy: 1, medium: 2, hard: 3 }[random.difficulty]))) return null;
    const game = createGame(opening);
    if (random && game.status === 'won') return null;
    for (const dir of data.history) if (!move(game, dir as Direction)) return null;
    const completed = [...new Set<string>(data.completed)];
    if (!random && game.status === 'won' && !completed.includes(game.level.id)) completed.push(game.level.id);
    return { index, game, completed, random };
  } catch {
    return null;
  }
}
