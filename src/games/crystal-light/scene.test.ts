import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import * as THREE from 'three';
import type { Game } from './engine';
import { CrystalScene } from './scene';

const {views}=vi.hoisted(()=>({views:[] as Array<{
  rotating:boolean;cancel:()=>void;handlers:Map<string,(event:Record<string,unknown>)=>void>;pick:ReturnType<typeof vi.fn>;
  boxes:Array<{owner?:string}>;meshes:Array<{owner?:string;yaw:number;geometry:THREE.BufferGeometry;object:THREE.Mesh}>;
}>}));
vi.mock('./engine',()=>({trace:(game:Game)=>({segments:[{from:{x:0,y:2},to:{x:2,y:2}}],lit:game.mirrors[0].slash?[{x:2,y:0}]:[],loop:false})}));
vi.mock('../../shared/mini-scene',()=>({MiniScene:class{
  effects=new THREE.Group();
  rotating=false;handlers=new Map<string,(event:Record<string,unknown>)=>void>();pick=vi.fn(()=>undefined as string|undefined);
  boxes:Array<{owner?:string}>=[];meshes:Array<{owner?:string;yaw:number;geometry:THREE.BufferGeometry;object:THREE.Mesh}>=[];
  canvas={setAttribute(){},addEventListener:(name:string,handler:(event:Record<string,unknown>)=>void)=>this.handlers.set(name,handler),setPointerCapture(){}};
  constructor(_host:HTMLElement,public cancel:()=>void){views.push(this);}
  box(_x0:number,_y0:number,_x1:number,_y1:number,_z0:number,_z1:number,_color:string,owner?:string){this.boxes.push({owner});}
  mesh(geometry:THREE.BufferGeometry,material:THREE.Material,_x:number,_y:number,_z:number,owner?:string,yaw=0){const object=new THREE.Mesh(geometry,material);this.meshes.push({geometry,owner,yaw,object});return object;}
  clear(){this.boxes=[];this.meshes=[];}render(){}repaint(){}cancelInput(){this.cancel();}
}}));
const frames=new Map<number,FrameRequestCallback>(),listeners=new Map<string,()=>void>();
let frameId=0;
const motion={matches:false,addEventListener(_event:string,callback:()=>void){listeners.set('motion',callback);}};
beforeEach(()=>{
  views.length=0;frames.clear();listeners.clear();frameId=0;motion.matches=false;
  vi.stubGlobal('window',{addEventListener(event:string,callback:()=>void){listeners.set(event,callback);},matchMedia(){return motion;}});
  vi.stubGlobal('document',{hidden:false,addEventListener(event:string,callback:()=>void){listeners.set(event,callback);}});
  vi.stubGlobal('requestAnimationFrame',(callback:FrameRequestCallback)=>{frames.set(++frameId,callback);return frameId;});
  vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
});
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
  const select=vi.fn(),rotate=vi.fn(),scene=new CrystalScene({} as HTMLElement,select,rotate);
  const mirrors=[{id:'mirror-1',x:2,y:2,slash:false}];
  const game:Game={level:{id:'fixture',title:'Fixture',width:5,height:5,source:{x:0,y:2,dir:'e'},mirrors,crystals:[{x:2,y:0}],walls:[]},mirrors:mirrors.map(m=>({...m})),history:[],moves:0,status:'playing'};
  scene.update(game,'mirror-1');const view=views[0];
  const send=(name:string,id=1,point={x:200,y:200})=>view.handlers.get(name)!({pointerId:id,clientX:point.x,clientY:point.y,button:0,preventDefault(){}});
  return{select,rotate,scene,game,view,send};
}
describe('Crystal Light 3D mirror input',()=>{
  it('selects and turns one picked mirror exactly once on a clean release',()=>{
    const {select,rotate,view,send,game}=fixture();view.pick.mockReturnValue('mirror-1');
    send('pointerdown');expect(rotate).not.toHaveBeenCalled();send('pointerup');send('pointerup');
    expect(select).toHaveBeenCalledExactlyOnceWith('mirror-1');expect(rotate).toHaveBeenCalledExactlyOnceWith('mirror-1');expect(game.history).toEqual([]);
  });
  it('ignores decorative targets and a release on another surface',()=>{
    const {select,rotate,view,send}=fixture();view.pick.mockReturnValue(undefined);send('pointerdown');send('pointerup');
    view.pick.mockReturnValue('mirror-1');send('pointerdown');view.pick.mockReturnValue('crystal');send('pointerup');
    expect(select).not.toHaveBeenCalled();expect(rotate).not.toHaveBeenCalled();
  });
  it('never turns on a drag, including a drag returning to its start',()=>{
    const {rotate,view,send}=fixture();view.pick.mockReturnValue('mirror-1');
    send('pointerdown');send('pointermove',1,{x:230,y:210});send('pointermove',1,{x:200,y:200});send('pointerup');
    send('pointerdown',2);send('pointerup',2,{x:220,y:220});expect(rotate).not.toHaveBeenCalled();
  });
  it('cancels pending taps for multi-touch, explicit cancel, camera changes and game replacement',()=>{
    const {rotate,view,send,scene,game}=fixture();view.pick.mockReturnValue('mirror-1');
    send('pointerdown',1);send('pointerdown',2);send('pointerup',1);send('pointerup',2);
    send('pointerdown',3);send('pointercancel',3);send('pointerup',3);
    send('pointerdown',4);view.cancel();send('pointerup',4);
    send('pointerdown',5);scene.update(game,'mirror-1');send('pointerup',5);expect(rotate).not.toHaveBeenCalled();
  });
  it('ignores unrelated releases, Rotate mode and completed puzzles',()=>{
    const {rotate,view,send,scene,game}=fixture();view.pick.mockReturnValue('mirror-1');
    send('pointerdown',1);send('pointerup',99);expect(rotate).not.toHaveBeenCalled();send('pointerup',1);expect(rotate).toHaveBeenCalledTimes(1);rotate.mockClear();
    view.rotating=true;send('pointerdown',2);send('pointerup',2);view.rotating=false;
    game.status='won';scene.update(game,'mirror-1');send('pointerdown',3);send('pointerup',3);expect(rotate).not.toHaveBeenCalled();
  });
  it('allows selection callbacks to redraw safely before the turn callback',()=>{
    const {select,rotate,view,send,scene,game}=fixture();view.pick.mockReturnValue('mirror-1');select.mockImplementation(id=>scene.update(game,id));
    send('pointerdown');send('pointerup');expect(rotate).toHaveBeenCalledExactlyOnceWith('mirror-1');
  });
  it('moves decorative particles while preserving puzzle state and using one frame loop',()=>{
    const {view,game,scene}=fixture(),spark=view.meshes.find(mesh=>!mesh.owner&&mesh.geometry.type==='OctahedronGeometry')!.object;
    const before=spark.position.clone(),snapshot=JSON.stringify(game);
    const [id,callback]=[...frames][0];frames.delete(id);callback(12345);
    expect(spark.position.equals(before)).toBe(false);expect(JSON.stringify(game)).toBe(snapshot);expect(frames.size).toBe(1);
    scene.update(game,'mirror-1');expect(frames.size).toBe(1);
  });
  it('stops frames when hidden, suspended or reduced motion is requested, then resumes',()=>{
    fixture();expect(frames.size).toBe(1);
    (document as unknown as{hidden:boolean}).hidden=true;listeners.get('visibilitychange')!();expect(frames.size).toBe(0);
    (document as unknown as{hidden:boolean}).hidden=false;listeners.get('visibilitychange')!();expect(frames.size).toBe(1);
    motion.matches=true;listeners.get('motion')!();expect(frames.size).toBe(0);
    motion.matches=false;listeners.get('motion')!();expect(frames.size).toBe(1);
    listeners.get('pagehide')!();expect(frames.size).toBe(0);listeners.get('pageshow')!();expect(frames.size).toBe(1);
  });
  it('builds actual diagonal framed mirrors and faceted crystals, keeping beams decorative',()=>{
    const {view,scene,game}=fixture();
    expect(view.meshes.filter(mesh=>mesh.owner==='mirror-1')).toHaveLength(2);
    expect(view.meshes.find(mesh=>mesh.owner==='mirror-1')!.yaw).toBeCloseTo(-Math.PI/4);
    expect(view.meshes.some(mesh=>mesh.geometry.type==='OctahedronGeometry'&&mesh.owner==='crystal:2,0')).toBe(true);
    expect(view.meshes.some(mesh=>!mesh.owner&&mesh.geometry.type==='OctahedronGeometry')).toBe(true);
    game.mirrors[0].slash=true;scene.update(game,'mirror-1');expect(view.meshes.find(mesh=>mesh.owner==='mirror-1')!.yaw).toBeCloseTo(Math.PI/4);
  });
});
