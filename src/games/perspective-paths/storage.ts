import { isDifficulty } from '../../shared/random-puzzle';
import { complete, createGame, join, validView, type Game } from './engine';
import { levels, randomLevel, type RandomPath } from './levels';

export interface Save { game: Game; completed: string[]; random?: RandomPath }

export function writeSave(save: Save): string {
  return JSON.stringify({
    version: 1, level: save.game.level.id, history: save.game.history,
    completed: save.completed, random: save.random,
  });
}

export function readSave(raw: string | null): Save | null {
  if (!raw || raw.length > 8192) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.history) || data.history.length > 5
      || !Array.isArray(data.completed) || data.completed.length > levels.length
      || data.completed.some((id: unknown) => !levels.some(level => level.id === id))) return null;

    let random: RandomPath | undefined;
    if (data.random !== undefined) {
      const spec = data.random;
      if (spec?.version !== 1 || !isDifficulty(spec.difficulty)
        || typeof spec.seed !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(spec.seed)) return null;
      random = { version: 1, seed: spec.seed, difficulty: spec.difficulty };
    }
    const level = random ? randomLevel(random) : levels.find(item => item.id === data.level);
    if (!level || level.id !== data.level) return null;

    const game = createGame(level);
    for (const view of data.history) if (!validView(view) || !join(game, view)) return null;
    const completed = [...new Set<string>(data.completed)];
    if (!random && complete(game) && !completed.includes(level.id)) completed.push(level.id);
    return { game, completed, random };
  } catch {
    return null;
  }
}
