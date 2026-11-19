import './menu-toggle.css';
import type { SoundGame } from './sound-voices';

/**
 * Optional zen background music, generated live with Web Audio (no files to download).
 * A pad, a soft noise bed and sparse plucked notes; about ten oscillators at most,
 * paused while the tab is hidden.
 */
type Pluck = 'kalimba' | 'glass' | 'bowl';
type Bed = 'breeze' | 'water' | 'hum';
export interface Mood {
  root: number;
  scale: readonly number[];
  chords: readonly (readonly number[])[];
  gap: readonly [number, number];
  pluck: Pluck;
  bed: Bed;
  pad: number;
}

const major = [0, 2, 4, 7, 9], minor = [0, 3, 5, 7, 10];
const garden = (root: number): Mood => ({ root, scale: major, chords: [[0, 2, 4], [3, 0, 2], [1, 3, 0], [4, 1, 3]], gap: [1.6, 4.2], pluck: 'kalimba', bed: 'breeze', pad: .05 });
const water = (root: number): Mood => ({ root, scale: minor, chords: [[0, 2, 3], [4, 1, 3], [2, 4, 1], [3, 0, 2]], gap: [2.4, 5.5], pluck: 'glass', bed: 'water', pad: .06 });
const night = (root: number): Mood => ({ root, scale: minor, chords: [[0, 3, 4], [2, 4, 1]], gap: [5, 10], pluck: 'bowl', bed: 'hum', pad: .045 });

/** Each game gets the mood that fits its setting and its own key, so games sound related but not identical. */
export const gameMoods: Record<SoundGame, Mood> = {
  'petals': garden(261.63),
  'traffic-garden': garden(293.66),
  'crate-garden': garden(246.94),
  'flip-garden': garden(277.18),
  'garden-sudoku': garden(220),
  'tiny-tangrams': garden(311.13),
  'picture-islands': garden(233.08),
  'robot-garden': garden(207.65),
  'color-stacks': garden(329.63),
  'water-garden': water(146.83),
  'water-balance': water(164.81),
  'frosty-paths': water(174.61),
  'crystal-light': water(196),
  'bridge-islands': water(130.81),
  'stepping-stones': water(155.56),
  'shadow-blocks': night(110),
  'perspective-paths': night(123.47),
  'pocket-escape': night(98),
  'rolling-stone': night(103.83),
  'marble-workshop': night(116.54),
  'pocket-railroads': night(92.5),
};

const musicKey = 'puzzles-music';
/** Music sits under the action sounds: its loudest notes stay about half as loud as a tap cue. */
export const MUSIC_VOLUME = .25;
/** Music follows the sound setting until the player chooses otherwise. */
export function musicPreference(music: string | null, sound: string | null): boolean {
  return music ? music === 'on' : sound !== 'off';
}

export function noteFrequency(mood: Mood, degree: number, octave = 0): number {
  const steps = mood.scale.length, wrapped = ((degree % steps) + steps) % steps;
  return mood.root * 2 ** ((mood.scale[wrapped] + 12 * (Math.floor(degree / steps) + octave)) / 12);
}

const plucks: Record<Pluck, { partials: [number, number][]; decay: number; attack: number; peak: number }> = {
  kalimba: { partials: [[1, 1], [5.4, .12]], decay: 1.4, attack: .004, peak: .16 },
  glass: { partials: [[1, 1], [2.76, .25], [5.4, .08]], decay: 2.6, attack: .003, peak: .09 },
  bowl: { partials: [[1, 1], [2.71, .35], [5.15, .1]], decay: 7, attack: .5, peak: .07 },
};
const beds: Record<Bed, [BiquadFilterType, number, number, number, number, number]> = {
  // filter, frequency, Q, level, swell depth, swell rate
  breeze: ['bandpass', 500, .5, .10, .07, .06],
  water: ['lowpass', 380, .8, .16, .12, .17],
  hum: ['lowpass', 160, .4, .06, .03, .06],
};
const rand = (low: number, high: number) => low + Math.random() * (high - low);

class Ambient {
  private context?: AudioContext;
  private master?: GainNode;
  private reverb?: ConvolverNode;
  private sources: AudioScheduledSourceNode[] = [];
  private timers: number[] = [];
  playing = false;

  constructor(private readonly mood: Mood) {}

  start() {
    if (this.playing || typeof AudioContext === 'undefined') return;
    try {
      this.setup();
      const context = this.context!;
      void context.resume().catch(() => {});
      this.playing = true;
      this.master!.gain.setTargetAtTime(MUSIC_VOLUME, context.currentTime, 1.5);
      if (!this.sources.length) { this.pad(); this.bed(); }
      const next = () => {
        if (!this.playing) return;
        if (!document.hidden) this.pluck();
        this.timers.push(window.setTimeout(next, rand(...this.mood.gap) * 1000));
      };
      this.timers.push(window.setTimeout(next, 1500));
    } catch { /* Music is optional; never interrupt play. */ }
  }

  stop() {
    this.playing = false;
    this.timers.forEach(clearTimeout); this.timers = [];
    const context = this.context;
    if (!context || !this.master) return;
    this.master.gain.setTargetAtTime(0, context.currentTime, .4);
    // Suspend once faded so the generated sound costs nothing while off.
    this.timers.push(window.setTimeout(() => { if (!this.playing) void context.suspend().catch(() => {}); }, 1800));
  }

