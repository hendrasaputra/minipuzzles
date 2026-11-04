import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { applyMove, createGame } from './engine';
import { levels } from './levels';
import { StackScene } from './scene';

const fixture = vi.hoisted(() => ({
  tick: (_time: number) => {},
  stop: vi.fn(),
  effects: undefined as THREE.Group | undefined,
  block: undefined as THREE.Mesh | undefined,
}));

vi.mock('../../shared/mini-scene', () => ({
  MiniScene: class {
    canvas = { setAttribute() {}, addEventListener() {} };
    effects = new THREE.Group();
    constructor() { fixture.effects = this.effects; }
    clear() {}
    box() {}
    label() {}
    render() {}
    repaint() {}
    mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, z, y);
      fixture.block = mesh;
      return mesh;
    }
  },
}));

vi.mock('../../shared/material-motion', () => ({
  MaterialMotion: class {
    constructor(tick: (time: number) => void) { fixture.tick = tick; }
    refresh() {}
    stop = fixture.stop;
  },
}));

describe('Color Stacks landing feedback', () => {
  it('plays dust only on contact and settles at the committed position', () => {
    const game = createGame(levels[0]);
    const move = { from: 0, to: 2 };
    expect(applyMove(game, move)).toBe(true);
    const saved = structuredClone(game);
    const scene = new StackScene({} as HTMLElement, () => {});
    scene.draw(game, 0, move);
    const block = fixture.block!;
    const destination = block.position.clone();
    const burst = fixture.effects!.children[0];

    fixture.tick(10);
    fixture.tick(10.06);
    expect(block.position.equals(destination)).toBe(false);
    expect(burst.visible).toBe(false);
    for (let frame = 2; frame <= 6; frame++) fixture.tick(10 + frame * .06);
    expect(burst.visible).toBe(true);
    for (let frame = 7; frame <= 17; frame++) fixture.tick(10 + frame * .06);
    expect(burst.visible).toBe(false);
    expect(block.position.equals(destination)).toBe(true);
    expect(block.scale.y).toBe(1);
    expect(game).toEqual(saved);
  });

  it('snaps to the destination without particles for reduced motion', () => {
    const game = createGame(levels[0]);
    const move = { from: 0, to: 2 };
    applyMove(game, move);
    const scene = new StackScene({} as HTMLElement, () => {});
    scene.draw(game, 0, move);
    const destination = fixture.block!.position.clone();
    fixture.tick(20);
    fixture.tick(20.06);
    fixture.tick(0);
    expect(fixture.block!.position.equals(destination)).toBe(true);
    expect(fixture.effects!.children[0].visible).toBe(false);
    expect(fixture.stop).toHaveBeenCalled();
  });
});
