import { canMove, type Car, type Game } from './engine';
import { canvasPoint, inside, project, SlideGesture, VIEW, type Point } from './projection';

interface Face { layer: number; points: Point[]; color: string; depth: number; owner?: string; label?: string }
function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return `rgb(${[n >> 16, (n >> 8) & 255, n & 255].map(channel => Math.max(0, Math.min(255, Math.round(channel * amount)))).join(',')})`;
}

/** Original fixed-camera Canvas miniature; no WebGL or Pixel Plays source dependency. */
export class TrafficScene {
  private canvas = document.createElement('canvas');
  private context: CanvasRenderingContext2D;
  private game?: Game;
  private selected: string | null = null;
  private faces: Face[] = [];
  private gesture = new SlideGesture();
  private pointers = new Set<number>();
  private multiTouch = false;
  private layer = 0;
  private stateKey = '';
  private observer: ResizeObserver;

  constructor(private host: HTMLElement, private onSelect: (id: string) => void, private onMove: (id: string, delta: number) => void) {
    this.canvas.width = VIEW.width; this.canvas.height = VIEW.height;
    Object.assign(this.canvas.style, { width: '100%', height: '100%', objectFit: 'contain', display: 'block', imageRendering: 'pixelated', touchAction: 'none', userSelect: 'none', webkitUserSelect: 'none', webkitTouchCallout: 'none' });
    this.canvas.setAttribute('role', 'img');
    this.canvas.setAttribute('aria-label', 'Isometric parking garden. Drag a car along its length, or use the car selector and move buttons.');
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Canvas rendering is unavailable');
    this.context = context; this.context.imageSmoothingEnabled = false;
    host.append(this.canvas);
    this.observer = new ResizeObserver(() => this.draw()); this.observer.observe(host);
    this.canvas.addEventListener('pointerdown', this.down);
    this.canvas.addEventListener('pointermove', this.move);
    this.canvas.addEventListener('pointerup', this.up);
    this.canvas.addEventListener('pointercancel', this.cancel);
    this.canvas.addEventListener('contextmenu', event => event.preventDefault());
    window.addEventListener('blur', this.cancel);
  }

