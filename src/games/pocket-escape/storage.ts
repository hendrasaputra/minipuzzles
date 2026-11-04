import { isDifficulty } from '../../shared/random-puzzle';
import { randomRoom, rooms, unlock, type RandomRoom, type Room } from './engine';

export interface Save {
  room: Room;
  inspected: number[];
  code: string[];
  won: boolean;
  completed: string[];
  random?: RandomRoom;
}

export function writeSave(save: Save): string {
  return JSON.stringify({ ...save, room: save.room.id, version: 1 });
}

export function readSave(raw: string | null): Save | null {
  if (!raw || raw.length > 4096) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || typeof data.won !== 'boolean' || !Array.isArray(data.completed)
      || data.completed.length > rooms.length
      || data.completed.some((id: unknown) => !rooms.some(room => room.id === id))) return null;
    let random: RandomRoom | undefined;
    if (data.random !== undefined) {
      const spec = data.random;
      if (spec?.version !== 1 || !isDifficulty(spec.difficulty)
        || typeof spec.seed !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(spec.seed)) return null;
      random = { version: 1, seed: spec.seed, difficulty: spec.difficulty };
    }
    const room = random ? randomRoom(random) : rooms.find(room => room.id === data.room);
    if (!room || data.room !== room.id || !Array.isArray(data.code) || data.code.length !== room.clues.length
      || !data.code.every((value: unknown) => typeof value === 'string' && /^[0-9]?$/.test(value))
      || !Array.isArray(data.inspected) || data.inspected.length > room.clues.length
      || !data.inspected.every((i: number) => Number.isInteger(i) && i >= 0 && i < room.clues.length)
      || (data.won && !unlock(room, data.inspected, data.code))) return null;
    return {
      room, random, code: data.code, inspected: [...new Set<number>(data.inspected)],
      won: data.won, completed: [...new Set<string>(data.completed)],
    };
  } catch {
    return null;
  }
}
