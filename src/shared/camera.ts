import * as THREE from 'three';

export function clampZoom(value: number): number {
  return Number.isFinite(value) ? THREE.MathUtils.clamp(value, .75, 8) : 1;
}

/** Fit the unpanned scene first; panning must not make auto-fit zoom back out. */
export function fitCamera(camera: THREE.OrthographicCamera, box: THREE.Box3, center: THREE.Vector3,
  yaw: number, zoom: number, pan: THREE.Vector3, aspect: number, tilt = Math.atan2(18, 20)): void {
  camera.position.copy(center).add(new THREE.Vector3(Math.sin(yaw) * 20, 20 * Math.tan(tilt), Math.cos(yaw) * 20));
  camera.lookAt(center); camera.updateMatrixWorld();
  let extentX = 1, extentY = 1;
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
    const p = new THREE.Vector3(x, y, z).applyMatrix4(camera.matrixWorldInverse);
    extentX = Math.max(extentX, Math.abs(p.x)); extentY = Math.max(extentY, Math.abs(p.y));
  }
  const height = Math.max(extentY * 2, extentX * 2 / aspect) * 1.16 / clampZoom(zoom);
  camera.left = -height * aspect / 2; camera.right = height * aspect / 2;
  camera.top = height / 2; camera.bottom = -height / 2;
  camera.near = .1; camera.far = 150;
  camera.position.add(pan); camera.lookAt(center.clone().add(pan));
  camera.updateMatrixWorld(); camera.updateProjectionMatrix();
}

export function dragPan(camera: THREE.OrthographicCamera, dx: number, dy: number, width: number, height: number): THREE.Vector3 {
  if (width <= 0 || height <= 0) return new THREE.Vector3();
  return new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    .multiplyScalar(-dx * (camera.right - camera.left) / width)
    .addScaledVector(new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion), dy * (camera.top - camera.bottom) / height);
}
