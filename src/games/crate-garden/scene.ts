import type { Mesh } from 'three';
import type { Direction, Game } from './engine';
import { MaterialMotion } from '../../shared/material-motion';
import { PixelBurst } from '../../shared/pixel-burst';
import { MiniScene } from '../../shared/mini-scene';

type Point = { x: number; y: number };
type Part = { mesh: Mesh; x: number; z: number };
export type StepCue = 'move' | { blocked: Direction };
const vectors: Record<Direction, Point> = {
  n: { x: 0, y: -1 }, e: { x: 1, y: 0 }, s: { x: 0, y: 1 }, w: { x: -1, y: 0 },
};

/** Resolve a screen swipe against the current camera's two projected ground axes. */
export function swipeDirection(delta:Point,xAxis:Point={x:32,y:16},yAxis:Point={x:-32,y:16}):Direction|null {
  if(Math.hypot(delta.x,delta.y)<12)return null;
  const determinant=xAxis.x*yAxis.y-xAxis.y*yAxis.x;
  if(Math.abs(determinant)<1e-6)return null;
  const x=(delta.x*yAxis.y-delta.y*yAxis.x)/determinant;
  const y=(xAxis.x*delta.y-xAxis.y*delta.x)/determinant;
  return Math.abs(x)>Math.abs(y)?x>0?'e':'w':y>0?'s':'n';
}

/** Three.js miniature; puzzle rules stay independent of camera and picking. */
export class CrateScene {
  private mini:MiniScene;
  private game?:Game;
  private readonly motion: MaterialMotion;
  private readonly burst = new PixelBurst('landing');
  private parts: Part[] = [];
  private crateParts: Part[] = [];
  private moving?: {
    dx: number;
    dy: number;
    crate?: Point;
    planted: boolean;
    blocked: boolean;
    elapsed: number;
    previous?: number;
    contact: boolean;
  };
  private pointers=new Set<number>();
  private multi=false;
  private press:{id:number;client:Point}|null=null;
  constructor(host:HTMLElement,private onDirection:(direction:Direction)=>void){
    this.mini=new MiniScene(host,this.clearInput,true);
    this.mini.effects.add(this.burst.object);
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    this.mini.canvas.setAttribute('role','img');
    this.mini.canvas.setAttribute('aria-label','3D crate garden. Swipe or tap with one finger to move. Drag with two fingers to rotate, or pinch to zoom.');
    this.mini.canvas.addEventListener('pointerdown',this.down);
    this.mini.canvas.addEventListener('pointerup',this.up);
    this.mini.canvas.addEventListener('pointercancel',this.cancelInput);
    window.addEventListener('blur',this.cancelInput);
  }
  screenDirection(dir:Direction){const [x,y]=dir==='n'?[0,-1]:dir==='e'?[1,0]:dir==='s'?[0,1]:[-1,0];return this.mini.direction(x,y);}
  update(game:Game, cue?: StepCue) {
    this.cancelInput();
    this.motion.stop();
    this.burst.clear();
    this.moving = undefined;
    const previous = cue === 'move' ? game.history[game.history.length - 1] : undefined;
    const direction = previous?.direction ?? (typeof cue === 'object' ? cue.blocked : undefined);
    if (direction) {
      const crate = previous && game.crates.find((cell, i) =>
        cell.x !== previous.crates[i].x || cell.y !== previous.crates[i].y);
      const planted = !!crate && game.level.goals.some(goal => goal.x === crate.x && goal.y === crate.y);
      const { x: dx, y: dy } = vectors[direction];
      this.moving = { dx, dy, crate, planted, blocked: !previous, elapsed: 0, contact: false };
    }
    this.game=game;
    this.draw();
    if (this.moving) this.motion.refresh();
  }
  private clearInput=()=>{this.press=null;this.pointers.clear();this.multi=false;};
  cancelInput=()=>{this.clearInput();this.mini.cancelInput();};
  private down=(event:PointerEvent)=>{
    if(event.button!==0||this.mini.rotating||!this.game||this.game.status==='won')return;
    event.preventDefault();this.mini.canvas.setPointerCapture(event.pointerId);this.pointers.add(event.pointerId);
    if(this.pointers.size>1||this.multi){this.multi=true;this.press=null;return;}
    this.press={id:event.pointerId,client:{x:event.clientX,y:event.clientY}};
  };
  private up=(event:PointerEvent)=>{
    if(!this.pointers.has(event.pointerId))return;
    this.pointers.delete(event.pointerId);
    if(this.multi){if(!this.pointers.size)this.multi=false;this.press=null;return;}
    const press=this.press;this.press=null;
    if(!press||press.id!==event.pointerId||!this.game||this.mini.rotating)return;
    const {player}=this.game,origin=this.mini.project(player.x,player.y,0);
    const east=this.mini.project(player.x+1,player.y,0),south=this.mini.project(player.x,player.y+1,0);
    const direction=swipeDirection({x:event.clientX-press.client.x,y:event.clientY-press.client.y},
      {x:east.x-origin.x,y:east.y-origin.y},{x:south.x-origin.x,y:south.y-origin.y});
    if(direction){this.onDirection(direction);return;}
    const owner=this.mini.pick(press.client.x,press.client.y),match=owner?.match(/^tile:(\d+),(\d+)$/);
    const tile=match?{x:Number(match[1]),y:Number(match[2])}:this.mini.ground(press.client.x,press.client.y);
    if(!tile)return;
    const dx=Math.floor(tile.x)-player.x,dy=Math.floor(tile.y)-player.y;
    if(Math.abs(dx)+Math.abs(dy)===1)this.onDirection(dx===1?'e':dx===-1?'w':dy===1?'s':'n');
  };
  private box(x:number,y:number,w:number,h:number,bottom:number,top:number,color:string,owner?:string){
    return this.mini.box(x,y,x+w,y+h,bottom,top,color,owner);
  }
  private animate = (seconds: number) => {
    const move = this.moving;
    if (!move) return;
    if (move.previous !== undefined) move.elapsed += Math.min(.075, Math.max(0, seconds - move.previous));
    move.previous = seconds;
    const duration = move.blocked ? .17 : move.crate ? .25 : .16;
    const progress = seconds === 0 ? 1 : Math.min(1, move.elapsed / duration);
    const position = (parts: Part[], distance: number) => {
      for (const { mesh, x, z } of parts) {
        mesh.position.x = x + move.dx * distance;
        mesh.position.z = z + move.dy * distance;
      }
    };
    const walk = move.blocked ? .1 * Math.sin(progress * Math.PI) : -((1 - progress) ** 2);
    // A push accelerates the crate after the gardener leans into it.
    position(this.parts, walk);
    position(this.crateParts, -(1 - progress * progress * (3 - 2 * progress)));
    if (progress < 1) return;
    if (seconds !== 0 && move.crate) {
      if (!move.contact) {
        move.contact = true;
        move.elapsed = duration;
        this.burst.start(move.crate.x + .5, .03, move.crate.y + .5,
          move.planted ? 'leaf' : 'dust', this.game?.pushes, move.planted ? 8 : 5);
      }
      if (this.burst.update(move.elapsed - duration)) return;
    }
    this.burst.clear();
    this.moving = undefined;
    this.motion.stop();
  };

