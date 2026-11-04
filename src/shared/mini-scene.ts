import * as THREE from 'three';
import { BoardGesture, type GestureAction } from './gestures';
import { clampZoom, fitCamera } from './camera';
import './mini-scene.css';

export interface Point { x:number;y:number }
export function screenArrow(dx:number,dy:number):string{return ['→','↘','↓','↙','←','↖','↑','↗'][(Math.round(Math.atan2(dy,dx)/(Math.PI/4))+8)%8];}
export function cameraPoint(camera:THREE.Camera,point:THREE.Vector3,rect:{left:number;top:number;width:number;height:number}):Point{
  const p=point.clone().project(camera);return{x:rect.left+(p.x+1)*rect.width/2,y:rect.top+(1-p.y)*rect.height/2};
}
export function cameraGround(camera:THREE.Camera,x:number,y:number,rect:{left:number;top:number;width:number;height:number},height=0):Point|null{
  if(rect.width<=0||rect.height<=0)return null;
  const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),camera);
  const hit=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-height),new THREE.Vector3());
  return hit?{x:hit.x,y:hit.z}:null;
}

/** Shared miniature camera; puzzle scenes own their geometry and game gestures. */
export class MiniScene {
  readonly canvas:HTMLCanvasElement;
  readonly camera=new THREE.OrthographicCamera();
  private renderer:THREE.WebGLRenderer;
  private scene=new THREE.Scene();
  private board=new THREE.Group();
  private geometry=new THREE.BoxGeometry(1,1,1);
  private materials=new Map<string,THREE.MeshLambertMaterial>();
  private labels:THREE.Mesh[]=[];
  private shapes:THREE.Mesh[]=[];
  private bounds=new THREE.Box3();
  private center=new THREE.Vector3();
  private ray=new THREE.Raycaster();
  private yaw=Math.PI/4;
  private tilt=Math.atan2(18,20);
  private zoom=1;
  private mode:'play'|'rotate'='play';
  private gesture=new BoardGesture();
  private pointers=new Set<number>();
  private multi=false;
  private controls:HTMLDivElement;
  private rotateButton:HTMLButtonElement;
  private playButton:HTMLButtonElement;
  private observer:ResizeObserver;
  private sun:THREE.DirectionalLight;
  get rotating(){return this.mode==='rotate';}

