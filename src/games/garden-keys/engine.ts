/**
 * Garden Keys rules: a tile maze with seeds, keys, boots, hazards, crates and monsters.
 * Mechanics follow the classic tile-maze genre; no DOM, rendering, audio or storage here.
 *
 * Deterministic ticks: one tick moves the player one step (or along a forced slide), then
 * sliding crates, then each monster in list order. Classic mode runs ticks on a timer;
 * calm mode only ticks when the player acts (see `act`). The same inputs always give the same game.
 */
export type Direction = 'n' | 'e' | 's' | 'w';
export const DIRECTIONS: readonly Direction[] = ['n', 'e', 's', 'w'];
const vectors: Record<Direction, readonly [number, number]> = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const turn = (d: Direction, quarters: number) => DIRECTIONS[(DIRECTIONS.indexOf(d) + quarters + 4) % 4];
export const left = (d: Direction) => turn(d, -1);
export const right = (d: Direction) => turn(d, 1);
export const back = (d: Direction) => turn(d, 2);

export type KeyColor = 'red' | 'blue' | 'yellow' | 'green';
export type Boot = 'ring' | 'clogs' | 'spikes' | 'grips';
export type Item = 'seed' | `key-${KeyColor}` | `boot-${Boot}`;
export type Terrain =
  | 'floor' | 'wall' | 'water' | 'fire' | 'ice' | 'ice-nw' | 'ice-ne' | 'ice-sw' | 'ice-se'
  | 'push-n' | 'push-e' | 'push-s' | 'push-w' | 'mud' | 'gravel' | 'gate' | 'exit'
  | `door-${KeyColor}` | 'thief' | 'bomb' | 'teleport' | 'hint'
  | 'button-green' | 'button-blue' | 'button-brown' | 'button-red' | 'trap' | 'cloner'
  | 'toggle-closed' | 'toggle-open' | 'hidden-wall' | 'fake-wall' | 'popup-wall';
/** beetle keeps a wall on its left, newt on its right; firefly turns right, dragonfly left; ball bounces; tank drives straight; snapper chases at half speed. */
export type MonsterKind = 'beetle' | 'firefly' | 'ball' | 'tank' | 'dragonfly' | 'snapper' | 'newt';
export type Kind = 'player' | 'crate' | MonsterKind;
export interface Cell { x: number; y: number }
export interface Entity { id: number; kind: Kind; x: number; y: number; dir: Direction; slide: boolean }
export interface MonsterStart { kind: MonsterKind; x: number; y: number; dir: Direction }
/** A crate with a direction, for crates on special squares such as cloners (X on the map faces south). */
export interface CrateStart { x: number; y: number; dir: Direction }
/** A brown button holds a trap open; a red button fires a cloner. */
export interface Link { button: Cell; target: Cell }
export interface LevelSource {
  id: string; title: string; hint?: string;
  /** Seconds allowed in classic mode; 0 or missing means no timer. */
  time?: number;
  map: readonly string[];
  monsters?: readonly MonsterStart[];
  crates?: readonly CrateStart[];
  links?: readonly Link[];
}
export interface Level {
  id: string; title: string; hint: string; time: number; width: number; height: number;
  terrain: Terrain[]; items: (Item | null)[]; start: Cell; crates: CrateStart[]; monsters: MonsterStart[]; links: Link[];
}
export type Cause = 'water' | 'fire' | 'bomb' | 'monster' | 'time';
export interface State {
  terrain: Terrain[]; items: (Item | null)[];
  player: Entity; crates: Entity[]; monsters: Entity[];
  keys: Record<KeyColor, number>; boots: Boot[]; seedsLeft: number;
  /** Hidden walls the player has bumped into, by cell index. */
  revealed: number[];
  ticks: number; status: 'playing' | 'won' | 'lost'; cause?: Cause; nextId: number;
}
/** A direction, an explicit wait, or null for a tick with no player choice (timer or slide). */
export type Input = Direction | 'wait' | null;
export interface Game { level: Level; timed: boolean; state: State; history: { state: State; input: Input }[] }
export const TICKS_PER_SECOND = 4;

/**
 * Map legend, one character per square:
 * . floor  # wall  ~ water  f fire  _ ice  7 9 1 3 ice corners (walls at NW, NE, SW, SE, like a number pad)
 * ^ > v < conveyors  : mud  , gravel  H seed gate  E burrow exit  R B Y G doors  T thief  * bomb  O teleport  ? hint
 * % green button (toggle walls)  & blue button (turn tanks)  = brown button (trap)  + red button (cloner)  K trap  C cloner
 * L closed toggle wall  l open toggle wall  Z hidden wall  z fake wall  U wall that rises after you leave
 * Items on floor: $ seed  r b y g keys  w swim ring  h heat clogs  i ice spikes  c grip soles.  @ start  X crate
 */
