import { isDifficulty } from '../../shared/random-puzzle';
import { createGame, complete, pour, type Game } from './engine';
import { levels, randomLevel, type RandomBalance } from './levels';

const maxMoves = 5000;

export function writeSave(game: Game, completed: string[], random?: RandomBalance): string {
  if (game.history.length > maxMoves) throw new RangeError('Save too large');
  return JSON.stringify({ version: 1, level: game.level.id, history: game.history, completed, random });
}

export function readSave(raw: string | null): { game: Game; completed: string[]; random?: RandomBalance } | null {
  if (!raw || raw.length > 1024 * 1024) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.history) || data.history.length > maxMoves
      || !Array.isArray(data.completed) || data.completed.length > levels.length
      || data.completed.some((id: unknown) => !levels.some(level => level.id === id))) return null;
    let random: RandomBalance | undefined;
    if (data.random !== undefined) {
      const spec = data.random;
      if (spec?.version !== 1 || !isDifficulty(spec.difficulty)
        || typeof spec.seed !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(spec.seed)) return null;
      random = { version: 1, seed: spec.seed, difficulty: spec.difficulty };
    }
    const level = random ? randomLevel(random) : levels.find(candidate => candidate.id === data.level);
    if (!level || level.id !== data.level) return null;
    const game = createGame(level);
    for (const move of data.history) if (!move || !pour(game, move)) return null;
    const completed = [...new Set<string>(data.completed)];
    if (!random && complete(game) && !completed.includes(level.id)) completed.push(level.id);
    return { game, completed, random };
  } catch {
    return null;
  }
}
