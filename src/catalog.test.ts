import { describe, expect, it } from 'vitest';
import { games } from './catalog';

describe('puzzle catalog', () => {
  it('has unique stable IDs and twenty-one playable games', () => {
    expect(games).toHaveLength(21);
    expect(new Set(games.map(game => game.id)).size).toBe(games.length);
    expect(games.filter(game => game.status === 'playable')).toEqual([
      expect.objectContaining({ id: 'petals', title: 'Petals', href: './games/petals/' }),
      expect.objectContaining({ id: 'traffic-garden', title: 'Traffic Garden', href: './games/traffic-garden/' }),
      expect.objectContaining({ id: 'crate-garden', title: 'Crate Garden', href: './games/crate-garden/' }),
      expect.objectContaining({ id: 'water-garden', title: 'Water Garden', href: './games/water-garden/' }),
      expect.objectContaining({ id: 'crystal-light', title: 'Crystal Light', href: './games/crystal-light/' }),
      expect.objectContaining({ id: 'frosty-paths', title: 'Frosty Paths', href: './games/frosty-paths/' }),
      expect.objectContaining({ id: 'marble-workshop', title: 'Marble Workshop', href: './games/marble-workshop/' }),
      expect.objectContaining({ id: 'shadow-blocks', title: 'Shadow Blocks', href: './games/shadow-blocks/' }),
      expect.objectContaining({ id: 'picture-islands', title: 'Picture Islands', href: './games/picture-islands/' }),
      expect.objectContaining({ id: 'pocket-railroads', title: 'Pocket Railroads', href: './games/pocket-railroads/' }),
      expect.objectContaining({ id: 'robot-garden', title: 'Robot Garden', href: './games/robot-garden/' }),
      expect.objectContaining({ id: 'bridge-islands', title: 'Bridge Islands', href: './games/bridge-islands/' }),
      expect.objectContaining({ id: 'flip-garden', title: 'Flip Garden', href: './games/flip-garden/' }),
      expect.objectContaining({ id: 'tiny-tangrams', title: 'Tiny Tangrams', href: './games/tiny-tangrams/' }),
      expect.objectContaining({ id: 'color-stacks', title: 'Color Stacks', href: './games/color-stacks/' }),
      expect.objectContaining({ id: 'garden-sudoku', title: 'Garden Sudoku', href: './games/garden-sudoku/' }),
      expect.objectContaining({ id: 'rolling-stone', title: 'Rolling Stone', href: './games/rolling-stone/' }),
      expect.objectContaining({ id: 'stepping-stones', title: 'Stepping Stones', href: './games/stepping-stones/' }),
      expect.objectContaining({ id: 'water-balance', title: 'Water Balance', href: './games/water-balance/' }),
      expect.objectContaining({ id: 'perspective-paths', title: 'Perspective Paths', href: './games/perspective-paths/' }),
      expect.objectContaining({ id: 'pocket-escape', title: 'Pocket Escape', href: './games/pocket-escape/' }),
    ]);
  });

  it('keeps planned games non-navigable and uses stable icon filenames', () => {
    for (const game of games) {
      expect(game.id).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
      expect(game.accent).toMatch(/^#[0-9a-f]{6}$/);
      expect(game.monogram.length).toBeGreaterThan(0);
      expect(game.monogram.length).toBeLessThanOrEqual(2);
      expect(game.description.length).toBeGreaterThan(20);
      if (game.icon) expect(game.icon).toBe(`./icons/${game.id}.png`);
      if (game.status === 'planned') expect(game.href).toBeUndefined();
    }
  });
});
