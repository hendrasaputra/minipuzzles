import { afterEach,describe,expect,it,vi } from 'vitest';
import * as THREE from 'three';
import { MiniScene,cameraPoint,cameraGround } from './mini-scene';
import { fitCamera } from './camera';

vi.mock('three',async original=>{
  const actual=await original<typeof import('three')>();
  return{...actual,WebGLRenderer:class{
    domElement=document.createElement('canvas');shadowMap={};outputColorSpace='';setPixelRatio(){}setSize(){}
    render(scene:THREE.Scene,camera:THREE.Camera){scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);}
  }};
});
afterEach(()=>vi.unstubAllGlobals());
const bounds=new THREE.Box3(new THREE.Vector3(-.5,-.5,-.5),new THREE.Vector3(7,1.5,7));
const center=bounds.getCenter(new THREE.Vector3()),rect={left:10,top:20,width:390,height:300};
describe('shared miniature camera',()=>{
  it('fits the full board and roundtrips ground picking through a full orbit and tilt range',()=>{
    const camera=new THREE.OrthographicCamera();
    for(const tilt of [.35,Math.atan2(18,20),1.25])for(let yaw=0;yaw<Math.PI*2;yaw+=Math.PI/4){
      fitCamera(camera,bounds,center,yaw,1,new THREE.Vector3(),rect.width/rect.height,tilt);
      for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
        const p=new THREE.Vector3(x,y,z).project(camera);expect(Math.abs(p.x)).toBeLessThan(1);expect(Math.abs(p.y)).toBeLessThan(1);
      }
      const world=new THREE.Vector3(2.5,0,3.5),screen=cameraPoint(camera,world,rect),hit=cameraGround(camera,screen.x,screen.y,rect)!;
      expect(hit.x).toBeCloseTo(world.x);expect(hit.y).toBeCloseTo(world.z);
    }
  });
  it('rejects hidden viewports and supports elevated surface projection',()=>{
    const camera=new THREE.OrthographicCamera();fitCamera(camera,bounds,center,1,3,new THREE.Vector3(),1);
    const screen=cameraPoint(camera,new THREE.Vector3(3,.8,2),rect);
    expect(cameraGround(camera,screen.x,screen.y,rect,.8)).toEqual(expect.objectContaining({x:expect.closeTo(3),y:expect.closeTo(2)}));
    expect(cameraGround(camera,10,20,{...rect,width:0})).toBeNull();
  });
});
function fixture(){
  class Element{
    style={};dataset={};children:Element[]=[];handlers=new Map<string,(event:any)=>void>();clientWidth=480;clientHeight=400;
    append(...children:Element[]){this.children.push(...children);}setAttribute(){}focus(){}
    setPointerCapture=vi.fn();
    getBoundingClientRect(){return{left:0,top:0,width:480,height:400};}
    addEventListener(name:string,callback:(event:any)=>void){this.handlers.set(name,callback);}
    getContext(){return null;}
  }
  vi.stubGlobal('document',{createElement:()=>new Element()});vi.stubGlobal('window',{addEventListener(){}});vi.stubGlobal('devicePixelRatio',1);vi.stubGlobal('ResizeObserver',class{observe(){}});
  const host=new Element(),cancel=vi.fn(),scene=new MiniScene(host as unknown as HTMLElement,cancel);
  scene.box(0,0,6,6,-.5,0,'#e1c69d');scene.box(2,2,3,3,0,1,'#d88378','crate');scene.render();
  const canvas=scene.canvas as unknown as Element;
  const event=(id:number,x:number,y:number,target:unknown=canvas)=>({target,pointerId:id,pointerType:'touch',clientX:x,clientY:y,button:0,deltaY:0,preventDefault:vi.fn(),stopImmediatePropagation:vi.fn(),stopPropagation:vi.fn()});
  const send=(name:string,e:ReturnType<typeof event>)=>{host.handlers.get(name)!(e);return e;};
  return{scene,host,canvas,cancel,event,send};
}
describe('camera gesture separation',()=>{
  it('leaves single-finger play gestures unconsumed and does not rotate',()=>{
    const {scene,event,send}=fixture(),before=scene.project(0,0);
    expect(send('pointerdown',event(1,100,100)).stopImmediatePropagation).not.toHaveBeenCalled();
    expect(send('pointermove',event(1,200,150)).stopImmediatePropagation).not.toHaveBeenCalled();send('pointerup',event(1,200,150));
    expect(scene.project(0,0)).toEqual(before);
  });
  it('rotates and tilts only in Rotate, cancels pending gameplay and resets to the original view',()=>{
    const {scene,cancel,event,send}=fixture(),before=scene.project(0,0);
    scene.setMode('rotate');expect(cancel).toHaveBeenCalled();
    expect(send('pointerdown',event(1,100,100)).stopImmediatePropagation).toHaveBeenCalled();
    send('pointermove',event(1,230,160));send('pointerup',event(1,230,160));expect(scene.project(0,0)).not.toEqual(before);
    scene.reset();expect(scene.project(0,0).x).toBeCloseTo(before.x);expect(scene.project(0,0).y).toBeCloseTo(before.y);
    scene.setMode('play');expect(scene.rotating).toBe(false);
  });
  it('consumes an entire pinch in Play, suppresses residual releases, and cancels stale camera gestures',()=>{
    const {scene,cancel,event,send}=fixture();send('pointerdown',event(1,100,100));
    expect(send('pointerdown',event(2,200,100)).stopImmediatePropagation).toHaveBeenCalled();expect(cancel).toHaveBeenCalled();
    send('pointermove',event(2,250,100));expect(send('pointerup',event(2,250,100)).stopImmediatePropagation).toHaveBeenCalled();
    expect(send('pointerup',event(1,100,100)).stopImmediatePropagation).toHaveBeenCalled();
    scene.setMode('rotate');send('pointerdown',event(3,100,100));scene.cancelInput();const before=scene.project(0,0);send('pointermove',event(3,300,200));expect(scene.project(0,0)).toEqual(before);
  });
  it('orbits with two fingers in Play and resumes one-finger gameplay after both lift',()=>{
    const {scene,cancel,event,send}=fixture();
    const initialDirection=scene.camera.getWorldDirection(new THREE.Vector3());
    send('pointerdown',event(1,100,100));
    expect(send('pointerdown',event(2,200,100)).stopImmediatePropagation).toHaveBeenCalledOnce();
    expect(cancel).toHaveBeenCalledOnce();
    send('pointermove',event(1,130,125));
    send('pointermove',event(2,230,125));
    expect(scene.camera.getWorldDirection(new THREE.Vector3())).not.toEqual(initialDirection);
    expect(scene.rotating).toBe(false);
    send('pointerup',event(2,230,125));
    expect(send('pointerup',event(1,130,125)).stopImmediatePropagation).toHaveBeenCalledOnce();
    send('pointerdown',event(3,100,100));
    expect(send('pointerup',event(3,135,120)).stopImmediatePropagation).not.toHaveBeenCalled();
  });
  it('hands a touch on a board overlay to the camera only when a second finger joins',()=>{
    const {canvas,cancel,event,send}=fixture();
    const marker={closest:(selector:string)=>selector==='[data-board-input]'?marker:null};
    expect(send('pointerdown',event(1,100,100,marker)).stopImmediatePropagation).not.toHaveBeenCalled();
    expect(send('pointerup',event(1,100,100,marker)).stopImmediatePropagation).not.toHaveBeenCalled();
    send('pointerdown',event(2,100,100,marker));
    send('pointerdown',event(3,200,100));
    expect(cancel).toHaveBeenCalledOnce();
    expect(canvas.setPointerCapture.mock.calls).toEqual([[2],[3]]);
  });
  it('keeps decorative beams out of picking and releases owned shape resources',()=>{
    const {scene}=fixture();
    const geometry=new THREE.BoxGeometry(.5,.05,.5),material=new THREE.MeshBasicMaterial({color:'#e5bc66'});
    const disposeGeometry=vi.spyOn(geometry,'dispose'),disposeMaterial=vi.spyOn(material,'dispose');
    scene.mesh(geometry,material,2.5,2.5,1.03);scene.render();
    const point=scene.project(2.5,2.5,1.06);expect(scene.pick(point.x,point.y)).toBe('crate');
    scene.mesh(new THREE.BoxGeometry(.5,.08,.5),new THREE.MeshBasicMaterial(),2.5,2.5,1.03,'mirror');scene.render();
    expect(scene.pick(point.x,point.y)).toBe('mirror');scene.clear();
    expect(disposeGeometry).toHaveBeenCalledOnce();expect(disposeMaterial).toHaveBeenCalledOnce();
  });
  it('picks actual frontmost 3D geometry after rotation',()=>{
    const {scene,event,send}=fixture();scene.setMode('rotate');for(let i=0;i<6;i++){const point=scene.project(2.5,2.5,1);expect(scene.pick(point.x,point.y)).toBe('crate');send('pointerdown',event(1,100,100));send('pointermove',event(1,170,100));send('pointerup',event(1,170,100));}
  });
});
