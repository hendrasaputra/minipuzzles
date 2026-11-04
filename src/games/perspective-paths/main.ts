import '../water-garden/style.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { isDifficulty, randomSeed, type Difficulty } from '../../shared/random-puzzle';
import { aligned, complete, createGame, hint, join, undo, type Level } from './engine';
import { levels, randomLevel, type RandomPath } from './levels';
import { PathScene } from './scene';
import { readSave, writeSave, type Save } from './storage';

const key = 'puzzles-perspective-paths-v1';
const audio = new GameAudio('perspective-paths');
const tiers = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
let saved: Save = { game: createGame(levels[0]), completed: [] };
let notice = '';

try {
  const raw = localStorage.getItem(key);
  const restored = readSave(raw);
  if (restored) saved = restored;
  else if (raw) notice = 'The previous save could not be opened.';
} catch { /* The board still works without storage. */ }

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Perspective Paths</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <p class="path-goal"><strong>Goal</strong> Join every gap to make one path.</p>
  <div class="stats path-stats">
    <div><strong id="moves"></strong><span>Gaps joined</span></div>
    <button id="show-help" aria-haspopup="dialog">See example</button>
  </div>
  <section class="play-area" aria-label="Perspective puzzle">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="Rotate and tilt the 3D board with arrow keys">
      <div id="dots" class="path-dots" aria-hidden="true"><span id="ring" class="path-ring"></span><span id="dot" class="path-dot"></span></div>
    </div>
  </section>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="view-controls" role="group" aria-label="Move the camera">
    <button id="turn-left">Turn left</button><button id="turn-right">Turn right</button>
    <button id="tilt-up">Tilt up</button><button id="tilt-down">Tilt down</button>
  </div>
  <div class="actions">
    <button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Retry</button>
    <button id="join" class="primary">Join</button><button id="next" class="primary" hidden>Next</button>
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
  <div class="sheet-heading"><h2 id="example-title">How to join a gap</h2><button id="close-help">Done</button></div>
  <div class="sheet-body">
    <p>Two platforms can look connected from the right angle. Join them to build a bridge.</p>
    ${gameGuide([
      { before: '🟡　🔵', after: '◉', text: 'Drag to turn and tilt the board. Move the blue dot into the gold ring.' },
      { before: '◉', after: '▰━▰', text: 'When the view says Dots lined up, press Join. A bridge fills the gap.' },
      { before: '▰━▰　▰', after: '▰━▰━▰', text: 'Join the next gap. Win when the whole path is connected.' },
    ], true)}
    <p>Use the Turn and Tilt buttons or focus the board and use arrow keys. Use ↺ to reset the view.</p>
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
const example = $<HTMLDialogElement>('example');
const difficulty = $<HTMLSelectElement>('random-difficulty');
difficulty.value = saved.random?.difficulty ?? 'easy';

let scene: PathScene | undefined;
try {
  scene = new PathScene($('scene'), () => updateView());
} catch {
  $('scene').append('This puzzle needs a browser with 3D graphics.');
}

function save() {
  try {
    localStorage.setItem(key, writeSave(saved));
    $('save-state').textContent = 'Progress saved on this device.';
  } catch {
    $('save-state').textContent = 'Saving unavailable. Keep this tab open.';
  }
}

function updateView() {
  const dots = scene?.dots() ?? [];
  $('dots').hidden = dots.length !== 2;
  for (const [index, id] of ['ring', 'dot'].entries()) {
    const point = dots[index];
    if (point) {
      $(id).style.left = `${point.x}px`;
      $(id).style.top = `${point.y}px`;
    }
  }
  const ready = Boolean(scene && aligned(saved.game, scene.view()));
  $('dots').classList.toggle('ready', ready);
  $<HTMLButtonElement>('join').disabled = !ready;
  const instruction = saved.game.level.id === 'perspective-1'
    ? 'Turn right to bring the blue dot into the gold ring.'
    : 'Turn and tilt to line up the next pair of dots.';
  const text = complete(saved.game) ? 'Path complete!'
    : ready ? 'Dots lined up. Press Join.' : notice || instruction;
  if ($('status').textContent !== text) $('status').textContent = text;
}

function draw(animateBridge = false) {
  const { game, random, completed } = saved;
  const won = complete(game);
  const index = levels.findIndex(level => level.id === game.level.id);
  scene?.draw(game, animateBridge);
  $('title').textContent = game.level.title;
  $('level-number').textContent = random ? tiers[random.difficulty] : `${index + 1} / ${levels.length}`;
  $('moves').textContent = `${game.history.length} / ${game.level.points.length - 1}`;
  $<HTMLButtonElement>('undo').disabled = game.history.length === 0;
  $('hint').hidden = won;
  $('join').hidden = won;
  $('next').hidden = !won;
  $('next').textContent = random ? 'New puzzle' : index === levels.length - 1 ? 'Levels' : 'Next';
  $('level-select').innerHTML = (random ? '<option value="" disabled selected>Random path</option>' : '') +
    levels.map(level => `<option value="${level.id}" ${level.id === game.level.id ? 'selected' : ''}>${level.title}${completed.includes(level.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${completed.length} of ${levels.length} levels done.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
  updateView();
}

function load(level: Level, random?: RandomPath) {
  saved = { game: createGame(level), completed: saved.completed, random };
  notice = '';
  if (menu.open) menu.close();
  draw();
  scene?.nudge('Home');
  save();
}

function newRandom(tier: Difficulty) {
  const spec: RandomPath = { version: 1, seed: randomSeed(), difficulty: tier };
  load(randomLevel(spec), spec);
}

for (const [id, key] of [['turn-left', 'ArrowLeft'], ['turn-right', 'ArrowRight'], ['tilt-up', 'ArrowUp'], ['tilt-down', 'ArrowDown']]) {
  $(id).onclick = () => scene?.nudge(key);
}

$('join').onclick = () => {
  if (!scene || !join(saved.game, scene.view())) return;
  const won = complete(saved.game);
  notice = '';
  if (won && !saved.random && !saved.completed.includes(saved.game.level.id)) saved.completed.push(saved.game.level.id);
  audio.play(won ? 'win' : 'flag');
  draw(true);
  save();
  if (won) $('next').focus();
};
$('hint').onclick = () => {
  if (!scene) return;
  notice = hint(saved.game, scene.view());
  $('status').textContent = notice;
};
$('undo').onclick = () => {
  if (!undo(saved.game)) return;
  notice = '';
  draw();
  save();
};
$('retry').onclick = () => load(saved.game.level, saved.random);
$('next').onclick = () => {
  if (saved.random) return newRandom(saved.random.difficulty);
  const next = levels[levels.findIndex(level => level.id === saved.game.level.id) + 1];
  if (next) load(next);
  else menu.showModal();
};
$('new-random').onclick = () => {
  if (isDifficulty(difficulty.value)) newRandom(difficulty.value);
};
$<HTMLSelectElement>('level-select').onchange = event => {
  const level = levels.find(candidate => candidate.id === (event.target as HTMLSelectElement).value);
  if (level) load(level);
};
$('open-menu').onclick = () => menu.showModal();
$('close-menu').onclick = () => menu.close();
$('show-help').onclick = () => example.showModal();
$('close-help').onclick = () => example.close();
$('sound').onclick = () => {
  audio.setEnabled(!audio.enabled);
  if (audio.enabled) audio.play('flag');
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
};
for (const event of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(event, () => audio.unlock(), { capture: true });
}
window.addEventListener('pagehide', save);
draw();
save();
