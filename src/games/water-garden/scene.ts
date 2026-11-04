import * as THREE from 'three';
import { MiniScene } from '../../shared/mini-scene';
import { flow,pipePorts,type Game } from './engine';
import { arrivalTime, WaterEffect, waterDistances } from './water-effect';
import { MaterialMotion } from '../../shared/material-motion';

type Point={x:number;y:number};

/** Garden geometry and tap input stay separate from channel connectivity rules. */
export class WaterScene {
  private mini:MiniScene;
  private game?:Game;
  private water?:WaterEffect;
  private watered = new Set<string>();
  private moves = 0;
  private pulse?: { elapsed: number; last?: number };
  private arrivals: { ring: THREE.Mesh; material: THREE.MeshBasicMaterial;
    at: number; petals: { mesh: THREE.Mesh; x: number }[] }[] = [];
  private motion:MaterialMotion;
  private selected:string|null=null;
  private pointers=new Set<number>();
  private multi=false;
  private press:{id:number;client:Point;pipe?:string;dragged:boolean}|null=null;
  constructor(host:HTMLElement,private onSelect:(id:string)=>void,private onRotate:(id:string)=>void){
    this.mini=new MiniScene(host,this.clearInput);
    this.motion=new MaterialMotion(this.animate,()=>this.mini.repaint());
    this.mini.canvas.setAttribute('aria-label','3D water garden. In Play, tap a channel tile to turn it. Choose Rotate to look around without turning tiles.');
    this.mini.canvas.addEventListener('pointerdown',this.down);
    this.mini.canvas.addEventListener('pointermove',this.move);
    this.mini.canvas.addEventListener('pointerup',this.up);
    this.mini.canvas.addEventListener('pointercancel',this.cancelInput);
    window.addEventListener('blur',this.cancelInput);
  }
  update(game:Game,selectedId:string|null){
    this.cancelInput();
    const forward = this.game === game && game.moves > this.moves;
    this.game=game;this.moves=game.moves;this.selected=selectedId;this.draw(forward);
  }
  private clearInput=()=>{this.press=null;this.pointers.clear();this.multi=false;};
  cancelInput=()=>{this.mini.cancelInput();};
  private pipeAt(point:Point){const id=this.mini.pick(point.x,point.y);return this.game?.pipes.some(pipe=>pipe.id===id)?id:undefined;}
  private down=(event:PointerEvent)=>{
    if(event.button!==0||this.mini.rotating||!this.game||this.game.status==='won')return;
    event.preventDefault();this.mini.canvas.setPointerCapture(event.pointerId);this.pointers.add(event.pointerId);
    if(this.multi||this.pointers.size>1){this.multi=true;this.press=null;return;}
    const client={x:event.clientX,y:event.clientY};this.press={id:event.pointerId,client,pipe:this.pipeAt(client),dragged:false};
  };
  private move=(event:PointerEvent)=>{const press=this.press;if(press?.id===event.pointerId&&Math.hypot(event.clientX-press.client.x,event.clientY-press.client.y)>8)press.dragged=true;};
  private up=(event:PointerEvent)=>{
    if(!this.pointers.has(event.pointerId))return;this.pointers.delete(event.pointerId);
    if(this.multi){if(!this.pointers.size)this.multi=false;this.press=null;return;}
    const press=this.press;if(!press||press.id!==event.pointerId)return;this.press=null;
    if(this.mini.rotating||!press.pipe||press.dragged||Math.hypot(event.clientX-press.client.x,event.clientY-press.client.y)>8)return;
    if(this.pipeAt({x:event.clientX,y:event.clientY})!==press.pipe)return;
    this.onSelect(press.pipe);this.onRotate(press.pipe);
  };
  private animate = (seconds: number) => {
    const pulse = this.pulse;
    if (pulse && seconds > 0) {
      if (pulse.last !== undefined) pulse.elapsed += Math.min(.08, Math.max(0, seconds - pulse.last)) * 1.2;
      pulse.last = seconds;
    }
    const elapsed = seconds === 0 ? Infinity : pulse?.elapsed ?? Infinity;
    this.water?.update(seconds, elapsed);
    for (const { ring, material, at, petals } of this.arrivals) {
      const t = elapsed - at;
      const active = t >= 0 && t < .42;
      const progress = active ? t / .42 : 1;
      ring.visible = active;
      ring.scale.setScalar(.28 + (1 - (1 - progress) ** 2) * 1.176);
      material.opacity = active ? .65 * (1 - progress) ** 2 : 0;
      const sway = active ? Math.sin(t * 24) * Math.exp(-t * 8) * .09 : 0;
      for (const { mesh, x } of petals) mesh.position.x = x + sway;
    }
    if (elapsed >= .9) this.pulse = undefined;
  };

