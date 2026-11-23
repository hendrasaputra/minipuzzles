import '../../shared/game-base.css';
import './style.css';
import { act, createGame, step, undo, TICKS_PER_SECOND, type Direction, type Game, type Input } from './engine';
import { campaign, levels } from './levels';
import { decode, solve, type Action } from './solver';
import { GardenScene } from './scene';
import { readSave, writeSave, type Speed } from './storage';
import { GameAudio } from '../../shared/audio';
import { addMusic } from '../../shared/ambient';
import { cameraOther, cameraStep, gameGuide, showGuideOnFirstVisit } from '../../shared/game-guide';

const KEY = 'puzzles-garden-keys-v1';
const touchFirst = window.matchMedia('(pointer: coarse)').matches;
const audio = new GameAudio('garden-keys');
let index = 0, speed: Speed = touchFirst ? 'calm' : 'classic', completed: string[] = [], best: Record<string, number> = {};
let game: Game = createGame(levels[0], { timed: speed === 'classic' }), saving = true, notice = '';
try {
  const saved = readSave(localStorage.getItem(KEY));
  if (saved) ({ index, game, speed, completed, best } = saved);
} catch { saving = false; }

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<header class="topbar"><a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a><span class="brand">Garden Keys</span><button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button></header>
<main class="game-shell"><div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div><p id="storage-warning" class="storage-warning" hidden>Save failed. Keep this tab open.</p>
<div class="stats"><div><strong id="seeds">0</strong><span>Seeds left</span></div><div id="time-stat"><strong id="time">0</strong><span>Time</span></div></div>
<ul id="inventory" class="inventory" aria-label="Carrying"></ul>
<section class="play-area" aria-label="Garden maze"><div id="scene" class="scene" tabindex="0" role="group" aria-label="3D board. Swipe or use the arrows to step. Collect every seed, then reach the burrow."></div></section>
<p id="status" class="status" role="status" aria-live="polite"></p>
<div class="walk-controls" aria-label="Step direction"><button data-dir="n" aria-label="Step north">↗</button><button data-dir="e" aria-label="Step east">↘</button><button id="wait" aria-label="Wait one turn">⏸</button><button data-dir="s" aria-label="Step south">↙</button><button data-dir="w" aria-label="Step west">↖</button></div>
<div class="actions"><button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Restart</button><button id="next" class="primary" hidden>Next level</button></div></main>
<dialog id="menu" class="sheet" aria-labelledby="menu-title"><div class="sheet-heading"><h2 id="menu-title">Menu</h2><button id="close-menu">Done</button></div><div class="sheet-body">
<label>Levels<select id="level-select"></select></label><p id="progress" class="muted"></p>
<label>Speed<select id="speed"><option value="calm">Calm: the garden moves when you do</option><option value="classic">Classic: the garden keeps moving, with a timer</option></select></label>
${gameGuide([
  { gesture: 'tap', text: 'Tap a square next to the gardener to step there. You can also swipe.' },
  { before: '🌰 🌰 🚪', after: '✓ ✓ 🕳️', text: 'Pick up every seed. Then the gate opens and you can walk into the burrow.' },
  { before: '🔑 🚪', after: '🔑 → open', text: 'A key opens a door of its color. Boots let you cross water, fire, ice and arrows.' },
  { before: '🧊 → → →', after: 'stop on grass', text: 'On ice and arrows you keep moving until solid ground.' },
  { gesture: 'hold', text: 'Monsters move by their own rules. In Calm, tap ⏸ to wait one turn and let them pass.' },
  cameraStep,
], false, `Use the arrow buttons below the board, or the arrow keys or WASD. Space waits. ${cameraOther}`)}
<button id="sound" class="menu-row" aria-pressed="true">Sound: on</button><p id="save-state" class="muted"></p></div></dialog>`;

const menu = $<HTMLDialogElement>('menu');
let scene: GardenScene | undefined;
try { scene = new GardenScene($('scene'), dir => press(dir)); } catch { $('scene').textContent = '3D is unavailable. Use a browser with 3D graphics support.'; }
$('scene').addEventListener('camerachange', () => {
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dir]'))) if (scene) button.textContent = scene.screenDirection(button.dataset.dir as Direction);
});

function save() {
  try { localStorage.setItem(KEY, writeSave({ index, game, speed, completed, best })); } catch { saving = false; }
  $('storage-warning').hidden = saving;
  $('save-state').textContent = saving ? 'Progress saved.' : 'Save failed.';
}

const causes = { water: 'You fell in the water.', fire: 'You walked into fire.', bomb: 'A bomb went off.', monster: 'A monster caught you.', time: 'Time ran out.' };
function draw(updateScene = true) {
  const s = game.state, won = s.status === 'won', lost = s.status === 'lost', p = s.player;
  if (updateScene) scene?.update(game);
  scene?.pointAt(index === 0 && s.status === 'playing' && !completed.includes(game.level.id) ? guideSquare() : undefined);
  $('title').textContent = game.level.title;
  $('level-number').textContent = `${index + 1} / ${levels.length}`;
  $('seeds').textContent = String(s.seedsLeft);
  $('time-stat').hidden = !game.timed || !game.level.time;
  $('time').textContent = String(Math.max(0, Math.ceil(game.level.time - s.ticks / TICKS_PER_SECOND)));
  const keys = (Object.entries(s.keys) as [string, number][]).filter(([, n]) => n > 0).map(([color, n]) => `<li class="chip key-${color}">${color} key${n > 1 ? ` ×${n}` : ''}</li>`);
  const boots = s.boots.map(b => `<li class="chip">${{ ring: 'Swim ring', clogs: 'Heat clogs', spikes: 'Ice spikes', grips: 'Grip soles' }[b]}</li>`);
  $('inventory').innerHTML = [...keys, ...boots].join('') || '<li class="muted">Carrying nothing yet</li>';
  const onHint = game.state.terrain[p.y * game.level.width + p.x] === 'hint';
  $('status').textContent = won ? `Level complete in ${(s.ticks / TICKS_PER_SECOND).toFixed(1)} seconds.`
    : lost ? `${causes[s.cause!]} ${game.timed ? 'Tap Restart.' : 'Tap Undo or Restart.'}`
    : notice || (onHint ? game.level.hint : s.seedsLeft ? `Collect ${s.seedsLeft} more seed${s.seedsLeft > 1 ? 's' : ''}, then reach the burrow.` : 'The gate is open. Walk into the burrow.');
  $<HTMLButtonElement>('undo').hidden = game.timed;
  $<HTMLButtonElement>('undo').disabled = !game.history.length || sliding;
  $('wait').hidden = game.timed;
  document.querySelectorAll<HTMLButtonElement>('.walk-controls button').forEach(b => b.disabled = won || lost);
  $('hint').hidden = won || lost || game.timed;
  $('next').hidden = !won;
  $('next').textContent = index === levels.length - 1 ? 'Levels' : 'Next level';
  $<HTMLSelectElement>('level-select').innerHTML = levels.map((l, i) => `<option value="${i}" ${i === index ? 'selected' : ''}>${i + 1}. ${l.title}${completed.includes(l.id) ? ` ✓ ${(best[l.id] / TICKS_PER_SECOND).toFixed(1)} s` : ''}</option>`).join('');
  $<HTMLSelectElement>('speed').value = speed;
  $('progress').textContent = `${completed.length} of ${levels.length} levels complete.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