  constructor(private host:HTMLElement,private onCancel:()=>void){
    this.renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.canvas=this.renderer.domElement;this.canvas.setAttribute('role','img');
    this.canvas.setAttribute('aria-label','3D puzzle board. Choose Rotate to look around; choose Play to interact.');
    this.canvas.style.touchAction='none';host.append(this.canvas);
    this.scene.add(this.board,new THREE.AmbientLight('#fff7ec',2));
    this.sun=new THREE.DirectionalLight('#fff7e8',3);this.sun.position.set(-6,14,5);this.sun.castShadow=true;
    this.sun.shadow.mapSize.set(1024,1024);this.sun.shadow.bias=-.001;this.scene.add(this.sun,this.sun.target);
    this.controls=document.createElement('div');this.controls.className='mini-camera';this.controls.setAttribute('role','group');this.controls.setAttribute('aria-label','Board camera');
    this.playButton=this.button('Play',()=>this.setMode('play'));
    this.rotateButton=this.button('Rotate',()=>this.setMode('rotate'));
    const reset=this.button('↺',()=>this.reset());reset.setAttribute('aria-label','Reset camera');
    this.host.append(this.controls);this.syncMode();
    this.canvas.addEventListener('pointerdown',this.down,{capture:true});this.canvas.addEventListener('pointermove',this.move,{capture:true});
    this.canvas.addEventListener('pointerup',this.up,{capture:true});this.canvas.addEventListener('pointercancel',this.cancel,{capture:true});
    this.canvas.addEventListener('wheel',this.wheel,{passive:false});this.canvas.addEventListener('contextmenu',event=>event.preventDefault());
    host.addEventListener('keydown',this.key,{capture:true});window.addEventListener('blur',()=>this.cancelInput());
    this.observer=new ResizeObserver(()=>this.resize());this.observer.observe(host);
  }
  private button(label:string,action:()=>void){const button=document.createElement('button');button.type='button';button.textContent=label;button.onclick=action;this.controls.append(button);return button;}
  private syncMode(){this.playButton.setAttribute('aria-pressed',String(!this.rotating));this.rotateButton.setAttribute('aria-pressed',String(this.rotating));this.host.dataset.cameraMode=this.mode;this.canvas.style.cursor=this.rotating?'grab':'default';}
  setMode(mode:'play'|'rotate'){this.cancelInput();this.mode=mode;this.syncMode();this.host.focus({preventScroll:true});}
  reset(){this.cancelInput();this.yaw=Math.PI/4;this.tilt=Math.atan2(18,20);this.zoom=1;this.resize();}
  cancelInput(){this.gesture.cancel();this.pointers.clear();this.multi=false;this.onCancel();}
  clear(){
    for(const label of this.labels){label.geometry.dispose();const material=label.material as THREE.MeshBasicMaterial;material.map?.dispose();material.dispose();}
    for(const shape of this.shapes){shape.geometry.dispose();const materials=Array.isArray(shape.material)?shape.material:[shape.material];materials.forEach(material=>material.dispose());}
    this.shapes=[];this.labels=[];this.board.clear();
  }
  box(x0:number,y0:number,x1:number,y1:number,z0:number,z1:number,color:string,owner?:string){
    let material=this.materials.get(color);if(!material){material=new THREE.MeshLambertMaterial({color});this.materials.set(color,material);}
    const mesh=new THREE.Mesh(this.geometry,material);mesh.position.set((x0+x1)/2,(z0+z1)/2,(y0+y1)/2);mesh.scale.set(x1-x0,z1-z0,y1-y0);
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.owner=owner;this.board.add(mesh);
  }
  mesh(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,owner?:string,yaw=0){
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,z,y);mesh.rotation.y=yaw;mesh.userData.owner=owner;mesh.castShadow=true;mesh.receiveShadow=true;
    if(owner===undefined)mesh.raycast=()=>{};
    this.board.add(mesh);this.shapes.push(mesh);return mesh;
  }
  label(text:string,x:number,y:number,z:number){
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');if(!ctx)return;
    ctx.font='bold 82px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#fff9eb';ctx.fillText(text,64,67);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(.55,.55),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}));
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,z,y);mesh.raycast=()=>{};this.board.add(mesh);this.labels.push(mesh);
  }
  render(){
    this.bounds.setFromObject(this.board);if(this.bounds.isEmpty())return;this.bounds.getCenter(this.center);
    this.sun.target.position.copy(this.center);this.sun.position.copy(this.center).add(new THREE.Vector3(-6,14,5));
    const extent=Math.max(this.bounds.max.x-this.bounds.min.x,this.bounds.max.z-this.bounds.min.z)+2;
    Object.assign(this.sun.shadow.camera,{left:-extent,right:extent,top:extent,bottom:-extent,far:50});this.sun.shadow.camera.updateProjectionMatrix();this.resize();
  }
  private resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h||this.bounds.isEmpty())return;
    this.renderer.setSize(w,h);fitCamera(this.camera,this.bounds,this.center,this.yaw,this.zoom,new THREE.Vector3(),w/h,this.tilt);this.renderer.render(this.scene,this.camera);this.host.dispatchEvent?.(new Event('camerachange'));
  }
  repaint(){
    const autoUpdate=this.renderer.shadowMap.autoUpdate;this.renderer.shadowMap.autoUpdate=false;
    this.renderer.render(this.scene,this.camera);this.renderer.shadowMap.autoUpdate=autoUpdate;
  }
  project(x:number,y:number,z=0):Point{return cameraPoint(this.camera,new THREE.Vector3(x,z,y),this.canvas.getBoundingClientRect());}
  direction(dx:number,dy:number):string{const a=this.project(this.center.x,this.center.z),b=this.project(this.center.x+dx,this.center.z+dy);return screenArrow(b.x-a.x,b.y-a.y);}
  ground(x:number,y:number,z=0){return cameraGround(this.camera,x,y,this.canvas.getBoundingClientRect(),z);}
  pick(x:number,y:number):string|undefined{
    const rect=this.canvas.getBoundingClientRect();if(!rect.width||!rect.height)return;
    this.ray.setFromCamera(new THREE.Vector2((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2),this.camera);this.board.updateMatrixWorld(true);
    return this.ray.intersectObjects(this.board.children,false)[0]?.object.userData.owner;
  }
  private apply(action:GestureAction|undefined){
    if(action?.type==='drag'){this.yaw-=action.dx*.008;this.tilt=THREE.MathUtils.clamp(this.tilt+action.dy*.005,.35,1.25);this.resize();}
    if(action?.type==='zoom'){this.zoom=clampZoom(this.zoom*action.ratio);this.resize();}
  }
  private down=(event:PointerEvent)=>{
    if(event.button!==0)return;this.pointers.add(event.pointerId);this.gesture.down(event.pointerId,event.clientX,event.clientY,0);
    if(this.pointers.size>1){this.multi=true;this.onCancel();}
    if(this.rotating||this.multi){event.preventDefault();event.stopImmediatePropagation();this.canvas.setPointerCapture(event.pointerId);}
  };
  private move=(event:PointerEvent)=>{
    if(!this.pointers.has(event.pointerId))return;
    const action=this.gesture.move(event.pointerId,event.clientX,event.clientY);
    if(this.rotating||this.multi){event.preventDefault();event.stopImmediatePropagation();this.apply(action);}
  };
  private up=(event:PointerEvent)=>{
    const consume=this.rotating||this.multi;this.pointers.delete(event.pointerId);this.gesture.up(event.pointerId);if(!this.pointers.size)this.multi=false;
    if(consume){event.preventDefault();event.stopImmediatePropagation();}
  };
  private cancel=(event:PointerEvent)=>{const consume=this.rotating||this.multi;this.cancelInput();if(consume)event.stopImmediatePropagation();};
  private wheel=(event:WheelEvent)=>{event.preventDefault();this.cancelInput();this.zoom=clampZoom(this.zoom*Math.exp(-event.deltaY*.001));this.resize();};
  private key=(event:KeyboardEvent)=>{
    if(!this.rotating||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key))return;
    event.preventDefault();event.stopPropagation();if(event.key==='Home'){this.reset();return;}
    if(event.key==='ArrowLeft')this.yaw+=.15;if(event.key==='ArrowRight')this.yaw-=.15;
    if(event.key==='ArrowUp')this.tilt=Math.min(1.25,this.tilt+.1);if(event.key==='ArrowDown')this.tilt=Math.max(.35,this.tilt-.1);this.resize();
  };
}
