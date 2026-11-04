import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { createGame } from './engine';
import { BoardScene } from './scene';

vi.mock('../../shared/touch-camera-hint', () => ({ appendTouchCameraHint() {} }));
vi.mock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>();
  return { ...actual, WebGLRenderer: class {
    shadowMap = {};
    domElement = {};
    setPixelRatio() {}
    setClearColor() {}
    setSize() {}
    render() {}
  } };
});

afterEach(() => vi.unstubAllGlobals());
function fixture() {
  vi.stubGlobal('devicePixelRatio', 1);
  vi.stubGlobal('window', { addEventListener() {}, matchMedia() { return { matches: false, addEventListener() {} }; } });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('ResizeObserver', class { observe() {} });
  vi.stubGlobal('document', { addEventListener() {}, createElement() { return { width: 128, height: 128, getContext() { return { fillText() {} }; } }; } });
  const events = new Map<string, (event: PointerEvent) => void>();
  const host = {
    clientWidth: 390, clientHeight: 400, append() {}, setPointerCapture() {},
    addEventListener(type: string, handler: (event: PointerEvent) => void) { events.set(type, handler); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 390, height: 400 }; },
  } as unknown as HTMLElement;
  const action = vi.fn();
  const scene = new BoardScene(host, action);
  const internals = scene as unknown as { board: THREE.Group; camera: THREE.OrthographicCamera; targets: THREE.InstancedMesh[]; pick(x:number,y:number): {floor:number;index:number;revealed:boolean}|undefined };
  const game = createGame({ width: 30, height: 16, floors: 3, mines: 99, mode: 'connected', seed: 'instanced-picking', firstReveal: [225,225,225] });
  return { scene, internals, game, events, action };
}

describe('instanced large boards', () => {
  it('batches 1,440 hidden tiles into nine meshes and raycasts only the active floor', () => {
    const { scene, internals, game } = fixture();
    scene.update(game, 1, true);
    let meshes = 0;
    internals.board.traverse(object => { if (object instanceof THREE.InstancedMesh) meshes++; });
    expect(meshes).toBe(9);
    expect(internals.targets).toHaveLength(1);
    expect(internals.targets[0].count).toBe(480);
    expect(internals.targets[0].userData.hits.every((hit: {floor:number}) => hit.floor === 1)).toBe(true);
    const point = new THREE.Vector3(-.5, 2.47, -.5).project(internals.camera);
    expect(internals.pick((point.x + 1) * 390 / 2, (1 - point.y) * 400 / 2)).toEqual({ floor: 1, index: 224, revealed: false });
  });

  it('preserves instance-to-cell mapping when revealed tiles split into another material batch', () => {
    const { scene, internals, game } = fixture();
    game.cells[1][224].revealed = true;
    game.cells[1][224].adjacent = 2;
    scene.update(game, 1, true, { floor: 1, index: 224 });
    const point = new THREE.Vector3(-.5, 2.47, -.5).project(internals.camera);
    expect(internals.pick((point.x + 1) * 390 / 2, (1 - point.y) * 400 / 2)).toEqual({ floor: 1, index: 224, revealed: true });
    expect(internals.targets.reduce((count, mesh) => count + mesh.count, 0)).toBe(480);
    scene.update(game, 2, false);
    expect(internals.targets.every(mesh => mesh.userData.hits.every((hit: {floor:number}) => hit.floor === 2))).toBe(true);
  });
});

it('orbits and pinches without opening a tile, then allows tapping again', () => {
  const { scene, internals, game, events, action } = fixture();
  scene.update(game, 1, false);
  const { camera } = internals;
  const start = camera.position.clone();
  const send = (type: string, pointerId: number, clientX: number, clientY: number) =>
    events.get(`pointer${type}`)!({ pointerId, pointerType: 'touch', clientX, clientY, button: 0, preventDefault() {} } as PointerEvent);
  send('down', 1, 170, 200);
  send('down', 2, 220, 200);
  send('move', 1, 190, 210);
  send('move', 2, 240, 210);
  expect(camera.position.x).not.toBeCloseTo(start.x);
  expect(camera.position.y).not.toBeCloseTo(start.y);
  const right = camera.right;
  send('move', 1, 170, 210);
  send('move', 2, 260, 210);
  expect(camera.right).toBeLessThan(right);
  send('up', 2, 260, 210);
  send('up', 1, 170, 210);
  expect(action).not.toHaveBeenCalled();

  scene.reset();
  expect(camera.position.distanceTo(start)).toBeCloseTo(0);
  const tile = new THREE.Vector3(-.5, .17, -.5).project(camera);
  const x = (tile.x + 1) * 195, y = (1 - tile.y) * 200;
  send('down', 3, x, y);
  send('up', 3, x, y);
  expect(action).toHaveBeenCalledWith(1, 224, false, false);
});

describe('mine impact', () => {
  it('anchors a new loss to its floor and clears the effect when changing floors', () => {
    const { scene, game } = fixture();
    const burst = (scene as unknown as { burst: { object: THREE.Group } }).burst.object;
    scene.update(game, 1, true);
    game.status = 'lost';
    game.exploded = { floor: 1, index: 224 };
    scene.update(game, 1, true);
    expect(burst.visible).toBe(true);
    expect(burst.position.y).toBeCloseTo(2.535);
    scene.update(game, 0, true);
    expect(burst.visible).toBe(false);
    scene.update(game, 1, true);
    expect(burst.visible).toBe(false);
  });
});

it('plays short action feedback and clears it when changing floors', () => {
  const { scene, game } = fixture();
  const effects = scene as unknown as {
    chips: { object: THREE.Group };
    ripple: THREE.LineLoop;
    animateEffect(seconds: number): void;
  };
  scene.update(game, 1, true, undefined, { floor: 1, index: 224, kind: 'flag' });
  expect(effects.chips.object.visible).toBe(true);
  expect(effects.ripple.visible).toBe(true);
  for (let frame = 1; frame <= 18; frame++) effects.animateEffect(performance.now() / 1000 + frame / 60);
  expect(effects.chips.object.visible).toBe(false);
  expect(effects.ripple.visible).toBe(false);
  scene.update(game, 1, true, undefined, { floor: 1, index: 224, kind: 'chord' });
  scene.update(game, 0, false);
  expect(effects.chips.object.visible).toBe(false);
});