  private setup() {
    if (this.context) return;
    const context = new AudioContext({ latencyHint: 'playback' });
    const master = context.createGain(); master.gain.value = 0; master.connect(context.destination);
    const reverb = context.createConvolver(), length = Math.floor(context.sampleRate * 2.6);
    const impulse = context.createBuffer(2, length, context.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
    }
    reverb.buffer = impulse;
    const wet = context.createGain(); wet.gain.value = .55; reverb.connect(wet).connect(master);
    this.context = context; this.master = master; this.reverb = reverb;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) void context.suspend().catch(() => {});
      else if (this.playing) void context.resume().catch(() => {});
    });
  }

  private out(node: AudioNode, dry: number) {
    const gain = this.context!.createGain(); gain.gain.value = dry;
    node.connect(gain).connect(this.master!); node.connect(this.reverb!);
  }

  private pad() {
    const context = this.context!, mood = this.mood;
    const bus = context.createGain(); bus.gain.value = mood.pad;
    const filter = context.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 700; filter.Q.value = .3;
    const lfo = context.createOscillator(), depth = context.createGain(); lfo.frequency.value = .05; depth.gain.value = 250;
    lfo.connect(depth).connect(filter.frequency); lfo.start();
    bus.connect(filter); this.out(filter, .5);
    const tones = [0, 1, 2].map(() => [-4, 4].map(cents => {
      const tone = context.createOscillator(), level = context.createGain();
      tone.type = cents < 0 ? 'sine' : 'triangle'; tone.detune.value = cents; level.gain.value = cents < 0 ? .5 : .18;
      tone.connect(level).connect(bus); tone.start(); return tone;
    }));
    let step = 0;
    const change = () => {
      const chord = mood.chords[step++ % mood.chords.length];
      tones.forEach((pair, i) => pair.forEach(tone =>
        tone.frequency.setTargetAtTime(noteFrequency(mood, chord[i], i === 0 ? -1 : 0), context.currentTime, 2.5)));
    };
    change();
    window.setInterval(() => { if (this.playing && !document.hidden) change(); }, 16000);
    this.sources.push(lfo, ...tones.flat());
  }

  private bed() {
    const context = this.context!;
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate), data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; data[i] = last * 3.5; }
    const [type, frequency, q, level, swell, rate] = beds[this.mood.bed];
    const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    const filter = context.createBiquadFilter(), gain = context.createGain();
    filter.type = type; filter.frequency.value = frequency; filter.Q.value = q; gain.gain.value = level;
    const lfo = context.createOscillator(), depth = context.createGain(); lfo.frequency.value = rate; depth.gain.value = swell;
    lfo.connect(depth).connect(gain.gain);
    source.connect(filter).connect(gain); this.out(gain, .8);
    source.start(); lfo.start();
    this.sources.push(source, lfo);
  }

  private pluck() {
    const context = this.context!, mood = this.mood, shape = plucks[mood.pluck];
    const time = context.currentTime + .02;
    const frequency = noteFrequency(mood, Math.floor(rand(0, mood.scale.length * 2)), mood.pluck === 'bowl' ? 0 : 1);
    const envelope = context.createGain(), pan = context.createStereoPanner();
    envelope.gain.setValueAtTime(.0001, time);
    envelope.gain.exponentialRampToValueAtTime(shape.peak, time + shape.attack);
    envelope.gain.exponentialRampToValueAtTime(.0001, time + shape.attack + shape.decay);
    pan.pan.value = rand(-.6, .6);
    envelope.connect(pan); this.out(pan, .45);
    const end = time + shape.attack + shape.decay + .1;
    for (const [ratio, level] of shape.partials) {
      const tone = context.createOscillator(), gain = context.createGain();
      tone.frequency.value = frequency * ratio; gain.gain.value = level;
      tone.connect(gain).connect(envelope); tone.start(time); tone.stop(end);
      tone.onended = () => { tone.disconnect(); gain.disconnect(); };
    }
    if (Math.random() < .3) this.timers.push(window.setTimeout(() => this.playing && !document.hidden && this.pluck(), rand(250, 700)));
  }
}

/** Adds a "Music" row after the game's Sound row and plays the game's mood after the first tap or key press. */
export function addMusic(game: SoundGame) {
  const sound = document.getElementById('sound') ?? document.getElementById('sound-toggle');
  if (!sound) return;
  const ambient = new Ambient(gameMoods[game]);
  let enabled = true;
  try { enabled = musicPreference(localStorage.getItem(musicKey), localStorage.getItem('mines-sound')); } catch { /* default on */ }
  const button = document.createElement('button');
  button.type = 'button'; button.className = sound.className;
  const label = () => { button.textContent = enabled ? 'Music: on' : 'Music: off'; button.setAttribute('aria-pressed', String(enabled)); };
  label();
  sound.after(button);
  // Put both switches at the top of the menu, where they are easy to find.
  const body = sound.closest('.sheet-body');
  if (body) {
    const group = document.createElement('div');
    group.className = 'menu-toggles';
    group.append(sound, button);
    body.prepend(group);
  }
  button.onclick = () => {
    enabled = !enabled; label();
    try { localStorage.setItem(musicKey, enabled ? 'on' : 'off'); } catch { /* keep the in-memory choice */ }
    if (enabled) ambient.start(); else ambient.stop();
  };
  // Browsers only allow audio after a user gesture.
  const begin = () => { if (enabled) ambient.start(); };
  for (const event of ['pointerdown', 'keydown']) document.addEventListener(event, begin, { capture: true, once: true });
}
