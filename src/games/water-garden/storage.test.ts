import { describe,it,expect } from 'vitest';
import { createGame,rotate,undo,solve } from './engine';
import { levels } from './levels';
import { generateGarden } from './random';
import { writeSave,readSave } from './storage';
describe('Water Garden save replay',()=>{
  it('restores a completed light with selection and working undo',()=>{
    const game=createGame(levels[0]);for(const id of solve(game)!)rotate(game,id);
    const restored=readSave(writeSave(0,game,game.pipes[0].id,[]))!;
    expect(restored.game).toEqual(game);expect(restored.selected).toBe(game.pipes[0].id);expect(restored.completed).toContain(levels[0].id);
    expect(undo(restored.game)).toBe(true);expect(restored.game.status).toBe('playing');
  });
  it('replays partial progress and normalizes an unknown selection',()=>{
    const index=levels.length-1,game=createGame(levels[index]);rotate(game,solve(game)![0]);
    const restored=readSave(writeSave(index,game,'missing',[levels[0].id]))!;
    expect(restored.game).toEqual(game);expect(restored.selected).toBe(game.pipes[0].id);expect(restored.index).toBe(index);
  });
  it('rejects malformed, future, oversized and invalid replay data',()=>{
    const base=JSON.parse(writeSave(0,createGame(levels[0]),'missing',[]));
    for(const value of [{...base,version:2},{...base,level:'missing'},{...base,history:['missing']},{...base,history:Array(5001).fill('m1')},{...base,completed:['missing']}])expect(readSave(JSON.stringify(value))).toBeNull();
    expect(readSave('{')).toBeNull();expect(readSave(' '.repeat(1024*1024+1))).toBeNull();expect(readSave(null)).toBeNull();
    const game=createGame(levels[0]);for(const id of solve(game)!)rotate(game,id);const won=JSON.parse(writeSave(0,game,game.pipes[0].id,[]));won.history.push(game.pipes[0].id);expect(readSave(JSON.stringify(won))).toBeNull();
  });
});

it('restores a seeded garden and replays its win without marking a curated level', () => {
  const random = { version: 1, difficulty: 'medium', seed: 'water-garden-replay' } as const;
  const game = createGame(generateGarden(random));
  for (const id of solve(game)!) rotate(game, id);
  const completed = [levels[1].id];
  const raw = writeSave(0, game, game.pipes[0].id, completed, random);
  expect(readSave(raw)).toEqual({ index: 0, game, selected: game.pipes[0].id, completed, random });
  expect(readSave(JSON.stringify({ ...JSON.parse(raw), random: { ...random, version: 2 } }))).toBeNull();
  expect(readSave(JSON.stringify({ ...JSON.parse(raw), random: { ...random, difficulty: 'unknown' } }))).toBeNull();
  expect(readSave(JSON.stringify({ ...JSON.parse(raw), random: { ...random, seed: ' ' } }))).toBeNull();
});
