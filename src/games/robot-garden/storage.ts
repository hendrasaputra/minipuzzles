import { isDifficulty } from '../../shared/random-puzzle';
import { isDirection, maxCommands, run, type Direction, type Level } from './engine';
import { levels, randomLevel, type RandomGarden } from './levels';

export interface Save {
  level: Level;
  commands: Direction[];
  won: boolean;
  completed: string[];
  random?: RandomGarden;
}

export function writeSave(save: Save): string {
  return JSON.stringify({
    version: 1, level: save.level.id, commands: save.commands, won: save.won,
    completed: save.completed, random: save.random,
  });
}

export function readSave(raw: string | null): Save | null {
  if (!raw || raw.length > 8192) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.commands) || data.commands.length > maxCommands
      || !data.commands.every(isDirection) || typeof data.won !== 'boolean'
      || !Array.isArray(data.completed) || data.completed.length > levels.length
      || data.completed.some((id: unknown) => !levels.some(level => level.id === id))) return null;
    let random: RandomGarden | undefined;
    if (data.random !== undefined) {
      const spec = data.random;
      if (spec?.version !== 1 || !isDifficulty(spec.difficulty)
        || typeof spec.seed !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(spec.seed)) return null;
      random = { version: 1, difficulty: spec.difficulty, seed: spec.seed };
    }
    const level = random ? randomLevel(random) : levels.find(candidate => candidate.id === data.level);
    if (!level || level.id !== data.level || (data.won && !run(level, data.commands).won)) return null;
    const completed = [...new Set<string>(data.completed)];
    if (data.won && !random && !completed.includes(level.id)) completed.push(level.id);
    return { level, commands: data.commands, won: data.won, completed, random };
  } catch {
    return null;
  }
}
