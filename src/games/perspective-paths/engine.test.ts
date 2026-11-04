import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { fitCamera } from '../../shared/camera';
import { aligned, complete, createGame, currentGap, initialView, join, requiredView, undo } from './engine';
import { levels, randomLevel } from './levels';
import { readSave, writeSave } from './storage';

function solveLevel(level: typeof levels[number]) {
  const game = createGame(level);
  while (!complete(game)) {
    const view = requiredView(currentGap(game)!);
    // MiniScene moves in these same steps from the reset camera.
    const stepped = {
      yaw: initialView.yaw + Math.round((view.yaw - initialView.yaw) / .15) * .15,
      tilt: initialView.tilt + Math.round((view.tilt - initialView.tilt) / .1) * .1,
    };
    expect(join(game, stepped)).toBe(true);
  }
  return game;
}

describe('Perspective Paths', () => {
  it('accepts a join only when the two raised platforms overlap in camera projection', () => {
    const game = createGame(levels[0]);
    const oneTurn = { ...initialView, yaw: initialView.yaw - .15 };
    const twoTurns = { ...initialView, yaw: initialView.yaw - .30 };
    expect(join(game, initialView)).toBe(false);
    expect(join(game, oneTurn)).toBe(false);
    const [from, to] = currentGap(game)!.map(p => new THREE.Vector3(p.x, p.z, p.y));
    const camera = new THREE.OrthographicCamera();
    const bounds = new THREE.Box3().setFromPoints([from, to]);
    fitCamera(camera, bounds, bounds.getCenter(new THREE.Vector3()), twoTurns.yaw, 1, new THREE.Vector3(), 1, twoTurns.tilt);
    const a = from.clone().project(camera);
    const b = to.clone().project(camera);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(1e-9);
    expect(join(game, twoTurns)).toBe(true);
    expect(complete(game)).toBe(true);
    expect(undo(game)).toBe(true);
    expect(complete(game)).toBe(false);
    expect(aligned(game, twoTurns)).toBe(true);
  });

  it('joins every authored gap in order using supported camera steps', () => {
    expect(levels).toHaveLength(8);
    levels.forEach(solveLevel);
  });

  it.each(['easy', 'medium', 'hard'] as const)('makes distinct deterministic and solvable %s routes', difficulty => {
    const routes = new Set<string>();
    for (let i = 0; i < 12; i++) {
      const spec = { version: 1 as const, seed: `paths-${i}`, difficulty };
      const level = randomLevel(spec);
      expect(randomLevel(spec)).toEqual(level);
      solveLevel(level);
      routes.add(JSON.stringify(level.points));
    }
    expect(routes.size).toBeGreaterThan(8);
  });

  it('replays verified joins and rejects a forged viewing angle', () => {
    const random = { version: 1 as const, seed: 'replay', difficulty: 'hard' as const };
    const game = solveLevel(randomLevel(random));
    const raw = writeSave({ game, completed: ['perspective-1'], random });
    expect(readSave(raw)).toEqual({ game, completed: ['perspective-1'], random });
    const invalid = JSON.parse(raw);
    invalid.history[0].tilt = .35;
    invalid.history[0].yaw = -1;
    expect(readSave(JSON.stringify(invalid))).toBeNull();
    expect(readSave(JSON.stringify({ ...invalid, history: [null] }))).toBeNull();
  });
});