  update(game: Game, selectedId: string | null): void {
    const key = game.cars.map(car => `${car.id}:${car.x},${car.y}`).join('|');
    if (game !== this.game || key !== this.stateKey) this.clearInput();
    this.game = game; this.selected = selectedId; this.stateKey = key; this.draw();
  }
  cancelInput(): void { this.clearInput(); this.draw(); }
  private clearInput(): void { this.gesture.cancel(); this.pointers.clear(); this.multiTouch = false; }
  private polygon(points: Point[], color: string, stroke = true): void {
    const ctx = this.context;
    ctx.beginPath(); points.forEach((p, i) => i ? ctx.lineTo(Math.round(p.x), Math.round(p.y)) : ctx.moveTo(Math.round(p.x), Math.round(p.y))); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
    if (stroke) { ctx.strokeStyle = '#69584f32'; ctx.lineWidth = 1; ctx.stroke(); }
  }
  private box(x0: number, y0: number, x1: number, y1: number, z0: number, z1: number, color: string, owner?: string): void {
    const add = (coords: [number, number, number][], factor: number) => {
      const depth = coords.reduce((n, [x, y, z]) => n + (x + y) * .866 + z * .5, 0) / coords.length;
      this.faces.push({ layer: this.layer, points: coords.map(([x, y, z]) => project(x, y, z)), color: shade(color, factor), depth, owner });
    };
    add([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]], 1.08);
    add([[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],[x1,y0,z1]], .83);
    add([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]], .68);
  }
  private car(car: Car): void {
    const box = (u0:number,v0:number,u1:number,v1:number,z0:number,z1:number,color:string) => {
      this.box(car.x+(car.axis==='h'?u0:v0),car.y+(car.axis==='h'?v0:u0),car.x+(car.axis==='h'?u1:v1),car.y+(car.axis==='h'?v1:u1),z0,z1,color,car.id);
    };
    box(.12,.1,car.length-.12,.9,.07,.19,'#726774');
    box(.1,.08,car.length-.1,.92,.18,.48,car.color);
    for (const u of [.36,car.length-.36]) for (const v of [.04,.96]) box(u-.15,v-.075,u+.15,v+.075,.02,.21,'#615b69');
    const cab = car.length===3?car.length-1.05:.49;
    box(cab,.18,cab+.78,.82,.47,.68,'#a9c4cb');
    box(cab-.05,.13,cab+.83,.87,.67,.76,car.color);
    if (car.length===3) box(.23,.18,1.65,.82,.47,.57,shade(car.color,.93));
    for (const v of [.23,.64]) box(car.length-.13,v,car.length-.075,v+.12,.28,.39,'#fff0b5');
    const point = project(car.x+(car.axis==='h'?cab+.39:.5),car.y+(car.axis==='h'?.5:cab+.39),.78);
    this.faces.push({ layer: this.layer, points:[point],color:'#fffaf0',depth:(car.x+car.y+cab+.9)*.866+.78*.5,owner:car.id,label:car.id==='coral'?'★':car.id.replace(/^car-/,'').slice(0,2).toUpperCase() });
  }
  private draw(): void {
    const ctx=this.context,game=this.game;
    ctx.clearRect(0,0,VIEW.width,VIEW.height); if(!game)return;
    this.faces=[];this.layer=0;
    this.polygon([project(-.1,-.1),project(6.4,-.1),project(6.9,6.4),project(.4,6.4)].map(p=>({x:p.x+12,y:p.y+14})),'#79665622',false);
    this.box(-.16,-.16,6.16,6.16,-.48,-.08,'#bd946c');
    this.layer=1;
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
    let outline:Point[]|undefined;
    if(selected){
      const x1=selected.x+(selected.axis==='h'?selected.length:1),y1=selected.y+(selected.axis==='v'?selected.length:1);
      outline=[project(selected.x-.035,selected.y-.035,.025),project(x1+.035,selected.y-.035,.025),project(x1+.035,y1+.035,.025),project(selected.x-.035,y1+.035,.025)];
    }
    this.layer=2;cars.forEach(car=>this.car(car));
    this.faces.sort((a,b)=>a.layer-b.layer||a.depth-b.depth);
    for(const face of this.faces){
      if(face.label){ctx.font='bold 14px ui-monospace,monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeStyle='#594c4640';ctx.lineWidth=2;ctx.strokeText(face.label,face.points[0].x,face.points[0].y);ctx.fillStyle=face.color;ctx.fillText(face.label,face.points[0].x,face.points[0].y);}
      else this.polygon(face.points,face.color);
    }
    if(outline){ctx.beginPath();outline.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.strokeStyle='#b28a43';ctx.lineWidth=2;ctx.stroke();}
    const gate=project(6.64,2.5,.035);
    if(game.status!=='won'){ctx.font='bold 20px system-ui';ctx.textAlign='center';ctx.fillStyle='#9a7048';ctx.fillText('↘',gate.x,gate.y+5);}
  }
  private point(event:PointerEvent):Point {return canvasPoint({x:event.clientX,y:event.clientY},this.canvas.getBoundingClientRect());}
  private pick(point:Point):string|undefined {
    for(let i=this.faces.length-1;i>=0;i--){const face=this.faces[i];if(face.points.length>2&&inside(point,face.points))return face.owner;}
  }
  private down=(event:PointerEvent)=>{
    if(event.button!==0||!this.game||this.game.status==='won')return;
    event.preventDefault();this.canvas.setPointerCapture(event.pointerId);this.pointers.add(event.pointerId);
    if(this.pointers.size>1||this.multiTouch){this.multiTouch=true;this.gesture.cancel();this.draw();return;}
    const point=this.point(event),id=this.pick(point),car=this.game.cars.find(car=>car.id===id);
    if(!car){this.gesture.cancel();return;}
    const allowed=Array.from({length:13},(_,i)=>i-6).filter(delta=>canMove(this.game!,car.id,delta));
    this.gesture.begin(car.id,car.axis,point,{x:event.clientX,y:event.clientY},allowed);
    this.onSelect(car.id);this.draw();
  };
  private move=(event:PointerEvent)=>{
    if(!this.pointers.has(event.pointerId)||this.multiTouch)return;
    this.gesture.move(this.point(event),{x:event.clientX,y:event.clientY});this.draw();
  };
  private up=(event:PointerEvent)=>{
    if(!this.pointers.has(event.pointerId))return;
    this.pointers.delete(event.pointerId);
    if(this.multiTouch){if(!this.pointers.size)this.multiTouch=false;this.gesture.cancel();this.draw();return;}
    const move=this.gesture.finish();this.draw();if(move)this.onMove(move.id,move.delta);
  };
  private cancel=()=>this.cancelInput();
}
