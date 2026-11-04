import { seededRandom, type Difficulty } from '../../shared/random-puzzle';
import type { Cell, Level } from './engine';
import { makeWorkshop } from './levels';

export interface RandomWorkshop {
  seed: string;
  difficulty: Difficulty;
  version: 1;
}

const tiers = {
  easy: { size: 5, tracks: 3, variation: 2, min: 2, max: 4 },
  medium: { size: 6, tracks: 5, variation: 3, min: 5, max: 7 },
  hard: { size: 7, tracks: 7, variation: 4, min: 8, max: 11 },
};
const offsets = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

function capacity(level: Level): number {
  return level.tracks.reduce((total, track) => total + (track.kind === 'straight' ? 1 : 3), 0);
}

export function generateWorkshop(spec: RandomWorkshop): Level {
  const tier = tiers[spec.difficulty];
  const random = seededRandom(`marble-v1:${spec.difficulty}:${spec.seed}`);
  const integer = (limit: number) => Math.floor(random() * limit);
  const length = tier.tracks + integer(tier.variation) + 2;
  const create = (path: Cell[]) => makeWorkshop('marble-random', 'Random workshop', tier.size, path);
  let level: Level | undefined;
  for (let attempt = 0; attempt < 40; attempt++) {
    const path = [{ x: integer(tier.size), y: integer(tier.size) }];
    while (path.length < length) {
      const current = path[path.length - 1];
      const options = offsets.map(offset => ({ x: current.x + offset.x, y: current.y + offset.y }))
        .filter(cell => cell.x >= 0 && cell.y >= 0 && cell.x < tier.size && cell.y < tier.size
          && path.every((other, index) => index === path.length - 1
            || Math.abs(cell.x - other.x) + Math.abs(cell.y - other.y) > 1));
      if (!options.length) break;
      path.push(options[integer(options.length)]);
    }
    if (path.length !== length) continue;
    const candidate = create(path);
    if (capacity(candidate) < tier.min) continue;
    level = candidate;
    break;
  }

  if (!level) {
    // shortcut: an L-shaped route guarantees a quick fallback, expand the pool if fallback becomes frequent.
    const corner = Math.ceil((length - 1) / 2);
    const swap = random() < 0.5;
    const flipX = random() < 0.5;
    const flipY = random() < 0.5;
    level = create(Array.from({ length }, (_, index) => {
      let x = Math.min(index, corner);
      let y = Math.max(0, index - corner);
      if (swap) [x, y] = [y, x];
      return { x: flipX ? tier.size - 1 - x : x, y: flipY ? tier.size - 1 - y : y };
    }));
  }

  const turns = tier.min + integer(Math.min(tier.max, capacity(level)) - tier.min + 1);
  const available = level.tracks.map(track => ({ track, left: track.kind === 'straight' ? 1 : 3 }));
  for (let i = 0; i < turns; i++) {
    const index = integer(available.length);
    const option = available[index];
    option.track.turn = (option.track.turn + 3) % 4;
    if (--option.left === 0) available.splice(index, 1);
  }
  return level;
}
