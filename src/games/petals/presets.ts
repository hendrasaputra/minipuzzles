import type { Config } from './engine';

export const BOARD_SIZES = [
  { id: 'small', label: 'Small', width: 6, height: 6, mines: 6 },
  { id: 'beginner', label: 'Beginner', width: 9, height: 9, mines: 10 },
  { id: 'intermediate', label: 'Intermediate', width: 16, height: 16, mines: 40 },
  { id: 'expert', label: 'Expert', width: 30, height: 16, mines: 99 },
] as const;

export type BoardSizeId = typeof BOARD_SIZES[number]['id'];

/** The caller supplies a fresh seed for a new game, or reuses it for an exact retry. */
export function randomConfig(size: BoardSizeId, floors: number, seed: string, volume = false): Config {
  const preset = BOARD_SIZES.find(preset => preset.id === size);
  if (!preset || !Number.isInteger(floors) || floors < (volume ? 3 : 1) || floors > (volume ? 4 : 3)) {
    throw new RangeError('Invalid board preset');
  }
  return {
    width: preset.width, height: preset.height, mines: preset.mines,
    floors, seed, generatorVersion: 1,
    mode: volume ? 'volume' : floors === 1 ? 'classic' : 'connected',
    ...(floors > 1 && !volume ? { vertical: 'both' } : {}),
  };
}

export function findBoardSize(config: Pick<Config, 'width' | 'height' | 'mines'>): BoardSizeId {
  return BOARD_SIZES.find(preset => preset.width === config.width && preset.height === config.height
    && preset.mines === config.mines)?.id ?? 'beginner';
}
