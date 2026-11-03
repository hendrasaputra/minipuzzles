import { describe, expect, it } from 'vitest';
import { restoreGame, startGame } from './engine';
import { BOARD_SIZES, findBoardSize, randomConfig, type BoardSizeId } from './presets';

describe('random-play board sizes', () => {
  it('offers a compact board and the traditional Windows sizes', () => {
    expect(BOARD_SIZES.map(({ id, width, height, mines }) => [id, width, height, mines])).toEqual([
      ['small', 6, 6, 6], ['beginner', 9, 9, 10], ['intermediate', 16, 16, 40], ['expert', 30, 16, 99],
    ]);
  });

  for (const preset of BOARD_SIZES) {
    for (const floors of [1, 2, 3]) {
      it(`${preset.id} × ${floors} has reproducible safe openings, mine totals and saves`, () => {
        const config = randomConfig(preset.id, floors, 'preset-proof-a');
        const game = startGame(config);
        expect(config.mode).toBe(floors === 1 ? 'classic' : 'connected');
        expect(config.vertical).toBe(floors === 1 ? undefined : 'both');
        expect(game).toEqual(startGame(config));
        expect(game.status).not.toBe('lost');
        for (let f = 0; f < floors; f++) {
          expect(game.cells[f]).toHaveLength(preset.width * preset.height);
          expect(game.cells[f].filter(cell => cell.mine)).toHaveLength(preset.mines);
          expect(game.cells[f][game.config.firstReveal![f]]).toMatchObject({ mine: false, revealed: true });
        }
        expect(restoreGame(JSON.parse(JSON.stringify(game)))).toEqual(game);
        const different = startGame(randomConfig(preset.id, floors, 'preset-proof-b'));
        expect(different.cells.map(floor => floor.map(cell => cell.mine))).not.toEqual(game.cells.map(floor => floor.map(cell => cell.mine)));
        expect(different.cells.map(floor => floor.map(cell => cell.adjacent))).not.toEqual(game.cells.map(floor => floor.map(cell => cell.adjacent)));
      });
    }
  }

  it('matches saved board settings by dimensions and mine count', () => {
    for (const preset of BOARD_SIZES) expect(findBoardSize(preset)).toBe(preset.id);
    expect(findBoardSize({ width: 6, height: 6, mines: 5 })).toBe('beginner');
    expect(findBoardSize({ width: 5, height: 5, mines: 3 })).toBe('beginner');
  });

  it('rejects unsupported preset and floor inputs', () => {
    expect(() => randomConfig('unknown' as BoardSizeId, 1, 'test')).toThrow(RangeError);
    for (const floors of [0, 4, 1.5, NaN]) expect(() => randomConfig('beginner', floors, 'test')).toThrow(RangeError);
  });
});
