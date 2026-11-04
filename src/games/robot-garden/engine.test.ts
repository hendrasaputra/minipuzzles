import { describe, expect, it } from 'vitest';
import { run, seedCount, solve } from './engine';
import { levels, randomLevel, type RandomGarden } from './levels';
import { readSave, writeSave } from './storage';

describe('Robot Garden', () => {
  it('collects the first seed and wins only when the robot stops on the dock', () => {
    const level = levels[0];
    const seed = run(level, ['e']);
    expect(seedCount(level, seed.position)).toBe(1);
    expect(seed.won).toBe(false);
    expect(run(level, ['n', 'e']).won).toBe(false);
    expect(run(level, ['e', 'n']).won).toBe(true);
    expect(run(level, ['e', 'n', 'e']).won).toBe(false);
  });

  it('stops at the first obstacle or edge without running the remaining steps', () => {
    const rock = run(levels[1], ['e', 's']);
    expect(rock.blocked).toBe(true);
    expect(rock.path).toHaveLength(1);
    const edge = run(levels[0], ['e', 'n', 'n', 'e']);
    expect(edge.blocked).toBe(true);
    expect(edge.won).toBe(false);
    expect(edge.position.cell).toBe(levels[0].dock);
  });

  it('finds a working route for every authored level', () => {
    for (const level of levels) {
      const commands = solve(level);
      expect(commands, level.id).toBeDefined();
      expect(commands!.length).toBeLessThanOrEqual(40);
      expect(run(level, commands!).won).toBe(true);
    }
  });

  it('repeats seeded layouts and keeps each tier solvable', () => {
    const tiers = [
      { difficulty: 'easy', size: 4, min: 3, max: 7 },
      { difficulty: 'medium', size: 5, min: 8, max: 14 },
      { difficulty: 'hard', size: 7, min: 15, max: 28 },
    ] as const;
    for (const tier of tiers) {
      const starts = new Set<number>();
      for (let i = 0; i < 12; i++) {
        const spec: RandomGarden = { version: 1, seed: `robot-${i}`, difficulty: tier.difficulty };
        const level = randomLevel(spec);
        starts.add(level.start);
        expect(level).toEqual(randomLevel(spec));
        expect(level.size).toBe(tier.size);
        const route = solve(level)!;
        expect(route.length).toBeGreaterThanOrEqual(tier.min);
        expect(route.length).toBeLessThanOrEqual(tier.max);
        expect(run(level, route).won).toBe(true);
      }
      expect(starts.size).toBeGreaterThan(1);
    }
  });

  it('restores validated steps and refuses fake wins and invalid directions', () => {
    const level = levels[0];
    const raw = writeSave({ level, commands: ['e', 'n'], won: true, completed: [] });
    expect(readSave(raw)).toMatchObject({ level, commands: ['e', 'n'], won: true, completed: [level.id] });
    expect(readSave(raw.replace('["e","n"]', '["n","e"]'))).toBeNull();
    expect(readSave(raw.replace('"e"', '"jump"'))).toBeNull();
  });
});
