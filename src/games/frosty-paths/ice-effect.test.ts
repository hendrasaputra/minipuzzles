import { describe,it,expect } from 'vitest';
import * as THREE from 'three';
import type { MiniScene } from '../../shared/mini-scene';
import { IceEffect,slidePoint } from './ice-effect';
describe('ice material effects',()=>{
  it('interpolates slides without overshooting and keeps a straight route',()=>{
    const a={x:1,y:2},b={x:5,y:2};expect(slidePoint(a,b,-1)).toEqual(a);expect(slidePoint(a,b,2)).toEqual(b);
    for(let t=0;t<=1;t+=.1){const p=slidePoint(a,b,t);expect(p.x).toBeGreaterThanOrEqual(1);expect(p.x).toBeLessThanOrEqual(5);expect(p.y).toBe(2);}
  });
  it('caps decorative meshes, keeps snow bounded, and moves them without new allocations',()=>{
    const meshes:THREE.Mesh[]=[],mini={mesh(geometry:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number,owner?:string){expect(owner).toBeUndefined();const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,z,y);meshes.push(mesh);return mesh;}} as unknown as MiniScene;
    const effect=new IceEffect(mini,7,7);expect(meshes).toHaveLength(38);const before=meshes.map(mesh=>mesh.position.clone());effect.update(22);
    expect(meshes).toHaveLength(38);expect(meshes.some((mesh,i)=>!mesh.position.equals(before[i]))).toBe(true);
    for(const mesh of meshes){expect(mesh.castShadow).toBe(false);expect(mesh.position.x).toBeGreaterThanOrEqual(0);expect(mesh.position.x).toBeLessThan(7);expect(mesh.position.z).toBeGreaterThanOrEqual(0);expect(mesh.position.z).toBeLessThan(7);}
  });
});
