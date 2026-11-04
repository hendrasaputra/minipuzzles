import { describe,expect,it } from 'vitest';
import { createGame,rotate,undo,trace,solve,validateLevel,type Direction,type Level } from './engine';
import { levels } from './levels';

const base=():Level=>({id:'fixture',title:'Fixture',width:5,height:5,source:{x:0,y:2,dir:'e'},mirrors:[{id:'a',x:2,y:2,slash:false}],crystals:[{x:2,y:0}],walls:[]});
const delta:Record<Direction,{x:number;y:number}>={n:{x:0,y:-1},e:{x:1,y:0},s:{x:0,y:1},w:{x:-1,y:0}};
describe('Crystal Light tracing',()=>{
  it.each([
    ['n',true,'e'],['e',true,'n'],['s',true,'w'],['w',true,'s'],
    ['n',false,'w'],['w',false,'n'],['s',false,'e'],['e',false,'s'],
  ] as [Direction,boolean,Direction][])('reflects incoming %s with slash=%s toward %s',(incoming,slash,outgoing)=>{
    const inDelta=delta[incoming],outDelta=delta[outgoing];
    const game=createGame({...base(),source:{x:2-inDelta.x,y:2-inDelta.y,dir:incoming},mirrors:[{id:'a',x:2,y:2,slash}],crystals:[{x:2+outDelta.x,y:2+outDelta.y}]});
    expect(trace(game).lit).toEqual(game.level.crystals);expect(game.status).toBe('won');
  });
  it('passes through multiple crystals and stops precisely at the board edge',()=>{
    const game=createGame({...base(),crystals:[{x:1,y:2},{x:3,y:2}],mirrors:[{id:'a',x:0,y:0,slash:true}]});
    const beam=trace(game);expect(beam.lit).toEqual(game.level.crystals);expect(beam.segments.at(-1)?.to).toEqual({x:4.5,y:2});expect(beam.loop).toBe(false);
  });
  it('stops before a wall without lighting a hidden crystal',()=>{
    const game=createGame({...base(),mirrors:[{id:'a',x:0,y:0,slash:true}],crystals:[{x:4,y:2}],walls:[{x:2,y:2}]});
    const beam=trace(game);expect(beam.lit).toEqual([]);expect(beam.segments.at(-1)?.to).toEqual({x:1.5,y:2});expect(game.status).toBe('playing');
  });
  it('detects repeated cell/direction states and counts loop crystals only once',()=>{
    const level:Level={...base(),source:{x:1,y:1,dir:'e'},mirrors:[{id:'a',x:3,y:1,slash:false},{id:'b',x:3,y:3,slash:true},{id:'c',x:0,y:3,slash:false},{id:'d',x:0,y:1,slash:true}],crystals:[{x:2,y:1},{x:1,y:2}]};
    const game=createGame(level),beam=trace(game);expect(beam.loop).toBe(true);expect(beam.lit).toEqual([{x:2,y:1}]);expect(beam.segments.length).toBeLessThanOrEqual(level.width*level.height*4);
    const complete=createGame({...level,crystals:[{x:2,y:1}]});expect(complete.status).toBe('won');expect(trace(complete).loop).toBe(true);
  });
});
describe('Crystal Light actions and hints',()=>{
  it('rotates one mirror, wins, prevents further moves and undoes the win exactly',()=>{
    const game=createGame(base()),opening=structuredClone(game);
    expect(rotate(game,'missing')).toBe(false);expect(game).toEqual(opening);
    expect(rotate(game,'a')).toBe(true);expect(game.status).toBe('won');expect(game.moves).toBe(1);expect(game.history).toEqual(['a']);
    expect(rotate(game,'a')).toBe(false);expect(game.moves).toBe(1);
    expect(undo(game)).toBe(true);expect(game).toEqual(opening);expect(undo(game)).toBe(false);
    expect(base().mirrors[0].slash).toBe(false);
  });
  it('finds a shortest hint sequence without mutating game, and honors its state budget',()=>{
    const game=createGame(levels[1]),before=structuredClone(game);
    expect(solve(game)).toHaveLength(2);expect(game).toEqual(before);expect(solve(game,1)).toBeNull();expect(solve(game,NaN)).toBeNull();expect(solve(game,4097)).toBeNull();
    for(const id of solve(game)!)rotate(game,id);expect(solve(game)).toEqual([]);
  });
  it('returns null for a genuinely unreachable crystal instead of looping',()=>{
    const game=createGame({...base(),crystals:[{x:4,y:4}]});expect(solve(game)).toBeNull();
  });
  it('rejects malformed and overlapping level definitions and clones valid inputs',()=>{
    const level=base();
    for(const bad of [null,{}, {...level,width:9},{...level,height:0},{...level,source:{...level.source,dir:'up'}},{...level,mirrors:[{...level.mirrors[0],slash:1}]},{...level,mirrors:[level.mirrors[0],{...level.mirrors[0],x:3}]},{...level,crystals:[]},{...level,crystals:[{x:2.1,y:0}]},{...level,walls:[{x:2,y:2}]},{...level,mirrors:Array.from({length:13},(_,i)=>({id:`a${i}`,x:i%5,y:Math.floor(i/5),slash:true}))}])expect(validateLevel(bad)).toBeNull();
    expect(()=>createGame({...level,mirrors:[]})).toThrow();const game=createGame(level);game.mirrors[0].slash=true;expect(level.mirrors[0].slash).toBe(false);game.level.walls.push({x:4,y:4});expect(level.walls).toEqual([]);
  });
});
describe('curated crystal gardens',()=>{
  it('has stable unique IDs, increasingly involved shortest solutions, and no solved openings',()=>{
    expect(new Set(levels.map(l=>l.id)).size).toBe(8);
    const lengths=levels.map(level=>{const game=createGame(level);expect(game.status).toBe('playing');expect(validateLevel(level)).not.toBeNull();return solve(game)!.length;});
    expect(lengths).toEqual([1,2,2,3,3,4,5,5]);
  });
  it.each(levels)('$id can replay its hint solution, undo the last flip and win again',level=>{
    const game=createGame(level),solution=solve(game)!;
    expect(solution).not.toBeNull();for(const id of solution)expect(rotate(game,id)).toBe(true);
    expect(game.status).toBe('won');expect(trace(game).lit).toHaveLength(level.crystals.length);expect(game.moves).toBe(solution.length);
    expect(undo(game)).toBe(true);expect(game.status).toBe('playing');expect(rotate(game,solution.at(-1)!)).toBe(true);expect(game.status).toBe('won');
  });
});