  private draw(){
    const game=this.game;if(!game)return;
    const {width,height,walls,goals}=game.level,has=(cells:Point[],x:number,y:number)=>cells.some(c=>c.x===x&&c.y===y);
    this.mini.clear();
    this.parts = [];
    this.crateParts = [];
    this.box(-.16,-.16,width+.32,height+.32,-.45,-.09,'#b89570');
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const goal=has(goals,x,y),filled=has(game.crates,x,y),owner=`tile:${x},${y}`;
      this.box(x+.025,y+.025,.95,.95,-.09,0,goal?'#c0cda0':(x+y)%2?'#eee6d6':'#faf2df',owner);
      if(goal){
        this.box(x+.17,y+.17,.66,.66,.005,.025,filled?'#97b76a':'#a8b884',owner);
        for(const [u,v] of [[.3,.3],[.6,.3],[.3,.6],[.6,.6]])this.box(x+u,y+v,.12,.12,.03,.075,'#dfe6bc',owner);
      }
      if(has(walls,x,y)){
        this.box(x+.035,y+.035,.93,.93,0,.48,'#c5bdac',owner);
        this.box(x+.065,y+.065,.87,.87,.47,.62,'#a0b68a',owner);
        this.box(x+.16,y+.16,.68,.68,.61,.74,'#b7c69b',owner);
      }
    }
    for(const crate of game.crates){
      const {x,y}=crate,owner=`tile:${x},${y}`,onGoal=has(goals,x,y),wood=onGoal?'#9bae73':'#c79c62',trim=onGoal?'#cad69e':'#e3bd7b';
      const part = (px: number, py: number, w: number, h: number, low: number, high: number, color: string) => {
        const mesh = this.box(px, py, w, h, low, high, color, owner);
        if (mesh && this.moving?.crate === crate) this.crateParts.push({ mesh, x: mesh.position.x, z: mesh.position.z });
      };
      part(x+.1,y+.1,.8,.8,.02,.7,wood);
      part(x+.09,y+.09,.82,.82,.69,.78,trim);
      part(x+.2,y+.2,.6,.6,.78,.8,wood);
      // Raised slats give the lid a tactile seed-crate construction.
      part(x+.43,y+.17,.14,.66,.8,.85,trim);
      part(x+.17,y+.43,.66,.14,.8,.85,trim);
      for(const u of [.16,.72]){
        part(x+u,y+.895,.1,.035,.08,.65,trim);
        part(x+.895,y+u,.035,.1,.08,.65,trim);
      }
      part(x+.22,y+.895,.56,.035,.27,.39,trim);
      part(x+.895,y+.22,.035,.56,.33,.45,trim);
      if(onGoal)part(x+.36,y+.36,.28,.28,.85,.96,'#e9dd9e');
    }
    const {x,y}=game.player,owner=`tile:${game.player.x},${game.player.y}`;
    const part = (px: number, py: number, w: number, h: number, low: number, high: number, color: string) => {
      const mesh = this.box(px, py, w, h, low, high, color, owner);
      if (mesh && this.moving) this.parts.push({ mesh, x: mesh.position.x, z: mesh.position.z });
    };
    part(x+.25,y+.3,.19,.4,0,.15,'#705b54');part(x+.55,y+.3,.19,.4,0,.15,'#705b54');
    part(x+.25,y+.28,.5,.44,.14,.6,'#ba8995');
    part(x+.19,y+.24,.62,.52,.18,.3,'#9caec0');
    part(x+.32,y+.32,.36,.36,.6,.91,'#efca9e');
    part(x+.16,y+.16,.68,.68,.9,.98,'#d8bd79');
    part(x+.29,y+.29,.42,.42,.98,1.15,'#e8d196');
    this.mini.render();
  }
}
