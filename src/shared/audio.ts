import { soundTextures, soundVoices, type SoundGame } from './sound-voices';

type Note = readonly [frequency: number, delay: number, duration: number, peak: number,
  wave?: OscillatorType, endFrequency?: number];
export const MASTER_VOLUME = .25;
export const SOUNDS = {
  reveal: [[740, 0, .07, .2], [988, .035, .08, .12]],
  flag: [[440, 0, .06, .2], [660, .045, .09, .15]],
  win: [[523.25, 0, .16, .22], [659.25, .09, .16, .22], [783.99, .18, .18, .22], [1046.5, .29, .28, .25]],
  loss: [[392, 0, .1, .22], [220, .075, .15, .2], [130.81, .18, .22, .2]],
} as const satisfies Record<string, readonly Note[]>;
export type SoundCue = keyof typeof SOUNDS;

export class GameAudio {
  enabled = true;
  private context?: AudioContext;
  private master?: GainNode;
  private noise?: AudioBuffer;

  constructor(private readonly game?: SoundGame) {
    try { this.enabled = localStorage.getItem('mines-sound') !== 'off'; } catch { /* Play still works without storage. */ }
  }

  private notes(cue: SoundCue): readonly Note[] {
    if (!this.game) return SOUNDS[cue];
    const [wave, start, end, duration] = soundVoices[this.game];
    if (cue === 'win' || cue === 'loss') {
      const chime = wave === 'square' || wave === 'sawtooth' ? 'triangle' : wave;
      return SOUNDS[cue].map(([frequency, delay, length, peak]) => [frequency, delay, length, peak, chime]);
    }
    const pitch = cue === 'flag' ? .78 : 1;
    const peak = wave === 'square' || wave === 'sawtooth' ? .09 : .20;
    return [
      [start * pitch, 0, duration, peak, wave, end * pitch],
      [end * pitch * 1.5, duration * .3, duration * .85, .07, 'sine'],
    ];
  }

  private playTexture(context: AudioContext, master: GainNode, cue: SoundCue): void {
    const texture = this.game && soundTextures[this.game];
    if (!texture || (cue !== 'reveal' && cue !== 'flag')) return;
    const [frequency, duration, peak] = texture;
    if (!this.noise) {
      const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * .3), context.sampleRate);
      const samples = buffer.getChannelData(0);
      let seed = 19;
      for (let i = 0; i < samples.length; i++) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        samples[i] = seed / 2147483648 - 1;
      }
      this.noise = buffer;
    }
    const time = context.currentTime;
    const source = context.createBufferSource(), filter = context.createBiquadFilter(), envelope = context.createGain();
    source.buffer = this.noise;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(frequency, time);
    filter.Q.value = .7;
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.linearRampToValueAtTime(cue === 'flag' ? peak * .6 : peak, time + .012);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + duration);
    source.connect(filter); filter.connect(envelope); envelope.connect(master);
    source.onended = () => { source.disconnect(); filter.disconnect(); envelope.disconnect(); };
    source.start(time); source.stop(time + duration);
  }

  /** Called inside pointer/key gestures so mobile browsers can unlock audio. */
  unlock(): void {
    if (!this.enabled || typeof AudioContext === 'undefined') return;
    try {
      if (!this.context) {
        const context = new AudioContext();
        const master = context.createGain();
        master.gain.value = MASTER_VOLUME;
        master.connect(context.destination);
        this.context = context; this.master = master;
      }
      if (this.context.state !== 'running' && this.context.state !== 'closed') void this.context.resume().catch(() => {});
    } catch { /* Audio is optional; device/browser failures must not interrupt play. */ }
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try { localStorage.setItem('mines-sound', enabled ? 'on' : 'off'); } catch { /* Keep the in-memory preference. */ }
    try {
      if (this.context && this.master) this.master.gain.setTargetAtTime(enabled ? MASTER_VOLUME : 0, this.context.currentTime, .015);
    } catch { /* Keep the toggle usable if audio hardware fails. */ }
  }

  async play(cue: SoundCue): Promise<void> {
    if (!this.enabled) return;
    this.unlock();
    const context = this.context, master = this.master;
    if (!context || !master) return;
    try {
      if (context.state !== 'running') await context.resume();
      if (!this.enabled || context.state !== 'running') return;
      for (const [frequency, delay, duration, peak, wave = 'triangle', endFrequency] of this.notes(cue)) {
        const start = context.currentTime + delay;
        const tone = context.createOscillator(), envelope = context.createGain();
        tone.type = wave;
        tone.frequency.setValueAtTime(frequency, start);
        if (endFrequency !== undefined) tone.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
        envelope.gain.setValueAtTime(.0001, start);
        envelope.gain.linearRampToValueAtTime(peak, start + .005);
        envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
        tone.connect(envelope); envelope.connect(master);
        tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
        tone.start(start); tone.stop(start + duration);
      }
      this.playTexture(context, master, cue);
    } catch { /* Stay playable if the audio device becomes unavailable. */ }
  }
}
