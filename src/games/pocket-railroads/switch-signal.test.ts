import { expect, it } from 'vitest';
import * as THREE from 'three';
import { applyMove, createGame, trace, undo } from './engine';
import { levels } from './levels';
import { switchSignal } from './switch-signal';

it('points down the actual branch after a flip and returns after undo', () => {
  const game = createGame(levels[0]);
  const root = game.level.root;
  if (!('junction' in root)) throw new Error('Expected a switch in the first level');
  const junction = root;
  const template = new THREE.Group();
  const disc = new THREE.Group();
  disc.name = 'disc';
  template.add(disc);

  function check() {
    const signal = switchSignal(template, junction, game.switches[junction.junction]);
    const pointer = signal.children[1];
    const arrowDirection = new THREE.Vector3(0, 0, 1).applyEuler(pointer.rotation);
    const routeDirection = Math.sign(trace(game).points[2].y - junction.y);
    expect(arrowDirection.z).toBeCloseTo(routeDirection);
    expect(Math.sign(pointer.position.z)).toBe(routeDirection);
    expect(Math.sign(signal.getObjectByName('disc')!.rotation.z)).toBe(routeDirection);
    expect(disc.rotation.z).toBe(0);
  }

  check();
  expect(applyMove(game, junction.junction)).toBe(true);
  check();
  expect(undo(game)).toBe(true);
  check();
});
