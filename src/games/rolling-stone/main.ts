import '../water-garden/style.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { isDifficulty, randomSeed } from '../../shared/random-puzzle';
import { atGoal, createGame, directions, move, solve, undo, type Direction, type Level } from './engine';
import { levels, randomLevel, type RandomBoard } from './levels';
import { StoneScene } from './scene';
import { readSave, writeSave, type Save } from './storage';

const key = 'puzzles-rolling-stone-v1';
const audio = new GameAudio('rolling-stone');
const names = { n: 'North', e: 'East', s: 'South', w: 'West' };
const glyphs = { n: '↗', e: '↘', s: '↙', w: '↖' };
const difficultyNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let data: Save = { game: createGame(levels[0]), completed: [] };
let notice = '';
try {
  const raw = localStorage.getItem(key);
  const saved = readSave(raw);
  if (saved) data = saved;
  else if (raw) notice = 'The previous save could not be opened.';
} catch { /* Save status is shown when the game writes progress. */ }

document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Rolling Stone</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <p class="stone-goal">Stand the block upright on the gold star.</p>
  <div class="stats stone-stats">
    <div><strong id="moves">0</strong><span>Rolls</span></div>
    <button id="show-help" aria-haspopup="dialog">See example</button>
  </div>
  <section class="play-area" aria-label="Rolling block puzzle">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="3D rolling block puzzle"></div>
  </section>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="stone-directions" role="group" aria-label="Roll direction">
    ${directions.map(direction => `<button id="move-${direction}" aria-label="Roll ${names[direction].toLowerCase()}">${glyphs[direction]}</button>`).join('')}
  </div>
  <div class="actions">
    <button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Retry</button>
    <button id="next" class="primary" hidden>Next</button>
  </div>
</main>
<dialog id="menu" class="sheet" aria-labelledby="menu-title">
  <div class="sheet-heading"><h2 id="menu-title">Menu</h2><button id="close-menu">Done</button></div>
  <div class="sheet-body">
    <label>Levels<select id="level-select"></select></label>
    <label>Random difficulty<select id="difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
    <div class="menu-pair"><button id="new-random">New random puzzle</button></div>
    <p id="progress" class="muted"></p>
    <button id="sound" class="menu-row" aria-pressed="true">Sound: on</button>
    <p id="save-state" class="muted"></p>
  </div>
</dialog>
<dialog id="example" class="sheet" aria-labelledby="example-title">
  <div class="sheet-heading"><h2 id="example-title">How to roll the block</h2><button id="close-example">Done</button></div>
  <div class="sheet-body">
    <div class="stone-example" aria-hidden="true"><i></i><span>→</span><i class="flat"></i><span>→</span><i class="goal"></i></div>
    ${gameGuide([
      { before: '▮', after: '▬', text: 'Tap a landing tile or a direction button to roll. A standing block falls onto two tiles.' },
      { before: '▬', after: '▮ ★', text: 'Roll along the long side to stand up. Stand on the gold star to win.' },
      { before: '▬', after: '□ □', text: 'Both halves need a tile. A roll that would leave the board is blocked.' },
      { before: '↺', after: '▧', text: 'Drag with two fingers to rotate. With a mouse, choose Rotate and drag, then choose Play to resume.' },
    ], true)}
    <p>Arrow keys move north, east, south, and west on the board.</p>
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
const example = $<HTMLDialogElement>('example');
const difficulty = $<HTMLSelectElement>('difficulty');
difficulty.value = data.random?.difficulty ?? 'easy';
let scene: StoneScene | undefined;
try {
  scene = new StoneScene($('scene'), step);
} catch {
  $('scene').textContent = '3D graphics are unavailable. You can still use the direction buttons and Hint.';
}

function save() {
  try {
    localStorage.setItem(key, writeSave(data));
    $('save-state').textContent = 'Progress saved.';
  } catch {
    $('save-state').textContent = 'Save failed. Keep this tab open.';
  }
}

