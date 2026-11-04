import { describe,it,expect } from 'vitest';
import { createGame,move,solve,undo } from './engine';
import { levels } from './levels';
import { readSave,writeSave } from './storage';

describe('Crate Garden saves',()=>{
  it('replays legal progress and restores a win with working undo',()=>{
    const game=createGame(levels[0]);for(const dir of solve(game)!)move(game,dir);
    const restored=readSave(writeSave(0,game,[]))!;
    expect(restored.game.status).toBe('won');expect(restored.completed).toEqual([levels[0].id]);
    expect(undo(restored.game)).toBe(true);expect(restored.game.status).toBe('playing');
  });
  it('roundtrips a partial solution with move and push counts',()=>{
    const game=createGame(levels[levels.length-1]);for(const dir of solve(game)!.slice(0,4))move(game,dir);
    const restored=readSave(writeSave(levels.length-1,game,[levels[0].id]))!;
    expect(restored.game).toEqual(game);expect(restored.index).toBe(levels.length-1);
  });
  it('rejects corrupt, oversized, future, unknown-level and illegal histories',()=>{
    const good=JSON.parse(writeSave(0,createGame(levels[0]),[]));
    for(const data of [{...good,version:2},{...good,level:'missing'},{...good,history:['teleport']},{...good,history:Array(5001).fill('n')},{...good,completed:['fake']},{...good,history:['w','w','w','w','w','w','w','w']}])expect(readSave(JSON.stringify(data))).toBeNull();
    expect(readSave('{')).toBeNull();expect(readSave(' '.repeat(1024*1024+1))).toBeNull();
  });
});
