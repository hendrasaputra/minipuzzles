import { describe, it, expect } from 'vitest';
import { act, createGame } from './engine';
import { campaign, levels } from './levels';
import { decode } from './solver';
import { readSave, writeSave, type Progress } from './storage';

const progress = (): Progress => {
  const game = createGame(levels[0]);
  act(game, 'e'); act(game, 'w'); act(game, 'wait');
  return { index: 0, game, speed: 'calm', completed: ['first-seeds'], best: { 'first-seeds': 31 } };
};

describe('Garden Keys saves', () => {
  it('restores the level, speed, moves and progress by replaying inputs', () => {
    const saved = progress(), loaded = readSave(writeSave(saved))!;
    expect(loaded.game.state).toEqual(saved.game.state);
    expect(loaded.game.history.length).toBe(3);
    expect(loaded).toMatchObject({ index: 0, speed: 'calm', completed: ['first-seeds'], best: { 'first-seeds': 31 } });
  });
  it('keeps classic games timed', () => {
    const p = progress(); p.speed = 'classic';
    expect(readSave(writeSave(p))!.game.timed).toBe(true);
  });
  it('rejects tampered or broken saves before replacing progress', () => {
    const good = JSON.parse(writeSave(progress()));
    for (const patch of [{ version: 2 }, { level: 'nope' }, { speed: 'fast' }, { inputs: 'eq' }, { completed: ['nope'] },
      { completed: ['first-seeds', 'first-seeds'] }, { best: { 'first-seeds': 0 } }, { best: [] }])
      expect(readSave(JSON.stringify({ ...good, ...patch }))).toBeNull();
    expect(readSave('{')).toBeNull();
    expect(readSave(null)).toBeNull();
    // Inputs after the level has ended cannot come from real play.
    const won = createGame(levels[0]);
    for (const action of decode(campaign[0].solution)) act(won, action);
    const finished = writeSave({ ...progress(), game: won });
    expect(readSave(finished)!.game.state.status).toBe('won');
    expect(readSave(JSON.stringify({ ...JSON.parse(finished), inputs: JSON.parse(finished).inputs + 'n' }))).toBeNull();
  });
});
