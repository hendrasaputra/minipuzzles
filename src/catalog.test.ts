import { describe, expect, it } from 'vitest';
import { games } from './catalog';

describe('puzzle catalog', () => {
  it('has unique stable IDs and two playable games', () => {
    expect(games).toHaveLength(21);
    expect(new Set(games.map(game => game.id)).size).toBe(games.length);
    expect(games.filter(game => game.status === 'playable')).toEqual([
      expect.objectContaining({ id: 'petals', title: 'Petals', href: './games/petals/' }),
      expect.objectContaining({ id: 'traffic-garden', title: 'Traffic Garden', href: './games/traffic-garden/' }),
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
