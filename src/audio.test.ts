import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MinesAudio, MASTER_VOLUME, SOUNDS } from './audio';

function gain() {
  return { gain: { value: 0, setTargetAtTime: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn() };
}
function oscillator() {
  return { type: '', frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null as (() => void) | null };
}
class FakeContext {
  static instances: FakeContext[] = [];
  state = 'suspended'; currentTime = 10; destination = {};
  gains: ReturnType<typeof gain>[] = [];
  tones: ReturnType<typeof oscillator>[] = [];
  constructor() { FakeContext.instances.push(this); }
  resume = vi.fn(() => { this.state = 'running'; return Promise.resolve(); });
  createGain() { const node = gain(); this.gains.push(node); return node; }
  createOscillator() {
    const node = oscillator();
    this.tones.push(node); return node;
  }
}
const storage = { getItem: vi.fn(), setItem: vi.fn() };
beforeEach(() => {
  FakeContext.instances = []; storage.getItem.mockReset().mockReturnValue(null); storage.setItem.mockReset();
  vi.stubGlobal('AudioContext', FakeContext); vi.stubGlobal('localStorage', storage);
});
afterEach(() => vi.unstubAllGlobals());

describe('game sounds', () => {
  it('stays silent on page load and reuses one lazily unlocked audio context', () => {
    const audio = new MinesAudio();
    expect(FakeContext.instances).toHaveLength(0);
    audio.unlock(); audio.unlock();
    expect(FakeContext.instances).toHaveLength(1);
    expect(FakeContext.instances[0].resume).toHaveBeenCalledTimes(1);
    expect(FakeContext.instances[0].tones).toHaveLength(0);
  });

  it.each(['reveal', 'flag', 'win', 'loss'] as const)('schedules and cleans up the finite %s cue', cue => {
    new MinesAudio().play(cue);
    const ctx = FakeContext.instances[0];
    expect(ctx.gains[0].gain.value).toBe(MASTER_VOLUME);
    expect(ctx.tones).toHaveLength(SOUNDS[cue].length);
    SOUNDS[cue].forEach(([frequency, delay, duration, peak], i) => {
      const tone = ctx.tones[i], envelope = ctx.gains[i + 1];
      expect(tone.type).toBe('triangle');
      expect(tone.frequency.setValueAtTime).toHaveBeenCalledWith(frequency, 10 + delay);
      expect(envelope.gain.linearRampToValueAtTime).toHaveBeenCalledWith(peak, 10 + delay + .005);
      expect(tone.start).toHaveBeenCalledWith(10 + delay);
      expect(tone.stop).toHaveBeenCalledWith(10 + delay + duration);
      tone.onended!();
      expect(tone.disconnect).toHaveBeenCalledOnce(); expect(envelope.disconnect).toHaveBeenCalledOnce();
    });
  });

  it('persists mute, silences active voices, and does not schedule muted cues', () => {
    const audio = new MinesAudio(); audio.play('win');
    const ctx = FakeContext.instances[0], count = ctx.tones.length;
    audio.setEnabled(false); audio.play('reveal');
    expect(storage.setItem).toHaveBeenCalledWith('mines-sound', 'off');
    expect(ctx.gains[0].gain.setTargetAtTime).toHaveBeenCalledWith(0, 10, .015);
    expect(ctx.tones).toHaveLength(count);
    audio.setEnabled(true); audio.play('flag');
    expect(ctx.tones.length).toBeGreaterThan(count);
    storage.getItem.mockReturnValue('off');
    const muted = new MinesAudio(); muted.unlock(); muted.play('loss');
    expect(muted.enabled).toBe(false); expect(FakeContext.instances).toHaveLength(1);
  });

  it('waits for audio permission and does not play a pending cue after muting', async () => {
    const audio = new MinesAudio(); audio.unlock();
    const ctx = FakeContext.instances[0]; ctx.state = 'suspended';
    let resume!: () => void;
    const permission = new Promise<void>(resolve => { resume = () => { ctx.state = 'running'; resolve(); }; });
    ctx.resume.mockImplementation(() => permission);
    const pending = audio.play('win');
    expect(ctx.tones).toHaveLength(0);
    audio.setEnabled(false); resume(); await pending;
    expect(ctx.tones).toHaveLength(0);
  });

  it('keeps gameplay safe when storage, audio support or device access fails', async () => {
    storage.getItem.mockImplementation(() => { throw new Error('storage unavailable'); });
    storage.setItem.mockImplementation(() => { throw new Error('storage unavailable'); });
    vi.stubGlobal('AudioContext', undefined);
    const audio = new MinesAudio();
    expect(() => { audio.play('win'); audio.setEnabled(false); }).not.toThrow();
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('device unavailable'); } });
    audio.setEnabled(true);
    expect(() => audio.play('win')).not.toThrow();
    vi.stubGlobal('AudioContext', FakeContext);
    audio.unlock();
    const ctx = FakeContext.instances[0]; ctx.state = 'suspended';
    ctx.gains[0].gain.setTargetAtTime.mockImplementation(() => { throw new Error('device lost'); });
    expect(() => { audio.setEnabled(false); audio.setEnabled(true); }).not.toThrow();
    ctx.resume.mockImplementation(() => Promise.reject(new Error('blocked')));
    expect(() => audio.play('flag')).not.toThrow();
    await Promise.resolve();
  });
});
