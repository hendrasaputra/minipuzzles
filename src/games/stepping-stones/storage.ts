import { isDifficulty } from '../../shared/random-puzzle';
import { complete, createGame, step, type Game } from './engine';
import { levels, randomLevel, type RandomPath } from './levels';

export interface Save {
  game: Game;
  completed: string[];
  random?: RandomPath;
}

export function writeSave(save: Save): string {
  return JSON.stringify({
    version: 1, level: save.game.level.id, path: save.game.path,
    completed: save.completed, random: save.random,
  });
}

export function readSave(raw: string | null): Save | null {
  if (!raw || raw.length > 8192) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.path) || data.path.length > 25 || !data.path.length
      || !data.path.every(Number.isInteger) || new Set(data.path).size !== data.path.length
      || !Array.isArray(data.completed) || data.completed.length > levels.length
      || data.completed.some((id: unknown) => !levels.some(level => level.id === id))) return null;
    let random: RandomPath | undefined;
    if (data.random !== undefined) {
      const spec = data.random;
      if (spec?.version !== 1 || !isDifficulty(spec.difficulty)
        || typeof spec.seed !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(spec.seed)) return null;
      random = { version: 1, difficulty: spec.difficulty, seed: spec.seed };
    }
    const level = random ? randomLevel(random) : levels.find(candidate => candidate.id === data.level);
    if (!level || data.level !== level.id || data.path[0] !== level.route[0]) return null;
    const game = createGame(level);
    if (!data.path.slice(1).every((cell: number) => step(game, cell))) return null;
    const completed = [...new Set<string>(data.completed)];
    if (!random && complete(game) && !completed.includes(level.id)) completed.push(level.id);
    return { game, completed, random };
  } catch {
    return null;
  }
}
