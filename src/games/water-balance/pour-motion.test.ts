import { describe, expect, it } from 'vitest';
import { firstContact, pourEnd, settleEnd, transferProgress, waterSlope } from './pour-motion';

describe('Water Balance pour feedback', () => {
  it('starts transferring at contact and stops exactly at the committed amount', () => {
    expect(transferProgress(firstContact - .01)).toBe(0);
    expect(transferProgress((firstContact + pourEnd) / 2)).toBeCloseTo(.5);
    expect(transferProgress(pourEnd)).toBe(1);
    expect(transferProgress(settleEnd + 1)).toBe(1);
  });

  it('bounds the slosh inside the jug and settles at a flat surface', () => {
    const radius = .45;
    for (const height of [0, .01, .5, .99, 1]) {
      for (let time = firstContact; time < settleEnd; time += .02) {
        const edge = Math.abs(waterSlope(time, height, 1, radius)) * radius;
        expect(height - edge).toBeGreaterThanOrEqual(0);
        expect(height + edge).toBeLessThanOrEqual(1);
      }
    }
    expect(waterSlope(firstContact + .06, .5, 1, radius)).not.toBe(0);
    expect(waterSlope(settleEnd, .5, 1, radius)).toBe(0);
  });
});
