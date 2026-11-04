// Wave, starting pitch, ending pitch and duration for each game's action sound.
type Voice = readonly [wave: OscillatorType, start: number, end: number, duration: number];

export const soundVoices = {
  'bridge-islands': ['triangle', 360, 160, .14],
  'color-stacks': ['sine', 510, 260, .095],
  'crate-garden': ['triangle', 225, 96, .10],
  'crystal-light': ['sine', 840, 1680, .19],
  'flip-garden': ['sine', 470, 760, .11],
  'frosty-paths': ['sine', 1250, 560, .21],
  'garden-sudoku': ['triangle', 370, 550, .12],
  'marble-workshop': ['sine', 690, 320, .18],
  'perspective-paths': ['sine', 410, 820, .17],
  'petals': ['triangle', 630, 870, .085],
  'picture-islands': ['triangle', 570, 390, .075],
  'pocket-escape': ['square', 280, 175, .068],
  'pocket-railroads': ['triangle', 275, 205, .15],
  'robot-garden': ['square', 460, 610, .075],
  'rolling-stone': ['triangle', 165, 62, .15],
  'shadow-blocks': ['triangle', 295, 131, .12],
  'stepping-stones': ['sine', 440, 240, .12],
  'tiny-tangrams': ['triangle', 720, 500, .08],
  'traffic-garden': ['sawtooth', 115, 200, .14],
  'water-balance': ['sine', 490, 790, .22],
  'water-garden': ['sine', 580, 1010, .16],
} as const satisfies Record<string, Voice>;

export type SoundGame = keyof typeof soundVoices;

// Center frequency, length and gain of the filtered texture under the action tone.
export const soundTextures: Partial<Record<SoundGame, readonly [number, number, number]>> = {
  'bridge-islands': [1250, .15, .22],
  'crate-garden': [410, .085, .28],
  'frosty-paths': [3100, .22, .16],
  'marble-workshop': [1800, .14, .14],
  'pocket-railroads': [720, .14, .25],
  'rolling-stone': [260, .15, .30],
  'stepping-stones': [670, .10, .15],
  'traffic-garden': [530, .14, .17],
  'water-balance': [1450, .27, .29],
  'water-garden': [1750, .17, .22],
};
