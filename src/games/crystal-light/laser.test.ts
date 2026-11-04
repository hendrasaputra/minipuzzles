import { describe,it,expect } from 'vitest';
import { beamArrival, beamPoint } from './laser';
const route=[{from:{x:0,y:2},to:{x:2,y:2}},{from:{x:2,y:2},to:{x:2,y:0}}];
describe('laser particle route',()=>{
  it('flows around mirror corners and wraps to the source',()=>{
    expect(beamPoint(route,1)).toEqual({x:1.5,y:2.5,dx:1,dy:0});
    expect(beamPoint(route,2)).toEqual({x:2.5,y:2.5,dx:0,dy:-1});
    expect(beamPoint(route,3)).toEqual({x:2.5,y:1.5,dx:0,dy:-1});
    expect(beamPoint(route,4)).toEqual(beamPoint(route,0));expect(beamPoint(route,-1)).toEqual(beamPoint(route,3));
  });
  it('moves the one-shot pulse through the mirror and ends it at the last point', () => {
    expect(beamPoint(route,3,false)).toEqual({x:2.5,y:1.5,dx:0,dy:-1});
    expect(beamPoint(route,4,false)).toBeNull();
    expect(beamArrival(route,{x:2,y:0})).toBe(4);
    expect(beamArrival(route,{x:2,y:-1})).toBe(Infinity);
  });
  it('never interpolates beyond a blocker or across a reflected corner',()=>{
    const wall=[{from:{x:1,y:1},to:{x:1.5,y:1}}];
    for(let t=0;t<20;t+=.07){const p=beamPoint(wall,t)!;expect(p.x).toBeGreaterThanOrEqual(1.5);expect(p.x).toBeLessThan(2);expect(p.y).toBe(1.5);}
    expect(beamPoint([],1)).toBeNull();expect(beamPoint([{from:{x:0,y:0},to:{x:0,y:0}}],1)).toBeNull();
  });
});