function draw() {
  const { game, random, completed } = data;
  const won = atGoal(game.level, game.block);
  const index = levels.indexOf(game.level);
  $('title').textContent = game.level.title;
  $('level-number').textContent = random ? difficultyNames[random.difficulty] : `${index + 1} / ${levels.length}`;
  $('moves').textContent = String(game.history.length);
  const stance = game.block.stance === 'up' ? 'Block is standing.' : 'Block is lying flat.';
  const instruction = game.level.id === levels[0].id ? 'Roll twice toward the gold star.' : stance;
  $('status').textContent = won ? 'Block upright on the goal!' : notice || instruction;
  $<HTMLButtonElement>('undo').disabled = !game.history.length;
  for (const direction of directions) $<HTMLButtonElement>(`move-${direction}`).disabled = won;
  $('hint').hidden = won;
  $('next').hidden = !won;
  $('next').textContent = random ? 'New puzzle' : index === levels.length - 1 ? 'Levels' : 'Next';
  $('level-select').innerHTML = (random ? '<option value="" disabled selected>Random path</option>' : '')
    + levels.map(level => `<option value="${level.id}" ${game.level.id === level.id ? 'selected' : ''}>${level.title}${completed.includes(level.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${completed.length} of ${levels.length} levels complete.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

function step(direction: Direction) {
  if (menu.open || example.open || atGoal(data.game.level, data.game.block)) return;
  const previous = data.game.block;
  if (!move(data.game, direction)) {
    notice = 'That roll would leave the path. Try another direction.';
    draw();
    return;
  }
  notice = '';
  const won = atGoal(data.game.level, data.game.block);
  if (won && !data.random && !data.completed.includes(data.game.level.id)) data.completed.push(data.game.level.id);
  scene?.roll(previous, direction);
  audio.play(won ? 'win' : 'reveal');
  draw();
  save();
  if (won) $('next').focus();
}

function load(level: Level, random?: RandomBoard) {
  data = { game: createGame(level), completed: data.completed, random };
  notice = '';
  if (menu.open) menu.close();
  scene?.draw(data.game);
  draw();
  save();
  $('scene').focus();
}

function newRandom() {
  if (!isDifficulty(difficulty.value)) return;
  const spec: RandomBoard = { version: 1, difficulty: difficulty.value, seed: randomSeed() };
  load(randomLevel(spec), spec);
}

for (const direction of directions) $(`move-${direction}`).onclick = () => step(direction);
$('scene').addEventListener('camerachange', () => {
  for (const direction of directions) $(`move-${direction}`).textContent = scene?.arrow(direction) ?? glyphs[direction];
});
window.addEventListener('keydown', event => {
  if (menu.open || example.open || $('scene').dataset.cameraMode === 'rotate'
    || event.target instanceof HTMLSelectElement || event.ctrlKey || event.altKey || event.metaKey) return;
  const direction = { ArrowUp: 'n', ArrowRight: 'e', ArrowDown: 's', ArrowLeft: 'w' }[event.key] as Direction | undefined;
  if (direction) { event.preventDefault(); step(direction); }
});
$('undo').onclick = () => {
  if (!undo(data.game)) return;
  notice = '';
  scene?.draw(data.game);
  draw();
  save();
};
$('hint').onclick = () => {
  const direction = solve(data.game.level, data.game.block)?.[0];
  if (direction) step(direction);
  else { notice = 'No route from here. Try Undo or Retry.'; draw(); }
};
$('retry').onclick = () => load(data.game.level, data.random);
$('next').onclick = () => {
  if (data.random) return newRandom();
  const next = levels[levels.indexOf(data.game.level) + 1];
  if (next) load(next);
  else menu.showModal();
};
$('new-random').onclick = newRandom;
$('level-select').onchange = event => {
  const level = levels.find(candidate => candidate.id === (event.target as HTMLSelectElement).value);
  if (level) load(level);
};
$('open-menu').onclick = () => { scene?.cancelInput(); menu.showModal(); };
$('close-menu').onclick = () => menu.close();
$('show-help').onclick = () => { scene?.cancelInput(); example.showModal(); };
$('close-example').onclick = () => example.close();
$('sound').onclick = () => { audio.setEnabled(!audio.enabled); draw(); };
for (const event of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(event, () => audio.unlock(), { capture: true });
}
window.addEventListener('pagehide', save);
scene?.draw(data.game);
draw();
save();
