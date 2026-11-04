import { describe, expect, it } from 'vitest';
import { axisDelta, canvasPoint, inside, nearestSlide, project, SlideGesture, unproject } from './projection';

describe('isometric parking projection',()=>{
  it('roundtrips board coordinates including elevated roofs',()=>{
    for(const [x,y,z] of [[0,0,0],[6,6,0],[2.5,3,.76],[8,2,.5]]){
      const result=unproject(project(x,y,z),z);expect(result.x).toBeCloseTo(x);expect(result.y).toBeCloseTo(y);
    }
  });
  it('maps pointer positions through contained-canvas letterboxing',()=>{
    expect(canvasPoint({x:250,y:250},{left:10,top:10,width:480,height:480})).toEqual({x:240,y:200});
    expect(canvasPoint({x:130,y:110},{left:10,top:10,width:240,height:200})).toEqual({x:240,y:200});
  });
  it('picks the projected car polygon rather than its ground-plane shadow',()=>{
    const roof=[project(2,2,.7),project(4,2,.7),project(4,3,.7),project(2,3,.7)];
    expect(inside(project(3,2.5,.7),roof)).toBe(true);
    expect(inside(project(0,5),roof)).toBe(false);
  });
  it('projects diagonal drags onto the appropriate car axis',()=>{
    expect(axisDelta('h',{x:68,y:34})).toBe(2);
    expect(axisDelta('v',{x:-34,y:17})).toBe(1);
    expect(axisDelta('h',{x:0,y:0})).toBe(0);
  });
});

describe('car slide gesture',()=>{
  const start={x:200,y:180},client={x:100,y:100};
  it('selects on a tap without accidentally moving',()=>{
    const gesture=new SlideGesture();gesture.begin('A','h',start,client,[-1,1,2]);
    gesture.move({x:205,y:182},{x:104,y:103});expect(gesture.finish()).toBeNull();
  });
  it('snaps to a legal move and clamps the preview before a blocker',()=>{
    const gesture=new SlideGesture();gesture.begin('A','h',start,client,[-1,1,2]);
    gesture.move({x:370,y:265},{x:210,y:155});
    expect(gesture.preview).toEqual({id:'A',delta:2});expect(gesture.finish()).toEqual({id:'A',delta:2});
  });
  it('can snap the final coral slide to the special exit while never choosing partial-offboard space',()=>{
    expect(nearestSlide(.9,[0,2])).toBe(0);expect(nearestSlide(1.2,[0,2])).toBe(2);
    const gesture=new SlideGesture();gesture.begin('coral','h',start,client,[2]);
    gesture.move({x:251,y:205.5},{x:140,y:120});expect(gesture.finish()).toEqual({id:'coral',delta:2});
  });
  it('cancels a pending move and has no effect for a fully blocked car',()=>{
    const gesture=new SlideGesture();gesture.begin('A','v',start,client,[-1,1]);
    gesture.move({x:166,y:197},{x:70,y:115});gesture.cancel();expect(gesture.finish()).toBeNull();expect(gesture.preview).toBeNull();
    gesture.begin('B','h',start,client,[]);gesture.move({x:300,y:230},{x:150,y:140});expect(gesture.finish()).toBeNull();
  });
});

import { afterEach, vi } from 'vitest';
import { TrafficScene } from './scene';
import { createGame } from './engine';

afterEach(()=>vi.unstubAllGlobals());
function renderedScene() {
  const handlers=new Map<string,(event:Record<string,unknown>)=>void>();
  const labels:string[]=[];
  const context=new Proxy({fillText(text:string){labels.push(text);}}, {get(target,key){return Reflect.get(target,key)??(()=>{});}});
  const canvas={style:{},setAttribute(){},width:480,height:400,getContext(){return context;},addEventListener(name:string,handler:(event:Record<string,unknown>)=>void){handlers.set(name,handler);},setPointerCapture(){},getBoundingClientRect(){return{left:0,top:0,width:480,height:400};}};
  vi.stubGlobal('document',{createElement(){return canvas;}});
  vi.stubGlobal('window',{addEventListener(){}});
  vi.stubGlobal('ResizeObserver',class{observe(){}});
  const host={append(){}} as unknown as HTMLElement;
  const select=vi.fn(),move=vi.fn();
  const scene=new TrafficScene(host,select,move);
  const game=createGame({seed:'render-fixture',difficulty:'easy',cars:[
    {id:'coral',x:0,y:2,length:2,axis:'h',color:'#d88378'},
    {id:'A',x:0,y:0,length:2,axis:'h',color:'#91b2c4'},
    {id:'B',x:4,y:0,length:3,axis:'v',color:'#a9bb90'},
  ]});
  scene.update(game,'A');
  const point=project(.88,.5,.78);
  const event=(pointerId:number,x=point.x,y=point.y)=>({pointerId,clientX:x,clientY:y,button:0,preventDefault(){}});
  return{scene,game,point,select,move,event,labels,send:(name:string,e:Record<string,unknown>)=>handlers.get(name)!(e)};
}

describe('Canvas scene input integration',()=>{
  it('keeps cars on the far side visible/pickable above the large tray surface',()=>{
    const {scene,point}=renderedScene();
    const pick=scene as unknown as{pick(point:{x:number;y:number}):string|undefined};
    expect(pick.pick(point)).toBe('A');
    expect(pick.pick(project(.88,2.5,.78))).toBe('coral');
  });
  it('gives numbered cars distinct roof labels rather than the shared ID prefix',()=>{
    const {scene,game,labels}=renderedScene();labels.length=0;
    const numbered=createGame({...game.puzzle,cars:game.puzzle.cars.map((car,i)=>({...car,id:i===0?'coral':`car-${i}`}))});
    scene.update(numbered,'car-1');
    expect(labels).toEqual(expect.arrayContaining(['★','1','2']));expect(labels).not.toContain('CA');
  });
  it('selects without moving on tap and commits a clamped drag without mutating game state',()=>{
    const {scene,point,select,move,event,send,game}=renderedScene();
    send('pointerdown',event(1));send('pointerup',event(1));
    expect(select).toHaveBeenCalledWith('A');expect(move).not.toHaveBeenCalled();
    send('pointerdown',event(2));send('pointermove',event(2,point.x+68,point.y+34));send('pointerup',event(2,point.x+68,point.y+34));
    expect(move).toHaveBeenCalledWith('A',2);expect(game.history).toEqual([]);
    scene.cancelInput();
  });
  it('never commits after cancellation or a second pointer, including an unrelated pointer release',()=>{
    const {scene,point,move,event,send}=renderedScene();
    send('pointerdown',event(1));send('pointermove',event(1,point.x+68,point.y+34));send('pointerup',event(99));
    expect(move).not.toHaveBeenCalled();scene.cancelInput();send('pointerup',event(1));expect(move).not.toHaveBeenCalled();
    send('pointerdown',event(2));send('pointermove',event(2,point.x+68,point.y+34));send('pointerdown',event(3));send('pointerup',event(3));send('pointerup',event(2));expect(move).not.toHaveBeenCalled();
  });
});
