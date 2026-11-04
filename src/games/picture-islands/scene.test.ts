import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createGame, levels, markCell } from './engine';
import { IslandScene } from './scene';

vi.mock('../../shared/mini-scene', () => ({
  MiniScene: class {
    canvas = { setAttribute() {}, addEventListener() {} };
    effects = new THREE.Group();
    box() {}
    label() {}
    clear() {}
    render() {}
    repaint() {}
    mesh(geometry: THREE.BoxGeometry, material: THREE.Material, x: number, z: number, y: number) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, z);
      return mesh;
    }
  },
}));

afterEach(() => vi.unstubAllGlobals());

it('emits placement chips at contact, then clears them before the next board draw', () => {
  vi.stubGlobal('window', { addEventListener() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) });
  vi.stubGlobal('document', { hidden: false, addEventListener() {} });
  vi.stubGlobal('requestAnimationFrame', () => 1);
  vi.stubGlobal('cancelAnimationFrame', () => {});
  const scene = new IslandScene({} as HTMLElement, () => {});
  const feedback = scene as unknown as {
    lift: { mesh: THREE.Mesh; y: number; previous?: number };
    finish: { object: THREE.Group };
    animate: (time: number) => void;
  };
  const game = createGame(levels[0]);
  const filled = game.puzzle.picture.findIndex(Boolean);
  markCell(game, filled, 1);
  scene.draw(game, [], filled);

  expect(feedback.lift.mesh.position.y).toBeGreaterThan(feedback.lift.y);
  expect(feedback.finish.object.visible).toBe(false);
  feedback.lift.previous = 1;
  for (const time of [1.05, 1.10, 1.15]) feedback.animate(time);
  expect(feedback.finish.object.visible).toBe(false);
  feedback.animate(1.17);
  expect(feedback.lift.mesh.position.y).toBe(feedback.lift.y);
  expect(feedback.finish.object.visible).toBe(true);

  scene.draw(game, []);
  expect(feedback.finish.object.visible).toBe(false);
});