const square = (action: Action | undefined) => {
  if (!action || action === 'wait') return undefined;
  const { x, y } = game.state.player, [dx, dy] = action === 'n' ? [0, -1] : action === 'e' ? [1, 0] : action === 's' ? [0, 1] : [-1, 0];
  return { x: x + dx, y: y + dy };
};
// Hints and the first-level finger follow the level's recorded route, so they are instant on any board,
// and only search again (up to `limit` states) after the player leaves that route.
const routeKey = (state: Game['state']) => JSON.stringify({ ...state, ticks: 0 });
let route: { id: string; actions: Action[]; keys: string[] } | undefined;
function routeFrom(start: Game, actions: Action[]) {
  const probe: Game = { ...start, state: structuredClone(start.state), history: [] }, keys: string[] = [];
  for (const action of actions) { keys.push(routeKey(probe.state)); act(probe, action); }
  route = { id: start.level.id, actions, keys };
}
function nextAction(limit: number): Action | undefined {
  if (route?.id !== game.level.id) routeFrom(createGame(game.level), decode(campaign[index].solution));
  const at = route!.keys.indexOf(routeKey(game.state));
  if (at >= 0) return route!.actions[at];
  const actions = solve(game, limit);
  if (!actions?.length) return undefined;
  routeFrom(game, actions);
  return actions[0];
}
const guideSquare = () => square(nextAction(50_000));

/** After each tick: sounds, progress and the redraw. */
function after(previous: Game['state']) {
  const s = game.state;
  if (s.status === 'won') {
    if (!completed.includes(game.level.id)) completed.push(game.level.id);
    best[game.level.id] = Math.min(best[game.level.id] ?? Infinity, s.ticks);
    audio.play('win');
  } else if (s.status === 'lost') audio.play('loss');
  else if (s.items.some((item, i) => item !== previous.items[i])) audio.play('reveal');
  else if (s.player.x !== previous.player.x || s.player.y !== previous.player.y) audio.play('flag');
  draw(); save();
  if (s.status === 'won') $('next').focus();
}