const legend: Record<string, Terrain> = {
  '.': 'floor', '#': 'wall', '~': 'water', 'f': 'fire', '_': 'ice', '7': 'ice-nw', '9': 'ice-ne', '1': 'ice-sw', '3': 'ice-se',
  '^': 'push-n', '>': 'push-e', 'v': 'push-s', '<': 'push-w', ':': 'mud', ',': 'gravel', 'H': 'gate', 'E': 'exit',
  'R': 'door-red', 'B': 'door-blue', 'Y': 'door-yellow', 'G': 'door-green', 'T': 'thief', '*': 'bomb', 'O': 'teleport', '?': 'hint',
  '%': 'button-green', '&': 'button-blue', '=': 'button-brown', '+': 'button-red', 'K': 'trap', 'C': 'cloner',
  'L': 'toggle-closed', 'l': 'toggle-open', 'Z': 'hidden-wall', 'z': 'fake-wall', 'U': 'popup-wall',
};
const itemLegend: Record<string, Item> = {
  '$': 'seed', 'r': 'key-red', 'b': 'key-blue', 'y': 'key-yellow', 'g': 'key-green',
  'w': 'boot-ring', 'h': 'boot-clogs', 'i': 'boot-spikes', 'c': 'boot-grips',
};
const monsterKinds: readonly MonsterKind[] = ['beetle', 'firefly', 'ball', 'tank', 'dragonfly', 'snapper', 'newt'];
const cornerWalls: Partial<Record<Terrain, readonly Direction[]>> = { 'ice-nw': ['n', 'w'], 'ice-ne': ['n', 'e'], 'ice-sw': ['s', 'w'], 'ice-se': ['s', 'e'] };
const conveyors: Partial<Record<Terrain, Direction>> = { 'push-n': 'n', 'push-e': 'e', 'push-s': 's', 'push-w': 'w' };
const isIce = (t: Terrain) => t === 'ice' || t in cornerWalls;
/** Squares crates and monsters may enter (monsters may also enter the player's square). */
const crateGround = new Set<Terrain>(['floor', 'water', 'ice', 'ice-nw', 'ice-ne', 'ice-sw', 'ice-se', 'push-n', 'push-e', 'push-s', 'push-w',
  'gravel', 'bomb', 'teleport', 'button-green', 'button-blue', 'button-brown', 'button-red', 'trap', 'toggle-open']);
const monsterGround = new Set<Terrain>([...crateGround].filter(t => t !== 'gravel'));
const playerBlocked = new Set<Terrain>(['wall', 'hidden-wall', 'toggle-closed', 'cloner']);

export function parseLevel(source: LevelSource): Level {
  const fail = (why: string): never => { throw new RangeError(`Level ${source.id}: ${why}`); };
  if (!/^[a-z0-9-]{1,40}$/.test(source.id) || !source.title) fail('bad id or title');
  const height = source.map.length, width = source.map[0]?.length ?? 0;
  if (width < 3 || height < 3 || width > 32 || height > 32 || source.map.some(row => row.length !== width)) fail('map must be a 3–32 square rectangle');
  const time = source.time ?? 0;
  if (!Number.isInteger(time) || time < 0) fail('bad time');
  const terrain: Terrain[] = [], items: (Item | null)[] = [], crates: CrateStart[] = [];
  let start: Cell | null = null;
  source.map.forEach((row, y) => [...row].forEach((ch, x) => {
    items.push(Object.hasOwn(itemLegend, ch) ? itemLegend[ch] : null);
    if (ch === '@') { if (start) fail('two starts'); start = { x, y }; }
    if (ch === 'X') crates.push({ x, y, dir: 's' });
    if (Object.hasOwn(legend, ch)) terrain.push(legend[ch]);
    else if (Object.hasOwn(itemLegend, ch) || ch === '@' || ch === 'X') terrain.push('floor');
    else fail(`unknown square "${ch}"`);
  }));
  if (!start) fail('no start');
  const inside = (c: Cell) => Number.isInteger(c.x) && Number.isInteger(c.y) && c.x >= 0 && c.y >= 0 && c.x < width && c.y < height;
  const at = (c: Cell) => terrain[c.y * width + c.x];
  const monsters = (source.monsters ?? []).map(m => {
    if (!monsterKinds.includes(m.kind) || !DIRECTIONS.includes(m.dir) || !inside(m) || playerBlocked.has(at(m)) && at(m) !== 'cloner') fail('bad monster');
    return { ...m };
  });
  for (const c of source.crates ?? []) {
    if (!DIRECTIONS.includes(c.dir) || !inside(c)) fail('bad crate');
    crates.push({ ...c });
  }
  const links = (source.links ?? []).map(l => {
    if (!inside(l.button) || !inside(l.target)) fail('link outside map');
    const pair = `${at(l.button)}>${at(l.target)}`;
    if (pair !== 'button-brown>trap' && pair !== 'button-red>cloner') fail(`bad link ${pair}`);
    return { button: { ...l.button }, target: { ...l.target } };
  });
  return { id: source.id, title: source.title, hint: source.hint ?? '', time, width, height, terrain, items, start: start!, crates, monsters, links };
}

