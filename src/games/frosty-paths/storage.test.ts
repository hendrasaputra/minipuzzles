import { describe,it,expect } from 'vitest';
import { createGame,move,solve,undo } from './engine';
import { levels } from './levels';
import { readSave,writeSave } from './storage';
import { generatePath } from './random';

describe('Frosty Paths saves',()=>{
  it('replays legal progress and restores a win with working undo',()=>{
    const game=createGame(levels[0]);for(const dir of solve(game)!)move(game,dir);
    const restored=readSave(writeSave(game,[]))!;
    expect(restored.game.status).toBe('won');expect(restored.completed).toEqual([levels[0].id]);
    expect(undo(restored.game)).toBe(true);expect(restored.game.status).toBe('playing');
  });
  it('roundtrips a partial solution with slides and collected fish',()=>{
    const game=createGame(levels[levels.length-1]);for(const dir of solve(game)!.slice(0,4))move(game,dir);
    const restored=readSave(writeSave(game,[levels[0].id]))!;
    expect(restored.game).toEqual(game);expect(restored.index).toBe(levels.length-1);
  });
  it('preserves a legacy curated save and its completion marks',()=>{
    const legacy=JSON.stringify({version:1,level:'frost-1',history:['e','n'],completed:['frost-2']});
    const restored=readSave(legacy)!;
    expect(restored.game.status).toBe('won');
    expect(restored.index).toBe(0);
    expect(restored.random).toBeUndefined();
    expect(restored.completed).toEqual(['frost-2','frost-1']);
  });
  it('restores the exact random opening and move history without marking curated levels',()=>{
    const random={seed:'winter-1',difficulty:'medium'} as const;
    const game=createGame(generatePath(random));
    for(const dir of solve(game)!)move(game,dir);
    const raw=writeSave(game,['frost-1'],random);
    const restored=readSave(raw)!;
    expect(restored.game).toEqual(game);
    expect(restored.random).toEqual(random);
    expect(restored.completed).toEqual(['frost-1']);
    const invalid=JSON.parse(raw);
    for(const metadata of [
      {...invalid.random, seed:''},
      {...invalid.random, difficulty:'hard'},
      {...invalid.random, opening:{...invalid.random.opening, rocks:[invalid.random.opening.goal]}},
    ])expect(readSave(JSON.stringify({...invalid,random:metadata}))).toBeNull();
  });
  it('rejects corrupt, oversized, future, unknown-level and illegal histories',()=>{
    const good=JSON.parse(writeSave(createGame(levels[0]),[]));
    for(const data of [{...good,version:2},{...good,level:'missing'},{...good,history:['teleport']},{...good,history:Array(5001).fill('n')},{...good,completed:['fake']},{...good,history:['w','w','w','w','w','w','w','w']}])expect(readSave(JSON.stringify(data))).toBeNull();
    expect(readSave('{')).toBeNull();expect(readSave(' '.repeat(1024*1024+1))).toBeNull();
  });
});
