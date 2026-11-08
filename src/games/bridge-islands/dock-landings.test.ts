import { Group } from 'three';
import { expect, it } from 'vitest';
import { dockLandings } from './dock-landings';
import { applyMove, createGame, nearestEdges, undo } from './engine';

it('places landings on both ends of completed bridges and removes them on undo', () => {
  const islands = [{ x: 0, y: 0, goal: 3 }, { x: 3, y: 0, goal: 3 }, { x: 0, y: 3, goal: 3 }];
  const game = createGame({ id: 'test', title: 'Test', islands, edges: nearestEdges(islands), solution: [1, 1] });
  const template = new Group();
  expect(dockLandings(game, template)).toHaveLength(0);
  expect(applyMove(game, { edge: 0, count: 1 })).toBe(true);
  expect(dockLandings(game, template, 0)).toHaveLength(0);
  expect(applyMove(game, { edge: 1, count: 2 })).toBe(true);
  const [east, west, south, north] = dockLandings(game, template);
  expect(east.position.x).toBeCloseTo(.53);
  expect(west.position.x).toBeCloseTo(2.47);
  expect(south.position.z).toBeCloseTo(.53);
  expect(north.position.z).toBeCloseTo(2.47);
  expect(south.rotation.y).toBe(Math.PI / 2);
  expect(south.scale.z).toBeGreaterThan(east.scale.z);
  expect(undo(game)).toBe(true);
  expect(dockLandings(game, template)).toHaveLength(2);
});
