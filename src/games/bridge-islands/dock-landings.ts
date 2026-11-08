import { Group } from 'three';
import type { Game } from './engine';

export function dockLandings(game: Game, template: Group, growingEdge?: number): Group[] {
  const { islands, edges } = game.level;
  return edges.flatMap(({ a, b }, index) => {
    const count = game.bridges[index];
    if (!count || (count === 1 && index === growingEdge)) return [];
    const from = islands[a], to = islands[b];
    const horizontal = from.y === to.y;
    return [from, to].map((island, end) => {
      const dock = template.clone();
      const offset = end === 0 ? .53 : -.53;
      dock.position.set(island.x + (horizontal ? offset : 0), .03, island.y + (horizontal ? 0 : offset));
      dock.scale.set(.24, .6, count === 2 ? .34 : .22);
      dock.rotation.y = horizontal ? 0 : Math.PI / 2;
      return dock;
    });
  });
}
