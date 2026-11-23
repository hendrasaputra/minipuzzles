import { describe, it, expect } from 'vitest';
import { act, createGame, inputs, parseLevel, replay, step, undo, type Direction, type Game, type LevelSource, type MonsterStart } from './engine';

const level = (map: string[], extra: Partial<LevelSource> = {}) => parseLevel({ id: 'test', title: 'Test', map, ...extra });
const play = (map: string[], moves: (Direction | 'wait')[], extra: Partial<LevelSource> = {}) => {
  const game = createGame(level(map, extra));
  for (const move of moves) act(game, move);
  return game;
};
const at = (game: Game) => [game.state.player.x, game.state.player.y];
const room = ['#######', '#.....#', '#.....#', '#.....#', '#######'];
/** A 5×3 open room with the player tucked in the bottom-left corner, for monster tests. */
const withMonster = (m: MonsterStart, patch: (rows: string[]) => void = () => {}) => {
  const rows = [...room];
  rows[3] = '#@....#';
  patch(rows);
  return createGame(level(rows, { monsters: [m] }));
};

describe('Garden Keys level format', () => {
  it('reads terrain, items, crates and the start square', () => {
    const l = level(['#####', '#@$X#', '#####']);
    expect(l.start).toEqual({ x: 1, y: 1 });
    expect(l.items[7]).toBe('seed');
    expect(l.crates).toEqual([{ x: 3, y: 1, dir: 's' }]);
    expect(l.terrain[8]).toBe('floor');
  });
  it('rejects broken maps, monsters and links', () => {
    for (const map of [['###', '#@', '###'], ['###', '#.#', '###'], ['####', '#@@#', '####'], ['###', '#@Q', '###'], ['##', '@#']])
      expect(() => level(map)).toThrow(RangeError);
    expect(() => level(['###', '#@#', '###'], { monsters: [{ kind: 'beetle', x: 0, y: 0, dir: 'n' }] })).toThrow(RangeError);
    expect(() => level(['####', '#@=#', '####'], { links: [{ button: { x: 2, y: 1 }, target: { x: 1, y: 1 } }] })).toThrow(RangeError);
    expect(() => level(['###', '#@#', '###'], { id: '<x>' })).toThrow(RangeError);
  });
});

