import { describe, expect, it } from 'vitest';
import { createGame, rotate, run, solve, undo } from './engine';
import { levels } from './levels';
import { generateWorkshop, type RandomWorkshop } from './random';
import { readSave, writeSave } from './storage';

describe('Marble Workshop save replay', () => {
  it('restores random geometry and legal turns without awarding authored completion', () => {
    const random: RandomWorkshop = { version: 1, difficulty: 'hard', seed: 'roundtrip' };
    const game = createGame(generateWorkshop(random));
    for (const id of solve(game)) expect(rotate(game, id)).toBe(true);
    const saved = readSave(writeSave(game, game.tracks[0].id, [], random))!;
    expect(saved.random).toEqual(random);
    expect(saved.game).toEqual(game);
    expect(saved.game.status).toBe('playing');
    expect(run(saved.game)).toBe(true);
    expect(readSave(writeSave(saved.game, saved.selected, [], random))?.completed).toEqual([]);
  });

  it('restores an authored win and supports undo after reload', () => {
    const game = createGame(levels[0]);
    for (const id of solve(game)) rotate(game, id);
    expect(run(game)).toBe(true);
    const saved = readSave(writeSave(game, game.tracks[0].id, []))!;
    expect(saved.game.status).toBe('won');
    expect(saved.completed).toEqual([levels[0].id]);
    expect(undo(saved.game)).toBe(true);
    expect(saved.game.status).toBe('playing');
  });

  it('rejects invalid replay metadata, fake wins and unknown track IDs', () => {
    const game = createGame(levels[0]);
    const raw = JSON.parse(writeSave(game, game.tracks[0].id, []));
    for (const data of [
      { ...raw, won: true }, { ...raw, version: 2 }, { ...raw, history: ['missing-track'] },
      { ...raw, random: { version: 1, seed: '', difficulty: 'hard' } },
      { ...raw, completed: ['missing-level'] },
    ]) expect(readSave(JSON.stringify(data))).toBeNull();
  });
});
