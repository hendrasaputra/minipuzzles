import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/** Load a local, vertex-colored prop once so its clones share geometry and materials. */
export async function loadProp(url: string, tint?: (color: THREE.Color) => THREE.Color): Promise<THREE.Group> {
  const { scene } = await new GLTFLoader().loadAsync(url);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const previousMaterials = new Set<THREE.Material>();
  const color = new THREE.Color();
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const colors = object.geometry.getAttribute('color');
    if (colors && tint) {
      for (let i = 0; i < colors.count; i++) {
        color.setRGB(colors.getX(i), colors.getY(i), colors.getZ(i));
        const tinted = tint(color);
        colors.setXYZ(i, tinted.r, tinted.g, tinted.b);
      }
      colors.needsUpdate = true;
    }
    for (const previous of [object.material].flat()) previousMaterials.add(previous);
    object.material = material;
  });
  for (const previous of previousMaterials) previous.dispose();
  return scene;
}