export function createGame(level: Level, { timed = false } = {}): Game {
  let nextId = 0;
  const entity = (kind: Kind, c: Cell, dir: Direction = 's'): Entity => ({ id: nextId++, kind, x: c.x, y: c.y, dir, slide: false });
  const state: State = {
    terrain: [...level.terrain], items: [...level.items],
    player: entity('player', level.start), crates: level.crates.map(c => entity('crate', c, c.dir)),
    monsters: level.monsters.map(m => entity(m.kind, m, m.dir)),
    keys: { red: 0, blue: 0, yellow: 0, green: 0 }, boots: [], seedsLeft: level.items.filter(i => i === 'seed').length,
    revealed: [], ticks: 0, status: 'playing', nextId: 0,
  };
  state.nextId = nextId;
  const game: Game = { level, timed, state, history: [] };
  for (const e of [state.player, ...state.crates, ...state.monsters]) settle(game, e);
  return game;
}

const index = (g: Game, x: number, y: number) => y * g.level.width + x;
export const terrainAt = (g: Game, x: number, y: number) => g.state.terrain[index(g, x, y)];
const occupant = (s: State, x: number, y: number, except?: Entity) =>
  [s.player, ...s.crates, ...s.monsters].find(e => e !== except && e.x === x && e.y === y);
const has = (g: Game, e: Entity, boot: Boot) => e.kind === 'player' && g.state.boots.includes(boot);
const isMonster = (e: Entity) => e.kind !== 'player' && e.kind !== 'crate';

/** A trap holds whatever is on it unless one of its brown buttons is pressed down. */
export function trapOpen(g: Game, x: number, y: number) {
  return g.level.links.some(l => l.target.x === x && l.target.y === y
    && terrainAt(g, l.button.x, l.button.y) === 'button-brown' && occupant(g.state, l.button.x, l.button.y));
}
const trapped = (g: Game, e: Entity) => terrainAt(g, e.x, e.y) === 'trap' && !trapOpen(g, e.x, e.y);

function canEnter(g: Game, e: Entity, x: number, y: number, dir: Direction): boolean {
  const { level, state: s } = g;
  if (x < 0 || y < 0 || x >= level.width || y >= level.height) return false;
  const t = s.terrain[index(g, x, y)];
  if (cornerWalls[t]?.includes(back(dir))) return false;
  const other = occupant(s, x, y, e);
  if (e.kind === 'player') {
    if (playerBlocked.has(t)) return false; // Also keeps the template crate on a cloner from being pushed off.
    if (other) return true; // A crate gets pushed; walking into a monster is fatal.
    if (t.startsWith('door-')) return s.keys[t.slice(5) as KeyColor] > 0;
    if (t === 'gate') return s.seedsLeft === 0;
    return true;
  }
  if (other && other.kind !== 'player') return false;
  if (other && e.kind === 'crate') return false;
  if (s.items[index(g, x, y)]) return false;
  if (e.kind === 'crate') return crateGround.has(t);
  return monsterGround.has(t) || (t === 'fire' && e.kind === 'firefly');
}

function canStep(g: Game, e: Entity, dir: Direction) {
  const [dx, dy] = vectors[dir];
  return !cornerWalls[terrainAt(g, e.x, e.y)]?.includes(dir) && !trapped(g, e) && canEnter(g, e, e.x + dx, e.y + dy, dir);
}

