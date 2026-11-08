import * as THREE from 'three';
import type { Direction,Game } from './engine';
import { MiniScene } from '../../shared/mini-scene';
import { MaterialMotion } from '../../shared/material-motion';
import { IceEffect,slidePoint,type Point } from './ice-effect';
import { PixelBurst } from '../../shared/pixel-burst';

export function swipeDirection(delta:Point,xAxis:Point,yAxis:Point):Direction|null{
  if(Math.hypot(delta.x,delta.y)<12)return null;
  const determinant=xAxis.x*yAxis.y-xAxis.y*yAxis.x;if(Math.abs(determinant)<1e-6)return null;
  const x=(delta.x*yAxis.y-delta.y*yAxis.x)/determinant,y=(xAxis.x*delta.y-xAxis.y*delta.x)/determinant;
  return Math.abs(x)>Math.abs(y)?x>0?'e':'w':y>0?'s':'n';
}

/** Rules advance immediately; sliding and ice particles are visual only. */
export class FrostScene {
  private mini:MiniScene;
  private motion:MaterialMotion;
  private ice?:IceEffect;
  private game?:Game;
  private logical?:Point;
  private slide?:{from:Point;to:Point;elapsed:number;last:number;duration:number;pickups:Point[]};
  private burst = new PixelBurst();
  private moves = 0;
  private effectTime = 0;
  private lastTime?: number;
  private burstAt = -Infinity;
  private landing?: Point;
  private pendingPickups: Point[] = [];
  private penguin:{mesh:THREE.Mesh;position:THREE.Vector3}[]=[];
  private pointers=new Set<number>();
  private multi=false;
  private press:{id:number;point:Point}|null=null;
  constructor(host:HTMLElement,private onMove:(direction:Direction)=>void){
    this.mini=new MiniScene(host,this.clearInput);
    this.mini.effects.add(this.burst.object);
    this.motion=new MaterialMotion(this.animate,()=>this.mini.repaint());
    this.mini.canvas.setAttribute('aria-label','3D ice puzzle. Swipe along the ice or tap beside the penguin to slide. Drag with two fingers to rotate the board.');
    this.mini.canvas.addEventListener('pointerdown',this.down);this.mini.canvas.addEventListener('pointerup',this.up);this.mini.canvas.addEventListener('pointercancel',this.cancelInput);
    window.addEventListener('blur',this.cancelInput);
  }
  screenDirection(dir:Direction){const [x,y]=dir==='n'?[0,-1]:dir==='e'?[1,0]:dir==='s'?[0,1]:[-1,0];return this.mini.direction(x,y);}
  update(game:Game){
    this.cancelInput();const from=this.logical,to={...game.player};
    const forward = this.game === game && game.moves > this.moves;
    const previous = forward ? game.history.at(-1)?.collected ?? [] : [];
    const pickups = forward
      ? game.collected.filter(fish => !previous.some(point => point.x === fish.x && point.y === fish.y))
      : [];
    if (from) pickups.sort((a, b) =>
      Math.hypot(a.x - from.x, a.y - from.y) - Math.hypot(b.x - from.x, b.y - from.y));
    this.slide = this.game === game && from && game.moves >= this.moves && (from.x !== to.x || from.y !== to.y)
      ? { from, to, elapsed: 0, last: performance.now() / 1000, pickups,
        duration: Math.min(.29, .15 + Math.hypot(to.x - from.x, to.y - from.y) * .025) }
      : undefined;
    this.moves = game.moves;
    this.burst.clear();
    this.effectTime = 0;
    this.lastTime = undefined;
    this.burstAt = -Infinity;
    this.landing = undefined;
    this.pendingPickups = [];
    this.game=game;this.logical=to;this.draw();
  }
  private clearInput=()=>{this.press=null;this.pointers.clear();this.multi=false;};
  cancelInput=()=>{this.mini.cancelInput();};
  private down=(event:PointerEvent)=>{
    if(event.button!==0||!this.game||this.game.status==='won'||this.mini.rotating)return;
    event.preventDefault();this.mini.canvas.setPointerCapture(event.pointerId);this.pointers.add(event.pointerId);
    if(this.multi||this.pointers.size>1){this.multi=true;this.press=null;return;}
    this.press={id:event.pointerId,point:{x:event.clientX,y:event.clientY}};
  };
  private up=(event:PointerEvent)=>{
    if(!this.pointers.has(event.pointerId))return;this.pointers.delete(event.pointerId);
    if(this.multi){if(!this.pointers.size)this.multi=false;this.press=null;return;}
    const press=this.press;if(press?.id!==event.pointerId)return;this.press=null;
    const game=this.game;if(!game||this.mini.rotating)return;
    const a=this.mini.project(game.player.x,game.player.y),b=this.mini.project(game.player.x+1,game.player.y),c=this.mini.project(game.player.x,game.player.y+1);
    const dir=swipeDirection({x:event.clientX-press.point.x,y:event.clientY-press.point.y},{x:b.x-a.x,y:b.y-a.y},{x:c.x-a.x,y:c.y-a.y});
    if(dir){this.onMove(dir);return;}
    const owner=this.mini.pick(press.point.x,press.point.y),match=owner?.match(/^tile:(\d+),(\d+)$/);
    const tile=match?{x:Number(match[1]),y:Number(match[2])}:this.mini.ground(press.point.x,press.point.y);if(!tile)return;
    const dx=Math.floor(tile.x)-game.player.x,dy=Math.floor(tile.y)-game.player.y;
    if(Math.abs(dx)+Math.abs(dy)===1)this.onMove(dx===1?'e':dx===-1?'w':dy===1?'s':'n');
  };
  private animate=(seconds:number)=>{
    this.ice?.update(seconds);
    if (seconds === 0) {
      this.burst.clear();
      this.landing = undefined;
      this.pendingPickups = [];
    } else {
      if (this.lastTime !== undefined) this.effectTime += Math.min(.08, Math.max(0, seconds - this.lastTime));
      this.lastTime = seconds;
    }
    const slide = this.slide;
    if (slide) {
      if (seconds > 0) {
        slide.elapsed += Math.min(.08, Math.max(0, seconds - slide.last));
        slide.last = seconds;
      }
      const progress = seconds === 0 ? 1 : slide.elapsed / slide.duration;
      const point = slidePoint(slide.from, slide.to, progress);
      for (const part of this.penguin) {
        part.mesh.position.set(part.position.x + (point.x - slide.to.x), part.position.y,
          part.position.z + (point.y - slide.to.y));
      }
      if (seconds > 0) {
        const distance = Math.hypot(point.x - slide.from.x, point.y - slide.from.y);
        while (slide.pickups.length) {
          const fish = slide.pickups[0];
          if (progress < 1 && distance < Math.hypot(fish.x - slide.from.x, fish.y - slide.from.y)) break;
          this.pendingPickups.push(slide.pickups.shift()!);
        }
      }
      if (progress >= 1) {
        if (seconds > 0) this.landing = slide.to;
        this.slide = undefined;
      }
    }
    if (seconds > 0 && this.pendingPickups.length && this.effectTime - this.burstAt >= .14) {
      const {x,y} = this.pendingPickups.shift()!;
      this.burst.start(x + .5, .13, y + .5, 'spark', x + y * 17, 8);
      this.burstAt = this.effectTime;
    }
    if (this.landing && !this.pendingPickups.length && seconds > 0 && this.effectTime - this.burstAt >= .18) {
      const {x,y} = this.landing;
      this.burst.start(x + .5, .02, y + .5, 'ice', x + y * 17, 8);
      this.burstAt = this.effectTime;
      this.landing = undefined;
    }
    this.burst.update(this.effectTime - this.burstAt);
  };
  private draw(){
    const game=this.game;if(!game)return;
    const {width,height,rocks,goal,fish}=game.level,has=(cells:Point[],x:number,y:number)=>cells.some(c=>c.x===x&&c.y===y);
    this.mini.clear();this.penguin=[];
    this.mini.box(-.16,-.16,width+.16,height+.16,-.45,-.12,'#a5bec8');
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const owner=`tile:${x},${y}`;
      this.mini.box(x+.025,y+.025,x+.975,y+.975,-.12,0,(x+y)%2?'#bfdae2':'#d4e8ec',owner);
      this.mini.box(x+.08,y+.08,x+.92,y+.92,.001,.014,'#e1f0f0',owner);
      if((x+y)%3===0){
        this.mini.box(x+.23,y+.26,x+.65,y+.28,.016,.021,'#f6fbf7');
        this.mini.box(x+.63,y+.27,x+.65,y+.48,.016,.021,'#f6fbf7');
      }
      if(has(rocks,x,y)){
        this.mini.box(x+.08,y+.08,x+.92,y+.92,0,.4,'#9aaeb9',owner);
        this.mini.box(x+.14,y+.12,x+.88,y+.88,.4,.55,'#f3f5ed',owner);
        this.mini.box(x+.23,y+.2,x+.72,y+.73,.54,.65,'#fcfcf1',owner);
      }
    }
    const home=`tile:${goal.x},${goal.y}`;
    this.mini.box(goal.x+.1,goal.y+.1,goal.x+.9,goal.y+.9,.018,.06,'#87b8c9',home);
    const ring=this.mini.mesh(new THREE.TorusGeometry(.3,.035,5,20),new THREE.MeshLambertMaterial({color:'#eaf8fa'}),goal.x+.5,goal.y+.5,.09,home);ring.rotation.x=Math.PI/2;
    this.mini.box(goal.x+.75,goal.y+.1,goal.x+.81,goal.y+.18,.06,.65,'#89a6b7',home);
    this.mini.box(goal.x+.77,goal.y+.13,goal.x+.97,goal.y+.18,.48,.65,'#a1c7d8',home);
    for(const item of fish)if(!has(game.collected,item.x,item.y)){
      const owner=`tile:${item.x},${item.y}`,body=new THREE.SphereGeometry(.18,8,5);body.scale(1.2,.45,.65);
      this.mini.mesh(body,new THREE.MeshLambertMaterial({color:'#e9bf67',flatShading:true}),item.x+.53,item.y+.5,.16,owner);
      const tail=this.mini.mesh(new THREE.ConeGeometry(.12,.18,3),new THREE.MeshLambertMaterial({color:'#d8a956',flatShading:true}),item.x+.3,item.y+.5,.16,owner);tail.rotation.z=-Math.PI/2;
      const eye=this.mini.mesh(new THREE.SphereGeometry(.022,4,3),new THREE.MeshBasicMaterial({color:'#766754'}),item.x+.65,item.y+.45,.2,owner);eye.castShadow=false;
    }
    const {x,y}=game.player,owner=`tile:${x},${y}`;
    const add=(geometry:THREE.BufferGeometry,color:string,px:number,py:number,z:number,yaw=0)=>{
      const mesh=this.mini.mesh(geometry,new THREE.MeshLambertMaterial({color,flatShading:true}),px,py,z,owner,yaw);mesh.castShadow=false;
      this.penguin.push({mesh,position:mesh.position.clone()});return mesh;
    };
    for(const dx of [-.14,.14])add(new THREE.BoxGeometry(.19,.07,.28),'#dca85d',x+.5+dx,y+.62,.06);
    const body=new THREE.SphereGeometry(.33,10,7);body.scale(1,1.5,.9);add(body,'#4c5966',x+.5,y+.5,.51);
    const belly=new THREE.SphereGeometry(.26,10,6);belly.scale(.9,1.2,.28);add(belly,'#f4f1df',x+.5,y+.755,.49);
    add(new THREE.SphereGeometry(.25,10,7),'#4c5966',x+.5,y+.5,.93);
    for(const dx of [-.1,.1])add(new THREE.SphereGeometry(.064,6,4),'#fff8e9',x+.5+dx,y+.705,.96);
    for(const dx of [-.1,.1])add(new THREE.SphereGeometry(.029,6,4),'#3e4652',x+.5+dx,y+.756,.96);
    const beak=add(new THREE.ConeGeometry(.095,.22,4),'#dfad60',x+.5,y+.79,.88);beak.rotation.x=Math.PI/2;
    add(new THREE.BoxGeometry(.48,.1,.48),'#c48fa3',x+.5,y+.5,.76);
    add(new THREE.BoxGeometry(.1,.28,.06),'#d9a1af',x+.7,y+.73,.63);
    for(const dx of [-.3,.3]){const wing=new THREE.SphereGeometry(.14,7,5);wing.scale(.55,1.5,.7);add(wing,'#4c5966',x+.5+dx,y+.5,.52);}
    this.ice=new IceEffect(this.mini,width,height);this.mini.render();this.motion.refresh();
  }
}
