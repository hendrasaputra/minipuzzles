import { describe, expect, it } from 'vitest';
import { createGame, startGame, reveal, toggleFlag } from './engine';
import { readSession, readTransfer, MAX_SAVE_BYTES, writeSession, type Session } from './storage';

const known = ['classic-1', 'layered-1', 'connected-1'];
function session(): Session {
  const game = createGame({ width: 6, height: 6, mines: 6, floors: 2, seed: 'saved-petal' });
  reveal(game, 0, 14);
  const hidden = game.cells[0].findIndex(cell => !cell.revealed);
  toggleFlag(game, 0, hidden);
  return { game, active: 1, elapsed: 93, exploded: true, action: 'inspect', levelId: 'layered-1', completed: ['classic-1'] };
}

describe('versioned browser sessions', () => {
  it('round trips board, flags, navigation, time and campaign progress', () => {
    const original = session();
    const raw = writeSession(original);
    expect(JSON.parse(raw).version).toBe(2);
    expect(readSession(raw, known)).toEqual(original);
  });

  it('migrates the original versionless save without losing its board or elapsed time', () => {
    const { game, active, elapsed } = session();
    expect(readSession(JSON.stringify({ game, active, elapsed }), known)).toEqual({
      game, active, elapsed, exploded: false, action: 'reveal', levelId: null, completed: [],
    });
  });

  it.each([null, '', '{', 'null', '[]', 'true', '123', '{}'])('rejects missing or corrupt envelope %s', raw => {
    expect(readSession(raw, known)).toBeNull();
  });

  it('rejects unknown versions without pretending they are legacy saves', () => {
    for (const version of [0, 1, 3, '2', null]) {
      expect(readSession(JSON.stringify({ ...session(), version }), known)).toBeNull();
    }
  });

  it('rejects a corrupted puzzle through the engine validator', () => {
    const saved = session();
    saved.game.cells[0][0].adjacent = 999;
    expect(readSession(writeSession(saved), known)).toBeNull();
  });

  it('bounds navigation and elapsed seconds and filters unknown completed levels', () => {
    const saved = { ...session(), active: 500, elapsed: 1e20, levelId: 'removed-level',
      completed: ['classic-1', 'classic-1', 'removed-level', false, 'connected-1'] };
    const restored = readSession(JSON.stringify(saved), known)!;
    expect(restored.active).toBe(1);
    expect(restored.elapsed).toBe(604800);
    expect(restored.levelId).toBeNull();
    expect(restored.completed).toEqual(['classic-1', 'connected-1']);
  });

  it('normalizes malformed metadata while preserving a valid puzzle', () => {
    const restored = readSession(JSON.stringify({ ...session(), active: 0.5, elapsed: '12',
      exploded: 'true', action: 'delete', levelId: {}, completed: 'classic-1' }), known)!;
    expect(restored).toMatchObject({ active: 0, elapsed: 0, exploded: false, action: 'reveal', levelId: null, completed: [] });
    const negative = readSession(JSON.stringify({ ...session(), active: -2, elapsed: -10 }), known)!;
    expect(negative).toMatchObject({ active: 0, elapsed: 0 });
    expect(readSession(JSON.stringify({ ...session(), elapsed: 9.9 }), known)!.elapsed).toBe(9);
  });
});


describe('portable Petals save files', () => {
  const config = { width: 5, height: 5, floors: 1, mines: 3, mode: 'classic' as const, seed: 'transfer-lesson', firstReveal: [12], generatorVersion: 1 as const };
  const levels = [{ id: 'transfer-level', config }];
  const example = (): Session => ({ game: startGame(config), active: 0, elapsed: 42, exploded: false, action: 'flag', levelId: 'transfer-level', completed: [] });

  it('round trips an exported fixed game without changing its clues, flags or time', () => {
    const saved = example();
    const hidden = saved.game.cells[0].findIndex(cell => !cell.revealed);
    toggleFlag(saved.game, 0, hidden);
    expect(readTransfer(writeSession(saved), levels)).toEqual(saved);
  });

  it('accepts a valid random or legacy save without a learning level', () => {
    const saved = { ...session(), levelId: null };
    expect(readTransfer(writeSession(saved), levels)?.game).toEqual(saved.game);
    expect(readTransfer(JSON.stringify({game: saved.game, active: 1, elapsed: 12}), levels)).toMatchObject({active: 1, elapsed: 12, levelId: null});
  });

  it('rejects a forged learning label and inconsistent board without mutating the source', () => {
    const saved = example(), original = structuredClone(saved);
    saved.game = startGame({ ...config, seed: 'different-puzzle' });
    expect(readTransfer(writeSession(saved), levels)).toBeNull();
    saved.game = structuredClone(original.game);
    saved.game.cells[0][0].adjacent = 99;
    expect(readTransfer(writeSession(saved), levels)).toBeNull();
    expect(original).toEqual(example());
  });

  it('compares learning configuration by values rather than JSON key order', () => {
    const saved = example();
    saved.game.config = Object.fromEntries(Object.entries(saved.game.config).reverse()) as typeof saved.game.config;
    expect(readTransfer(writeSession(saved), levels)?.game).toEqual(saved.game);
  });

  it('rejects malformed and oversized files before returning any replacement state', () => {
    expect(readTransfer('{', levels)).toBeNull();
    expect(readTransfer(' '.repeat(MAX_SAVE_BYTES + 1), levels)).toBeNull();
    expect(readTransfer('é'.repeat(MAX_SAVE_BYTES / 2 + 1), levels)).toBeNull();
  });
});
