import * as THREE from 'three';
import { MiniScene } from '../../shared/mini-scene';
import { trace, type Game } from './engine';
import { LaserLight } from './laser';

type Point={x:number;y:number};

/** Mirror turns are tap-only; the shared camera owns orbit, tilt and pinch. */
export class CrystalScene {
  private mini:MiniScene;
  private game?:Game;
  private laser?:LaserLight;
  private frame=0;
  private lastFrame=-Infinity;
  private motion=window.matchMedia('(prefers-reduced-motion: reduce)');
  private suspended=false;
  private selected:string|null=null;
  private pointers=new Set<number>();
  private multi=false;
  private press:{id:number;client:Point;mirror?:string;dragged:boolean}|null=null;
  constructor(host:HTMLElement,private onSelect:(id:string)=>void,private onRotate:(id:string)=>void){
    this.mini=new MiniScene(host,this.clearInput);
    this.mini.canvas.setAttribute('aria-label','3D crystal puzzle. In Play, tap a brass mirror to turn it. Choose Rotate to look around without turning mirrors.');
    this.mini.canvas.addEventListener('pointerdown',this.down);
    this.mini.canvas.addEventListener('pointermove',this.move);
    this.mini.canvas.addEventListener('pointerup',this.up);
    this.mini.canvas.addEventListener('pointercancel',this.cancelInput);
    window.addEventListener('blur',this.cancelInput);
    document.addEventListener('visibilitychange',this.syncAnimation);
    this.motion.addEventListener('change',this.syncAnimation);
    window.addEventListener('pagehide',()=>{this.suspended=true;this.syncAnimation();});
    window.addEventListener('pageshow',()=>{this.suspended=false;this.syncAnimation();});
  }
  update(game:Game,selectedId:string|null){this.cancelInput();this.game=game;this.selected=selectedId;this.draw();}
  private clearInput=()=>{this.press=null;this.pointers.clear();this.multi=false;};
  cancelInput=()=>{this.mini.cancelInput();};
  private mirrorAt(point:Point){const id=this.mini.pick(point.x,point.y);return this.game?.mirrors.some(mirror=>mirror.id===id)?id:undefined;}
  private down=(event:PointerEvent)=>{
    if(event.button!==0||this.mini.rotating||!this.game||this.game.status==='won')return;
    event.preventDefault();this.mini.canvas.setPointerCapture(event.pointerId);this.pointers.add(event.pointerId);
    if(this.multi||this.pointers.size>1){this.multi=true;this.press=null;return;}
    const client={x:event.clientX,y:event.clientY};
    this.press={id:event.pointerId,client,mirror:this.mirrorAt(client),dragged:false};
  };
  private move=(event:PointerEvent)=>{
    const press=this.press;if(!press||press.id!==event.pointerId)return;
    if(Math.hypot(event.clientX-press.client.x,event.clientY-press.client.y)>8)press.dragged=true;
  };
  private up=(event:PointerEvent)=>{
    if(!this.pointers.has(event.pointerId))return;
    this.pointers.delete(event.pointerId);
    if(this.multi){if(!this.pointers.size)this.multi=false;this.press=null;return;}
    const press=this.press;if(!press||press.id!==event.pointerId)return;this.press=null;
    if(this.mini.rotating||!press.mirror||press.dragged||Math.hypot(event.clientX-press.client.x,event.clientY-press.client.y)>8)return;
    if(this.mirrorAt({x:event.clientX,y:event.clientY})!==press.mirror)return;
    this.onSelect(press.mirror);this.onRotate(press.mirror);
  };
  private syncAnimation=()=>{
    cancelAnimationFrame(this.frame);this.frame=0;
    if(!this.game)return;
    if(this.motion.matches){this.laser?.update(0);this.mini.repaint();}
    if(!document.hidden&&!this.suspended&&!this.motion.matches)this.frame=requestAnimationFrame(this.animate);
  };
  private animate=(time:number)=>{
    this.frame=0;
    if(document.hidden||this.suspended||this.motion.matches)return;
    if(time-this.lastFrame>=1000/30){this.lastFrame=time;this.laser?.update(time/1000);this.mini.repaint();}
    this.frame=requestAnimationFrame(this.animate);
  };
  private draw(){
    const game=this.game;if(!game)return;
    const {width,height,walls,crystals,source}=game.level,light=trace(game);
    this.mini.clear();
    this.mini.box(-.16,-.16,width+.16,height+.16,-.38,-.09,'#b79c78');
    this.mini.box(-.18,-.18,width+.18,-.05,-.09,.12,'#d7bd88');
    this.mini.box(-.18,-.05,-.05,height+.18,-.09,.12,'#d7bd88');
    this.mini.box(-.05,height+.05,width+.18,height+.18,-.09,.12,'#d7bd88');
    this.mini.box(width+.05,-.05,width+.18,height+.05,-.09,.12,'#d7bd88');
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)this.mini.box(x+.025,y+.025,x+.975,y+.975,-.09,0,(x+y)%2?'#eee6dc':'#fbf3e8');
    for(const {x,y} of walls){
      this.mini.box(x+.07,y+.07,x+.93,y+.93,0,.44,'#afa6bd');
      this.mini.box(x+.11,y+.11,x+.89,y+.89,.43,.54,'#c6bed0');
    }
    this.laser=new LaserLight(this.mini,light.segments);
    for(const {x,y} of crystals){
      const lit=light.lit.some(cell=>cell.x===x&&cell.y===y);
      this.mini.box(x+.18,y+.18,x+.82,y+.82,0,.09,'#c5b9d1');
      this.mini.box(x+.24,y+.24,x+.76,y+.76,.09,.16,lit?'#e7cd89':'#e2d7e8');
      const geometry=new THREE.OctahedronGeometry(.42);geometry.scale(.8,1.4,.8);
      this.mini.mesh(geometry,new THREE.MeshLambertMaterial({color:lit?'#b7a0d6':'#9b93b2',emissive:lit?'#806796':'#000000',emissiveIntensity:.22,flatShading:true}),x+.5,y+.5,.69,`crystal:${x},${y}`);
    }
    for(const mirror of game.mirrors){
      const {x,y,id,slash}=mirror,yaw=slash?Math.PI/4:-Math.PI/4;
      this.mini.box(x+.15,y+.15,x+.85,y+.85,.01,.12,this.selected===id?'#d6b568':'#b59a72',id);
      this.mini.box(x+.41,y+.41,x+.59,y+.59,.12,.3,'#b79a62',id);
      this.mini.mesh(new THREE.BoxGeometry(1.02,.76,.12),new THREE.MeshLambertMaterial({color:'#c6a468'}),x+.5,y+.5,.62,id,yaw);
      this.mini.mesh(new THREE.BoxGeometry(.84,.58,.14),new THREE.MeshLambertMaterial({color:'#b6cbd2'}),x+.5,y+.5,.62,id,yaw);
      if(this.selected===id){
        for(const dy of [.07,.9])this.mini.box(x+.07,y+dy,x+.93,y+dy+.03,.025,.055,'#c19944',id);
        for(const dx of [.07,.9])this.mini.box(x+dx,y+.07,x+dx+.03,y+.93,.025,.055,'#c19944',id);
      }
    }
    const {x,y,dir}=source;
    this.mini.box(x+.16,y+.16,x+.84,y+.84,0,.16,'#b49b70');
    this.mini.box(x+.25,y+.25,x+.75,y+.75,.16,.57,'#d2b77e');
    const offsets={n:[0,-.29],e:[.29,0],s:[0,.29],w:[-.29,0]} as const,[dx,dy]=offsets[dir];
    this.mini.box(x+.5+dx-.12,y+.5+dy-.12,x+.5+dx+.12,y+.5+dy+.12,.36,.62,'#f8e4b1');
    this.mini.box(x+.34,y+.34,x+.66,y+.66,.57,.65,'#eee0b6');
    this.laser.update(this.motion.matches?0:performance.now()/1000);
    this.mini.render();this.syncAnimation();
  }
}
