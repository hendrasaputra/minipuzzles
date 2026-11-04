import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { clueNeighbors, type Game } from './engine';
import { BoardGesture, type GestureAction, type TileHit } from '../../shared/gestures';
import { clampZoom, dragPan, fitCamera } from '../../shared/camera';
import { MaterialMotion } from '../../shared/material-motion';
import { PixelBurst } from '../../shared/pixel-burst';

const colors = ['#596fa2', '#558976', '#bc657a', '#8573ae', '#b07845', '#4e919c', '#7c7182', '#514454'];
interface Batch {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  matrices: THREE.Matrix4[];
  hits: TileHit[];
}
export class BoardScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera();
  private board = new THREE.Group();
  private targets: THREE.Object3D[] = [];
  private ray = new THREE.Raycaster();
  private yaw = Math.PI / 4;
  private zoom = 1;
  private pan = new THREE.Vector3();
  private center = new THREE.Vector3();
  private bounds = new THREE.Box3();
  private observer: ResizeObserver;
  private tile = new RoundedBoxGeometry(.94, .34, .94, 2, .045);
  private cap = new RoundedBoxGeometry(.81, .055, .81, 2, .025);
  private stud = new THREE.BoxGeometry(.13, .025, .13);
  private glyph = new THREE.PlaneGeometry(.63, .63);
  private pole = new THREE.BoxGeometry(.045, .62, .045);
  private flag = new THREE.BoxGeometry(.33, .24, .065);
  private flagBase = new THREE.BoxGeometry(.25, .045, .25);
  private mine = new THREE.IcosahedronGeometry(.23, 0);
  private spike = new THREE.BoxGeometry(.08, .12, .08);
  private fuse = new THREE.BoxGeometry(.07, .14, .07);
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private labelMaterials = new Map<string, THREE.MeshBasicMaterial>();
  private textures = new Map<string, THREE.CanvasTexture>();
  private dimmed = false;
  private gesture = new BoardGesture();
  private game?: Game;
  private active = -1;
  private hold?: ReturnType<typeof setTimeout>;
  private burst = new PixelBurst('mine');
  private ripple = new THREE.LineLoop(
    new THREE.BufferGeometry().setFromPoints([[-.4, -.4], [.4, -.4], [.4, .4], [-.4, .4]]
      .map(([x, z]) => new THREE.Vector3(x, 0, z))),
    new THREE.LineBasicMaterial({ color: '#9e6d83', transparent: true, depthWrite: false }),
  );
  private motion: MaterialMotion;
  private effectTime = 0;
  private lastEffectTime?: number;
  private lost = false;
  private exploded = false;
  private sun = new THREE.DirectionalLight(0xfff6e4, 2.1);

  constructor(private host: HTMLElement, private action: (floor:number,index:number,flag:boolean,doubleTap?:boolean)=>void) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0xfaf8f5, 0);
    host.append(this.renderer.domElement);
    this.scene.add(new THREE.HemisphereLight(0xfffaf2, 0xc9b3c8, 1.9));
    this.sun.position.set(-6, 12, 5); this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048); this.sun.shadow.normalBias = .03;
    this.ripple.visible = false;
    this.scene.add(this.sun, this.board, this.burst.object, this.ripple);
    this.motion = new MaterialMotion(this.animateEffect, () => {
      const shadows = this.renderer.shadowMap.autoUpdate;
      this.renderer.shadowMap.autoUpdate = false;
      this.renderer.render(this.scene, this.camera);
      this.renderer.shadowMap.autoUpdate = shadows;
    });
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200,200), new THREE.ShadowMaterial({opacity:.08}));
    ground.rotation.x = -Math.PI/2; ground.position.y = -.65; ground.receiveShadow = true; this.scene.add(ground);
    this.observer = new ResizeObserver(()=>this.resize()); this.observer.observe(host);
    host.addEventListener('pointerdown', this.down);
    host.addEventListener('pointermove', this.move);
    host.addEventListener('pointerup', this.up);
    host.addEventListener('pointercancel', this.cancel);
    host.addEventListener('contextmenu', e=>e.preventDefault());
    window.addEventListener('blur', this.cancel);
    host.addEventListener('wheel', e=>{
      e.preventDefault(); this.cancel(); this.changeZoom(this.zoom * Math.exp(-e.deltaY * .001));
    }, {passive:false});
  }
  private material(color:string) {
    const key=color+(this.dimmed?':dim':'');
    if(!this.materials.has(key)) this.materials.set(key,new THREE.MeshStandardMaterial({color,roughness:.78,transparent:this.dimmed,opacity:this.dimmed ? .3 : 1,depthWrite:!this.dimmed}));
    return this.materials.get(key)!;
  }
  private label(text:string,color:string) {
    const key=text+color;
    if(!this.textures.has(key)) {
      const c=document.createElement('canvas');c.width=c.height=128;
      const ctx=c.getContext('2d')!;ctx.fillStyle=color;ctx.font=`bold ${text.length > 1 ? 55 : 86}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,64,69);
      const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;this.textures.set(key,texture);
    }
    const materialKey=key+(this.dimmed?':dim':'');
    if(!this.labelMaterials.has(materialKey)) this.labelMaterials.set(materialKey,new THREE.MeshBasicMaterial({map:this.textures.get(key),transparent:true,depthWrite:false,opacity:this.dimmed ? .35 : 1}));
    return this.labelMaterials.get(materialKey)!;
  }
  update(game:Game, active:number, exploded:boolean, inspected?:TileHit, revealed?:TileHit) {
    const hit = game === this.game && game.status === 'lost' && !this.lost ? game.exploded : undefined;
    if (game !== this.game || active !== this.active || exploded !== this.exploded) this.clearEffect();
    this.lost = game.status === 'lost';
    this.exploded = exploded;
    if(game!==this.game){this.pan.set(0,0,0);this.zoom=1;}
    if(game!==this.game||active!==this.active)this.cancel();
    this.game=game;this.active=active;
    const source=inspected&&game.cells[inspected.floor]?.[inspected.index]?.revealed&&!game.cells[inspected.floor][inspected.index].mine?inspected:undefined;
    const footprint=new Set(source?clueNeighbors(game,source.floor,source.index).map(p=>`${p.floor}:${p.index}`):[]);
    this.board.traverse(o=>{
      if(o instanceof THREE.InstancedMesh)o.dispose();
      else if(o instanceof THREE.Line){o.geometry.dispose();(o.material as THREE.Material).dispose();}
    });
    this.board.clear();this.targets=[];
    const {width,height,floors}=game.config;
    for(let f=0;f<floors;f++) {
      if(!exploded&&f!==active)continue;
      this.dimmed=f!==active;
      const floor=new THREE.Group();
      floor.position.set(exploded?(f-(floors-1)/2)*1.4:0,exploded?f*2.3:0,exploded?-(f-(floors-1)/2)*1.4:0);this.board.add(floor);
      const batches=new Map<string,Batch>();
      const add=(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,hit?:TileHit,rx=0,rz=0)=>{
        const key=geometry.uuid+material.uuid;
        if(!batches.has(key))batches.set(key,{geometry,material,matrices:[],hits:[]});
        const batch=batches.get(key)!;
        batch.matrices.push(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,0,rz)),new THREE.Vector3(1,1,1)));
        if(hit)batch.hits.push(hit);
      };
      game.cells[f].forEach((cell,i)=>{
        const x=i%width-(width-1)/2,z=Math.floor(i/width)-(height-1)/2;
        const hit=game.exploded?.floor===f&&game.exploded.index===i;
        const mine=cell.mine&&(cell.revealed||game.status==='lost');
        add(this.tile,this.material(hit?'#ca617b':cell.revealed?'#d8d8e5':f===active?'#dc91ac':'#dfb1bf'),x,0,z,f===active?{floor:f,index:i,revealed:cell.revealed&&!cell.mine}:undefined);
        const selected=source?.floor===f&&source.index===i,targeted=footprint.has(`${f}:${i}`);
        add(this.cap,this.material(hit?'#f18f9d':selected?'#efcf94':targeted?'#b8dbe0':cell.revealed?'#f4f0eb':f===active?'#f5bdce':'#efd5dc'),x,.19,z);
        if(selected||targeted){
          const corners=[[-.43,-.43],[.43,-.43],[.43,.43],[-.43,.43]].map(([dx,dz])=>new THREE.Vector3(x+dx,.235,z+dz));
          floor.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(corners),new THREE.LineBasicMaterial({color:selected?'#957035':'#477c90'})));
        }
        if(cell.flagged&&!mine){
          add(this.pole,this.material('#94734d'),x,.5,z);
          add(this.flag,this.material('#c95379'),x+.14,.68,z);
          add(this.flagBase,this.material('#e9bc79'),x,.25,z);
        }else if(mine){
          add(this.mine,this.material('#645773'),x,.42,z);
          for(let a=0;a<4;a++)add(this.spike,this.material('#e9d9d5'),x+Math.cos(a*Math.PI/2)*.2,.44,z+Math.sin(a*Math.PI/2)*.2,undefined,0,a*Math.PI/2);
          add(this.fuse,this.material('#e9d9d5'),x,.65,z);
        }else if(cell.revealed&&(cell.adjacent||cell.clueType==='above'||cell.clueType==='below')){
          const arrow=cell.clueType==='above'?'↑':cell.clueType==='below'?'↓':'';
          add(this.glyph,this.label(`${arrow}${cell.adjacent}`,arrow?'#615486':colors[cell.adjacent-1]??'#514454'),x,.225,z,undefined,-Math.PI/2);
        }else if(!cell.revealed)add(this.stud,this.material('#f9d5de'),x,.23,z);
      });
      for(const batch of batches.values()){
        const mesh=new THREE.InstancedMesh(batch.geometry,batch.material,batch.matrices.length);
        batch.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;
        mesh.computeBoundingBox();mesh.computeBoundingSphere();
        mesh.castShadow=!this.dimmed&&batch.geometry!==this.glyph;mesh.receiveShadow=true;
        if(batch.hits.length){mesh.userData.hits=batch.hits;this.targets.push(mesh);}
        floor.add(mesh);
      }
    }
    this.bounds.setFromObject(this.board);this.bounds.getCenter(this.center);
    const shadowExtent=Math.max(width,height)+floors*3;
    Object.assign(this.sun.shadow.camera,{left:-shadowExtent,right:shadowExtent,top:shadowExtent,bottom:-shadowExtent});this.sun.shadow.camera.updateProjectionMatrix();
    this.resize();
    const cue = hit ?? revealed;
    if (cue && (exploded || cue.floor === active)) {
      this.clearEffect();
      const offset = exploded ? (cue.floor - (floors - 1) / 2) * 1.4 : 0;
      const x = cue.index % width - (width - 1) / 2 + offset;
      const z = Math.floor(cue.index / width) - (height - 1) / 2 - offset;
      const y = (exploded ? cue.floor * 2.3 : 0) + .235;
      if (hit) this.burst.start(x, y, z, 'dust', cue.index, 10);
      else {
        this.ripple.position.set(x, y, z);
        this.ripple.visible = true;
      }
      this.motion.refresh();
    }
  }

  private clearEffect() {
    this.motion.stop();
    this.burst.clear();
    this.ripple.visible = false;
    this.effectTime = 0;
    this.lastEffectTime = undefined;
  }

  private animateEffect = (seconds: number) => {
    if (seconds === 0) { this.clearEffect(); return; }
    if (this.lastEffectTime !== undefined) {
      this.effectTime += Math.min(.075, Math.max(0, seconds - this.lastEffectTime));
    }
    this.lastEffectTime = seconds;
    if (this.ripple.visible) {
      const progress = this.effectTime / .26;
      this.ripple.visible = progress < 1;
      this.ripple.scale.setScalar(.75 + progress * .5);
      this.ripple.material.opacity = .55 * (1 - Math.min(1, progress));
    }
    if (!this.burst.update(this.effectTime) && !this.ripple.visible) this.clearEffect();
  };

  private resize(){
    const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h||this.bounds.isEmpty())return;
    this.renderer.setSize(w,h);fitCamera(this.camera,this.bounds,this.center,this.yaw,this.zoom,this.pan,w/h);this.renderer.render(this.scene,this.camera);
  }
  private pick(x:number,y:number):TileHit|undefined{
    const r=this.host.getBoundingClientRect();this.ray.setFromCamera(new THREE.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),this.camera);
    const hit=this.ray.intersectObjects(this.targets)[0];
    return hit?.instanceId===undefined?undefined:hit.object.userData.hits[hit.instanceId];
  }
  private changeZoom(value:number){this.zoom=clampZoom(value);if(this.zoom<=1)this.pan.set(0,0,0);this.resize();}
  private apply(action:GestureAction|undefined){
    if(!action)return;
    if(action.type==='drag'){
      if(this.zoom>1.05)this.pan.add(dragPan(this.camera,action.dx,action.dy,this.host.clientWidth,this.host.clientHeight));
      else this.yaw-=action.dx*.008;
      this.resize();
    }else if(action.type==='zoom')this.changeZoom(this.zoom*action.ratio);
    else this.action(action.tile.floor,action.tile.index,action.type==='flag',action.type==='chord');
  }
  private down=(e:PointerEvent)=>{
    if(e.button!==0&&e.button!==2)return;
    e.preventDefault();this.host.setPointerCapture(e.pointerId);clearTimeout(this.hold);
    this.apply(this.gesture.down(e.pointerId,e.clientX,e.clientY,e.button,this.pick(e.clientX,e.clientY)));
    if(e.button===0)this.hold=setTimeout(()=>{const action=this.gesture.hold();this.apply(action);if(action)navigator.vibrate?.(15);},480);
  };
  private move=(e:PointerEvent)=>{this.apply(this.gesture.move(e.pointerId,e.clientX,e.clientY));};
  private up=(e:PointerEvent)=>{clearTimeout(this.hold);this.apply(this.gesture.up(e.pointerId));};
  private cancel=()=>{clearTimeout(this.hold);this.gesture.cancel();};
  cancelInput(){this.cancel();}
  reset(){this.cancel();this.yaw=Math.PI/4;this.zoom=1;this.pan.set(0,0,0);this.resize();}
}
