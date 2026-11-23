import { describe, it, expect } from 'vitest';
import { act, createGame, inputs, parseLevel, replay, TICKS_PER_SECOND } from './engine';
import { campaign, levels } from './levels';
import { decode, encode, solve } from './solver';

describe('Garden Keys campaign', () => {
  it('keeps fifty stable, unique level ids in teaching order', () => {
    expect(levels.map(l => l.id)).toEqual([
      'first-seeds', 'colored-doors', 'wet-and-hot', 'ice-rink', 'conveyors', 'crate-bridges',
      'beetle-walk', 'switch-walls', 'traps-and-clones', 'teleports', 'thief-walls', 'grand-garden',
      'key-thrift', 'grip-soles', 'steady-spikes', 'firefly-ring', 'three-ponds', 'newt-halls',
      'crate-blasting', 'one-way-rooms', 'secret-hedges', 'snapper-shelter', 'carry-the-key', 'belt-ring',
      'snapper-bait', 'dragonfly-pond', 'newt-switch', 'skating-crates', 'firefly-field', 'crate-maker',
      'crate-relay', 'beetle-box', 'thiefs-toll', 'bomb-orchard', 'popup-presses', 'belt-and-tank',
      'slippery-post', 'crate-post', 'belt-ferry', 'trap-keeper', 'garden-gauntlet', 'belt-factory',
      'bomb-foundry', 'flooded-orchard', 'teleport-ruins', 'switch-garden', 'ice-palace', 'monster-zoo',
      'hedge-maze', 'grand-tour',
    ]);
    for (const l of levels) expect(l.items.filter(i => i === 'seed').length).toBeGreaterThan(0);
  });

  for (const [i, source] of campaign.entries()) {
    it(`${source.title} is winnable in calm and classic mode`, () => {
      const calm = createGame(levels[i]);
      for (const action of decode(source.solution)) act(calm, action);
      expect(calm.state.status).toBe('won');
      // Classic plays the same ticks on a timer, with the time limit on.
      const classic = replay(levels[i], inputs(calm), { timed: true });
      expect(classic.state.status).toBe('won');
      expect(classic.state.ticks).toBeLessThan(levels[i].time * TICKS_PER_SECOND);
    });
  }

  it('needs the swim ring to finish Wet and Hot', () => {
    const map = campaign[2].map.map(row => row.replace('w', '.'));
    expect(solve(createGame(parseLevel({ ...campaign[2], map })))).toBeNull();
  });
});

describe('Garden Keys solver', () => {
  it('finds the fewest actions and gives up past its state limit', () => {
    const level = parseLevel({ id: 'tiny', title: 'Tiny', map: ['######', '#@$HE#', '######'] });
    expect(encode(solve(createGame(level))!)).toBe('eee');
    expect(solve(createGame(levels[11]), 10)).toBeNull();
    expect(decode('enx')).toEqual(['e', 'n', 'wait']);
  });
});
