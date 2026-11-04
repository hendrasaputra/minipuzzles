import { describe, expect, it } from 'vitest';
import { games } from './catalog';

describe('puzzle catalog', () => {
  it('has unique stable IDs and nine playable games', () => {
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
