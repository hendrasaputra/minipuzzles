import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { createGame } from './engine';
import { levels } from './levels';
import { StoneScene } from './scene';

const { meshes, tick } = vi.hoisted(() => ({
  meshes: [] as THREE.Mesh[],
  tick: { update: (_seconds: number) => {} },
}));

vi.mock('../../shared/material-motion', () => ({
  MaterialMotion: class {
    constructor(update: (seconds: number) => void) { tick.update = update; }
    stop() {}
    refresh() {}
  },
}));

vi.mock('../../shared/mini-scene', () => ({
  MiniScene: class {
    effects = new THREE.Group();
    canvas = { setAttribute() {}, addEventListener() {} };
    clear() { meshes.length = 0; }
    render() {}
    repaint() {}
    box() {}
    label() {}
    mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, z: number, y: number) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      meshes.push(mesh);
      return mesh;
    }
  },
}));

it('expands a step ripple at water height, then clears it for reduced motion and redraws', () => {
  const game = createGame(levels[0]);
  const scene = new StoneScene({} as HTMLElement, vi.fn());
  scene.draw(game, true);
  const ripple = meshes.find(mesh => mesh.geometry instanceof THREE.RingGeometry)!;
  expect(ripple.position.y).toBeLessThan(.025);
  tick.update(1);
  const initial = ripple.scale.x;
  tick.update(1.07);
  expect(ripple.scale.x).toBeGreaterThan(initial);
  tick.update(0);
  expect(ripple.visible).toBe(false);
  scene.draw(game);
  expect(meshes.some(mesh => mesh.geometry instanceof THREE.RingGeometry)).toBe(false);
});
