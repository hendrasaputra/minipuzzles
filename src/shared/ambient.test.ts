import { describe, expect, it } from 'vitest';
import { gameMoods, musicPreference, noteFrequency } from './ambient';
import { soundVoices } from './sound-voices';

describe('ambient music', () => {
  it('gives every game a mood in its own key', () => {
    expect(Object.keys(gameMoods).sort()).toEqual(Object.keys(soundVoices).sort());
    const roots = Object.values(gameMoods).map(mood => mood.root);
    expect(new Set(roots).size).toBe(roots.length);
  });
  it('follows the sound setting until music is chosen', () => {
    expect(musicPreference(null, null)).toBe(true);
    expect(musicPreference(null, 'off')).toBe(false);
    expect(musicPreference('on', 'off')).toBe(true);
    expect(musicPreference('off', 'on')).toBe(false);
  });
  it('wraps scale degrees into octaves', () => {
    const mood = gameMoods.petals;
    expect(noteFrequency(mood, 0)).toBeCloseTo(261.63);
    expect(noteFrequency(mood, 5)).toBeCloseTo(523.26);
    expect(noteFrequency(mood, -5)).toBeCloseTo(130.815);
  });
});
