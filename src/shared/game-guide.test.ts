import { describe, expect, it } from 'vitest';
import { firstVisit, gameGuide } from './game-guide';

describe('game guide', () => {
  it('opens only for players with no save and no earlier guide', () => {
    expect(firstVisit(['mines-sound', 'puzzles-music'], 'water-garden', 'puzzles-guide-water-garden')).toBe(true);
    expect(firstVisit(['puzzles-water-garden-v1'], 'water-garden', 'puzzles-guide-water-garden')).toBe(false);
    expect(firstVisit(['puzzles-guide-water-garden'], 'water-garden', 'puzzles-guide-water-garden')).toBe(false);
    expect(firstVisit(['petal-save-v2'], 'petals', 'puzzles-guide-petals')).toBe(false);
  });
  it('draws a finger for gesture steps and adds the other-controls line', () => {
    const html = gameGuide([{ gesture: 'tap', text: 'Tap a pipe.' }], true, 'Press Enter.');
    expect(html).toContain('guide-gesture');
    expect(html).toContain('Other controls.');
    expect(html).not.toContain('guide-arrow');
  });
});
