import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { nearestSlide, projectedAxisDelta, SlideGesture } from './projection';

const miniState=vi.hoisted(()=>({instances:[] as any[], tick: (_time: number) => {}}));
vi.mock('../../shared/material-motion',()=>({MaterialMotion:class{
  constructor(update:(time:number)=>void){miniState.tick=update;}
  refresh(){}
  stop(){}
}}));
vi.mock('../../shared/mini-scene',()=>({MiniScene:class{
  rotating=false;
  effects=new THREE.Group();
  owner:string|undefined='A';
  horizontal={x:34,y:17};vertical={x:-34,y:17};
  handlers=new Map<string,(event:any)=>void>();
  labels:string[]=[];
  boxes:any[]=[];
  parts:{owner?:string;mesh:THREE.Object3D}[]=[];
  canvas={setAttribute(){},setPointerCapture(){},addEventListener:(name:string,handler:(event:any)=>void)=>this.handlers.set(name,handler)};
  constructor(_host:HTMLElement,public cameraCancel:()=>void){miniState.instances.push(this);}
  clear(){this.labels=[];this.boxes=[];this.parts=[];}
  box(...args:any[]){
    this.boxes.push(args);
    const [x0,y0,x1,y1,z0,z1,,owner]=args;
    const mesh=new THREE.Object3D();
    mesh.position.set((x0+x1)/2,(z0+z1)/2,(y0+y1)/2);
    this.parts.push({owner,mesh});
    return mesh;
  }
  mesh(_geometry:unknown,_material:unknown,x:number,y:number,z:number,owner?:string){
    const mesh=new THREE.Object3D();
    mesh.position.set(x,z,y);
    this.parts.push({owner,mesh});
    return mesh;
  }
  label(text:string){this.labels.push(text);}
  render(){}
  cancelInput(){this.cameraCancel();}
  pick(){return this.owner;}
  project(x:number,y:number){return{x:x*this.horizontal.x+y*this.vertical.x,y:x*this.horizontal.y+y*this.vertical.y};}
}}));
import { TrafficScene } from './scene';
import { createGame, moveCar } from './engine';
afterEach(()=>vi.unstubAllGlobals());

describe('camera-relative car slide gesture',()=>{
  it('projects movement along the car axis at every camera orientation and scale',()=>{
    for(const angle of [0,Math.PI/4,Math.PI/2,Math.PI,Math.PI*1.5])for(const scale of [12,40,100]){
      const axis={x:Math.cos(angle)*scale,y:Math.sin(angle)*scale};
      expect(projectedAxisDelta(axis,{x:axis.x*2,y:axis.y*2})).toBeCloseTo(2);
      expect(projectedAxisDelta(axis,{x:-axis.y,y:axis.x})).toBeCloseTo(0);
    }
    expect(projectedAxisDelta({x:0,y:0},{x:20,y:20})).toBe(0);
  });
  it('uses CSS-pixel slop before snapping a legal move',()=>{
    const gesture=new SlideGesture(),start={x:100,y:100};
    gesture.begin('A',{x:-40,y:20},start,[-1,1,2]);
    gesture.move({x:96,y:102});expect(gesture.finish()).toBeNull();
    gesture.begin('A',{x:-40,y:20},start,[-1,1,2]);
    gesture.move({x:0,y:150});expect(gesture.preview).toEqual({id:'A',delta:2});expect(gesture.finish()).toEqual({id:'A',delta:2});
  });
  it('never invents a partial-offboard escape or a move past a blocker',()=>{
    expect(nearestSlide(.9,[0,2])).toBe(0);expect(nearestSlide(1.2,[0,2])).toBe(2);
    const gesture=new SlideGesture();gesture.begin('coral',{x:34,y:17},{x:0,y:0},[2]);
    gesture.move({x:51,y:25.5});expect(gesture.finish()).toEqual({id:'coral',delta:2});
    gesture.begin('blocked',{x:34,y:17},{x:0,y:0},[]);gesture.move({x:100,y:50});expect(gesture.finish()).toBeNull();
  });
  it('cancels without committing a pending preview',()=>{
    const gesture=new SlideGesture();gesture.begin('A',{x:34,y:17},{x:0,y:0},[1,2]);
    gesture.move({x:68,y:34});gesture.cancel();expect(gesture.preview).toBeNull();expect(gesture.finish()).toBeNull();
  });
});

