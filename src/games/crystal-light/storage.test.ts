import { describe,it,expect } from 'vitest';
import { createGame,rotate,undo,solve } from './engine';
import { levels } from './levels';
import { generateRandomLight } from './random';
import { writeSave,readSave } from './storage';
describe('Crystal Light save replay',()=>{
  it('restores a completed light with selection and working undo',()=>{
    const game=createGame(levels[0]);for(const id of solve(game)!)rotate(game,id);
    const restored=readSave(writeSave(0,game,game.mirrors[0].id,[]))!;
    expect(restored.game).toEqual(game);expect(restored.selected).toBe(game.mirrors[0].id);expect(restored.completed).toContain(levels[0].id);
    expect(undo(restored.game)).toBe(true);expect(restored.game.status).toBe('playing');
  });
  it('replays partial progress and normalizes an unknown selection',()=>{
    const index=levels.length-1,game=createGame(levels[index]);rotate(game,solve(game)![0]);
    const restored=readSave(writeSave(index,game,'missing',[levels[0].id]))!;
    expect(restored.game).toEqual(game);expect(restored.selected).toBe(game.mirrors[0].id);expect(restored.index).toBe(index);
  });
  it('rejects malformed, future, oversized and invalid replay data',()=>{
    const base=JSON.parse(writeSave(0,createGame(levels[0]),'missing',[]));
    for(const value of [{...base,version:2},{...base,level:'missing'},{...base,history:['missing']},{...base,history:Array(5001).fill('m1')},{...base,completed:['missing']}])expect(readSave(JSON.stringify(value))).toBeNull();
    expect(readSave('{')).toBeNull();expect(readSave(' '.repeat(1024*1024+1))).toBeNull();expect(readSave(null)).toBeNull();
    const game=createGame(levels[0]);for(const id of solve(game)!)rotate(game,id);const won=JSON.parse(writeSave(0,game,game.mirrors[0].id,[]));won.history.push(game.mirrors[0].id);expect(readSave(JSON.stringify(won))).toBeNull();
  });
});

describe('random light saves', () => {
  it('restores the seeded route and replay without awarding a curated completion', () => {
    const random = { version: 1, seed: 'saved-random', difficulty: 'hard' } as const;
    const game = createGame(generateRandomLight(random));
    const solution = solve(game)!;
    rotate(game, solution[0]);
    const restored = readSave(writeSave(-1, game, solution[0], ['crystal-1'], random));
    expect(restored).toEqual({ index: -1, game, selected: solution[0], completed: ['crystal-1'], random });
    for (const id of solution.slice(1)) rotate(game, id);
    expect(game.status).toBe('won');
    expect(readSave(writeSave(-1, game, solution[0], ['crystal-1'], random))?.completed).toEqual(['crystal-1']);
  });

  it('rejects tampered random metadata and history', () => {
    const random = { version: 1, seed: 'saved-random', difficulty: 'easy' } as const;
    const game = createGame(generateRandomLight(random));
    const saved = JSON.parse(writeSave(-1, game, game.mirrors[0].id, [], random));
    for (const corrupt of [
      { ...saved, level: 'crystal-1' },
      { ...saved, random: { ...random, version: 2 } },
      { ...saved, random: { ...random, seed: 'x'.repeat(129) } },
      { ...saved, random: { ...random, difficulty: 'unknown' } },
      { ...saved, history: ['unknown-mirror'] },
    ]) expect(readSave(JSON.stringify(corrupt))).toBeNull();
  });
});
