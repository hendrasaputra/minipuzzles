import * as THREE from 'three';
import type { Trace } from './engine';
import type { MiniScene } from '../../shared/mini-scene';

type Segment=Trace['segments'][number];
/** Travel along the traced route, turning at mirrors rather than cutting corners. */
export function beamPoint(segments:Segment[],distance:number,loop = true){
  const total=segments.reduce((sum,s)=>sum+Math.hypot(s.to.x-s.from.x,s.to.y-s.from.y),0);
  if(!total || (!loop && (distance < 0 || distance >= total)))return null;
  let remaining=((distance%total)+total)%total;
  for(const s of segments){
    const dx=s.to.x-s.from.x,dy=s.to.y-s.from.y,length=Math.hypot(dx,dy);if(!length)continue;
    if(remaining<length)return{x:s.from.x+.5+dx*remaining/length,y:s.from.y+.5+dy*remaining/length,dx:dx/length,dy:dy/length};
    remaining-=length;
  }
  return null;
}

export function beamArrival(segments: Segment[], target: Trace['lit'][number]) {
  let distance = 0;
  for (const {from,to} of segments) {
    distance += Math.hypot(to.x - from.x, to.y - from.y);
    if (to.x === target.x && to.y === target.y) return distance;
  }
  return Infinity;
}

/** Small reusable meshes move each frame; geometry is rebuilt only when the route changes. */
export class LaserLight {
  private sparks:THREE.Mesh[]=[];
  private halos:{material:THREE.MeshBasicMaterial;start:number}[]=[];
  private length:number;
  private pulse?: THREE.Mesh;
  constructor(private mini:MiniScene,private segments:Segment[], highlight = false){
    this.length=segments.reduce((sum,s)=>sum+Math.hypot(s.to.x-s.from.x,s.to.y-s.from.y),0);
    let start=0;
    for(const s of segments){
      const dx=s.to.x-s.from.x,dy=s.to.y-s.from.y,length=Math.hypot(dx,dy);if(!length)continue;
      const x=(s.from.x+s.to.x)/2+.5,y=(s.from.y+s.to.y)/2+.5,yaw=-Math.atan2(dy,dx);
      const material=new THREE.MeshBasicMaterial({color:'#ffc66e',transparent:true,opacity:.16,depthWrite:false,blending:THREE.AdditiveBlending});
      const halo=mini.mesh(new THREE.BoxGeometry(length,.13,.16),material,x,y,.5,undefined,yaw);halo.castShadow=false;halo.receiveShadow=false;
      const core=mini.mesh(new THREE.BoxGeometry(length,.035,.05),new THREE.MeshBasicMaterial({color:'#efb849'}),x,y,.5,undefined,yaw);core.castShadow=false;core.receiveShadow=false;
      this.halos.push({material,start});start+=length;
    }
    const count=Math.min(80,Math.ceil(this.length*2));
    for(let i=0;i<count;i++){
      const spark=mini.mesh(i%3===0?new THREE.BoxGeometry(.23,.04,.065):new THREE.OctahedronGeometry(.05),new THREE.MeshBasicMaterial({color:i%3===0?'#fff3bd':'#ec9e32',transparent:true,opacity:.9}),0,0,.5);
      spark.castShadow=false;spark.receiveShadow=false;this.sparks.push(spark);
    }
    if (highlight && this.length > 0) {
      this.pulse = mini.mesh(new THREE.BoxGeometry(.28, .05, .085),
        new THREE.MeshBasicMaterial({ color: '#fff2b7' }), 0, 0, .5);
      this.pulse.castShadow = this.pulse.receiveShadow = this.pulse.visible = false;
    }
    this.update(0);
  }
  get pulseSpeed() { return Math.max(12, this.length / .45); }
  update(seconds:number,elapsed = Infinity){
    if (this.pulse) {
      const point = beamPoint(this.segments, elapsed * this.pulseSpeed, false);
      this.pulse.visible = point !== null;
      if (point) {
        this.pulse.position.set(point.x, .5, point.y);
        this.pulse.rotation.y = -Math.atan2(point.dy, point.dx);
      }
    }
    this.halos.forEach(({material,start})=>material.opacity=.14+.045*Math.sin(seconds*3-start*1.5));
    this.sparks.forEach((spark,i)=>{
      const point=beamPoint(this.segments,seconds*1.8+i*this.length/this.sparks.length);if(!point)return;
      const shimmer=Math.sin(seconds*4+i*2.4),offset=shimmer*(i%3===0?.015:.08);
      spark.position.set(point.x-point.dy*offset,.5+Math.cos(seconds*3+i)*.035,point.y+point.dx*offset);
      spark.rotation.y=i%3===0?-Math.atan2(point.dy,point.dx):seconds+i;spark.scale.setScalar(.8+.25*shimmer);
    });
  }
}
