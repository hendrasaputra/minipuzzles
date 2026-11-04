import * as THREE from 'three';
import type { MiniScene } from '../../shared/mini-scene';

export interface Point{x:number;y:number}
export function slidePoint(from:Point,to:Point,progress:number):Point{
  const t=Math.max(0,Math.min(1,progress)),ease=1-(1-t)**3;
  return{x:from.x+(to.x-from.x)*ease,y:from.y+(to.y-from.y)*ease};
}

/** Restrained decorative glints and drifting snow; all meshes remain outside picking. */
export class IceEffect {
  private glints:THREE.Mesh[]=[];
  private snow:THREE.Mesh[]=[];
  constructor(private mini:MiniScene,private width:number,private height:number){
    for(let i=0;i<Math.min(20,width*height);i++){
      const geometry=new THREE.OctahedronGeometry(.035),material=new THREE.MeshBasicMaterial({color:'#f6ffff',transparent:true,opacity:.4,depthWrite:false});
      const mesh=mini.mesh(geometry,material,((i*2.73+.4)%width),((i*1.39+.6)%height),.035);
      mesh.castShadow=false;mesh.receiveShadow=false;this.glints.push(mesh);
    }
    for(let i=0;i<18;i++){
      const mesh=mini.mesh(new THREE.SphereGeometry(.018+(i%3)*.005,4,3),new THREE.MeshBasicMaterial({color:'#edf8ff',transparent:true,opacity:.6,depthWrite:false}),0,0,.5);
      mesh.castShadow=false;mesh.receiveShadow=false;this.snow.push(mesh);
    }
    this.update(0);
  }
  update(seconds:number){
    this.glints.forEach((mesh,i)=>{
      const shine=(Math.sin(seconds*1.6+i*2.2)+1)/2;
      mesh.scale.setScalar(.35+shine*.85);mesh.rotation.y=seconds*.3+i;
      (mesh.material as THREE.MeshBasicMaterial).opacity=.12+shine*.55;
    });
    this.snow.forEach((mesh,i)=>{
      const t=(seconds*.11+i/18)%1;
      mesh.position.set((i*1.73+seconds*.045)%this.width,.18+(1-t)*.85,(i*2.37+Math.sin(seconds*.3+i)*.1+this.height)%this.height);
      (mesh.material as THREE.MeshBasicMaterial).opacity=.5*Math.sin(t*Math.PI);
    });
  }
}
