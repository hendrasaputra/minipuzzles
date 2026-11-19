import { describe, expect, it } from 'vitest';
import { tipLearned } from './touch-camera-hint';

describe('touch camera tip', () => {
  it('stays for the first few one-finger taps and goes after a two-finger touch', () => {
    expect(tipLearned(3, 1)).toBe(false);
    expect(tipLearned(4, 1)).toBe(true);
    expect(tipLearned(2, 2)).toBe(true);
  });
});