describe('Garden Keys player squares', () => {
  it('opens the gate only after every seed, then wins at the burrow', () => {
    const map = ['########', '#$.@.HE#', '########'];
    const early = play(map, ['e', 'e']);
    expect(at(early)).toEqual([4, 1]);
    expect(early.state.status).toBe('playing');
    const won = play(map, ['w', 'w', 'e', 'e', 'e', 'e', 'e']);
    expect(won.state.seedsLeft).toBe(0);
    expect(won.state.status).toBe('won');
    expect(step(won, 'w')).toBe(false);
  });
  it('uses up red, blue and yellow keys but keeps the green key', () => {
    const red = play(['########', '#@rRR..#', '########'], ['e', 'e', 'e']);
    expect(at(red)).toEqual([3, 1]);
    expect(red.state.keys.red).toBe(0);
    const green = play(['########', '#@gGG..#', '########'], ['e', 'e', 'e']);
    expect(at(green)).toEqual([4, 1]);
    expect(green.state.keys.green).toBe(1);
  });
  it('drowns in water and burns in fire without the right boots', () => {
    expect(play(['#####', '#@~.#', '#####'], ['e']).state.cause).toBe('water');
    expect(play(['#####', '#@f.#', '#####'], ['e']).state.cause).toBe('fire');
    const safe = play(['#######', '#@wh~f#', '#######'], ['e', 'e', 'e', 'e']);
    expect(safe.state.status).toBe('playing');
    expect(at(safe)).toEqual([5, 1]);
  });
  it('slides across ice, bounces off walls, and walks on ice with spikes', () => {
    expect(at(play(['#######', '#@__..#', '#######'], ['e']))).toEqual([4, 1]);
    expect(at(play(['######', '#.@__#', '######'], ['e']))).toEqual([2, 1]); // Bounces back to solid ground.
    expect(at(play(['#######', '#@i__.#', '#######'], ['e', 'e']))).toEqual([3, 1]);
  });
  it('turns on ice corners', () => {
    const game = play(['#####', '#@_9#', '###.#', '#####'], ['e']);
    expect(at(game)).toEqual([3, 2]);
  });
  it('rides conveyors unless wearing grip soles', () => {
    expect(at(play(['#######', '#@>>..#', '#######'], ['e']))).toEqual([4, 1]);
    expect(at(play(['#######', '#@c>>.#', '#######'], ['e', 'e']))).toEqual([3, 1]);
    expect(at(play(['#####', '#.^.#', '#.@.#', '#####'], ['n', 'e']))).toEqual([3, 1]); // Blocked conveyor: free to step off.
  });
  it('pushes crates, which fill water and leave mud that the player clears', () => {
    const game = play(['#######', '#@X~..#', '#######'], ['e']);
    expect(game.state.crates).toEqual([]);
    expect(at(game)).toEqual([2, 1]);
    expect(game.state.terrain[10]).toBe('mud');
    act(game, 'e');
    expect(game.state.terrain[10]).toBe('floor');
    expect(at(play(['######', '#@XX.#', '######'], ['e']))).toEqual([1, 1]);
    expect(at(play(['#####', '#@X#.', '#####'], ['e']))).toEqual([1, 1]);
  });
  it('blows up on bombs: crates clear them, players lose', () => {
    const crate = play(['######', '#@X*.#', '######'], ['e']);
    expect(crate.state.crates).toEqual([]);
    expect(crate.state.terrain[9]).toBe('floor');
    expect(play(['#####', '#@*.#', '#####'], ['e']).state.cause).toBe('bomb');
  });
  it('loses every boot to the thief', () => {
    const game = play(['######', '#@wT.#', '######'], ['e', 'e']);
    expect(game.state.boots).toEqual([]);
  });
  it('toggles walls, reveals hidden walls, clears fake walls and raises pop-up walls', () => {
    const toggle = play(['#######', '#@%L..#', '#######'], ['e', 'e']);
    expect(at(toggle)).toEqual([3, 1]);
    expect(toggle.state.terrain[10]).toBe('toggle-open');
    const hidden = play(['#####', '#@Z.#', '#####'], ['e']);
    expect(at(hidden)).toEqual([1, 1]);
    expect(hidden.state.revealed).toEqual([7]);
    expect(at(play(['#####', '#@z.#', '#####'], ['e', 'e']))).toEqual([3, 1]);
    const popup = play(['#####', '#@U.#', '#####'], ['e', 'e', 'w']);
    expect(at(popup)).toEqual([3, 1]);
    expect(popup.state.terrain[7]).toBe('wall');
  });
  it('teleports to the previous pad and walks out the far side', () => {
    const game = play(['#########', '#.O..@O.#', '#########'], ['e']);
    expect(at(game)).toEqual([3, 1]); // From the second pad back to the first, then one step out.
  });
  it('holds the player in a trap until its brown button is pressed', () => {
    const map = ['########', '#@X=...#', '#....K.#', '########'], link = { links: [{ button: { x: 3, y: 1 }, target: { x: 5, y: 2 } }] };
    expect(at(play(map, ['s', 'e', 'e', 'e', 'e', 'e'], link))).toEqual([5, 2]);
    expect(at(play(map, ['e', 's', 'e', 'e', 'e', 'e'], link))).toEqual([6, 2]); // The crate holds the button down.
  });
  it('clones the template on a cloner when its red button is pressed', () => {
    const game = play(['########', '#@+...C#', '########'], ['e'], {
      monsters: [{ kind: 'ball', x: 6, y: 1, dir: 'w' }], links: [{ button: { x: 2, y: 1 }, target: { x: 6, y: 1 } }],
    });
    expect(game.state.monsters.map(m => [m.x, m.y])).toEqual([[6, 1], [4, 1]]); // Cloned onto 5, then moved to 4.
  });
  it('never lets the player push the template crate off a cloner', () => {
    const game = play(['#######', '#@....#', '#..C..#', '#.....#', '#######'], ['s', 'e', 'e'], { crates: [{ x: 3, y: 2, dir: 's' }] });
    expect([at(game), game.state.crates.map(c => [c.x, c.y])]).toEqual([[2, 2], [[3, 2]]]);
  });
});

