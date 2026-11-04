import * as THREE from 'three';
import type { MiniScene } from '../../shared/mini-scene';
import type { Cell,Flow } from './engine';

type Segment=Flow['segments'][number];
const key = ({ x, y }: Cell) => `${x},${y}`;

/** Flow supplies breadth-first edges, so each new tile inherits its parent's distance. */
export function waterDistances(segments: readonly Segment[], source: Cell): Map<string, number> {
  const distances = new Map([[key(source), 0]]);
  for (const { from, to } of segments) {
    const distance = distances.get(key(from));
    if (distance !== undefined && !distances.has(key(to))) distances.set(key(to), distance + 1);
  }
  return distances;
}

export const arrivalTime = (distance: number) => Math.min(.48, distance * .055);
const waterColor = new THREE.Color('#65c4d1');
const pulseColor = new THREE.Color('#d7fffb');
export function waterPoint(segment:Segment,progress:number){
  const t=((progress%1)+1)%1,dx=segment.to.x-segment.from.x,dy=segment.to.y-segment.from.y;
  return{x:segment.from.x+.5+dx*t,y:segment.from.y+.5+dy*t,dx,dy,t};
}

/** Decorative water follows only reciprocal wet connections; it never participates in picking. */
export class WaterEffect {
  private foam:{mesh:THREE.Mesh;segment:Segment;phase:number}[]=[];
  private surfaces:{material:THREE.MeshBasicMaterial;arrival:number}[]=[];
  private rings:THREE.Mesh[]=[];
  private bubbles:THREE.Mesh[]=[];
  constructor(private mini:MiniScene,segments:Segment[],private source:Cell){
    const valid=segments.filter(s=>Math.hypot(s.to.x-s.from.x,s.to.y-s.from.y)>0);
    const distances = waterDistances(valid, source);
    for(const segment of valid){
      const dx=segment.to.x-segment.from.x,dy=segment.to.y-segment.from.y,length=Math.hypot(dx,dy);
      const material=new THREE.MeshBasicMaterial({color:'#65c4d1',transparent:true,opacity:.82,depthWrite:false});
      this.make(new THREE.BoxGeometry(length,.028,.19),material,(segment.from.x+segment.to.x)/2+.5,(segment.from.y+segment.to.y)/2+.5,.19,-Math.atan2(dy,dx));
      this.surfaces.push({material,arrival:arrivalTime(distances.get(key(segment.to)) ?? 0)});
    }
    const count=Math.min(64,valid.length*4);
    for(let i=0;i<count;i++){
      const segment=valid[i%valid.length],phase=Math.floor(i/valid.length)/Math.ceil(count/valid.length)+(i%valid.length)*.173;
      const geometry=new THREE.SphereGeometry(i%3===0?.038:.025,6,4);geometry.scale(1.7,.55,1);
      const mesh=this.make(geometry,new THREE.MeshBasicMaterial({color:i%3===0?'#e2fbf5':'#a8e4e8',transparent:true,opacity:.85,depthWrite:false}),0,0,.2);
      this.foam.push({mesh,segment,phase});
    }
    for(let i=0;i<3;i++){
      const mesh=this.make(new THREE.TorusGeometry(.18,.009,4,24),new THREE.MeshBasicMaterial({color:'#d9f7ed',transparent:true,opacity:.4,depthWrite:false}),source.x+.5,source.y+.5,.278);
      mesh.rotation.x=Math.PI/2;this.rings.push(mesh);
    }
    for(let i=0;i<6;i++)this.bubbles.push(this.make(new THREE.SphereGeometry(.025+(i%2)*.008,6,4),new THREE.MeshBasicMaterial({color:i%2?'#dffbf3':'#8ad5e2',transparent:true,opacity:.7,depthWrite:false}),source.x+.5,source.y+.5,.3));
    this.update(0);
  }
  private make(geometry:THREE.BufferGeometry,material:THREE.MeshBasicMaterial,x:number,y:number,z:number,yaw=0){
    const mesh=this.mini.mesh(geometry,material,x,y,z,undefined,yaw);mesh.castShadow=false;mesh.receiveShadow=false;return mesh;
  }
  update(seconds:number,elapsed = Infinity){
    this.surfaces.forEach(({material,arrival},i)=>{
      const pulse = Math.max(0, 1 - Math.abs(elapsed - arrival) / .14);
      material.opacity = Math.min(1, .76 + .09 * Math.sin(seconds * 2.5 - i * .6) + pulse * .18);
      material.color.copy(waterColor).lerp(pulseColor, pulse * .7);
    });
    this.foam.forEach(({mesh,segment,phase},i)=>{
      const p=waterPoint(segment,seconds*.75+phase),length=Math.hypot(p.dx,p.dy),offset=Math.sin(seconds*2+i)*.035;
      const startsAtSpring=segment.from.x===this.source.x&&segment.from.y===this.source.y;
      mesh.position.set(p.x-p.dy/length*offset,.204+(startsAtSpring?(1-p.t)*.07:0)+Math.sin(seconds*3+i)*.004,p.y+p.dx/length*offset);
      mesh.rotation.y=-Math.atan2(p.dy,p.dx);mesh.scale.setScalar(.8+.2*Math.sin(p.t*Math.PI));
    });
    this.rings.forEach((mesh,i)=>{const t=(seconds*.65+i/3)%1;mesh.scale.setScalar(.12+t*.88);(mesh.material as THREE.MeshBasicMaterial).opacity=(1-t)*.5;});
    this.bubbles.forEach((mesh,i)=>{
      const t=(seconds*.9+i/6)%1,angle=i*2.4;
      mesh.position.set(this.source.x+.5+Math.cos(angle)*.085,.29+Math.sin(t*Math.PI)*.14,this.source.y+.5+Math.sin(angle)*.085);
      mesh.scale.setScalar(.6+Math.sin(t*Math.PI)*.6);(mesh.material as THREE.MeshBasicMaterial).opacity=Math.sin(t*Math.PI)*.7;
    });
  }
}
