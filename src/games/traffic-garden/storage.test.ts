import { describe, expect, it } from 'vitest';
import { createGame, moveCar, undo } from './engine';
import { generatePuzzle } from './puzzles';
import { solve } from './solver';
import { readSave, writeSave } from './storage';

function fixture(){return createGame(generatePuzzle('storage-fixture','easy'));}
describe('Traffic Garden save replay',()=>{
  it('roundtrips moves, positions, seed and selected car',()=>{
    const game=fixture(),first=solve(game)![0];
    expect(moveCar(game,first.id,first.delta)).toBe(true);
    const saved=readSave(writeSave(game,first.id));
    expect(saved).toEqual({game,selected:first.id});
  });
  it('reconstructs a win and an undo without trusting a saved status',()=>{
    const game=fixture();
    for(const step of solve(game)!)expect(moveCar(game,step.id,step.delta)).toBe(true);
    expect(readSave(writeSave(game,'coral'))?.game.status).toBe('won');
    undo(game);
    expect(readSave(writeSave(game,'coral'))?.game).toEqual(game);
    const data=JSON.parse(writeSave(fixture(),'coral'));data.status='won';
    expect(readSave(JSON.stringify(data))?.game.status).toBe('playing');
  });
  it('rejects invalid moves and malformed vehicle data',()=>{
    const initial=JSON.parse(writeSave(fixture(),'coral'));
    for(const history of [[{id:'unknown',delta:1}],[{id:'coral',delta:0}],[{id:'coral',delta:99}],[{id:'coral',delta:'2'}]]){
      expect(readSave(JSON.stringify({...initial,history}))).toBeNull();
    }
    initial.puzzle.cars[0].id='<img onerror=x>';
    expect(readSave(JSON.stringify(initial))).toBeNull();
  });
  it('rejects corrupt, future, oversized and excessive-history saves',()=>{
    expect(readSave('{')).toBeNull();expect(readSave(null)).toBeNull();
    const data=JSON.parse(writeSave(fixture(),'coral'));
    expect(readSave(JSON.stringify({...data,version:2}))).toBeNull();
    expect(readSave(' '.repeat(1024*1024+1))).toBeNull();
    expect(readSave(JSON.stringify({...data,history:Array(5001).fill({id:'coral',delta:1})}))).toBeNull();
  });
  it('normalizes only selection metadata while retaining the puzzle',()=>{
    const game=fixture();
    expect(readSave(writeSave(game,'missing'))).toEqual({game,selected:'coral'});
  });
});