function tryMove(g: Game, e: Entity, dir: Direction): boolean {
  const s = g.state, [dx, dy] = vectors[dir], x = e.x + dx, y = e.y + dy;
  e.dir = dir;
  if (!canStep(g, e, dir)) {
    if (e.kind === 'player' && x >= 0 && y >= 0 && x < g.level.width && y < g.level.height
      && terrainAt(g, x, y) === 'hidden-wall' && !s.revealed.includes(index(g, x, y))) s.revealed.push(index(g, x, y));
    return false;
  }
  if (e.kind === 'player') {
    const crate = s.crates.find(c => c.x === x && c.y === y);
    if (crate && !tryMove(g, crate, dir)) return false;
  }
  const from = index(g, e.x, e.y);
  e.x = x; e.y = y;
  if (e.kind === 'player' && s.terrain[from] === 'popup-wall') s.terrain[from] = 'wall';
  arrive(g, e, dir);
  return true;
}

const lose = (g: Game, cause: Cause) => { g.state.status = 'lost'; g.state.cause = cause; };
const remove = (g: Game, e: Entity) => {
  g.state.crates = g.state.crates.filter(c => c !== e);
  g.state.monsters = g.state.monsters.filter(m => m !== e);
};

function arrive(g: Game, e: Entity, dir: Direction) {
  const s = g.state, i = index(g, e.x, e.y), t = s.terrain[i];
  if (e.kind === 'player') {
    const item = s.items[i];
    if (item) {
      s.items[i] = null;
      if (item === 'seed') s.seedsLeft--;
      else if (item.startsWith('key-')) s.keys[item.slice(4) as KeyColor]++;
      else if (!s.boots.includes(item.slice(5) as Boot)) s.boots.push(item.slice(5) as Boot);
    }
    if (t.startsWith('door-')) { if (t !== 'door-green') s.keys[t.slice(5) as KeyColor]--; s.terrain[i] = 'floor'; }
    else if (t === 'gate' || t === 'mud' || t === 'fake-wall') s.terrain[i] = 'floor';
    else if (t === 'thief') s.boots = [];
    else if (t === 'exit') { s.status = 'won'; return; }
    else if (t === 'water' && !has(g, e, 'ring')) return lose(g, 'water');
    else if (t === 'fire' && !has(g, e, 'clogs')) return lose(g, 'fire');
    else if (t === 'bomb') { s.terrain[i] = 'floor'; return lose(g, 'bomb'); }
    if (s.monsters.some(m => m.x === e.x && m.y === e.y)) return lose(g, 'monster');
  } else {
    if (t === 'bomb') { s.terrain[i] = 'floor'; return remove(g, e); }
    if (t === 'water' && e.kind === 'crate') { s.terrain[i] = 'mud'; return remove(g, e); }
    if (t === 'water' && e.kind !== 'dragonfly') return remove(g, e);
    if (isMonster(e) && s.player.x === e.x && s.player.y === e.y) return lose(g, 'monster');
  }
  if (t === 'button-green') s.terrain.forEach((x, j) => { if (x === 'toggle-closed') s.terrain[j] = 'toggle-open'; else if (x === 'toggle-open') s.terrain[j] = 'toggle-closed'; });
  if (t === 'button-blue') for (const m of s.monsters) if (m.kind === 'tank') m.dir = back(m.dir);
  if (t === 'button-red') clone(g, e.x, e.y);
  if (t === 'teleport') teleport(g, e, dir);
  settle(g, e);
}

/** Works out whether the square under an entity carries it along next tick. */
function settle(g: Game, e: Entity) {
  const t = terrainAt(g, e.x, e.y), walls = cornerWalls[t];
  e.slide = false;
  if (isIce(t) && !has(g, e, 'spikes')) {
    e.slide = true;
    if (walls) e.dir = DIRECTIONS.find(d => !walls.includes(d) && d !== back(e.dir)) ?? e.dir;
  } else if (conveyors[t] && !has(g, e, 'grips')) { e.slide = true; e.dir = conveyors[t]!; }
  else if (t === 'teleport') e.slide = true;
}

/** Ice bounces you back when blocked; conveyors and teleports just stop pushing. */
function forcedMove(g: Game, e: Entity): boolean {
  if (tryMove(g, e, e.dir)) return true;
  const t = terrainAt(g, e.x, e.y), walls = cornerWalls[t];
  if (!isIce(t) || has(g, e, 'spikes') || g.state.status !== 'playing') return false;
  const turned = walls ? DIRECTIONS.find(d => !walls.includes(d) && d !== e.dir) : back(e.dir);
  return !!turned && tryMove(g, e, turned);
}

/** Teleports send you to the previous pad in reading order whose exit is clear, wrapping around. */
function teleport(g: Game, e: Entity, dir: Direction) {
  const pads = g.state.terrain.flatMap((t, i) => t === 'teleport' ? [i] : []), here = index(g, e.x, e.y), at = pads.indexOf(here), [dx, dy] = vectors[dir];
  for (let k = 1; k <= pads.length; k++) {
    const pad = pads[(at - k + pads.length * 2) % pads.length], x = pad % g.level.width, y = Math.floor(pad / g.level.width);
    if (pad !== here && occupant(g.state, x, y, e)) continue;
    if (canEnter(g, e, x + dx, y + dy, dir)) { e.x = x; e.y = y; return; }
  }
}

