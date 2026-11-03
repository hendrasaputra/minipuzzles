import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { clampZoom, dragPan, fitCamera } from './camera';

const box = new THREE.Box3(new THREE.Vector3(-17, -.2, -10), new THREE.Vector3(17, 5.5, 10));
const center = box.getCenter(new THREE.Vector3());

describe('large-board camera', () => {
  it.each([390 / 280, 706 / 404])('fits an Expert three-floor board at aspect %s across rotations', aspect => {
    const camera = new THREE.OrthographicCamera();
    for (const yaw of [0, Math.PI / 4, Math.PI / 2, Math.PI]) {
      fitCamera(camera, box, center, yaw, 1, new THREE.Vector3(), aspect);
      for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
        const projected = new THREE.Vector3(x, y, z).project(camera);
        expect(Math.abs(projected.x)).toBeLessThan(1);
        expect(Math.abs(projected.y)).toBeLessThan(1);
        expect(Math.abs(projected.z)).toBeLessThan(1);
      }
    }
  });

  it('supports close inspection up to 8× without invalid zoom values', () => {
    expect(clampZoom(5)).toBe(5);
    expect(clampZoom(20)).toBe(8);
    expect(clampZoom(.1)).toBe(.75);
    expect(clampZoom(NaN)).toBe(1);
    const camera = new THREE.OrthographicCamera();
    fitCamera(camera, box, center, Math.PI / 4, 1, new THREE.Vector3(), 1);
    const fullHeight = camera.top - camera.bottom;
    fitCamera(camera, box, center, Math.PI / 4, 8, new THREE.Vector3(), 1);
    expect(camera.top - camera.bottom).toBeCloseTo(fullHeight / 8);
  });

  it('pans with the finger in both axes without changing fitted zoom or rotation', () => {
    const camera = new THREE.OrthographicCamera();
    fitCamera(camera, box, center, Math.PI / 4, 4, new THREE.Vector3(), 400 / 300);
    const frustum = camera.right - camera.left;
    const rotation = camera.quaternion.clone();
    const pan = dragPan(camera, 100, 50, 400, 300);
    fitCamera(camera, box, center, Math.PI / 4, 4, pan, 400 / 300);
    const projected = center.clone().project(camera);
    expect(projected.x).toBeCloseTo(.5);
    expect(projected.y).toBeCloseTo(-1 / 3);
    expect(camera.right - camera.left).toBeCloseTo(frustum);
    expect(Math.abs(camera.quaternion.dot(rotation))).toBeCloseTo(1);
  });

  it('does not produce infinite offsets while a viewport is hidden', () => {
    expect(dragPan(new THREE.OrthographicCamera(), 10, 10, 0, 0).length()).toBe(0);
  });
});
