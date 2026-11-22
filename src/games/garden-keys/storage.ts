import { createGame, step, type Game, type Input } from './engine';
import { levels } from './levels';

export type Speed = 'calm' | 'classic';
export interface Progress { index: number; game: Game; speed: Speed; completed: string[]; best: Record<string, number> }

const MAX_INPUTS = 20_000;
const letters: Record<string, Input> = { n: 'n', e: 'e', s: 's', w: 'w', x: 'wait', '.': null };
const encode = (input: Input) => input === null ? '.' : input === 'wait' ? 'x' : input;

/** Saves the level and every tick's input; loading replays them through the rules. */
export function writeSave(p: Progress): string {
  const inputs = p.game.history.map(h => encode(h.input)).join('');
  if (inputs.length > MAX_INPUTS) throw new RangeError('Save too large');
  return JSON.stringify({ version: 1, level: p.game.level.id, speed: p.speed, inputs, completed: p.completed, best: p.best });
}

export function readSave(raw: string | null): Progress | null {
  if (!raw || raw.length > MAX_INPUTS * 2) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || (data.speed !== 'calm' && data.speed !== 'classic')) return null;
    const index = levels.findIndex(l => l.id === data.level);
    if (index < 0 || typeof data.inputs !== 'string' || data.inputs.length > MAX_INPUTS || !/^[nesw.x]*$/.test(data.inputs)) return null;
    const known = (id: unknown) => typeof id === 'string' && levels.some(l => l.id === id);
    if (!Array.isArray(data.completed) || !data.completed.every(known) || new Set(data.completed).size !== data.completed.length) return null;
    if (!data.best || typeof data.best !== 'object' || Array.isArray(data.best)) return null;
    const best: Record<string, number> = {};
    for (const [id, ticks] of Object.entries(data.best)) {
      if (!known(id) || !Number.isInteger(ticks) || (ticks as number) < 1) return null;
      best[id] = ticks as number;
    }
    const game = createGame(levels[index], { timed: data.speed === 'classic' });
    for (const letter of data.inputs) if (!step(game, letters[letter])) return null;
    return { index, game, speed: data.speed, completed: [...data.completed], best };
  } catch { return null; }
}
