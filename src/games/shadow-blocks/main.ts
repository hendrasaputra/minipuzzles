import '../water-garden/style.css';
import './style.css';
import { gameGuide } from '../../shared/game-guide';
import { GameAudio } from '../../shared/audio';
import { isDifficulty, randomSeed, type Difficulty } from '../../shared/random-puzzle';
import { canEdit, createGame, edit, hint, shadows, undo, type Level } from './engine';
import { generateShadow, levels, type RandomShadow } from './levels';
import { ShadowScene, columns } from './scene';
import { readSave, writeSave } from './storage';

const key = 'puzzles-shadow-blocks-v1';
const audio = new GameAudio('shadow-blocks');
const difficultyNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
let game = createGame(levels[0]);
let selected = 0;
let completed: string[] = [];
let random: RandomShadow | undefined;
let notice = '';

try {
  const raw = localStorage.getItem(key);
  const saved = readSave(raw);
  if (saved) ({ game, selected, completed, random } = saved);
  else if (raw) notice = 'The previous save could not be restored.';
} catch {
  // The save status is shown when the first write is attempted.
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Shadow Blocks</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved. Keep this tab open.</p>
  <div class="stats"><div><strong id="moves">0</strong><span>Blocks left</span></div></div>
  <section class="play-area" aria-label="Shadow puzzle">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="3D board. Tap a square to add a block."></div>
  </section>
  <section class="shadow-targets" aria-label="Shadow targets">
    <div class="shadow-heading">
      <span>Add blocks until your shadows match both goals. Use all the blocks.</span>
      <button id="show-help" type="button">See example</button>
    </div>
    <div class="shadow-profiles">
      <div id="front-shadow"></div><div id="side-shadow"></div>
    </div>
  </section>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="stack-controls">
    <label class="car-choice"><span class="sr-only">Choose a stack</span><select id="stack-select" aria-label="Choose a stack"></select></label>
    <button id="remove" aria-label="Remove a block">−</button><button id="add" aria-label="Add a block">+</button>
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
    ${gameGuide([
      { before: `<svg width="44" height="40" viewBox="0 0 44 40" aria-hidden="true">
        <path d="M2 27 22 16 42 27 22 38Z" fill="#e4dce8"/>
        <path d="M10 10 22 3 34 10 22 17Z" fill="#f1cb83"/>
        <path d="M10 10 22 17 22 30 10 23Z" fill="#bd8744"/>
        <path d="M22 17 34 10 34 23 22 30Z" fill="#dba65e"/>
      </svg>`, after: '🟪 🟪', text: 'One block on A1 makes one purple square in Your shadow for column A and one for row 1.' },
      { before: '▣', after: '□', text: 'Choose a stack and press − to remove a block.' },
      { before: '▂ ▄', after: '▄', text: 'A row with stacks of 1 and 2 has a shadow 2 blocks high. Columns work the same way.' },
      { before: '▥ ▥', after: '✓ ✓', text: 'Make Your shadow look like Goal in both panels. Use every block.' },
      { before: '↺', after: '▧', text: 'Drag with two fingers to rotate. With a mouse, choose Rotate and drag.' },
    ])}
    <button id="sound" class="menu-row" aria-pressed="true">Sound: on</button>
    <p id="save-state" class="muted"></p>
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
const difficulty = $<HTMLSelectElement>('random-difficulty');
const stackSelect = $<HTMLSelectElement>('stack-select');
difficulty.value = random?.difficulty ?? 'easy';
let scene: ShadowScene | undefined;
try {
  scene = new ShadowScene($('scene'), cell => change(cell, 1));
} catch {
  $('scene').textContent = '3D is unavailable. Choose a stack and use + or − below.';
}

function save() {
  let saving = true;
  try { localStorage.setItem(key, writeSave(game, selected, completed, random)); }
  catch { saving = false; }
  $('storage-warning').hidden = saving;
  $('save-state').textContent = saving ? 'Progress saved on this device.' : 'Saving unavailable.';
}

function profile(title: string, target: number[], actual: number[], names: string[], active: number, before?: number[]) {
  const matches = target.every((height, i) => height === actual[i]);
  function diagram(label: string, heights: number[], isGoal: boolean) {
    const bars = heights.map((height, i) => {
      const tiles = Array.from({ length: game.limit }, (_, z) => {
        let state = '';
        if (z < height) state = !isGoal && z >= target[i] ? 'extra' : 'filled';
        return `<span class="shadow-tile ${state}"></span>`;
      }).join('');
      const changed = !isGoal && before && before[i] !== height;
      return `<div class="shadow-column${i === active ? ' active' : ''}${changed ? ' changed' : ''}"><small>${names[i]}</small>${tiles}</div>`;
    }).join('');
    const summary = names.map((name, i) => `${name}: ${heights[i]}`).join(', ');
    return `<div class="shadow-diagram${isGoal ? ' goal' : ''}" role="img" aria-label="${label}. ${summary}">
      <span>${label}</span>
      <div class="shadow-bars" aria-hidden="true">${bars}</div>
    </div>`;
  }
  return `<div class="profile">
    <strong>${title}${matches ? ' ✓' : ''}</strong>
    <div class="shadow-comparison">
      ${diagram('Goal', target, true)}
      ${diagram('Your shadow', actual, false)}
    </div>
  </div>`;
}

function draw(added?: number, before?: ReturnType<typeof shadows>) {
  const tutorial = !random && game.level.id === levels[0].id ? hint(game) : undefined;
  scene?.update(game, selected, added, tutorial?.cell);
  const index = levels.findIndex(level => level.id === game.level.id);
  const { size } = game.level;
  const current = shadows(game.stacks, size);
  $('title').textContent = game.level.title;
  $('level-number').textContent = random ? difficultyNames[random.difficulty] : `${index + 1} / ${levels.length}`;
  $('moves').textContent = String(game.budget - game.used);
  let instruction = 'Each shadow shows the tallest stack in that row or column.';
  if (tutorial) {
    const square = columns[tutorial.cell % size] + (Math.floor(tutorial.cell / size) + 1);
    instruction = tutorial.change === 1
      ? `Tap the highlighted square ${square} to add one block.`
      : `Choose stack ${square} and press − to remove one block.`;
  }
  $('status').textContent = game.won ? 'Both shadows match!' : notice || instruction;
  $('front-shadow').innerHTML = profile('Columns', game.front, current.front, columns.slice(0, size).split(''), selected % size, before?.front);
  $('side-shadow').innerHTML = profile('Rows', game.side, current.side, Array.from({ length: size }, (_, i) => String(i + 1)), Math.floor(selected / size), before?.side);
  stackSelect.innerHTML = game.stacks.map((height, i) =>
    `<option value="${i}">Stack ${columns[i % size]}${Math.floor(i / size) + 1} · ${height}</option>`).join('');
  stackSelect.value = String(selected);
  $<HTMLButtonElement>('add').disabled = !canEdit(game, selected, 1);
  $<HTMLButtonElement>('remove').disabled = !canEdit(game, selected, -1);
  $<HTMLButtonElement>('undo').disabled = !game.history.length;
  $('hint').hidden = game.won;
  $('next').hidden = !game.won;
  $('next').textContent = random ? 'New puzzle' : index === levels.length - 1 ? 'Levels' : 'Next';
  $('level-select').innerHTML = (random ? '<option value="" disabled selected>Random puzzle</option>' : '') +
    levels.map(level => `<option value="${level.id}" ${level.id === game.level.id ? 'selected' : ''}>${level.title}${completed.includes(level.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${completed.length} of ${levels.length} levels done.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

function load(level: Level, puzzle?: RandomShadow) {
  game = createGame(level);
  random = puzzle;
  selected = 0;
  notice = '';
  if (menu.open) menu.close();
  draw();
  save();
  $('scene').focus();
}

function newRandom(tier: Difficulty) {
  const spec: RandomShadow = { version: 1, seed: randomSeed(), difficulty: tier };
  load(generateShadow(spec), spec);
}

function change(cell: number, delta: 1 | -1) {
  if (menu.open || game.won) return;
  selected = cell;
  const before = shadows(game.stacks, game.level.size);
  const changed = edit(game, cell, delta);
  notice = !changed && delta === 1
    ? game.used === game.budget ? 'No blocks left. Remove one to move it.' : 'This stack is full.'
    : '';
  if (changed) {
    if (game.won && !random && !completed.includes(game.level.id)) completed.push(game.level.id);
    audio.play(game.won ? 'win' : 'flag');
  }
  draw(changed && delta === 1 ? cell : undefined, changed ? before : undefined);
  save();
  if (game.won) $('next').focus();
}

stackSelect.onchange = () => { selected = Number(stackSelect.value); notice = ''; draw(); save(); };
$('add').onclick = () => change(selected, 1);
$('remove').onclick = () => change(selected, -1);
$('undo').onclick = () => { if (undo(game)) { notice = ''; draw(); save(); } };
$('hint').onclick = () => {
  const move = hint(game);
  if (move) change(move.cell, move.change);
};
$('retry').onclick = () => load(game.level, random);
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
$('open-menu').onclick = () => { scene?.cancelInput(); menu.showModal(); };
$('show-help').onclick = () => {
  scene?.cancelInput();
  menu.showModal();
  const guide = menu.querySelector<HTMLDetailsElement>('.game-guide')!;
  guide.open = true;
  guide.querySelector('summary')?.focus();
};
$('close-menu').onclick = () => menu.close();
menu.addEventListener('close', () => $('open-menu').focus());
$('sound').onclick = () => { audio.setEnabled(!audio.enabled); draw(); };
$('scene').addEventListener('keydown', event => {
  if (event.target !== $('scene') || $('scene').dataset.cameraMode === 'rotate') return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    change(selected, 1);
  }
});
for (const event of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(event, () => audio.unlock(), { capture: true });
}
window.addEventListener('pagehide', save);
draw();
save();
