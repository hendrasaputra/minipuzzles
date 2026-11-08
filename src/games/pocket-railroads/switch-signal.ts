import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import signalUrl from './ground-disc-signal.glb?url';
import type { Node } from './engine';

type Junction = Extract<Node, { junction: number }>;

const arrow = new THREE.Shape()
  .moveTo(-.085, -.21).lineTo(.085, -.21).lineTo(.085, .015)
  .lineTo(.16, .015).lineTo(0, .23).lineTo(-.16, .015).lineTo(-.085, .015);
const arrowGeometry = new THREE.ShapeGeometry(arrow).rotateX(Math.PI / 2);
const arrowMaterial = new THREE.MeshBasicMaterial({ color: '#b77725', side: THREE.DoubleSide });

export async function loadSwitchSignal(): Promise<THREE.Group> {
  const { scene } = await new GLTFLoader().loadAsync(signalUrl);
  const material = new THREE.MeshLambertMaterial({ vertexColors: true });
  const enamel = new THREE.Color('#f9edcc');
  const stripe = new THREE.Color('#a35448');
  const iron = new THREE.Color('#536469');
  scene.traverse(object => {
    if (!(object instanceof THREE.Mesh)) return;
    const colors = object.geometry.getAttribute('color');
    for (let i = 0; i < colors.count; i++) {
      const red = colors.getX(i), green = colors.getY(i);
      const tint = red > .7 ? enamel : red > green * 2 ? stripe : iron;
      colors.setXYZ(i, tint.r, tint.g, tint.b);
    }
    object.material.dispose();
    object.material = material;
  });
  return scene;
}

export function switchSignal(template: THREE.Group, node: Junction, lower: boolean) {
  const direction = Math.sign(node.branches[Number(lower)].y - node.y);
  const signal = new THREE.Group();
  signal.position.set(node.x + .58, 0, node.y);
  const model = template.clone();
  model.scale.setScalar(.62);
  model.rotation.y = Math.PI / 2;
  const disc = model.getObjectByName('disc');
  if (disc) disc.rotation.z = direction * .65;
  const pointer = new THREE.Mesh(arrowGeometry, arrowMaterial);
  pointer.position.set(.045, .016, direction * .33);
  pointer.rotation.y = direction < 0 ? Math.PI : 0;
  signal.add(model, pointer);
  return signal;
}
