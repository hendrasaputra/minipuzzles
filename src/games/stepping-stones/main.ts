import '../water-garden/style.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { isDifficulty, randomSeed, type Difficulty } from '../../shared/random-puzzle';
import { canStep, complete, createGame, directions, hint, neighbor, neighbors, step, undo, type Direction, type Level } from './engine';
import { levels, randomLevel, type RandomPath } from './levels';
import { StoneScene } from './scene';
import { readSave, writeSave, type Save } from './storage';

const key = 'puzzles-stepping-stones-v1';
const audio = new GameAudio('stepping-stones');
const arrows = { n: '↑', e: '→', s: '↓', w: '←' };
const names = { n: 'North', e: 'East', s: 'South', w: 'West' };
const tiers = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let saved: Save = { game: createGame(levels[0]), completed: [] };
let notice = '';
try {
  const raw = localStorage.getItem(key);
  const restored = readSave(raw);
  if (restored) saved = restored;
  else if (raw) notice = 'The previous save could not be opened.';
} catch { /* Play is available without storage. */ }

document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Stepping Stones</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved. Keep this tab open.</p>
  <p class="stone-goal">Visit every stone once. End on the blue F stone.</p>
  <div class="stats stone-stats">
    <div><strong id="moves"></strong><span>Stones visited</span></div>
    <button id="show-help" aria-haspopup="dialog">See example</button>
  </div>
  <section class="play-area" aria-label="Stepping stones puzzle">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="3D stepping stones. Tap or drag through adjacent stones."></div>
  </section>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="stone-directions" role="group" aria-label="Extend the path">
    ${directions.map(direction => `<button id="step-${direction}" aria-label="Step ${names[direction].toLowerCase()}">${arrows[direction]}</button>`).join('')}
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
    <label>Random difficulty<select id="random-difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
    <div class="menu-pair"><button id="new-random">New random puzzle</button></div>
    <p id="progress" class="muted"></p>
    <button id="sound" class="menu-row" aria-pressed="true">Sound: on</button>
    <p id="save-state" class="muted"></p>
  </div>
</dialog>
<dialog id="example" class="sheet" aria-labelledby="example-title">
  <div class="sheet-heading"><h2 id="example-title">How to make a path</h2><button id="close-example">Done</button></div>
  <div class="sheet-body">
    ${gameGuide([
      { before: '<span class="stone-example"><b class="on">S</b><b>·</b><b class="finish">F</b></span>',
        after: '<span class="stone-example"><b class="on">S</b><b class="on">●</b><b class="on">F</b></span>',
        text: 'Start on S. Tap or drag to the next stone. Visit every stone before stepping onto F.' },
      { before: '● ↗ □', after: '● → □', text: 'Move along edges. Diagonal steps and jumps across water don’t count.' },
      { before: 'S — ● — ●', after: 'S — ●', text: 'Tap the previous stone or press Undo to go back one step.' },
      { before: '↺', after: '▧', text: 'Drag with two fingers to rotate. With a mouse, choose Rotate and drag, then choose Play to resume.' },
    ], true)}
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
const example = $<HTMLDialogElement>('example');
const difficulty = $<HTMLSelectElement>('random-difficulty');
difficulty.value = saved.random?.difficulty ?? 'easy';
let scene: StoneScene | undefined;
try {
  scene = new StoneScene($('scene'), extend);
} catch {
  $('scene').textContent = '3D is unavailable. Use the arrow buttons below to visit stones.';
}

function save() {
  let saving = true;
  try { localStorage.setItem(key, writeSave(saved)); }
  catch { saving = false; }
  $('storage-warning').hidden = saving;
  $('save-state').textContent = saving ? 'Progress saved on this device.' : 'Saving unavailable.';
}

function drawDirections() {
  const { game } = saved;
  const head = game.path.at(-1)!;
  for (const direction of directions) {
    const button = $<HTMLButtonElement>(`step-${direction}`);
    button.textContent = scene?.arrow(direction) ?? arrows[direction];
    const target = neighbor(game.level.size, head, direction);
    button.disabled = complete(game) || target === undefined || !canStep(game, target);
  }
}

