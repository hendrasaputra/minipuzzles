import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import * as THREE from 'three';
import type { Game } from './engine';
import { WaterScene } from './scene';

const {motions,views}=vi.hoisted(()=>({motions:[] as Array<{update:(seconds:number)=>void;paint:()=>void;refresh:ReturnType<typeof vi.fn>}>,views:[] as Array<{
  rotating:boolean;cancel:()=>void;handlers:Map<string,(event:Record<string,unknown>)=>void>;pick:ReturnType<typeof vi.fn>;
  boxes:Array<{owner?:string;color:string;x0:number;y0:number;x1:number;y1:number;z0:number;z1:number}>;
  meshes:Array<{owner?:string;color:string;geometry:THREE.BufferGeometry;object:THREE.Mesh}>;
}>}));
vi.mock('./engine',()=>({
  flow:(game:Game)=>({wet:game.pipes[0].turn===1?[{x:2,y:2}]:[],watered:game.pipes[0].turn===1?[{x:3,y:2}]:[],segments:game.pipes[0].turn===1?[{from:{x:1,y:2},to:{x:2,y:2}}]:[]}),
  pipePorts:(pipe:{turn:number})=>pipe.turn===0?['n','e']:['e','s'],
}));
vi.mock('../../shared/mini-scene',()=>({MiniScene:class{
  rotating=false;handlers=new Map<string,(event:Record<string,unknown>)=>void>();pick=vi.fn(()=>undefined as string|undefined);
  boxes:Array<{owner?:string;color:string;x0:number;y0:number;x1:number;y1:number;z0:number;z1:number}>=[];
  meshes:Array<{owner?:string;color:string;geometry:THREE.BufferGeometry;object:THREE.Mesh}>=[];
  canvas={setAttribute(){},addEventListener:(name:string,handler:(event:Record<string,unknown>)=>void)=>this.handlers.set(name,handler),setPointerCapture(){}};
  constructor(_host:HTMLElement,public cancel:()=>void){views.push(this);}
  box(x0:number,y0:number,x1:number,y1:number,z0:number,z1:number,color:string,owner?:string){this.boxes.push({x0,y0,x1,y1,z0,z1,color,owner});}
  mesh(geometry:THREE.BufferGeometry,material:THREE.MeshLambertMaterial,_x:number,_y:number,_z:number,owner?:string){const object=new THREE.Mesh(geometry,material);this.meshes.push({geometry,owner,color:`#${material.color.getHexString()}`,object});return object;}
  clear(){this.boxes=[];this.meshes=[];}render(){}repaint(){}cancelInput(){this.cancel();}
}}));
vi.mock('../../shared/material-motion',()=>({MaterialMotion:class{
  refresh=vi.fn(()=>{this.update(0);this.paint();});
  constructor(public update:(seconds:number)=>void,public paint:()=>void){motions.push(this);}
}}));
beforeEach(()=>{views.length=0;motions.length=0;vi.stubGlobal('window',{addEventListener(){}});});
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
  const select=vi.fn(),rotate=vi.fn(),scene=new WaterScene({} as HTMLElement,select,rotate);
  const pipes=[{id:'pipe-1',x:2,y:2,kind:'elbow' as const,turn:0}];
  const game:Game={level:{id:'fixture',title:'Fixture',width:5,height:5,source:{x:1,y:2,dir:'e'},pipes,flowers:[{x:3,y:2}],rocks:[{x:0,y:0}]},pipes:pipes.map(pipe=>({...pipe})),history:[],moves:0,status:'playing'};
  scene.update(game,'pipe-1');const view=views[0];
  const send=(name:string,id=1,point={x:200,y:200})=>view.handlers.get(name)!({pointerId:id,clientX:point.x,clientY:point.y,button:0,preventDefault(){}});
  return{select,rotate,scene,game,view,send};
}
describe('Water Garden channel picking',()=>{
  it('selects and rotates once only on a clean matching release',()=>{
    const {view,send,select,rotate,game}=fixture();view.pick.mockReturnValue('pipe-1');
    send('pointerdown');expect(rotate).not.toHaveBeenCalled();send('pointerup');send('pointerup');
    expect(select).toHaveBeenCalledExactlyOnceWith('pipe-1');expect(rotate).toHaveBeenCalledExactlyOnceWith('pipe-1');expect(game.history).toEqual([]);
  });
  it('ignores source/flower/background hits and release on a different object',()=>{
    const {view,send,rotate}=fixture();
    for(const id of [undefined,'spring','flower:3,2','rock:0,0']){view.pick.mockReturnValue(id);send('pointerdown');send('pointerup');}
    view.pick.mockReturnValue('pipe-1');send('pointerdown');view.pick.mockReturnValue('flower:3,2');send('pointerup');expect(rotate).not.toHaveBeenCalled();
  });
  it('suppresses a drag even when the pointer returns to its starting tile',()=>{
    const {view,send,rotate}=fixture();view.pick.mockReturnValue('pipe-1');
    send('pointerdown');send('pointermove',1,{x:230,y:205});send('pointermove');send('pointerup');
    send('pointerdown',2);send('pointerup',2,{x:220,y:200});expect(rotate).not.toHaveBeenCalled();
  });
  it('cancels for a second touch, cancellation, camera change and game replacement',()=>{
    const {view,send,rotate,scene,game}=fixture();view.pick.mockReturnValue('pipe-1');
    send('pointerdown',1);send('pointerdown',2);send('pointerup',1);send('pointerup',2);
    send('pointerdown',3);send('pointercancel',3);send('pointerup',3);
    send('pointerdown',4);view.cancel();send('pointerup',4);
    send('pointerdown',5);scene.update(game,'pipe-1');send('pointerup',5);expect(rotate).not.toHaveBeenCalled();
  });
  it('ignores Rotate mode, unrelated releases and completed gardens',()=>{
    const {view,send,rotate,scene,game}=fixture();view.pick.mockReturnValue('pipe-1');
    send('pointerdown');send('pointerup',99);expect(rotate).not.toHaveBeenCalled();send('pointerup');expect(rotate).toHaveBeenCalledTimes(1);rotate.mockClear();
    view.rotating=true;send('pointerdown',2);send('pointerup',2);view.rotating=false;
    game.status='won';scene.update(game,'pipe-1');send('pointerdown',3);send('pointerup',3);expect(rotate).not.toHaveBeenCalled();
  });
  it('allows the selection callback to redraw before rotating',()=>{
    const {view,send,select,rotate,scene,game}=fixture();view.pick.mockReturnValue('pipe-1');select.mockImplementation(id=>scene.update(game,id));
    send('pointerdown');send('pointerup');expect(rotate).toHaveBeenCalledExactlyOnceWith('pipe-1');
  });
  it('refreshes one material motion controller and changes only decorative water during frames',()=>{
    const {view,scene,game}=fixture();expect(motions).toHaveLength(1);expect(motions[0].refresh).toHaveBeenCalledOnce();
    const bubble=view.meshes.find(mesh=>!mesh.owner&&mesh.geometry.type==='SphereGeometry')!.object,before=bubble.position.clone(),snapshot=JSON.stringify(game);
    motions[0].update(.4);expect(bubble.position.equals(before)).toBe(false);expect(JSON.stringify(game)).toBe(snapshot);
    game.pipes[0].turn=1;scene.update(game,'pipe-1');expect(motions).toHaveLength(1);expect(motions[0].refresh).toHaveBeenCalledTimes(2);
    const wetFoam=view.meshes.find(mesh=>!mesh.owner&&mesh.geometry.type==='SphereGeometry')!.object,wetBefore=wetFoam.position.clone();
    motions[0].update(.6);expect(wetFoam.position.equals(wetBefore)).toBe(false);
    expect(view.meshes.filter(mesh=>mesh.color==='#65c4d1'||mesh.geometry.type==='TorusGeometry').every(mesh=>mesh.owner===undefined)).toBe(true);
  });
  it('carves channels from ports and changes water/flower appearance from actual flow',()=>{
    const {view,scene,game}=fixture();
    const caps=()=>view.boxes.filter(box=>box.owner==='pipe-1'&&box.z1===.28);
    expect(caps()).toHaveLength(6);
    expect(caps().some(box=>box.x0===2.36&&box.y0===2.055)).toBe(false);
    expect(view.boxes.some(box=>box.owner==='pipe-1'&&box.color==='#72bfc6')).toBe(false);
    expect(view.meshes.some(mesh=>mesh.owner==='flower:3,2'&&mesh.color==='#c8b1bb')).toBe(true);
    game.pipes[0].turn=1;scene.update(game,'pipe-1');
    expect(caps().some(box=>box.x0===2.36&&box.y0===2.055)).toBe(true);
    expect(view.boxes.filter(box=>box.owner==='pipe-1'&&box.color==='#72bfc6')).toHaveLength(3);
    expect(view.meshes.some(mesh=>mesh.owner==='flower:3,2'&&mesh.color==='#e7a8bd')).toBe(true);
    expect(view.meshes.some(mesh=>!mesh.owner&&mesh.color==='#65c4d1')).toBe(true);
  });
});
