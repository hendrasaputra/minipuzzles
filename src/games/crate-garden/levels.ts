import type { Level, Cell } from './engine';

// # wall, . planting bed, $ seed crate, @ gardener, * planted crate, + gardener on bed.
function level(id: string, title: string, rows: string[]): Level {
  const walls: Cell[] = [], goals: Cell[] = [], crates: Cell[] = [];
  let player: Cell = { x: -1, y: -1 };
  rows.forEach((row, y) => [...row].forEach((tile, x) => {
    const cell = { x, y };
    if (tile === '#') walls.push(cell);
    if ('.*+'.includes(tile)) goals.push(cell);
    if ('$*'.includes(tile)) crates.push(cell);
    if ('@+'.includes(tile)) player = cell;
  }));
  return { id, title, width: rows[0].length, height: rows.length, walls, goals, crates, player };
}

// Curated, solver-verified openings; stable IDs keep saved progress compatible.
export const levels: readonly Level[] = [
  level('garden-1', 'First planting', [
    '######',
    '#    #',
    '#@$ .#',
    '#    #',
    '#    #',
    '######',
  ]),
  level('garden-2', 'Around the bend', [
    '######',
    '# .  #',
    '#  $@#',
    '#  # #',
    '# *  #',
    '######',
  ]),
  level('garden-3', 'Two beds', [
    '######',
    '#   .#',
    '# $$ #',
    '#.#  #',
    '# @  #',
    '######',
  ]),
  level('garden-4', 'Make room', [
    '######',
    '#  . #',
    '# #@ #',
    '# $  #',
    '# $ .#',
    '######',
  ]),
  level('garden-5', 'Garden corners', [
    '######',
    '# $+ #',
    '#  # #',
    '#  $ #',
    '#  . #',
    '######',
  ]),
  level('garden-6', 'The courtyard', [
    '#######',
    '# $. .#',
    '#.#   #',
    '# $ # #',
    '#@$   #',
    '#     #',
    '#######',
  ]),
  level('garden-7', 'Orchard paths', [
    '#######',
    '#.  ..#',
    '#  @# #',
    '#   $ #',
    '#$ $  #',
    '#     #',
    '#######',
  ]),
  level('garden-8', 'Full bloom', [
    '#######',
    '# *   #',
    '#.$   #',
    '#@#   #',
    '#$ #  #',
    '#  .  #',
    '#######',
  ]),
];
