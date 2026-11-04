import { createGame, rotate, type Game } from './engine';
import { levels } from './levels';
import { generateRandomLight, isRandomLight, type RandomLight } from './random';

const MAX_BYTES = 1024 * 1024;
const MAX_TURNS = 5000;

export function writeSave(index: number, game: Game, selected: string, completed: string[], random?: RandomLight): string {
  const raw = JSON.stringify({
    version: 1,
    level: random ? game.level.id : levels[index].id,
    history: game.history,
    selected,
    completed,
    random,
  });
  if (game.history.length > MAX_TURNS || new TextEncoder().encode(raw).byteLength > MAX_BYTES) {
    throw new RangeError('Save too large');
  }
  return raw;
}

export function readSave(raw: string | null): {
  index: number; game: Game; selected: string; completed: string[]; random?: RandomLight;
} | null {
  if (!raw || new TextEncoder().encode(raw).byteLength > MAX_BYTES) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.history) || data.history.length > MAX_TURNS
      || !Array.isArray(data.completed) || data.completed.length > levels.length
      || data.completed.some((id: unknown) => !levels.some(level => level.id === id))) return null;

    const random = data.random;
    if (random !== undefined && (!isRandomLight(random) || data.level !== 'crystal-random')) return null;
    const index = random ? -1 : levels.findIndex(level => level.id === data.level);
    if (!random && index < 0) return null;

    const game = createGame(random ? generateRandomLight(random) : levels[index]);
    for (const id of data.history) if (typeof id !== 'string' || !rotate(game, id)) return null;
    const completed = [...new Set<string>(data.completed)];
    if (!random && game.status === 'won' && !completed.includes(game.level.id)) completed.push(game.level.id);
    const selected = game.mirrors.some(mirror => mirror.id === data.selected) ? data.selected : game.mirrors[0].id;
    return { index, game, selected, completed, random };
  } catch {
    return null;
  }
}