describe('Garden Keys monsters', () => {
  const center = (kind: MonsterStart['kind'], dir: Direction = 'e') => ({ kind, x: 3, y: 2, dir });
  const after = (game: Game, ticks = 1) => { for (let i = 0; i < ticks; i++) step(game, 'wait'); return game.state.monsters.map(m => [m.x, m.y]); };
  it('each kind picks its own turn in an open room', () => {
    expect(after(withMonster(center('beetle')))).toEqual([[3, 1]]);
    expect(after(withMonster(center('newt')))).toEqual([[3, 3]]);
    expect(after(withMonster(center('firefly')))).toEqual([[4, 2]]);
    const edge = { x: 5, y: 2, dir: 'e' as Direction };
    expect(after(withMonster({ ...edge, kind: 'ball' }))).toEqual([[4, 2]]);
    expect(after(withMonster({ ...edge, kind: 'dragonfly' }))).toEqual([[5, 1]]);
    expect(after(withMonster({ ...edge, kind: 'tank' }))).toEqual([[5, 2]]);
  });
  it('turns tanks around with the blue button', () => {
    const rows = ['#######', '#@&...#', '#.....#', '#######'];
    const game = createGame(level(rows, { monsters: [{ kind: 'tank', x: 4, y: 2, dir: 'e' }] }));
    act(game, 'e');
    expect(game.state.monsters[0]).toMatchObject({ x: 3, y: 2, dir: 'w' });
  });
  it('snappers chase the player on every second tick', () => {
    const game = withMonster({ kind: 'snapper', x: 5, y: 1, dir: 's' });
    expect(after(game)).toEqual([[5, 1]]);
    expect(after(game)).toEqual([[4, 1]]);
  });
  it('fire stops monsters except fireflies; water drowns all but dragonflies', () => {
    const fire = (rows: string[]) => { rows[1] = '#..f..#'; };
    expect(after(withMonster(center('beetle'), fire))).toEqual([[4, 2]]);
    expect(after(withMonster(center('firefly', 'n'), fire))).toEqual([[3, 1]]);
    const water = (rows: string[]) => { rows[1] = '#..~..#'; };
    expect(after(withMonster(center('beetle'), water))).toEqual([]);
    expect(after(withMonster(center('dragonfly', 'n'), water))).toEqual([[3, 1]]);
  });
  it('catches the player whether it walks in or the player does', () => {
    const chased = withMonster({ kind: 'tank', x: 3, y: 3, dir: 'w' });
    after(chased, 2);
    expect(chased.state.cause).toBe('monster');
    const walked = withMonster({ kind: 'tank', x: 2, y: 3, dir: 'n' });
    act(walked, 'e');
    expect(walked.state.cause).toBe('monster');
  });
});

describe('Garden Keys undo, replay and timer', () => {
  it('undoes a whole slide in one go and replays inputs exactly', () => {
    const map = ['#######', '#@__..#', '#######'];
    const game = play(map, ['e', 'e']);
    const replayed = replay(game.level, inputs(game));
    expect(replayed.state).toEqual(game.state);
    expect(undo(game)).toBe(true);
    expect(at(game)).toEqual([4, 1]);
    expect(undo(game)).toBe(true);
    expect(game.state).toEqual(createGame(level(map)).state);
    expect(undo(game)).toBe(false);
  });
  it('runs out of time only in classic mode', () => {
    const l = level(['#####', '#@..#', '#####'], { time: 1 });
    const classic = createGame(l, { timed: true }), calm = createGame(l);
    for (let i = 0; i < 4; i++) { step(classic, null); step(calm, null); }
    expect(classic.state.cause).toBe('time');
    expect(calm.state.status).toBe('playing');
  });
  it('ignores invalid input', () => {
    const game = createGame(level(['###', '#@#', '###']));
    expect(step(game, '__proto__' as Direction)).toBe(false);
    expect(game.history).toEqual([]);
  });
});
