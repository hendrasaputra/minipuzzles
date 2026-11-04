import { describe, expect, it } from 'vitest';
import { bounceHeight, burstDuration, PixelBurst } from './pixel-burst';

describe('pixel burst physics', () => {
  it('lands, bounces lower, and never crosses the floor', () => {
    expect(bounceHeight(1.1, .1)).toBeCloseTo(.055);
    expect(bounceHeight(1.1, .2)).toBeCloseTo(0);
    expect(bounceHeight(1.1, .228)).toBeGreaterThan(0);
    expect(bounceHeight(1.1, .228)).toBeLessThan(.055);
    expect(bounceHeight(1.1, .6)).toBe(0);
  });

  it('reuses its capped pool and clears expired effects', () => {
    const burst = new PixelBurst();
    burst.start(0, 0, 0, 'dust', 7, 99);
    expect(burst.object.children).toHaveLength(12);
    const first = burst.object.children[0];
    burst.update(.1);
    const position = first.position.clone();
    burst.start(0, 0, 0, 'dust', 7);
    burst.update(.1);
    expect(first.position.equals(position)).toBe(true);
    expect(burst.update(burstDuration)).toBe(false);
    expect(burst.object.visible).toBe(false);
    burst.dispose();
  });
});