// Calm: one step per action, then the rest of any slide plays out a square at a time.
let sliding = false;
function calm(input: Direction | 'wait') {
  if (sliding || menu.open) return;
  const before = game.state;
  if (!step(game, input)) return;
  notice = '';
  after(before);
  if (!game.state.player.slide || game.state.status !== 'playing') return;
  const glide = () => {
    const s = game.state;
    if (s.status !== 'playing' || !s.player.slide) { sliding = false; draw(false); return; }
    const { x, y } = s.player, prev = s;
    step(game, null); after(prev);
    if (game.state.player.x === x && game.state.player.y === y) { sliding = false; draw(false); return; }
    window.setTimeout(glide, 90);
  };
  sliding = true;
  window.setTimeout(glide, 90);
}

// Classic: the garden ticks four times a second once you first move; a held direction keeps walking.
let queued: Direction | null = null, held: Direction | null = null, clock = 0;
function classicTick() {
  if (menu.open || document.hidden || game.state.status !== 'playing') return;
  const before = game.state, input: Input = queued ?? held;
  queued = null;
  step(game, input);
  after(before);
}

function press(dir: Direction | 'wait') {
  if (game.state.status !== 'playing' || menu.open) return;
  if (!game.timed) return calm(dir);
  if (dir === 'wait') return;
  queued = dir;
  // The clock starts (or resumes after a reload) on the first press.
  if (!clock) { classicTick(); clock = window.setInterval(classicTick, 1000 / TICKS_PER_SECOND); }
}

function restart(next: Game) {
  scene?.cancelInput();
  window.clearInterval(clock); clock = 0; queued = held = null; sliding = false;
  game = next; notice = '';
  if (menu.open) menu.close();
  draw(); save(); $('scene').focus();
}
const fresh = (i: number) => createGame(levels[i], { timed: speed === 'classic' });
function load(i: number) { index = i; restart(fresh(i)); }

for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dir]'))) {
  const dir = button.dataset.dir as Direction;
  button.addEventListener('pointerdown', () => { held = dir; });
  for (const end of ['pointerup', 'pointerleave', 'pointercancel']) button.addEventListener(end, () => { if (held === dir) held = null; });
  button.onclick = () => press(dir);
}
$('wait').onclick = () => press('wait');
$('undo').onclick = () => { if (!sliding && undo(game)) { notice = ''; draw(); save(); } };
$('retry').onclick = () => restart(fresh(index));
$('hint').onclick = () => {
  const action = nextAction(20000), target = square(action);
  notice = action === 'wait' ? 'Tap ⏸ to wait one turn.' : target ? 'Step onto the marked square.' : 'No hint here. Try Undo or Restart.';
  draw(false);
  if (target) scene?.pointAt(target);
};
$('next').onclick = () => { if (index < levels.length - 1) load(index + 1); else menu.showModal(); };
$('open-menu').onclick = () => { scene?.cancelInput(); menu.showModal(); };
$('close-menu').onclick = () => menu.close();
menu.addEventListener('close', () => $('open-menu').focus());
$('level-select').onchange = e => load(Number((e.target as HTMLSelectElement).value));
$('speed').onchange = e => { speed = (e.target as HTMLSelectElement).value as Speed; restart(fresh(index)); };
$('sound').onclick = () => { audio.setEnabled(!audio.enabled); if (audio.enabled) audio.play('flag'); draw(false); };

const keys: Record<string, Direction> = { ArrowUp: 'n', ArrowRight: 'e', ArrowDown: 's', ArrowLeft: 'w', w: 'n', d: 'e', s: 's', a: 'w' };
window.addEventListener('keydown', e => {
  if (menu.open || $('scene').dataset.cameraMode === 'rotate' || e.target instanceof HTMLSelectElement || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) { e.preventDefault(); press('wait'); return; }
  const dir = keys[e.key];
  if (!dir) return;
  e.preventDefault();
  if (game.timed) held = dir;
  if (!e.repeat || !game.timed) press(dir);
});
window.addEventListener('keyup', e => { if (keys[e.key] === held) held = null; });
for (const event of ['pointerdown', 'pointerup', 'keydown']) document.addEventListener(event, () => audio.unlock(), { capture: true });
document.addEventListener('visibilitychange', () => { held = null; if (document.hidden) scene?.cancelInput(); save(); });
window.addEventListener('pagehide', save);
draw(); save();
addMusic('garden-keys');
showGuideOnFirstVisit('garden-keys');