let cloning = false;
function clone(g: Game, x: number, y: number) {
  if (cloning) return; // A clone landing on a red button must not loop forever.
  cloning = true;
  try {
    const s = g.state;
    for (const l of g.level.links) {
      if (l.button.x !== x || l.button.y !== y || terrainAt(g, l.target.x, l.target.y) !== 'cloner') continue;
      const template = occupant(s, l.target.x, l.target.y);
      if (!template || template.kind === 'player') continue;
      const copy: Entity = { ...template, id: s.nextId++, slide: false };
      (copy.kind === 'crate' ? s.crates : s.monsters).push(copy);
      if (!tryMove(g, copy, copy.dir)) remove(g, copy);
    }
  } finally { cloning = false; }
}

const preferences: Record<Exclude<MonsterKind, 'snapper'>, (d: Direction) => Direction[]> = {
  beetle: d => [left(d), d, right(d), back(d)],
  newt: d => [right(d), d, left(d), back(d)],
  firefly: d => [d, right(d), left(d), back(d)],
  dragonfly: d => [d, left(d), right(d), back(d)],
  ball: d => [d, back(d)],
  tank: d => [d],
};

function monsterMove(g: Game, m: Entity) {
  let choices: Direction[];
  if (m.kind === 'snapper') {
    const p = g.state.player, dx = p.x - m.x, dy = p.y - m.y;
    const across: Direction | null = dx > 0 ? 'e' : dx < 0 ? 'w' : null, down: Direction | null = dy > 0 ? 's' : dy < 0 ? 'n' : null;
    choices = (Math.abs(dx) >= Math.abs(dy) ? [across, down] : [down, across]).filter((d): d is Direction => !!d);
  } else choices = preferences[m.kind as Exclude<MonsterKind, 'snapper'>](m.dir);
  const dir = choices.find(d => canStep(g, m, d));
  if (dir) tryMove(g, m, dir);
  else if (m.kind === 'snapper' && choices[0]) m.dir = choices[0];
}

/** Advances one tick. Returns false (and changes nothing) after the game ends or for a bad input. */
export function step(g: Game, input: Input): boolean {
  const s0 = g.state;
  if (s0.status !== 'playing' || (input !== null && input !== 'wait' && !DIRECTIONS.includes(input))) return false;
  g.history.push({ state: structuredClone(s0), input });
  const s = g.state, playing = () => s.status === 'playing';
  s.ticks++;
  const p = s.player;
  if (!(p.slide && forcedMove(g, p)) && playing() && input && input !== 'wait') tryMove(g, p, input);
  for (const c of [...s.crates]) if (playing() && c.slide && s.crates.includes(c)) forcedMove(g, c);
  for (const m of [...s.monsters]) {
    if (!playing()) break;
    if (!s.monsters.includes(m) || terrainAt(g, m.x, m.y) === 'cloner') continue;
    if (m.slide && forcedMove(g, m)) continue;
    if (m.kind === 'snapper' && s.ticks % 2) continue;
    if (s.monsters.includes(m)) monsterMove(g, m);
  }
  if (playing() && g.timed && g.level.time && s.ticks >= g.level.time * TICKS_PER_SECOND) lose(g, 'time');
  return true;
}

/** Calm mode: one player action, then let any slide finish so the player never waits on ice. */
export function act(g: Game, input: Direction | 'wait'): boolean {
  if (!step(g, input)) return false;
  for (let guard = 0; guard < 200 && g.state.status === 'playing' && g.state.player.slide; guard++) {
    const { x, y } = g.state.player;
    step(g, null);
    if (g.state.player.x === x && g.state.player.y === y) break;
  }
  return true;
}

/** Steps back to before the player's last own input, skipping timer and slide ticks. */
export function undo(g: Game): boolean {
  if (!g.history.length) return false;
  while (g.history.length) {
    const last = g.history.pop()!;
    g.state = last.state;
    if (last.input !== null) break;
  }
  return true;
}

export const inputs = (g: Game): Input[] => g.history.map(h => h.input);

/** Rebuilds a game from its inputs; saves and level tests both use this. */
export function replay(level: Level, moves: readonly Input[], options?: { timed?: boolean }): Game {
  const game = createGame(level, options);
  for (const move of moves) if (!step(game, move)) break;
  return game;
}
