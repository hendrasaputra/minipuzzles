import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import * as THREE from 'three';
import { createGame } from './engine';
import { FrostScene,swipeDirection } from './scene';

const {views,motions}=vi.hoisted(()=>({views:[] as Array<{
  rotating:boolean;cancel:()=>void;handlers:Map<string,(event:any)=>void>;pick:ReturnType<typeof vi.fn>;ground:ReturnType<typeof vi.fn>;
  xAxis:{x:number;y:number};yAxis:{x:number;y:number};meshes:THREE.Mesh[];boxes:string[];
}>,motions:[] as Array<{update:(time:number)=>void;refresh:ReturnType<typeof vi.fn>}>}));
vi.mock('../../shared/material-motion',()=>({MaterialMotion:class{
  refresh=vi.fn(()=>this.update(0));constructor(public update:(time:number)=>void){motions.push(this);}
}}));
vi.mock('../../shared/mini-scene',()=>({MiniScene:class{
  effects=new THREE.Group();
  rotating=false;handlers=new Map<string,(event:any)=>void>();pick=vi.fn(()=>undefined as string|undefined);ground=vi.fn(()=>null as {x:number;y:number}|null);
  xAxis={x:32,y:16};yAxis={x:-32,y:16};meshes:THREE.Mesh[]=[];boxes:string[]=[];
  canvas={setAttribute(){},addEventListener:(name:string,handler:(event:any)=>void)=>this.handlers.set(name,handler),setPointerCapture(){}};
  constructor(_host:HTMLElement,public cancel:()=>void){views.push(this);}
  box(_x0:number,_y0:number,_x1:number,_y1:number,_z0:number,_z1:number,_color:string,owner?:string){this.boxes.push(owner??'');}
  mesh(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,owner?:string){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,z,y);mesh.userData.owner=owner;this.meshes.push(mesh);return mesh;}
  project(x:number,y:number){return{x:240+x*this.xAxis.x+y*this.yAxis.x,y:90+x*this.xAxis.y+y*this.yAxis.y};}
  direction(){return'→';}cancelInput(){this.cancel();}clear(){this.meshes=[];this.boxes=[];}render(){}repaint(){}
}}));
beforeEach(()=>{views.length=0;motions.length=0;vi.stubGlobal('window',{addEventListener(){}});});
afterEach(()=>vi.unstubAllGlobals());
function fixture(){
  const direction=vi.fn(),scene=new FrostScene({} as HTMLElement,direction);
  const game=createGame({id:'fixture',title:'Fixture',width:5,height:5,player:{x:2,y:2},goal:{x:4,y:4},fish:[{x:3,y:2}],rocks:[{x:0,y:0}]});scene.update(game);const view=views[0];
  const send=(name:string,id=1,x=200,y=200)=>view.handlers.get(name)!({pointerId:id,button:0,clientX:x,clientY:y,preventDefault(){}});
  return{direction,scene,game,view,send};
}
describe('Frosty Paths camera-relative input',()=>{
  it('resolves swipes through a full orbit and ignores jitter/degenerate axes',()=>{
    for(let angle=0;angle<Math.PI*2;angle+=Math.PI/4){
      const x={x:Math.cos(angle)*50,y:Math.sin(angle)*25},y={x:-Math.sin(angle)*50,y:Math.cos(angle)*25};
      expect(swipeDirection({x:x.x*2,y:x.y*2},x,y)).toBe('e');expect(swipeDirection({x:-y.x*2,y:-y.y*2},x,y)).toBe('n');
    }
    expect(swipeDirection({x:8,y:8},{x:32,y:16},{x:-32,y:16})).toBeNull();expect(swipeDirection({x:40,y:40},{x:1,y:0},{x:2,y:0})).toBeNull();
  });
  it('requests one slide for adjacent tile taps or rotated swipes without mutating the game',()=>{
    const {direction,game,view,send}=fixture();view.pick.mockReturnValue('tile:3,2');send('pointerdown');send('pointerup');
    expect(direction).toHaveBeenLastCalledWith('e');view.pick.mockReturnValue('tile:4,4');send('pointerdown');send('pointerup');expect(direction).toHaveBeenCalledTimes(1);
    view.xAxis={x:-40,y:20};view.yAxis={x:-40,y:-20};send('pointerdown',2);send('pointerup',2,120,160);expect(direction).toHaveBeenLastCalledWith('s');expect(game.moves).toBe(0);
  });
  it('cancels on multiple pointers, camera changes, cancellation and state replacement',()=>{
    const {direction,view,send,scene,game}=fixture();
    send('pointerdown',1);send('pointerdown',2);send('pointerup',1,260,230);send('pointerup',2,260,230);
    send('pointerdown',3);send('pointercancel',3);send('pointerup',3,260,230);
    send('pointerdown',4);view.cancel();send('pointerup',4,260,230);
    send('pointerdown',5);scene.update(game);send('pointerup',5,260,230);expect(direction).not.toHaveBeenCalled();
  });
  it('ignores Rotate mode, unrelated releases and completed games',()=>{
    const {direction,view,send,scene,game}=fixture();view.rotating=true;send('pointerdown');send('pointerup',1,260,230);view.rotating=false;
    send('pointerdown',2);send('pointerup',99,260,230);expect(direction).not.toHaveBeenCalled();scene.cancelInput();
    game.status='won';scene.update(game);send('pointerdown',3);send('pointerup',3,260,230);expect(direction).not.toHaveBeenCalled();
  });
  it('shows remaining fish, snow-capped rocks and a penguin without effect state mutation',()=>{
    const {game,scene,view}=fixture();const snapshot=JSON.stringify(game);
    expect(view.boxes).toContain('tile:0,0');expect(view.meshes.some(mesh=>mesh.userData.owner==='tile:3,2')).toBe(true);
    motions[0].update(12);expect(JSON.stringify(game)).toBe(snapshot);
    game.collected=[{x:3,y:2}];scene.update(game);expect(view.meshes.some(mesh=>mesh.userData.owner==='tile:3,2')).toBe(false);expect(motions).toHaveLength(1);
  });
  it('slides the visual penguin along its axis and snaps under reduced motion',()=>{
    const {game,scene,view}=fixture();motions[0].refresh.mockImplementation(()=>{});
    const started=performance.now()/1000;game.player={x:4,y:2};scene.update(game);
    const part=view.meshes.find(mesh=>mesh.userData.owner==='tile:4,2')!,end=part.position.clone();
    motions[0].update(started+.10);expect(part.position.x).toBeLessThan(end.x);expect(part.position.z).toBeCloseTo(end.z);
    motions[0].update(0);expect(part.position).toEqual(end);
  });
});
