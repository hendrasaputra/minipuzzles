import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';

import { createGame,move } from './engine';
import { CrateScene, swipeDirection } from './scene';

const { loadProp } = vi.hoisted(() => ({ loadProp: vi.fn<() => Promise<THREE.Group>>() }));
vi.mock('../../shared/polyfork-prop', () => ({ loadProp }));

const mockMotion=vi.hoisted(()=>({ tick: (_time:number)=>{} }));
vi.mock('../../shared/material-motion',()=>({MaterialMotion:class{
  constructor(update:(time:number)=>void){mockMotion.tick=update;}
  refresh(){}
  stop(){}
}}));
const {views}=vi.hoisted(()=>({views:[] as Array<{
  rotating:boolean; cancel:()=>void;
  handlers:Map<string,(event:Record<string,unknown>)=>void>;
  pick:ReturnType<typeof vi.fn>; ground:ReturnType<typeof vi.fn>;
  xAxis:{x:number;y:number};yAxis:{x:number;y:number};
  boxes:Array<{owner?:string;color:string;mesh:THREE.Object3D}>; effects:THREE.Group;
}>}));
vi.mock('../../shared/mini-scene',()=>({MiniScene:class{
  rotating=false;
  effects=new THREE.Group();
  handlers=new Map<string,(event:Record<string,unknown>)=>void>();
  pick=vi.fn(()=>undefined as string|undefined);
  ground=vi.fn(()=>null as {x:number;y:number}|null);
  xAxis={x:32,y:16};yAxis={x:-32,y:16};boxes:Array<{owner?:string;color:string;mesh:THREE.Object3D}>=[];
  canvas={setAttribute(){},addEventListener:(name:string,handler:(event:Record<string,unknown>)=>void)=>this.handlers.set(name,handler),setPointerCapture(){}};
  constructor(_host:HTMLElement,public cancel:()=>void){views.push(this);}
  project(x:number,y:number){return{x:240+x*this.xAxis.x+y*this.yAxis.x,y:90+x*this.xAxis.y+y*this.yAxis.y};}
  box(x0:number,y0:number,x1:number,y1:number,z0:number,z1:number,color:string,owner?:string){
    const mesh=new THREE.Object3D();
    mesh.position.set((x0+x1)/2,(z0+z1)/2,(y0+y1)/2);
    this.boxes.push({owner,color,mesh});
    return mesh;
  }
  clear(){this.boxes=[];}render(){}repaint(){}
  cancelInput(){this.cancel();}
}}));
beforeEach(()=>{
  views.length=0;
  loadProp.mockReset().mockImplementation(() => Promise.reject(new Error('Asset unavailable')));
  vi.stubGlobal('window',{addEventListener(){}});
});
afterEach(()=>vi.unstubAllGlobals());

