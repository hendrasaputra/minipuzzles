import { describe,it,expect } from 'vitest';
import * as THREE from 'three';
import type { MiniScene } from '../../shared/mini-scene';
import { WaterEffect,waterPoint,waterDistances } from './water-effect';
const branches=[{from:{x:1,y:1},to:{x:2,y:1}},{from:{x:1,y:1},to:{x:1,y:2}}];
function fixture(segments=branches){
  const shapes:THREE.Mesh[]=[];
  const mini={mesh(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,owner?:string,yaw=0){
    const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,z,y);mesh.rotation.y=yaw;mesh.userData.owner=owner;shapes.push(mesh);return mesh;
  }} as unknown as MiniScene;
  const effect=new WaterEffect(mini,segments,{x:0,y:1});return{effect,shapes};
}
describe('Water Garden flow particles',()=>{
  it('stays on each supplied branch and wraps at the endpoint rather than crossing a dry tile',()=>{
    for(let t=-2;t<10;t+=.13){
      const east=waterPoint(branches[0],t),south=waterPoint(branches[1],t);
      expect(east.x).toBeGreaterThanOrEqual(1.5);expect(east.x).toBeLessThan(2.5);expect(east.y).toBe(1.5);
      expect(south.y).toBeGreaterThanOrEqual(1.5);expect(south.y).toBeLessThan(2.5);expect(south.x).toBe(1.5);
    }
    expect(waterPoint(branches[0],1)).toEqual(waterPoint(branches[0],0));
  });
  it('propagates along reached branches without revisiting a cycle or lighting a disconnected edge', () => {
    const spring = {x:0,y:1};
    const linked = [{from:spring,to:branches[0].from}, ...branches,
      {from:branches[0].to,to:branches[0].from}, {from:{x:4,y:4},to:{x:3,y:4}}];
    expect([...waterDistances(linked,spring)]).toEqual([['0,1',0],['1,1',1],['2,1',2],['1,2',2]]);
  });
  it('has only spring ripples and bubbles when there are no connected channels',()=>{
    const {effect,shapes}=fixture([]);expect(shapes).toHaveLength(9);
    const before=shapes[3].position.clone();effect.update(.37);expect(shapes[3].position.equals(before)).toBe(false);
    for(const mesh of shapes){expect(mesh.userData.owner).toBeUndefined();expect(mesh.castShadow).toBe(false);}
  });
  it('moves existing foam meshes, bounds opacity and keeps particles out of picking',()=>{
    const {effect,shapes}=fixture(),foam=shapes.filter(shape=>shape.geometry.type==='SphereGeometry').slice(0,8),before=foam.map(mesh=>mesh.position.clone()),count=shapes.length;
    effect.update(.45);expect(shapes).toHaveLength(count);expect(foam.some((mesh,i)=>!mesh.position.equals(before[i]))).toBe(true);
    for(let t=0;t<5;t+=.11){effect.update(t);for(const mesh of shapes){const material=mesh.material as THREE.MeshBasicMaterial;expect(material.opacity).toBeGreaterThanOrEqual(0);expect(material.opacity).toBeLessThanOrEqual(1);expect(mesh.userData.owner).toBeUndefined();expect(mesh.castShadow).toBe(false);expect(mesh.receiveShadow).toBe(false);}}
  });
  it('caps moving foam at64 and never creates it for zero-length connections',()=>{
    const segments=Array.from({length:40},()=>branches[0]),{shapes}=fixture(segments);
    expect(shapes.filter(mesh=>mesh.geometry.type==='SphereGeometry')).toHaveLength(64+6);
    expect(fixture([{from:{x:0,y:0},to:{x:0,y:0}}]).shapes).toHaveLength(9);
  });
});
