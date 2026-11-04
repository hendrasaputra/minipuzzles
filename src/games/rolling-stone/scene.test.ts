import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createGame, move, undo, type Level } from './engine';
import { StoneScene } from './scene';

const hooks = vi.hoisted(() => ({
  frame: undefined as ((seconds: number) => void) | undefined,
  stone: undefined as THREE.Mesh | undefined,
  burst: { clear: vi.fn(), start: vi.fn(), update: vi.fn((age: number) => age < .6) },
}));

vi.mock('../../shared/mini-scene', () => ({
  MiniScene: class {
    effects = new THREE.Group();
    canvas = { setAttribute() {}, addEventListener() {} };
    box() {}
    clear() {}
    label() {}
    render() {}
    repaint() {}
    mesh(geometry: THREE.BufferGeometry, material: THREE.Material) {
      const mesh = new THREE.Mesh(geometry, material);
      hooks.stone = mesh;
      return mesh;
    }
  },
}));

vi.mock('../../shared/material-motion', () => ({
  MaterialMotion: class {
    constructor(frame: (seconds: number) => void) { hooks.frame = frame; }
    refresh() {}
    stop() {}
  },
}));

vi.mock('../../shared/pixel-burst', () => ({
  PixelBurst: class {
    object = new THREE.Group();
    clear = hooks.burst.clear;
    start = hooks.burst.start;
    update = hooks.burst.update;
  },
}));

const level: Level = {
  id: 'fixture', title: 'Fixture', tiles: ['####'], start: { x: 0, y: 0 }, goal: { x: 3, y: 0 },
};

function fixture() {
  const game = createGame(level);
  const scene = new StoneScene({} as HTMLElement, () => {});
  scene.draw(game);
  const rollEast = () => {
    const from = game.block;
    expect(move(game, 'e')).toBe(true);
    scene.roll(from, 'e');
  };
  return { game, scene, rollEast, frame: hooks.frame!, stone: hooks.stone! };
}

beforeEach(() => vi.clearAllMocks());

describe('Rolling Stone landing', () => {
  it('recoils slightly at contact without deforming the stone', () => {
    const { rollEast, frame, stone } = fixture();
    rollEast();
    for (let i = 0; i <= 3; i++) frame(1 + i * .08);
    expect(stone.position.y).toBeGreaterThan(.5);
    expect(stone.position.y).toBeLessThan(.52);
    expect(stone.scale.toArray()).toEqual([1, 1, 1]);
  });

  it('shows different cues for flat and upright contact and ends at the exact pose', () => {
    const { game, rollEast, frame, stone } = fixture();
    rollEast();
    frame(1);
    frame(1.08);
    expect(hooks.burst.start).not.toHaveBeenCalled();
    expect(stone.position.x).toBeGreaterThan(.5);
    for (let i = 2; i <= 14; i++) frame(1 + i * .08);
    expect(hooks.burst.start).toHaveBeenCalledExactlyOnceWith(2.9, .04, .5, 'dust', 1, 12);
    expect(stone.position.toArray()).toEqual([2, .5, .5]);
    expect(stone.scale.toArray()).toEqual([1, 1, 1]);

    rollEast();
    for (let i = 0; i <= 14; i++) frame(3 + i * .08);
    expect(hooks.burst.start).toHaveBeenLastCalledWith(3.9, .04, .5, 'spark', 2, 6);
    expect(stone.position.toArray()).toEqual([3.5, 1, .5]);
    expect(game.history).toEqual(['e', 'e']);
  });

  it('skips the burst in reduced motion and cancels pending contact when redrawn', () => {
    const { game, scene, rollEast, frame, stone } = fixture();
    rollEast();
    frame(0);
    expect(stone.position.toArray()).toEqual([2, .5, .5]);
    expect(hooks.burst.start).not.toHaveBeenCalled();

    rollEast();
    frame(1);
    expect(undo(game)).toBe(true);
    scene.draw(game);
    frame(2);
    expect(hooks.burst.start).not.toHaveBeenCalled();
    expect(hooks.stone?.position.toArray()).toEqual([2, .5, .5]);
    expect(hooks.burst.clear).toHaveBeenCalled();
  });
});
