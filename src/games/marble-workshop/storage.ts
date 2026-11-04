import { createGame, rotate, run, type Game } from './engine';
import { levels } from './levels';
import { generateWorkshop, type RandomWorkshop } from './random';
import { isDifficulty } from '../../shared/random-puzzle';

const maxBytes = 1024 * 1024;
const maxTurns = 5000;

interface Save {
  game: Game;
  selected: string;
  completed: string[];
  random?: RandomWorkshop;
}

export function writeSave(game: Game, selected: string, completed: string[], random?: RandomWorkshop): string {
  const raw = JSON.stringify({
    version: 1, level: game.level.id, history: game.history, won: game.status === 'won',
    selected, completed, random,
  });
  if (game.history.length > maxTurns || new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new RangeError('Save too large');
  }
  return raw;
}

export function readSave(raw: string | null): Save | null {
  if (!raw || new TextEncoder().encode(raw).byteLength > maxBytes) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || typeof data.won !== 'boolean'
      || !Array.isArray(data.history) || data.history.length > maxTurns
      || !Array.isArray(data.completed) || data.completed.length > levels.length
      || data.completed.some((id: unknown) => !levels.some(level => level.id === id))) return null;

    let random: RandomWorkshop | undefined;
    if (data.random !== undefined) {
      const spec = data.random;
      if (!spec || spec.version !== 1 || !isDifficulty(spec.difficulty)
        || typeof spec.seed !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(spec.seed)) return null;
      random = { version: 1, seed: spec.seed, difficulty: spec.difficulty };
    }
    const opening = random ? generateWorkshop(random) : levels.find(level => level.id === data.level);
    if (!opening || opening.id !== data.level) return null;
    const game = createGame(opening);
    for (const id of data.history) if (typeof id !== 'string' || !rotate(game, id)) return null;
    if (data.won && !run(game)) return null;

    const completed = [...new Set<string>(data.completed)];
    if (!random && game.status === 'won' && !completed.includes(opening.id)) completed.push(opening.id);
    const selected = game.tracks.some(track => track.id === data.selected) ? data.selected : game.tracks[0].id;
    return { game, selected, completed, random };
  } catch {
    return null;
  }
}
