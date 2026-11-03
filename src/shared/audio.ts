// Original, short triangle-wave plucks; no recordings or network requests.
type Note = readonly [frequency: number, delay: number, duration: number, peak: number];
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

  constructor() {
    try { this.enabled = localStorage.getItem('mines-sound') !== 'off'; } catch { /* Play still works without storage. */ }
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
      for (const [frequency, delay, duration, peak] of SOUNDS[cue]) {
        const start = context.currentTime + delay;
        const tone = context.createOscillator(), envelope = context.createGain();
        tone.type = 'triangle';
        tone.frequency.setValueAtTime(frequency, start);
        envelope.gain.setValueAtTime(.0001, start);
        envelope.gain.linearRampToValueAtTime(peak, start + .005);
        envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
        tone.connect(envelope); envelope.connect(master);
        tone.onended = () => { tone.disconnect(); envelope.disconnect(); };
        tone.start(start); tone.stop(start + duration);
      }
    } catch { /* Stay playable if the audio device becomes unavailable. */ }
  }
}
