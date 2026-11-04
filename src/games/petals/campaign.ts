import { startGame, type Config } from './engine';

export interface Level {
  id: string;
  title: string;
  chapter: 'classic' | 'layered' | 'connected';
  description: string;
  lesson: string;
  config: Config;
}

/** Curated generator-v1 seeds; campaign.test.ts proves every shipped opening without guesses. */
export const campaign: Level[] = [
  {
    id: 'first-steps', title: 'First steps', chapter: 'classic',
    description: 'A safe opening and a little room to think.',
    lesson: 'A number counts mines next to that tile. Open every safe tile to win.',
    config: { width: 5, height: 5, floors: 1, mines: 3, mode: 'classic', seed: 'petal-campaign-0', firstReveal: [12], generatorVersion: 1 },
  },
  {
    id: 'clear-thinking', title: 'Clear thinking', chapter: 'classic',
    description: 'Put your flags to work.',
    lesson: 'Flag suspected mines. When the flags match a number, tap it and choose Open tiles. A wrong flag can lead to a mine.',
    config: { width: 6, height: 6, floors: 1, mines: 5, mode: 'classic', seed: 'petal-campaign-0', firstReveal: [14], generatorVersion: 1 },
  },
  {
    id: 'another-perspective', title: 'Another perspective', chapter: 'layered',
    description: 'Two floors, two independent puzzles.',
    lesson: 'The floors are separate. Numbers count mines on their own floor. Clear both floors to win.',
    config: { width: 5, height: 5, floors: 2, mines: 3, mode: 'layered', seed: 'petal-campaign-0', firstReveal: [12, 12], generatorVersion: 1 },
  },
  {
    id: 'three-little-worlds', title: 'Three little worlds', chapter: 'layered',
    description: 'A taller stack, the same familiar logic.',
    lesson: 'Choose a floor to play it. Use All floors to see the whole board. Each floor has five mines.',
    config: { width: 6, height: 6, floors: 3, mines: 5, mode: 'layered', seed: 'petal-campaign-0', firstReveal: [14, 14, 14], generatorVersion: 1 },
  },
  {
    id: 'look-up', title: 'Look up', chapter: 'connected',
    description: 'A clue can point to a different floor.',
    lesson: '↑ counts mines in a 3×3 square one floor up, including the tile right above. Tap the clue to see the square.',
    config: { width: 5, height: 5, floors: 2, mines: 3, mode: 'connected', vertical: 'above', seed: 'petal-campaign-2', firstReveal: [11, 12], generatorVersion: 1 },
  },
  {
    id: 'look-down', title: 'Look down', chapter: 'connected',
    description: 'The same idea, in the other direction.',
    lesson: '↓ counts mines in a 3×3 square one floor down. A zero opens safe tiles in that square.',
    config: { width: 5, height: 5, floors: 2, mines: 3, mode: 'connected', vertical: 'below', seed: 'petal-campaign-71', firstReveal: [6, 7], generatorVersion: 1 },
  },
  {
    id: 'hidden-connections', title: 'Hidden connections', chapter: 'connected',
    description: 'Follow the logic through all three floors.',
    lesson: 'Numbers count mines on the same floor. An arrow counts one floor up or down. Tap a clue to see the tiles it counts.',
    config: { width: 5, height: 5, floors: 3, mines: 3, mode: 'connected', vertical: 'both', seed: 'petal-campaign-20', firstReveal: [6, 7, 8], generatorVersion: 1 },
  },
];

export function createLevel(level: Level) { return startGame(level.config); }
