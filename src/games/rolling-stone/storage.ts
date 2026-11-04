import { isDifficulty } from '../../shared/random-puzzle';
import { atGoal, createGame, isDirection, move, type Game } from './engine';
import { levels, randomLevel, type RandomBoard } from './levels';

export interface Save {
  game: Game;
  completed: string[];
  random?: RandomBoard;
}

const historyLimit = 5000;

export function writeSave({ game, completed, random }: Save): string {
  if (game.history.length > historyLimit) throw new RangeError('Save too large');
  return JSON.stringify({ version: 1, level: game.level.id, history: game.history, completed, random });
}

export function readSave(raw: string | null): Save | undefined {
  if (!raw || raw.length > 65536) return;
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.history) || data.history.length > historyLimit
      || !data.history.every(isDirection) || !Array.isArray(data.completed)
      || data.completed.length > levels.length
      || data.completed.some((id: unknown) => !levels.some(level => level.id === id))) return;
    let random: RandomBoard | undefined;
    if (data.random !== undefined) {
      const spec = data.random;
      if (spec?.version !== 1 || !isDifficulty(spec.difficulty) || typeof spec.seed !== 'string'
        || !/^[a-zA-Z0-9-]{1,80}$/.test(spec.seed)) return;
      random = { version: 1, seed: spec.seed, difficulty: spec.difficulty };
    }
    const level = random ? randomLevel(random) : levels.find(candidate => candidate.id === data.level);
    if (!level || level.id !== data.level) return;
    const game = createGame(level);
    for (const direction of data.history) if (!move(game, direction)) return;
    const completed = new Set<string>(data.completed);
    if (!random && atGoal(level, game.block)) completed.add(level.id);
    return { game, completed: [...completed], random };
  } catch {
    return;
  }
}