function draw(pulse = false, removed?: number) {
  const { game, random, completed } = saved;
  const { level, path } = game;
  const won = complete(game);
  const index = levels.findIndex(candidate => candidate.id === level.id);
  scene?.draw(game, pulse, removed);
  $('title').textContent = level.title;
  $('level-number').textContent = random ? tiers[random.difficulty] : `${index + 1} / ${levels.length}`;
  $('moves').textContent = `${path.length} / ${level.route.length}`;
  const available = neighbors(level.size, path.at(-1)!).some(cell => !path.includes(cell) && canStep(game, cell));
  const instruction = path.length === 1
    ? 'Start is marked S. Tap a stone beside it.'
    : available ? 'Continue from the gold stone.' : 'No new stone in reach. Undo to try another route.';
  $('status').textContent = won ? 'Every stone visited. Path complete!' : notice || instruction;
  drawDirections();
  $<HTMLButtonElement>('undo').disabled = path.length < 2;
  $('hint').hidden = won;
  $('next').hidden = !won;
  $('next').textContent = random ? 'New puzzle' : index === levels.length - 1 ? 'Levels' : 'Next';
  $('level-select').innerHTML = (random ? '<option value="" disabled selected>Random path</option>' : '')
    + levels.map(candidate => `<option value="${candidate.id}" ${candidate.id === level.id ? 'selected' : ''}>${candidate.title}${completed.includes(candidate.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${completed.length} of ${levels.length} levels done.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

function extend(cell: number, dragging = false) {
  const { game } = saved;
  if (menu.open || example.open || complete(game) || game.path.at(-1) === cell) return;
  const before = game.path.length;
  const previous = game.path.at(-1);
  if (!step(game, cell)) {
    if (dragging) return;
    notice = game.path.includes(cell) ? 'That stone is already on your path.'
      : cell === game.level.route.at(-1) && game.path.length < game.level.route.length - 1
        ? 'Visit the other stones before Finish.' : 'Choose a stone beside the gold one.';
    $('status').textContent = notice;
    return;
  }
  notice = '';
  const won = complete(game);
  if (won && !saved.random && !saved.completed.includes(game.level.id)) saved.completed.push(game.level.id);
  audio.play(won ? 'win' : 'flag');
  draw(game.path.length > before, game.path.length < before ? previous : undefined);
  save();
  if (won) $('next').focus();
}

function load(level: Level, random?: RandomPath) {
  scene?.cancelInput();
  saved = { game: createGame(level), completed: saved.completed, random };
  notice = '';
  if (menu.open) menu.close();
  draw();
  save();
  $('scene').focus();
}

function newRandom(tier: Difficulty) {
  const spec = { version: 1, seed: randomSeed(), difficulty: tier } as const;
  load(randomLevel(spec), spec);
}

function walk(direction: Direction) {
  const { game } = saved;
  const cell = neighbor(game.level.size, game.path.at(-1)!, direction);
  if (cell !== undefined) extend(cell);
}

for (const direction of directions) $(`step-${direction}`).onclick = () => walk(direction);
$('undo').onclick = () => {
  const removed = saved.game.path.at(-1);
  if (!undo(saved.game)) return;
  notice = '';
  draw(false, removed);
  save();
};
$('hint').onclick = () => {
  const move = hint(saved.game);
  const removed = saved.game.path.at(-1);
  if (move && 'cell' in move) extend(move.cell);
  else if (move && undo(saved.game)) {
    notice = 'Hint stepped back. Try a different route.';
    draw(false, removed);
    save();
  }
};
$('retry').onclick = () => load(saved.game.level, saved.random);
$('next').onclick = () => {
  if (saved.random) return newRandom(saved.random.difficulty);
  const next = levels[levels.findIndex(level => level.id === saved.game.level.id) + 1];
  if (next) load(next);
  else menu.showModal();
};
$('new-random').onclick = () => { if (isDifficulty(difficulty.value)) newRandom(difficulty.value); };
$<HTMLSelectElement>('level-select').onchange = event => {
  const level = levels.find(candidate => candidate.id === (event.target as HTMLSelectElement).value);
  if (level) load(level);
};
$('open-menu').onclick = () => { scene?.cancelInput(); menu.showModal(); };
$('close-menu').onclick = () => menu.close();
$('show-help').onclick = () => { scene?.cancelInput(); example.showModal(); };
$('close-example').onclick = () => example.close();
$('sound').onclick = () => { audio.setEnabled(!audio.enabled); draw(); };

$('scene').addEventListener('camerachange', drawDirections);
$('scene').addEventListener('keydown', event => {
  if ($('scene').dataset.cameraMode === 'rotate' || event.target !== $('scene')) return;
  const keys: Record<string, Direction> = { ArrowUp: 'n', ArrowRight: 'e', ArrowDown: 's', ArrowLeft: 'w' };
  const direction = keys[event.key];
  if (!direction) return;
  event.preventDefault();
  walk(direction);
});
for (const event of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(event, () => audio.unlock(), { capture: true });
}
document.addEventListener('visibilitychange', () => { if (document.hidden) scene?.cancelInput(); });
window.addEventListener('pagehide', save);
draw();
save();
