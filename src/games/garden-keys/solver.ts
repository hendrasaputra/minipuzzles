import { act, DIRECTIONS, type Direction, type Game, type State } from './engine';

/** A calm-mode action written as one letter: n e s w, or x to wait. */
export type Action = Direction | 'wait';
export const encode = (actions: readonly Action[]) => actions.map(a => a === 'wait' ? 'x' : a).join('');
export const decode = (text: string): Action[] => [...text].map(c => c === 'x' ? 'wait' : c as Direction);

// Ticks only matter through the snapper's every-other-step rhythm.
const key = (s: State) => JSON.stringify({ ...s, ticks: s.ticks % 2, nextId: 0 });

/**
 * Breadth-first search over calm-mode actions, so the answer has the fewest actions.
 * Waiting is only tried when monsters can move. Gives up after `maxStates`.
 */
export function solve(game: Game, maxStates = 200_000): Action[] | null {
  if (game.state.status === 'won') return [];
  const actions: Action[] = game.state.monsters.length ? ['wait', ...DIRECTIONS] : [...DIRECTIONS];
  const nodes: { state: State; parent: number; action?: Action }[] = [{ state: game.state, parent: -1 }];
  const seen = new Set([key(game.state)]);
  for (let head = 0; head < nodes.length; head++) {
    for (const action of actions) {
      const probe: Game = { level: game.level, timed: false, state: structuredClone(nodes[head].state), history: [] };
      act(probe, action);
      const s = probe.state;
      if (s.status === 'lost') continue;
      const id = key(s);
      if (seen.has(id)) continue;
      if (nodes.length >= maxStates) return null;
      seen.add(id);
      nodes.push({ state: s, parent: head, action });
      if (s.status === 'won') {
        const path: Action[] = [];
        for (let at = nodes.length - 1; nodes[at].parent !== -1; at = nodes[at].parent) path.push(nodes[at].action!);
        return path.reverse();
      }
    }
  }
  return null;
}