function renderedScene(reentrant=false){
  vi.stubGlobal('window',{addEventListener(){}});
  const select=vi.fn(),move=vi.fn();
  const scene=new TrafficScene({} as HTMLElement,select,move);
  const mini=miniState.instances[miniState.instances.length-1];
  const game=createGame({seed:'render-fixture',difficulty:'easy',cars:[
    {id:'coral',x:0,y:2,length:2,axis:'h',color:'#d88378'},
    {id:'A',x:0,y:0,length:2,axis:'h',color:'#91b2c4'},
    {id:'B',x:4,y:0,length:3,axis:'v',color:'#a9bb90'},
  ]});
  scene.update(game,'A');
  if(reentrant)select.mockImplementation((id:string)=>scene.update(game,id));
  const send=(name:string,id=1,x=100,y=100)=>mini.handlers.get(name)({pointerId:id,clientX:x,clientY:y,button:0,preventDefault(){}});
  return{scene,mini,game,select,move,send};
}

describe('rotatable 3D Traffic Garden input',()=>{
  it('selects the raycast owner without moving on tap',()=>{
    const {mini,select,move,send}=renderedScene();
    mini.owner='B';send('pointerdown');send('pointerup');
    expect(select).toHaveBeenCalledExactlyOnceWith('B');expect(move).not.toHaveBeenCalled();
    mini.owner=undefined;send('pointerdown',2);send('pointerup',2);expect(select).toHaveBeenCalledTimes(1);
  });
  it('draws every car as boxes and gives numbered cars distinct roof labels',()=>{
    const {scene,mini,game}=renderedScene();
    scene.update(createGame({...game.puzzle,cars:game.puzzle.cars.map((car,i)=>({...car,id:i===0?'coral':`car-${i}`}))}),'car-1');
    expect(mini.labels).toEqual(expect.arrayContaining(['★','1','2']));expect(mini.labels).not.toContain('CA');
    expect(mini.boxes.filter((box:any[])=>box[7]==='car-1').length).toBeGreaterThan(6);
  });
  it('eases to the committed car position and clears contact when the board redraws',()=>{
    const {scene,mini,game}=renderedScene();
    expect(moveCar(game,'A',1)).toBe(true);
    scene.update(game,'A',{id:'A',delta:1});
    const part=mini.parts.find((part:{owner?:string;mesh:THREE.Object3D})=>part.owner==='A' && part.mesh.position.y>.05).mesh;
    const endpoint=part.position.x;
    miniState.tick(1);
    expect(part.position.x).toBeCloseTo(endpoint-1);
    for(let i=1;i<=5;i++) miniState.tick(1+i*.06);
    expect(part.position.x).toBeCloseTo(endpoint);
    expect(mini.effects.children[0].visible).toBe(true);
    scene.update(game,'A');
    expect(mini.effects.children[0].visible).toBe(false);
    expect(game.history).toHaveLength(1);
  });
  it('drags correctly after camera rotation even when selection rerenders the same game',()=>{
    const {mini,move,send,game}=renderedScene(true);
    mini.horizontal={x:-30,y:10};
    send('pointerdown');send('pointermove',1,40,120);send('pointerup',1,40,120);
    expect(move).toHaveBeenCalledExactlyOnceWith('A',2);expect(game.history).toEqual([]);
  });
  it('never selects or moves while the camera is in Rotate mode, including after completion',()=>{
    const {mini,select,move,send,game,scene}=renderedScene();
    mini.rotating=true;send('pointerdown');send('pointermove',1,168,134);send('pointerup',1,168,134);
    expect(select).not.toHaveBeenCalled();expect(move).not.toHaveBeenCalled();
    game.status='won';scene.update(game,'A');send('pointerdown',2);send('pointerup',2);expect(move).not.toHaveBeenCalled();
  });
  it('cancels preview on camera interaction, game replacement, pointer cancellation and multi-touch',()=>{
    const {mini,scene,game,move,send}=renderedScene();
    send('pointerdown');send('pointermove',1,168,134);mini.cameraCancel();send('pointerup');expect(move).not.toHaveBeenCalled();
    send('pointerdown',2);send('pointermove',2,168,134);send('pointercancel',2);send('pointerup',2);expect(move).not.toHaveBeenCalled();
    send('pointerdown',3);send('pointermove',3,168,134);send('pointerdown',4);send('pointerup',4);send('pointerup',3);expect(move).not.toHaveBeenCalled();
    send('pointerdown',5);send('pointermove',5,168,134);moveCar(game,'A',1);scene.update(game,'A');send('pointerup',5);expect(move).not.toHaveBeenCalled();
    send('pointerdown',6);send('pointermove',6,168,134);send('pointerup',99);expect(move).not.toHaveBeenCalled();scene.cancelInput();send('pointerup',6);expect(move).not.toHaveBeenCalled();
  });
});
