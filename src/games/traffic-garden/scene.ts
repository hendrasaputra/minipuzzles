import * as THREE from 'three';
import { canMove, type Car, type Game, type Move } from './engine';
import { MaterialMotion } from '../../shared/material-motion';
import { PixelBurst } from '../../shared/pixel-burst';
import { MiniScene } from '../../shared/mini-scene';
import { SlideGesture, type Point } from './projection';

function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map(channel => Math.max(0, Math.min(255, Math.round(channel * amount)))).join(',')})`;
}

interface Slide {
  car: Car;
  offset: number;
  sign: number;
  blocked: boolean;
  parts: { mesh: THREE.Object3D; position: number; scale: number; wheel: boolean }[];
  elapsed: number;
  previous?: number;
  contact: boolean;
}

/** Toy geometry remains independent from the sliding-car rules. */
export class TrafficScene {
  private mini: MiniScene;
  private game?: Game;
  private selected: string | null = null;
  private gesture = new SlideGesture();
  private pointers = new Set<number>();
  private multiTouch = false;
  private stateKey = '';
  private readonly motion: MaterialMotion;
  private readonly burst = new PixelBurst();
  private slide?: Slide;
  private release?: number;

  constructor(host: HTMLElement, private onSelect: (id: string) => void, private onMove: (id: string, delta: number) => void) {
    this.mini = new MiniScene(host, () => {
      this.clearInput();
      this.clearEffect();
      if (this.game) this.draw();
    });
    this.mini.effects.add(this.burst.object);
    this.motion = new MaterialMotion(this.animate, () => this.mini.repaint());
    this.mini.canvas.setAttribute('aria-label', '3D parking garden. Drag a car along its length. Drag with two fingers to rotate the board.');
    this.mini.canvas.addEventListener('pointerdown', this.down);
    this.mini.canvas.addEventListener('pointermove', this.move);
    this.mini.canvas.addEventListener('pointerup', this.up);
    this.mini.canvas.addEventListener('pointercancel', () => this.cancelInput());
    window.addEventListener('blur', () => this.cancelInput());
  }

  screenDirection(axis:'h'|'v',sign:number){return this.mini.direction(axis==='h'?sign:0,axis==='v'?sign:0);}
  update(game: Game, selectedId: string | null, move?: Move): void {
    const key = game.cars.map(car => `${car.id}:${car.x},${car.y}`).join('|');
    if (game !== this.game || key !== this.stateKey) this.clearInput();
    this.clearEffect();
    const car = move && game.cars.find(car => car.id === move.id);
    if (car && move) this.prepareSlide(car, (this.release ?? 0) - move.delta, Math.sign(move.delta), false);
    this.game = game;
    this.selected = selectedId;
    this.stateKey = key;
    this.draw();
    if (this.slide) this.motion.refresh();
  }
  cancelInput(): void { this.mini.cancelInput(); }
  private clearInput(): void { this.gesture.cancel(); this.pointers.clear(); this.multiTouch = false; }
  private box(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, color: string, owner?: string) {
    return this.mini.box(x0, y0, x1, y1, z0, z1, color, owner);
  }
  private car(car: Car): void {
    const slide = this.slide?.car.id === car.id ? this.slide : undefined;
    const axis = car.axis === 'h' ? 'x' : 'z';
    const add = (mesh: THREE.Object3D | undefined, wheel = false) => {
      if (mesh && slide) slide.parts.push({ mesh, position: mesh.position[axis], scale: mesh.scale[axis], wheel });
    };
    const box = (u0:number,v0:number,u1:number,v1:number,z0:number,z1:number,color:string) => {
      add(this.box(car.x+(car.axis==='h'?u0:v0),car.y+(car.axis==='h'?v0:u0),
        car.x+(car.axis==='h'?u1:v1),car.y+(car.axis==='h'?v1:u1),z0,z1,color,car.id));
    };
    box(.12,.1,car.length-.12,.9,.07,.19,'#726774');
    box(.1,.08,car.length-.1,.92,.18,.48,car.color);
    for (const u of [.36, car.length - .36]) for (const v of [.06, .94]) {
      const wheel = new THREE.CylinderGeometry(.115, .115, .12, 8);
      if (car.axis === 'h') wheel.rotateX(Math.PI / 2);
      else wheel.rotateZ(Math.PI / 2);
      add(this.mini.mesh(wheel, new THREE.MeshLambertMaterial({ color: '#615b69', flatShading: true }),
        car.x + (car.axis === 'h' ? u : v), car.y + (car.axis === 'h' ? v : u), .115, car.id), true);
    }
    const cab = car.length===3?car.length-1.05:.49;
    box(cab,.18,cab+.78,.82,.47,.68,'#a9c4cb');
    box(cab-.05,.13,cab+.83,.87,.67,.76,car.color);
    if (car.length===3) box(.23,.18,1.65,.82,.47,.57,shade(car.color,.93));
    for (const v of [.23,.64]) box(car.length-.13,v,car.length-.075,v+.12,.28,.39,'#fff0b5');
    add(this.mini.label(car.id==='coral'?'★':car.id.replace(/^car-/,'').slice(0,2).toUpperCase(),
      car.x+(car.axis==='h'?cab+.39:.5),car.y+(car.axis==='h'?.5:cab+.39),.79));
  }
  private draw(): void {
    const game=this.game;if(!game)return;
    this.mini.clear();
    if (this.slide) this.slide.parts = [];
    this.box(-.16,-.16,6.16,6.16,-.48,-.08,'#bd946c');
    for(let y=0;y<6;y++)for(let x=0;x<6;x++)this.box(x+.025,y+.025,x+.975,y+.975,-.075,0,(x+y)%2?'#ede5d5':'#f3ecde');
    // The near-right rim has a physical gap for the coral car's exit.
    this.box(-.18,-.18,6.18,-.03,0,.27,'#d3b68c');
    this.box(-.18,-.03,-.03,6.18,0,.27,'#d3b68c');
    this.box(-.03,6.03,6.18,6.18,0,.2,'#d3b68c');
    this.box(6.03,-.03,6.18,1.93,0,.2,'#d3b68c');
    this.box(6.03,3.07,6.18,6.03,0,.2,'#d3b68c');
    this.box(6.18,2.08,7.18,2.92,-.1,.01,'#d4c7ac');
    for(const y of [1.9,3.1]){this.box(6.04,y-.055,6.15,y+.055,0,.56,'#af8645');this.box(6.005,y-.09,6.185,y+.09,.53,.64,'#d6b16c');}
    for(const [x,y] of [[-.4,-.4],[6.5,5.7]]){
      this.box(x-.2,y-.2,x+.2,y+.2,-.1,.18,'#b98e68');
      this.box(x-.23,y-.22,x+.22,y+.23,.16,.48,'#91a780');
      this.box(x-.12,y-.15,x+.15,y+.1,.46,.63,'#adc29a');
    }
    const preview=this.gesture.preview;
    const cars=game.cars.map(car=>preview?.id===car.id?{...car,x:car.x+(car.axis==='h'?preview.delta:0),y:car.y+(car.axis==='v'?preview.delta:0)}:car);
    const selected=cars.find(car=>car.id===this.selected);
    if(selected){
      const x0=selected.x-.035,y0=selected.y-.035;
      const x1=selected.x+(selected.axis==='h'?selected.length:1)+.035,y1=selected.y+(selected.axis==='v'?selected.length:1)+.035;
      for(const [a,b,c,d] of [[x0,y0,x1,y0+.035],[x0,y1-.035,x1,y1],[x0,y0,x0+.035,y1],[x1-.035,y0,x1,y1]])
        this.box(a,b,c,d,.005,.035,'#b28a43',selected.id);
    }
    cars.forEach(car=>this.car(car));
    if(game.status!=='won')this.mini.label('→',6.64,2.5,.035);
    this.mini.render();
  }
  showBlocked(car: Car, sign: number) {
    this.clearEffect();
    this.prepareSlide(car, 0, sign, true);
    this.draw();
    this.motion.refresh();
  }

  private clearEffect() {
    this.motion.stop();
    this.slide = undefined;
    this.burst.clear();
  }

  private prepareSlide(car: Car, offset: number, sign: number, blocked: boolean) {
    this.slide = { car, offset, sign, blocked, parts: [], elapsed: 0, contact: false };
  }

  private animate = (time: number) => {
    const slide = this.slide;
    if (!slide) return;
    const { car } = slide;
    const axis = car.axis === 'h' ? 'x' : 'z';
    const start = car.axis === 'h' ? car.x : car.y;
    const center = start + car.length / 2;
    if (slide.previous !== undefined) slide.elapsed += Math.min(.075, Math.max(0, time - slide.previous));
    slide.previous = time;
    const duration = slide.blocked ? .14 : .15 + Math.min(.12, Math.abs(slide.offset) * .045);
    const progress = time === 0 ? 1 : Math.min(1, slide.elapsed / duration);
    const travel = slide.offset * (1 - progress) ** 2;
    const squash = slide.blocked ? .045 * Math.sin(Math.PI * progress) : 0;
    const fixedEnd = center + slide.sign * car.length / 2;
    for (const part of slide.parts) {
      part.mesh.position[axis] = part.position + travel + (fixedEnd - part.position) * squash;
      part.mesh.scale[axis] = part.scale * (1 - squash);
      if (part.wheel) part.mesh.rotation[axis === 'x' ? 'z' : 'x'] = (axis === 'x' ? -1 : 1) * travel / .115;
    }
    if (time === 0) { this.clearEffect(); return; }
    if (progress < 1) return;
    if (!slide.contact) {
      slide.contact = true;
      slide.elapsed = duration;
      const rear = slide.sign > 0 ? .18 : car.length - .18;
      const contact = slide.blocked ? car.length - rear : rear;
      this.burst.start(car.x + (axis === 'x' ? contact : .5), .025, car.y + (axis === 'x' ? .5 : contact),
        slide.blocked || (car.id === 'coral' && car.x >= 6) ? 'spark' : 'dust', this.game?.history.length, slide.blocked ? 4 : 6);
    }
    if (!this.burst.update(slide.elapsed - duration)) this.clearEffect();
  };

  private point(event:PointerEvent):Point {return {x:event.clientX,y:event.clientY};}
  private down=(event:PointerEvent)=>{
    if(event.button!==0||this.mini.rotating||!this.game||this.game.status==='won')return;
    if (this.slide) { this.clearEffect(); this.draw(); }
    event.preventDefault();this.mini.canvas.setPointerCapture(event.pointerId);this.pointers.add(event.pointerId);
    if(this.pointers.size>1||this.multiTouch){this.multiTouch=true;this.gesture.cancel();this.draw();return;}
    const point=this.point(event),id=this.mini.pick(point.x,point.y),car=this.game.cars.find(car=>car.id===id);
    if(!car){this.gesture.cancel();return;}
    const allowed=Array.from({length:13},(_,i)=>i-6).filter(delta=>canMove(this.game!,car.id,delta));
    const a=this.mini.project(car.x,car.y,.5),b=this.mini.project(car.x+(car.axis==='h'?1:0),car.y+(car.axis==='v'?1:0),.5);
    this.gesture.begin(car.id,{x:b.x-a.x,y:b.y-a.y},point,allowed);
    this.onSelect(car.id);this.draw();
  };
  private move=(event:PointerEvent)=>{
    if(this.mini.rotating||!this.pointers.has(event.pointerId)||this.multiTouch)return;
    this.gesture.move(this.point(event));this.draw();
  };
  private up=(event:PointerEvent)=>{
    if(this.mini.rotating||!this.pointers.has(event.pointerId))return;
    this.pointers.delete(event.pointerId);
    if(this.multiTouch){if(!this.pointers.size)this.multiTouch=false;this.gesture.cancel();this.draw();return;}
    const preview = this.gesture.preview;
    const blocked = this.gesture.blocked;
    const move = this.gesture.finish();
    if (move) {
      this.release = preview?.delta;
      this.onMove(move.id, move.delta);
      this.release = undefined;
    } else if (preview && blocked) {
      const car = this.game?.cars.find(candidate => candidate.id === preview.id);
      if (car) { this.showBlocked(car, blocked); return; }
    }
    if (!move) this.draw();
  };
}
