import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createGame, type Level } from './engine';
import { MarbleScene } from './scene';
import { CUP_HEIGHT, ROLL_HEIGHT, rollCurve, trackCurve } from './roll-effect';

interface View {
  rotating: boolean;
  cancel: () => void;
  pick: ReturnType<typeof vi.fn>;
  handlers: Map<string, (event: PointerEvent) => void>;
  meshes: THREE.Mesh[];
}
interface Motion {
  update: (seconds: number) => void;
  refresh: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

const { views, motions } = vi.hoisted(() => ({
  views: [] as View[],
  motions: [] as Motion[],
}));

vi.mock('../../shared/mini-scene', () => ({
  MiniScene: class {
    rotating = false;
    pick = vi.fn();
    handlers = new Map<string, (event: PointerEvent) => void>();
    meshes: THREE.Mesh[] = [];
    canvas = {
      setAttribute() {},
      setPointerCapture() {},
      addEventListener: (name: string, handler: (event: PointerEvent) => void) => this.handlers.set(name, handler),
    };
    constructor(readonly host: HTMLElement, readonly cancel: () => void) { views.push(this); }
    box() {}
    clear() { this.meshes = []; }
    mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, z, y);
      this.meshes.push(mesh);
      return mesh;
    }
    render() {}
    repaint() {}
    cancelInput() { this.cancel(); }
  },
}));

vi.mock('../../shared/material-motion', () => ({
  MaterialMotion: class {
    refresh = vi.fn();
    stop = vi.fn();
    constructor(readonly update: (seconds: number) => void) { motions.push(this); }
  },
}));

const level: Level = {
  id: 'fixture', title: 'Fixture', width: 4, height: 4,
  source: { x: 0, y: 1 }, goal: { x: 1, y: 2 },
  tracks: [{ id: 'corner', x: 1, y: 1, kind: 'elbow', turn: 2 }],
};
const route = [level.source, level.tracks[0], level.goal];

beforeEach(() => { views.length = 0; motions.length = 0; });
afterEach(() => vi.clearAllMocks());

function fixture() {
  const select = vi.fn();
  const rotate = vi.fn();
  const roll = vi.fn();
  const scene = new MarbleScene({} as HTMLElement, select, rotate, roll);
  const game = createGame(level);
  scene.update(game, 'corner');
  const view = views[0];
  const motion = motions[0];
  const marble = view.meshes.find(mesh => mesh.geometry.type === 'SphereGeometry')!;
  const send = (name: string, pointerId = 1, clientX = 100, clientY = 100) =>
    view.handlers.get(name)!({ pointerId, clientX, clientY, button: 0, preventDefault() {} } as PointerEvent);
  return { select, rotate, roll, scene, game, view, motion, marble, send };
}

describe('Marble Workshop scene', () => {
  it('rolls through the same corner curve used to build the groove, and settles into the cup', () => {
    const path = rollCurve(route, true);
    const groove = trackCurve(level.tracks[0], 'w', 's', ROLL_HEIGHT);
    expect(path.curves[1].getPoints(8)).toEqual(groove.getPoints(8));
    expect(path.getPoint(0)).toEqual(new THREE.Vector3(.5, ROLL_HEIGHT, 1.5));
    expect(path.getPoint(1)).toEqual(new THREE.Vector3(1.5, CUP_HEIGHT, 2.5));
    const blocked = rollCurve([...route.slice(0, 2), { x: 1, y: 1.5 }], false);
    expect(blocked.getPoint(1)).toEqual(new THREE.Vector3(1.5, ROLL_HEIGHT, 2));
  });

  it('advances and spins a marble without mutating puzzle state, then completes once', () => {
    const { scene, motion, game, marble, view } = fixture();
    const done = vi.fn();
    const before = JSON.stringify(game);
    scene.roll(route, true, done);
    motion.update(1);
    motion.update(1.06);
    const position = marble.position.clone();
    expect(position.x).toBeGreaterThan(.5);
    expect(marble.quaternion.equals(new THREE.Quaternion())).toBe(false);
    motion.update(20);
    expect(marble.position.distanceTo(position)).toBeLessThan(.34);
    expect(done).not.toHaveBeenCalled();

    for (let tick = 1; tick < 30; tick++) motion.update(20 + tick * .06);
    expect(done).toHaveBeenCalledOnce();
    expect(motion.stop).toHaveBeenCalledTimes(2);
    expect(marble.position).toEqual(new THREE.Vector3(1.5, CUP_HEIGHT, 2.5));
    expect(view.meshes.filter(mesh => mesh.geometry.type === 'OctahedronGeometry' && mesh.visible)).toHaveLength(0);
    expect(JSON.stringify(game)).toBe(before);
  });

  it('stops at a gap and clears its short contact cue', () => {
    const { scene, motion, view, marble } = fixture();
    const done = vi.fn();
    scene.roll([level.source, { x: .5, y: 1 }], false, done);
    for (let tick = 0; tick <= 7; tick++) motion.update(1 + tick * .06);
    expect(marble.position.toArray()).toEqual([1, ROLL_HEIGHT, 1.5]);
    expect(view.meshes.some(mesh => mesh.geometry.type === 'OctahedronGeometry' && mesh.visible)).toBe(true);
    for (let tick = 8; tick <= 12; tick++) motion.update(1 + tick * .06);
    expect(done).toHaveBeenCalledOnce();
    expect(view.meshes.some(mesh => mesh.geometry.type === 'OctahedronGeometry' && mesh.visible)).toBe(false);
  });

  it('settles immediately with reduced motion and rejects edits while rolling', () => {
    const { scene, motion, view, rotate, send, marble } = fixture();
    const done = vi.fn();
    view.pick.mockReturnValue('corner');
    scene.roll(route, true, done);
    send('pointerdown');
    send('pointerup');
    expect(rotate).not.toHaveBeenCalled();
    motion.update(0);
    motion.update(0);
    expect(done).toHaveBeenCalledOnce();
    expect(marble.position.y).toBe(CUP_HEIGHT);
  });

  it('rolls on a marble tap and ignores drags and Rotate mode', () => {
    const { view, send, roll, rotate } = fixture();
    view.pick.mockReturnValue('roll:marble');
    send('pointerdown');
    send('pointerup');
    send('pointerdown');
    send('pointerup', 1, 125);
    view.rotating = true;
    send('pointerdown');
    send('pointerup');
    expect(roll).toHaveBeenCalledOnce();
    expect(rotate).not.toHaveBeenCalled();
  });

  it('turns on a clean tap and discards drag, cancel, multitouch, and camera gestures', () => {
    const { view, send, select, rotate } = fixture();
    view.pick.mockReturnValue('corner');
    send('pointerdown');
    send('pointerup');
    expect(select).toHaveBeenCalledExactlyOnceWith('corner');
    expect(rotate).toHaveBeenCalledExactlyOnceWith('corner');
    rotate.mockClear();
    send('pointerdown');
    send('pointermove', 1, 125);
    send('pointerup');
    send('pointerdown');
    send('pointercancel');
    send('pointerup');
    send('pointerdown');
    send('pointerdown', 2);
    send('pointerup');
    send('pointerup', 2);
    view.rotating = true;
    send('pointerdown');
    send('pointerup');
    expect(rotate).not.toHaveBeenCalled();
  });
});
