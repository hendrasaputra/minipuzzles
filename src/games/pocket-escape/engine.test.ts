import { describe, expect, it } from 'vitest';
import { digit, randomRoom, rooms, unlock } from './engine';
import { readSave, writeSave } from './storage';

describe('Pocket Escape', () => {
  it('requires both clues and their digits in the right order', () => {
    const room = rooms[0];
    expect(unlock(room, [0], ['3', '5'])).toBe(false);
    expect(unlock(room, [0, 1], ['5', '3'])).toBe(false);
    expect(unlock(room, [1, 0], ['3', '5'])).toBe(true);
  });

  it('makes every authored clue resolve to one digit', () => {
    for (const room of rooms) {
      const inspected = room.clues.map((_, i) => i);
      const code = inspected.map(i => String(digit(room, i)));
      expect(code.every(value => /^[0-9]$/.test(value))).toBe(true);
      expect(unlock(room, inspected, code)).toBe(true);
    }
    expect(rooms[7].clues.map((_, i) => digit(rooms[7], i))).toEqual([1, 3, 4, 7]);
  });

  it.each(['easy', 'medium', 'hard'] as const)('generates varied, reproducible %s rooms', difficulty => {
    const codes = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      const spec = { version: 1 as const, difficulty, seed: String(seed) };
      const room = randomRoom(spec);
      expect(randomRoom(spec)).toEqual(room);
      const inspected = room.clues.map((_, i) => i);
      const code = inspected.map(i => String(digit(room, i)));
      expect(code.every(value => /^[0-9]$/.test(value))).toBe(true);
      expect(unlock(room, inspected, code)).toBe(true);
      codes.add(code.join(''));
    }
    expect(codes.size).toBeGreaterThan(8);
  });

  it('restores a partial lock and rejects a forged win', () => {
    const state = { room: rooms[0], inspected: [0], code: ['3', ''], won: false, completed: [] };
    expect(readSave(writeSave(state))).toMatchObject(state);
    expect(readSave(writeSave({ ...state, won: true }))).toBeNull();
    expect(readSave(writeSave({ ...state, code: ['30', ''] }))).toBeNull();
  });
});
