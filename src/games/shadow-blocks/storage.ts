import { isDifficulty } from '../../shared/random-puzzle';
import { createGame, edit, type Game } from './engine';
import { generateShadow, levels, type RandomShadow } from './levels';

const maxEdits = 5000;

export function writeSave(game: Game, selected: number, completed: string[], random?: RandomShadow) {
  if (game.history.length > maxEdits) throw new RangeError('Save too large');
  return JSON.stringify({ version: 1, level: game.level.id, history: game.history, selected, completed, random });
}

export function readSave(raw: string | null): {
  game: Game;
  selected: number;
  completed: string[];
  random?: RandomShadow;
} | null {
  if (!raw || raw.length > 1024 * 1024) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.history) || data.history.length > maxEdits
      || !Array.isArray(data.completed) || data.completed.length > levels.length
      || data.completed.some((id: unknown) => !levels.some(level => level.id === id))) return null;

    let random: RandomShadow | undefined;
    if (data.random !== undefined) {
      const spec = data.random;
      if (!spec || spec.version !== 1 || !isDifficulty(spec.difficulty)
        || typeof spec.seed !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(spec.seed)) return null;
      random = { version: 1, seed: spec.seed, difficulty: spec.difficulty };
    }
    const opening = random ? generateShadow(random) : levels.find(level => level.id === data.level);
    if (!opening || opening.id !== data.level) return null;
    const game = createGame(opening);
    for (const move of data.history) {
      if (!move || (move.change !== 1 && move.change !== -1) || !edit(game, move.cell, move.change)) return null;
    }

    const completed = [...new Set<string>(data.completed)];
    if (!random && game.won && !completed.includes(opening.id)) completed.push(opening.id);
    const selected = Number.isInteger(data.selected) && data.selected >= 0 && data.selected < game.stacks.length
      ? data.selected : 0;
    return { game, selected, completed, random };
  } catch {
    return null;
  }
}
