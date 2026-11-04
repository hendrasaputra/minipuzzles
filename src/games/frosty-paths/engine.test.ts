import { describe,it,expect } from 'vitest';
import { createGame,move,undo,solve,validateLevel,type Level,type Direction } from './engine';
import { levels } from './levels';
const fixture=():Level=>({id:'fixture',title:'Fixture',width:5,height:5,player:{x:0,y:4},goal:{x:4,y:0},fish:[{x:2,y:4}],rocks:[]});

describe('Frosty Paths slides',()=>{
  it('slides to the edge and collects fish passed along the route',()=>{
    const game=createGame(fixture());expect(move(game,'e')).toBe(true);expect(game.player).toEqual({x:4,y:4});expect(game.collected).toEqual([{x:2,y:4}]);expect(game.moves).toBe(1);expect(game.status).toBe('playing');
  });
  it('stops before a rock, without collecting a fish beyond it',()=>{
    const game=createGame({...fixture(),rocks:[{x:3,y:4}],fish:[{x:4,y:4}]});move(game,'e');expect(game.player).toEqual({x:2,y:4});expect(game.collected).toEqual([]);
  });
  it('never counts blocked or invalid moves and does not mutate the opening',()=>{
    const level=fixture(),game=createGame(level),before=structuredClone(game);
    expect(move(game,'w')).toBe(false);expect(move(game,'s')).toBe(false);expect(move(game,'__proto__' as Direction)).toBe(false);expect(game).toEqual(before);
    move(game,'e');expect(level).toEqual(fixture());
  });
  it('does not stop or win when only passing over the goal',()=>{
    const game=createGame({...fixture(),goal:{x:2,y:4},fish:[]});move(game,'e');expect(game.player).toEqual({x:4,y:4});expect(game.status).toBe('playing');
  });
  it('requires all fish even when stopping on home',()=>{
    const game=createGame({...fixture(),goal:{x:4,y:4},fish:[{x:2,y:2}]});move(game,'e');expect(game.player).toEqual(game.level.goal);expect(game.status).toBe('playing');
  });
  it('counts each fish once across repeated crossings and collects several in a slide',()=>{
    const game=createGame({...fixture(),fish:[{x:1,y:4},{x:3,y:4}]});move(game,'e');move(game,'w');move(game,'e');expect(game.collected).toEqual([{x:1,y:4},{x:3,y:4}]);expect(game.moves).toBe(3);
  });
  it('wins only after stopping home, blocks later moves and undoes all collected state',()=>{
    const game=createGame(fixture());move(game,'e');const beforeWin=structuredClone(game);move(game,'n');expect(game.status).toBe('won');expect(move(game,'s')).toBe(false);
    expect(undo(game)).toBe(true);expect(game).toEqual(beforeWin);expect(undo(game)).toBe(true);expect(game).toEqual(createGame(fixture()));expect(undo(game)).toBe(false);
  });
  it('does not share snapshot arrays/positions with restored state',()=>{
    const game=createGame(fixture());move(game,'e');const snapshot=game.history[0];undo(game);game.player.x=3;game.collected.push({x:1,y:1});expect(snapshot.player.x).toBe(0);expect(snapshot.collected).toEqual([]);
  });
});

describe('Frosty Paths validation and hints',()=>{
  it('rejects invalid, overlapping, duplicate or out-of-board layouts',()=>{
    const base=fixture();
    for(const level of [null,{}, {...base,width:9},{...base,height:2},{...base,id:'<unsafe>'},{...base,title:''},{...base,player:{x:-1,y:0}},{...base,goal:{x:5,y:0}},{...base,rocks:[base.player]},{...base,rocks:[base.goal]},{...base,fish:[base.player]},{...base,fish:[base.goal]},{...base,fish:[{x:1,y:1},{x:1,y:1}]},{...base,rocks:[{x:1,y:1},{x:1,y:1}]},{...base,fish:[{x:1,y:1}],rocks:[{x:1,y:1}]},{...base,fish:[{x:0,y:0},{x:1,y:0},{x:2,y:0},{x:3,y:0},{x:4,y:0}]}])expect(validateLevel(level)).toBeNull();
    expect(()=>createGame({...base,width:0})).toThrow(RangeError);
  });
  it('clones accepted layouts and supports an already-complete no-fish opening',()=>{
    const input=fixture(),valid=validateLevel(input)!;valid.player.x=3;valid.fish[0].x=3;expect(input).toEqual(fixture());
    const won=createGame({...fixture(),goal:{x:0,y:4},fish:[]});expect(won.status).toBe('won');expect(solve(won)).toEqual([]);
  });
  it('returns the shortest slides without mutating the game',()=>{
    const game=createGame(fixture()),before=structuredClone(game);expect(solve(game)).toEqual(['e','n']);expect(game).toEqual(before);
    move(game,'e');expect(solve(game)).toEqual(['n']);
  });
  it('bounds search and terminates on an unreachable interior home',()=>{
    const game=createGame(fixture());for(const limit of [0,-1,1,NaN,1.5,50001])expect(solve(game,limit)).toBeNull();
    expect(solve(createGame({...fixture(),goal:{x:2,y:2},fish:[]}))).toBeNull();
  });
});

describe('Frosty Paths stable gardens',()=>{
  const minimum=[2,3,4,5,6,7,9,11];
  it('has eight unique stable valid IDs',()=>{expect(levels).toHaveLength(8);expect(new Set(levels.map(level=>level.id)).size).toBe(8);levels.forEach(level=>expect(validateLevel(level)).not.toBeNull());});
  it.each(levels.map((level,index)=>({level,index})))('solves $level.id at its verified minimum',({level,index})=>{
    const game=createGame(level),before=structuredClone(game),solution=solve(game)!;expect(solution).not.toBeNull();expect(solution).toHaveLength(minimum[index]);expect(game).toEqual(before);
    for(const dir of solution)expect(move(game,dir)).toBe(true);
    expect(game.status).toBe('won');expect(game.player).toEqual(level.goal);expect(game.collected).toHaveLength(level.fish.length);expect(solve(game)).toEqual([]);
    expect(undo(game)).toBe(true);expect(game.status).toBe('playing');expect(move(game,solution.at(-1)!)).toBe(true);expect(game.status).toBe('won');
  });
});
