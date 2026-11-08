import '../water-garden/style.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { isDifficulty, randomSeed, type Difficulty } from '../../shared/random-puzzle';
import { complete, createGame, jugs, names, pour, poured, solve, undo, type Level, type Pour } from './engine';
import { levels, randomLevel, type RandomBalance } from './levels';
import { BalanceScene } from './scene';
import { readSave, writeSave } from './storage';

const key = 'puzzles-water-balance-v1';
const audio = new GameAudio('water-balance');
const tiers = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
let game = createGame(levels[0]);
let completed: string[] = [];
let random: RandomBalance | undefined;
let source = 0;
let destination = 1;
let awaitingDestination = false;
let moving = false;
let notice = '';

try {
  const raw = localStorage.getItem(key);
  const saved = readSave(raw);
  if (saved) ({ game, completed, random } = saved);
  else if (raw) notice = 'The previous save could not be opened.';
} catch {
  // Play is still available when storage is blocked.
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Water Balance</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved. Keep this tab open.</p>
  <div class="stats balance-stats">
    <span>Match each jug to its goal.</span>
    <button id="show-help" aria-haspopup="dialog">See example</button>
  </div>
  <section class="play-area" aria-label="Water jugs">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="3D water jugs"></div>
  </section>
  <div id="amounts" class="jug-cards" aria-label="Current and goal amounts"></div>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="channel-controls jug-controls">
    <label><span class="sr-only">Pour from</span><select id="from" aria-label="Pour from"></select></label>
    <label><span class="sr-only">Pour into</span><select id="to" aria-label="Pour into"></select></label>
  </div>
  <div class="actions">
    <button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Retry</button>
    <button id="pour" class="primary">Pour</button><button id="next" class="primary" hidden>Next</button>
  </div>
</main>
<dialog id="menu" class="sheet" aria-labelledby="menu-title">
  <div class="sheet-heading"><h2 id="menu-title">Menu</h2><button id="close-menu">Done</button></div>
  <div class="sheet-body">
    <label>Levels<select id="level-select"></select></label>
    <label>Random difficulty<select id="random-difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
    <div class="menu-pair"><button id="new-random">New random puzzle</button></div>
    <p id="progress" class="muted"></p>
    <button id="sound" class="menu-row" aria-pressed="true">Sound: on</button>
    <p id="save-state" class="muted"></p>
  </div>
</dialog>
<dialog id="example" class="sheet" aria-labelledby="example-title">
  <div class="sheet-heading"><h2 id="example-title">How to pour</h2><button id="close-example">Done</button></div>
  <div class="sheet-body">
    <p>Match each current amount to its goal. Gold rings mark the goals on the jugs.</p>
    ${gameGuide([
      { before: 'A 6 L · B 0 L', after: 'A 2 L · B 4 L',
        text: 'Tap A, then B. A holds 6 L and B can hold 4 L, so the pour fills B and leaves 2 L in A.' },
      { before: 'C 2 L · A 0 L', after: 'C 0 L · A 2 L',
        text: 'C empties before A is full. A pour stops when the first jug is empty or the second jug is full.' },
      { before: '↺', after: '▧', text: 'Drag with two fingers to rotate. With a mouse, choose Rotate and drag, then choose Play to resume.' },
    ], true)}
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
const example = $<HTMLDialogElement>('example');
const from = $<HTMLSelectElement>('from');
const to = $<HTMLSelectElement>('to');
const difficulty = $<HTMLSelectElement>('random-difficulty');
difficulty.value = random?.difficulty ?? 'easy';
let scene: BalanceScene | undefined;
try {
  scene = new BalanceScene($('scene'), jug => {
    if (complete(game) || moving) return;
    if (awaitingDestination && jug !== source) {
      destination = jug;
      startPour();
      return;
    }
    source = jug;
    if (destination === source) destination = (source + 1) % 3;
    awaitingDestination = true;
    notice = `Jug ${names[jug]} selected. Tap another jug to pour.`;
    draw();
  });
} catch {
  $('scene').textContent = '3D is unavailable. Choose two jugs below and press Pour.';
}

function save() {
  let saving = true;
  try { localStorage.setItem(key, writeSave(game, completed, random)); }
  catch { saving = false; }
  $('storage-warning').hidden = saving;
  $('save-state').textContent = saving ? 'Progress saved on this device.' : 'Saving unavailable. Keep this tab open.';
}

function draw(updateBoard = true) {
  const { level, current } = game;
  const won = complete(game);
  if (updateBoard) scene?.draw(level, current, source, destination);
  const index = levels.findIndex(candidate => candidate.id === level.id);
  $('title').textContent = level.title;
  $('level-number').textContent = random ? tiers[random.difficulty] : `${index + 1} / ${levels.length}`;
  $('amounts').innerHTML = jugs.map(i => `<section class="jug-card${current[i] === level.goal[i] ? ' matched' : ''}">
    <strong>Jug ${names[i]}</strong><small>Holds ${level.capacities[i]} L</small>
    <span>Current <b>${current[i]} L</b></span><span>Goal <b>${level.goal[i]} L</b></span>
  </section>`).join('');
  $('status').textContent = won ? 'All amounts match!' : notice ||
    (level.id === levels[0].id && source === 0 && destination === 1 ? 'Tap A, then B. Or press Pour to fill B.' : 'Tap a jug with water, then tap another jug.');
  from.innerHTML = jugs.map(i => `<option value="${i}">From ${names[i]}</option>`).join('');
  to.innerHTML = jugs.filter(i => i !== source).map(i => `<option value="${i}">Into ${names[i]}</option>`).join('');
  from.value = String(source);
  to.value = String(destination);
  from.disabled = to.disabled = moving || won;
  $<HTMLButtonElement>('pour').disabled = moving || !poured(level.capacities, current, { from: source, to: destination });
  $('pour').hidden = won;
  $('pour').textContent = moving ? 'Pouring…' : 'Pour';
  $<HTMLButtonElement>('undo').disabled = moving || !game.history.length;
  for (const id of ['retry', 'hint', 'open-menu', 'show-help']) $<HTMLButtonElement>(id).disabled = moving;
  $('hint').hidden = won;
  $('next').hidden = !won;
  $('next').textContent = random ? 'New puzzle' : index === levels.length - 1 ? 'Levels' : 'Next';
  $('level-select').innerHTML = (random ? '<option value="" disabled selected>Random puzzle</option>' : '') +
    levels.map(candidate => `<option value="${candidate.id}" ${candidate.id === level.id ? 'selected' : ''}>${candidate.title}${completed.includes(candidate.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${completed.length} of ${levels.length} levels done.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

function startPour() {
  if (moving || complete(game)) return;
  const move: Pour = { from: source, to: destination };
  const next = poured(game.level.capacities, game.current, move);
  if (!next) {
    notice = game.current[source] === 0 ? `Jug ${names[source]} is empty.` : `Jug ${names[destination]} is full.`;
    awaitingDestination = false;
    draw();
    return;
  }
  moving = true;
  awaitingDestination = false;
  notice = `Pouring from ${names[source]} into ${names[destination]}.`;
  audio.play('reveal');
  draw(false);
  const finish = () => {
    moving = false;
    pour(game, move);
    const won = complete(game);
    if (won && !random && !completed.includes(game.level.id)) completed.push(game.level.id);
    notice = won ? '' : `Jug ${names[source]} has ${game.current[source]} L. Jug ${names[destination]} has ${game.current[destination]} L.`;
    audio.play(won ? 'win' : 'flag');
    draw(false);
    save();
    if (won) $('next').focus();
  };
  if (scene) scene.play(game.level, move, game.current, next, finish);
  else finish();
}

function load(level: Level, spec?: RandomBalance) {
  game = createGame(level);
  random = spec;
  source = 0;
  destination = 1;
  awaitingDestination = false;
  notice = '';
  if (menu.open) menu.close();
  draw();
  save();
}

function newRandom(tier: Difficulty) {
  const spec = { version: 1, difficulty: tier, seed: randomSeed() } as const;
  load(randomLevel(spec), spec);
}

from.onchange = () => {
  source = Number(from.value);
  if (destination === source) destination = (source + 1) % 3;
  awaitingDestination = false;
  notice = '';
  draw();
};
to.onchange = () => { destination = Number(to.value); awaitingDestination = false; notice = ''; draw(); };
$('pour').onclick = startPour;
$('undo').onclick = () => { if (!moving && undo(game)) { notice = ''; awaitingDestination = false; draw(); save(); } };
$('retry').onclick = () => load(game.level, random);
$('hint').onclick = () => {
  const move = solve(game)?.[0];
  if (!move) {
    notice = 'Try Undo or Retry to reach the goal.';
  } else {
    source = move.from;
    destination = move.to;
    awaitingDestination = false;
    notice = `Pour from ${names[source]} into ${names[destination]}.`;
  }
  draw();
};
$('next').onclick = () => {
  if (random) return newRandom(random.difficulty);
  const next = levels[levels.findIndex(level => level.id === game.level.id) + 1];
  if (next) load(next);
  else menu.showModal();
};
$('new-random').onclick = () => { if (isDifficulty(difficulty.value)) newRandom(difficulty.value); };
$<HTMLSelectElement>('level-select').onchange = event => {
  const level = levels.find(candidate => candidate.id === (event.target as HTMLSelectElement).value);
  if (level) load(level);
};
$('open-menu').onclick = () => menu.showModal();
$('close-menu').onclick = () => menu.close();
$('show-help').onclick = () => example.showModal();
$('close-example').onclick = () => example.close();
$('sound').onclick = () => { audio.setEnabled(!audio.enabled); draw(false); };
for (const event of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(event, () => audio.unlock(), { capture: true });
}
window.addEventListener('pagehide', save);
draw();
save();
