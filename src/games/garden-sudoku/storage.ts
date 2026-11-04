import { createGame, enter, levels, randomLevel, type Game } from './engine';
import { isDifficulty, type Difficulty } from '../../shared/random-puzzle';

export interface RandomSetup { seed: string; difficulty: Difficulty }
export const saveKey = 'puzzles-garden-sudoku-v1';

export function writeSave(game: Game, finished: string[], random?: RandomSetup): string {
  if (game.history.length > 1000) throw new RangeError('Too many edits');
  return JSON.stringify({ version: 1, level: game.level.id, history: game.history, finished, random });
}

export function readSave(raw: string | null): { game: Game; finished: string[]; random?: RandomSetup } | undefined {
  if (!raw || raw.length > 100_000) return;
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.history) || data.history.length > 1000
      || !Array.isArray(data.finished) || data.finished.length > levels.length
      || !data.finished.every((id: unknown) => levels.some(level => level.id === id))) return;
    let random: RandomSetup | undefined;
    if (data.random !== undefined) {
      const { seed, difficulty } = data.random ?? {};
      if (data.level !== 'sudoku-random' || typeof seed !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(seed)
        || !isDifficulty(difficulty)) return;
      random = { seed, difficulty };
    }
    const level = random ? randomLevel(random.seed, random.difficulty) : levels.find(level => level.id === data.level);
    if (!level) return;
    const game = createGame(level);
    for (const move of data.history) if (!move || !enter(game, move.cell, move.value)) return;
    return { game, finished: [...new Set<string>(data.finished)], random };
  } catch {
    return;
  }
}