  private draw(forward: boolean){
    const game=this.game;if(!game)return;
    const {width,height,source,flowers,rocks}=game.level,water=flow(game),has=(cells:Point[],x:number,y:number)=>cells.some(cell=>cell.x===x&&cell.y===y);
    const previous = this.watered;
    this.watered = new Set(water.watered.map(({x,y}) => `${x},${y}`));
    const distances = forward ? waterDistances(water.segments, source) : undefined;
    this.pulse = forward ? { elapsed: 0 } : undefined;
    this.arrivals = [];
    this.mini.clear();
    this.mini.box(-.16,-.16,width+.16,height+.16,-.38,-.08,'#ba9d79');
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)this.mini.box(x+.025,y+.025,x+.975,y+.975,-.08,0,(x+y)%2?'#e7e8d9':'#f4efdf');
    for(const [x,y,w,h] of [[-.18,-.18,width+.36,.13],[-.18,-.05,.13,height+.23],[-.05,height+.05,width+.23,.13],[width+.05,-.05,.13,height+.1]])this.mini.box(x,y,x+w,y+h,-.08,.13,'#c2c9a0');
    for(const {x,y} of rocks){
      this.mini.box(x+.12,y+.13,x+.88,y+.87,0,.28,'#aea99a',`rock:${x},${y}`);
      this.mini.box(x+.2,y+.21,x+.78,y+.76,.28,.4,'#c1bcab',`rock:${x},${y}`);
    }
    for(const pipe of game.pipes){
      const {x,y,id}=pipe,ports=pipePorts(pipe),wet=has(water.wet,x,y);
      this.mini.box(x+.04,y+.04,x+.96,y+.96,0,.14,'#c0a784',id);
      this.mini.box(x+.055,y+.055,x+.945,y+.945,.14,.155,'#cfbc96',id);
      const borders=[.055,.36,.64,.945];
      for(let row=0;row<3;row++)for(let col=0;col<3;col++){
        const channel=(row===1&&col===1)||(row===0&&col===1&&ports.includes('n'))||(row===1&&col===2&&ports.includes('e'))||(row===2&&col===1&&ports.includes('s'))||(row===1&&col===0&&ports.includes('w'));
        if(!channel)this.mini.box(x+borders[col],y+borders[row],x+borders[col+1],y+borders[row+1],.155,.28,'#f0e6cc',id);
        else if(wet)this.mini.box(x+borders[col],y+borders[row],x+borders[col+1],y+borders[row+1],.155,.185,'#72bfc6',id);
      }
      if(this.selected===id){
        for(const dy of [.025,.945])this.mini.box(x+.025,y+dy,x+.975,y+dy+.03,.015,.065,'#bc9950',id);
        for(const dx of [.025,.945])this.mini.box(x+dx,y+.025,x+dx+.03,y+.975,.015,.065,'#bc9950',id);
      }
    }
    this.water=new WaterEffect(this.mini,water.segments,source);
    for(const {x,y} of flowers){
      const watered=has(water.watered,x,y),owner=`flower:${x},${y}`,top=watered?.82:.67;
      this.mini.mesh(new THREE.CylinderGeometry(.3,.23,.3,8),new THREE.MeshLambertMaterial({color:'#bd9177'}),x+.5,y+.5,.18,owner);
      this.mini.mesh(new THREE.CylinderGeometry(.31,.31,.08,8),new THREE.MeshLambertMaterial({color:'#ddb295'}),x+.5,y+.5,.35,owner);
      this.mini.mesh(new THREE.CylinderGeometry(.25,.25,.025,8),new THREE.MeshLambertMaterial({color:watered?'#806d53':'#a08c6c'}),x+.5,y+.5,.395,owner);
      this.mini.box(x+.46,y+.46,x+.54,y+.54,.4,top,'#839f70',owner);
      this.mini.box(x+.26,y+.44,x+.48,y+.55,.52,.59,watered?'#9db984':'#a9ad8b',owner);
      this.mini.box(x+.52,y+.44,x+.74,y+.55,.61,.67,watered?'#9db984':'#a9ad8b',owner);
      const bloom: THREE.Mesh[] = [];
      for(let i=0;i<5;i++){
        const angle=i*Math.PI*2/5,geometry=new THREE.SphereGeometry(.14,6,4);geometry.scale(1,.6,1);
        bloom.push(this.mini.mesh(geometry,new THREE.MeshLambertMaterial({color:watered?'#e7a8bd':'#c8b1bb',flatShading:true}),x+.5+Math.cos(angle)*.16,y+.5+Math.sin(angle)*.16,top,owner));
      }
      bloom.push(this.mini.mesh(new THREE.SphereGeometry(.11,6,4),new THREE.MeshLambertMaterial({color:watered?'#f1d58c':'#d3c49b',flatShading:true}),x+.5,y+.5,top+.055,owner));
      const cell = `${x},${y}`;
      const distance = distances?.get(cell);
      if (watered && !previous.has(cell) && distance !== undefined && this.arrivals.length < 3) {
        const material = new THREE.MeshBasicMaterial({ color: '#a8f5f0', transparent: true, depthWrite: false });
        const ring = this.mini.mesh(new THREE.TorusGeometry(.23, .014, 4, 16), material, x + .5, y + .5, .41);
        ring.rotation.x = Math.PI / 2;
        ring.castShadow = ring.receiveShadow = ring.visible = false;
        this.arrivals.push({ ring, material, at: arrivalTime(distance), petals: bloom.map(mesh => ({ mesh, x: mesh.position.x })) });
      }
    }
    const {x,y,dir}=source,owner='spring';
    this.mini.box(x+.13,y+.13,x+.87,y+.87,0,.16,'#b4b49d',owner);
    this.mini.box(x+.2,y+.2,x+.8,y+.8,.16,.24,'#d5d4ba',owner);
    this.mini.box(x+.29,y+.29,x+.71,y+.71,.24,.265,'#72bfc6',owner);
    for(const dx of [.2,.7])this.mini.box(x+dx,y+.2,x+dx+.1,y+.8,.24,.36,'#c5c5a7',owner);
    for(const dy of [.2,.7])this.mini.box(x+.2,y+dy,x+.8,y+dy+.1,.24,.36,'#c5c5a7',owner);
    const offsets={n:[0,-.32],e:[.32,0],s:[0,.32],w:[-.32,0]} as const,[dx,dy]=offsets[dir];
    this.mini.box(x+.5+dx-.11,y+.5+dy-.11,x+.5+dx+.11,y+.5+dy+.11,.17,.26,'#b8a16d',owner);
    this.mini.box(x+.45,y+.45,x+.55,y+.55,.265,.38,'#a0d1d0',owner);
    this.mini.render();this.motion.refresh();
  }
}
