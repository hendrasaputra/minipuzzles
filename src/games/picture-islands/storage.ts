import { createGame, levels, markCell, randomPuzzle, type Game } from './engine';
import { isDifficulty, type Difficulty } from '../../shared/random-puzzle';

export interface RandomSetup { seed: string; difficulty: Difficulty }
export const saveKey = 'puzzles-picture-islands-v1';

export function writeSave(game: Game, finished: string[], random?: RandomSetup): string {
  return JSON.stringify({ version: 1, level: game.puzzle.id, history: game.history, finished, random });
}

export function readSave(raw: string | null): { game: Game; finished: string[]; random?: RandomSetup } | undefined {
  if (!raw || raw.length > 100_000) return;
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || !Array.isArray(value.history) || value.history.length > 1000
      || !Array.isArray(value.finished) || value.finished.length > levels.length
      || !value.finished.every((id: unknown) => levels.some(level => level.id === id))) return;
    let random: RandomSetup | undefined;
    if (value.random !== undefined) {
      const { seed, difficulty } = value.random ?? {};
      if (value.level !== 'random' || typeof seed !== 'string' || !/^[a-z0-9-]{1,80}$/i.test(seed) || !isDifficulty(difficulty)) return;
      random = { seed, difficulty };
    }
    const puzzle = random ? randomPuzzle(random.seed, random.difficulty) : levels.find(level => level.id === value.level);
    if (!puzzle) return;
    const game = createGame(puzzle);
    for (const move of value.history) if (!move || !markCell(game, move.cell, move.mark)) return;
    return { game, finished: [...new Set<string>(value.finished)], random };
  } catch { return; }
}
