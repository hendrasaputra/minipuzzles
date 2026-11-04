import { describe,it,expect } from 'vitest';
import { createGame,rotate,undo,solve,flow,pipePorts,validateLevel,type Level,type Pipe } from './engine';
import { levels } from './levels';
const fixture=():Level=>({id:'fixture',title:'Fixture',width:5,height:5,source:{x:0,y:2,dir:'e'},pipes:[{id:'a',x:1,y:2,kind:'straight',turn:0}],flowers:[{x:2,y:2}],rocks:[]});
describe('Water Garden channel ports',()=>{
  it.each([
    ['straight',0,['n','s']],['straight',1,['e','w']],['straight',2,['s','n']],['straight',3,['w','e']],
    ['elbow',0,['n','e']],['elbow',1,['e','s']],['elbow',2,['s','w']],['elbow',3,['w','n']],
    ['tee',0,['n','e','w']],['tee',1,['e','s','n']],['tee',2,['s','w','e']],['tee',3,['w','n','s']],
  ] as [Pipe['kind'],number,string[]][])('rotates %s clockwise to turn%s',(kind,turn,ports)=>expect(pipePorts({id:'a',x:1,y:2,kind,turn})).toEqual(ports));
});
describe('Water Garden connectivity',()=>{
  it('requires reciprocal channel ports and stops without filling dry channels',()=>{
    const game=createGame(fixture());expect(flow(game)).toEqual({wet:[{x:0,y:2}],watered:[],segments:[]});
    rotate(game,'a');expect(flow(game)).toEqual({wet:[{x:0,y:2},{x:1,y:2}],watered:[{x:2,y:2}],segments:[{from:{x:0,y:2},to:{x:1,y:2}},{from:{x:1,y:2},to:{x:2,y:2}}]});
  });
  it('splits through tees and counts flowers once without passing water through them',()=>{
    const game=createGame({...fixture(),pipes:[{id:'a',x:1,y:2,kind:'tee',turn:0},{id:'b',x:3,y:2,kind:'straight',turn:1}],flowers:[{x:1,y:1},{x:2,y:2}]});
    const result=flow(game);expect(result.watered).toEqual([{x:1,y:1},{x:2,y:2}]);expect(result.wet).not.toContainEqual({x:3,y:2});expect(game.status).toBe('won');
  });
  it('floods cycles finitely and records each connection only once',()=>{
    const game=createGame({...fixture(),source:{x:0,y:1,dir:'e'},pipes:[{id:'a',x:1,y:1,kind:'tee',turn:2},{id:'b',x:2,y:1,kind:'elbow',turn:2},{id:'c',x:2,y:2,kind:'elbow',turn:3},{id:'d',x:1,y:2,kind:'elbow',turn:0}],flowers:[{x:4,y:4}]});
    const result=flow(game);expect(result.wet).toHaveLength(5);expect(result.segments).toHaveLength(5);expect(result.watered).toEqual([]);
  });
  it('does not cross a rock, empty ground or board edge',()=>{
    const game=createGame({...fixture(),pipes:[{id:'a',x:1,y:2,kind:'tee',turn:0}],flowers:[{x:4,y:4}],rocks:[{x:2,y:2}]});
    expect(flow(game).wet).toHaveLength(2);expect(flow(game).watered).toEqual([]);expect(flow(game).segments).toHaveLength(1);
  });
});
describe('Water Garden actions and hints',()=>{
  it('wins, prevents later turns and undoes the win without changing original layouts',()=>{
    const level=fixture(),game=createGame(level),before=structuredClone(game);
    expect(rotate(game,'missing')).toBe(false);expect(game).toEqual(before);expect(rotate(game,'a')).toBe(true);expect(game.status).toBe('won');expect(game.history).toEqual(['a']);expect(game.moves).toBe(1);expect(rotate(game,'a')).toBe(false);
    expect(undo(game)).toBe(true);expect(game).toEqual(before);expect(undo(game)).toBe(false);expect(level.pipes[0].turn).toBe(0);
  });
  it('handles four physical clockwise turns and restores their exact prior orientation',()=>{
    const game=createGame({...fixture(),flowers:[{x:4,y:4}]});for(let i=0;i<4;i++)rotate(game,'a');expect(game.pipes[0].turn).toBe(0);expect(game.moves).toBe(4);
    undo(game);expect(game.pipes[0].turn).toBe(3);undo(game);expect(game.pipes[0].turn).toBe(2);
  });
  it('finds minimum clockwise turns without mutation and respects solver bounds',()=>{
    const game=createGame(levels[1]),before=structuredClone(game);expect(solve(game)).toHaveLength(2);expect(game).toEqual(before);
    expect(solve(game,1)).toBeNull();expect(solve(game,NaN)).toBeNull();expect(solve(game,50001)).toBeNull();for(const id of solve(game)!)rotate(game,id);expect(solve(game)).toEqual([]);
    expect(solve(createGame({...fixture(),flowers:[{x:4,y:4}]}))).toBeNull();
  });
  it('rejects invalid positions, ports, IDs, overlaps and unsafe level sizes',()=>{
    const level=fixture();for(const bad of [null,{}, {...level,width:9},{...level,height:2},{...level,source:{...level.source,dir:'up'}},{...level,pipes:[{...level.pipes[0],kind:'cross'}]},{...level,pipes:[{...level.pipes[0],turn:-1}]},{...level,pipes:[{...level.pipes[0],turn:4}]},{...level,pipes:[{...level.pipes[0],turn:.5}]},{...level,pipes:[level.pipes[0],{...level.pipes[0],x:3}]},{...level,flowers:[]},{...level,flowers:[{x:1,y:2}]},{...level,rocks:[{x:0,y:2}]},{...level,rocks:[{x:3.1,y:1}]}])expect(validateLevel(bad)).toBeNull();
    expect(()=>createGame({...level,pipes:[]})).toThrow();const game=createGame(level);game.level.rocks.push({x:4,y:4});expect(level.rocks).toEqual([]);
  });
});
describe('curated Water Garden levels',()=>{
  it('keeps stable IDs and increasingly involved verified openings',()=>{
    expect(levels.map(level=>level.id)).toEqual(Array.from({length:8},(_,i)=>`water-${i+1}`));
    expect(levels.map(level=>{const game=createGame(level);expect(game.status).toBe('playing');return solve(game)!.length;})).toEqual([1,2,3,3,4,5,6,7]);
  });
  it.each(levels)('$id replays hints, undoes a win and wins again',level=>{
    const game=createGame(level),solution=solve(game);expect(solution).not.toBeNull();for(const id of solution!)expect(rotate(game,id)).toBe(true);
    expect(game.status).toBe('won');expect(flow(game).watered).toHaveLength(level.flowers.length);const last=solution!.at(-1)!;
    expect(undo(game)).toBe(true);expect(game.status).toBe('playing');expect(rotate(game,last)).toBe(true);expect(game.status).toBe('won');
  });
});