describe('camera-relative crate swipes',()=>{
  it('follows both ground axes through a full orbit and different elevations',()=>{
    for(const angle of [0,.35,Math.PI/2,Math.PI,Math.PI*1.7])for(const tilt of [.2,.5,.9]){
      const xAxis={x:Math.cos(angle)*50,y:Math.sin(angle)*50*tilt};
      const yAxis={x:-Math.sin(angle)*50,y:Math.cos(angle)*50*tilt};
      const factor=3;
      for(const [axis,positive,negative] of [[xAxis,'e','w'],[yAxis,'s','n']] as const){
        expect(swipeDirection({x:axis.x*factor,y:axis.y*factor},xAxis,yAxis)).toBe(positive);
        expect(swipeDirection({x:-axis.x*factor,y:-axis.y*factor},xAxis,yAxis)).toBe(negative);
      }
    }
  });
  it('suppresses taps/jitter and degenerate projections',()=>{
    expect(swipeDirection({x:8,y:8})).toBeNull();
    expect(swipeDirection({x:50,y:50},{x:1,y:0},{x:2,y:0})).toBeNull();
  });
});
function fixture(){
  const direction=vi.fn(),scene=new CrateScene({} as HTMLElement,direction);
  const game=createGame({id:'fixture',title:'Fixture',width:6,height:6,walls:[{x:0,y:0}],goals:[{x:4,y:4}],crates:[{x:3,y:3}],player:{x:2,y:2}});
  scene.update(game);const view=views[0];
  const send=(name:string,id:number,point={x:200,y:200})=>view.handlers.get(name)!({button:0,pointerId:id,clientX:point.x,clientY:point.y,preventDefault(){}});
  return{direction,scene,game,view,send};
}
it('keeps the loaded sack off the playable grid when switching levels', async () => {
  const sack = new THREE.Group();
  loadProp.mockResolvedValueOnce(sack);
  const { scene, game, view } = fixture();
  await Promise.resolve();
  const stand = sack.parent!;
  expect(stand.parent).toBe(view.effects);
  expect(stand.position.x).toBeGreaterThan(game.level.width);
  scene.update(createGame({ ...game.level, width: 7, height: 7 }));
  expect(stand.position.x).toBeCloseTo(7.28);
  expect(stand.position.z).toBeCloseTo(6.38);
});
describe('3D crate play input',()=>{
  it('uses the picked elevated crate face as its exact tile, with no distant movement',()=>{
    const {direction,game,view,send}=fixture();view.pick.mockReturnValue('tile:3,2');
    send('pointerdown',1);send('pointerup',1);
    expect(direction).toHaveBeenCalledExactlyOnceWith('e');expect(game.player).toEqual({x:2,y:2});
    view.pick.mockReturnValue('tile:5,2');send('pointerdown',2);send('pointerup',2);
    expect(direction).toHaveBeenCalledTimes(1);
    expect(view.boxes.some(box=>box.owner==='tile:3,3')).toBe(true);
  });
  it('falls back to the camera ground ray for adjacent paths only',()=>{
    const {direction,view,send}=fixture();view.ground.mockReturnValue({x:2.5,y:3.5});
    send('pointerdown',1);send('pointerup',1);expect(direction).toHaveBeenCalledExactlyOnceWith('s');
    view.ground.mockReturnValue(null);send('pointerdown',2);send('pointerup',2);expect(direction).toHaveBeenCalledTimes(1);
  });
  it('keeps swipes camera-relative after rotation and emits only once per release',()=>{
    const {direction,view,send}=fixture();view.xAxis={x:-32,y:-16};view.yAxis={x:32,y:-16};
    send('pointerdown',1);send('pointerup',1,{x:136,y:168});send('pointerup',1,{x:136,y:168});
    expect(direction).toHaveBeenCalledExactlyOnceWith('e');
  });
  it('does not move in Rotate mode or after switching modes mid-gesture',()=>{
    const {direction,view,send}=fixture();view.rotating=true;
    send('pointerdown',1);send('pointerup',1,{x:264,y:232});expect(direction).not.toHaveBeenCalled();
    view.rotating=false;send('pointerdown',2);view.cancel();view.rotating=true;send('pointerup',2,{x:264,y:232});expect(direction).not.toHaveBeenCalled();
  });
  it('never moves after cancel, unrelated release, multi-touch or state replacement',()=>{
    const {direction,send,scene,game}=fixture(),end={x:264,y:232};
    send('pointerdown',1);send('pointerup',99,end);expect(direction).not.toHaveBeenCalled();
    send('pointercancel',1);send('pointerup',1,end);expect(direction).not.toHaveBeenCalled();
    send('pointerdown',2);send('pointerdown',3);send('pointerup',2,end);send('pointerup',3,end);expect(direction).not.toHaveBeenCalled();
    send('pointerdown',4);scene.update(game);send('pointerup',4,end);expect(direction).not.toHaveBeenCalled();
  });
  it('settles a pushed crate on its committed bed and clears planting feedback on redraw',()=>{
    const {scene,view}=fixture();
    const game=createGame({id:'push',title:'Push',width:5,height:5,walls:[],goals:[{x:3,y:2}],crates:[{x:2,y:2}],player:{x:1,y:2}});
    scene.update(game);
    expect(move(game,'e')).toBe(true);
    scene.update(game,'move');
    const crate=view.boxes.find(box=>box.color==='#9bae73')!.mesh;
    mockMotion.tick(1);
    expect(crate.position.x).toBeCloseTo(2.5);
    for(let i=1;i<=5;i++) mockMotion.tick(1+i*.06);
    expect(crate.position.x).toBeCloseTo(3.5);
    expect(view.effects.children[0].visible).toBe(true);
    scene.update(game);
    expect(view.effects.children[0].visible).toBe(false);
    expect(game.crates).toEqual([{x:3,y:2}]);
  });
  it('ignores puzzle movement after completion while leaving the camera available',()=>{
    const {direction,send,scene,game}=fixture();game.status='won';scene.update(game);
    send('pointerdown',1);send('pointerup',1,{x:264,y:232});expect(direction).not.toHaveBeenCalled();
  });
});
