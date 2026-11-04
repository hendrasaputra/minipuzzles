import '../water-garden/style.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { isDifficulty, randomSeed, type Difficulty } from '../../shared/random-puzzle';
import { complete, createGame, flip, solve, undo, type Level } from './engine';
import { levels, randomLevel, type RandomGarden } from './levels';
import { FlipScene, tileName } from './scene';
import { readSave, writeSave, type Save } from './storage';

const key = 'puzzles-flip-garden-v1';
const audio = new GameAudio('flip-garden');
const tiers = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
let data: Save = { game: createGame(levels[0]), completed: [] };
let notice = '';
try {
  const raw = localStorage.getItem(key);
  const saved = readSave(raw);
  if (saved) data = saved;
  else if (raw) notice = 'The previous save could not be opened.';
} catch {
  // Play remains available when storage is blocked.
}
let selected = data.game.level.id === 'flip-1' ? 4 : 0;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

function example(after: boolean) {
  return `<span class="flip-example">${Array.from({ length: 9 }, (_, i) =>
    after && [1, 3, 4, 5, 7].includes(i) ? '<i class="bloom">✿</i>' : `<i${i === 4 ? ' class="pressed"' : ''}></i>`
  ).join('')}</span>`;
}

document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Flip Garden</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved. Keep this tab open.</p>
  <div class="stats flip-stats">
    <div><strong id="moves"></strong><span>Tiles match</span></div>
    <button id="show-help" aria-haspopup="dialog">See example</button>
  </div>
  <section class="play-area" aria-label="Flip puzzle">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="Your 3D garden. Tap a tile to flip it and its edge neighbors."></div>
  </section>
  <div class="pattern-panel">
    <div><strong>Goal</strong><div id="goal-pattern"></div></div>
    <div><strong>Your garden</strong><div id="current-pattern"></div></div>
  </div>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="flip-controls">
    <label class="car-choice"><span class="sr-only">Choose a tile</span><select id="tile-select" aria-label="Choose a tile"></select></label>
  </div>
  <div class="actions">
    <button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Retry</button>
    <button id="flip" class="primary">Flip tile</button><button id="next" class="primary" hidden>Next</button>
  </div>
</main>
<dialog id="menu" class="sheet" aria-labelledby="menu-title">
  <div class="sheet-heading"><h2 id="menu-title">Menu</h2><button id="close-menu">Done</button></div>
  <div class="sheet-body">
    <label>Levels<select id="level-select"></select></label>
    <label>Random difficulty<select id="random-difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
    <div class="menu-pair"><button id="new-random">New random puzzle</button></div>
    <p id="progress" class="muted"></p>
    <p>Make every tile in Your garden match the Goal. The letters and numbers label the same positions on the 3D board and both maps.</p>
    ${gameGuide([
      { before: example(false), after: example(true),
        text: 'Tap B2 to flip it and the tiles above, below, left and right. Flowers turn into empty tiles. Empty tiles grow flowers.' },
      { before: '✿ · ✿', after: '✓', text: 'Win when every flower and empty tile matches the Goal map.' },
      { before: '↺', after: '▧', text: 'Choose Rotate and drag to look around. Choose Play to flip tiles.' },
    ])}
    <button id="sound" class="menu-row" aria-pressed="true">Sound: on</button>
    <p id="save-state" class="muted"></p>
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
const difficulty = $<HTMLSelectElement>('random-difficulty');
const tileSelect = $<HTMLSelectElement>('tile-select');
difficulty.value = data.random?.difficulty ?? 'easy';
let scene: FlipScene | undefined;
try {
  scene = new FlipScene($('scene'), play);
} catch {
  $('scene').textContent = '3D is unavailable. Use the maps and choose a tile below.';
}

function save() {
  let saving = true;
  try { localStorage.setItem(key, writeSave(data)); }
  catch { saving = false; }
  $('storage-warning').hidden = saving;
  $('save-state').textContent = saving ? 'Progress saved on this device.' : 'Saving unavailable.';
}

function pattern(mask: number, size: number, name: string) {
  const cells = Array.from({ length: size ** 2 }, (_, i) => i);
  const flowers = cells.filter(i => mask & (1 << i)).map(i => tileName(size, i));
  const description = flowers.length ? `Flowers at ${flowers.join(', ')}` : 'All tiles empty';
  let content = '<span></span>';
  for (let i = 0; i < size; i++) content += `<span>${tileName(size, i)[0]}</span>`;
  for (let row = 0; row < size; row++) {
    content += `<span>${row + 1}</span>`;
    for (let col = 0; col < size; col++) {
      content += mask & (1 << (row * size + col)) ? '<i class="bloom">✿</i>' : '<i></i>';
    }
  }
  return `<div class="pattern" style="--width:${size + 1}" role="img" aria-label="${name}. ${description}.">${content}</div>`;
}

function draw(updateBoard = true, pressed?: number) {
  const { game, random, completed } = data;
  const { level, current } = game;
  const won = complete(game);
  const index = levels.findIndex(candidate => candidate.id === level.id);
  const cells = Array.from({ length: level.size ** 2 }, (_, i) => i);
  const matches = cells.filter(i => !((current ^ level.goal) & (1 << i))).length;
  if (updateBoard) scene?.draw(game, selected, pressed);
  $('title').textContent = level.title;
  $('level-number').textContent = random ? tiers[random.difficulty] : `${index + 1} / ${levels.length}`;
  $('moves').textContent = `${matches} / ${cells.length}`;
  $('goal-pattern').innerHTML = pattern(level.goal, level.size, 'Goal');
  $('current-pattern').innerHTML = pattern(current, level.size, 'Your garden');
  const instruction = level.id === 'flip-1' && !game.history.length
    ? 'Flip B2 in the middle to grow five flowers.'
    : 'Match the flowers and empty tiles in the Goal map.';
  $('status').textContent = won ? 'Your garden matches the goal!' : notice || instruction;
  tileSelect.innerHTML = cells.map(i => `<option value="${i}">Tile ${tileName(level.size, i)} · ${current & (1 << i) ? 'Flower' : 'Empty'}</option>`).join('');
  tileSelect.value = String(selected);
  tileSelect.disabled = won;
  $<HTMLButtonElement>('undo').disabled = !game.history.length;
  $('hint').hidden = won;
  $('flip').hidden = won;
  $('next').hidden = !won;
  $('next').textContent = random ? 'New puzzle' : index === levels.length - 1 ? 'Levels' : 'Next';
  $('level-select').innerHTML = (random ? '<option value="" disabled selected>Random garden</option>' : '') +
    levels.map(item => `<option value="${item.id}" ${item.id === level.id ? 'selected' : ''}>${item.title}${completed.includes(item.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${completed.length} of ${levels.length} levels done.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

function load(level: Level, random?: RandomGarden) {
  data = { game: createGame(level), completed: data.completed, random };
  selected = level.id === 'flip-1' ? 4 : 0;
  notice = '';
  if (menu.open) menu.close();
  draw();
  save();
  $('scene').focus();
}

function newRandom(tier: Difficulty) {
  const random: RandomGarden = { version: 1, seed: randomSeed(), difficulty: tier };
  load(randomLevel(random), random);
}

function play(cell: number) {
  if (menu.open || !flip(data.game, cell)) return;
  selected = cell;
  notice = `Flipped tile ${tileName(data.game.level.size, cell)} and its neighbors.`;
  const won = complete(data.game);
  if (won && !data.random && !data.completed.includes(data.game.level.id)) data.completed.push(data.game.level.id);
  audio.play(won ? 'win' : 'flag');
  draw(true, cell);
  save();
  if (won) $('next').focus();
}

tileSelect.onchange = () => { selected = Number(tileSelect.value); draw(); };
$('flip').onclick = () => play(selected);
$('undo').onclick = () => {
  if (!undo(data.game)) return;
  notice = '';
  if (data.game.level.id === 'flip-1' && !data.game.history.length) selected = 4;
  draw();
  save();
};
$('hint').onclick = () => {
  const cell = solve(data.game)?.[0];
  if (cell === undefined) return;
  selected = cell;
  notice = `Try flipping the highlighted ${tileName(data.game.level.size, cell)} tile.`;
  draw();
};
$('retry').onclick = () => load(data.game.level, data.random);
$('next').onclick = () => {
  if (data.random) return newRandom(data.random.difficulty);
  const next = levels[levels.findIndex(level => level.id === data.game.level.id) + 1];
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
$('sound').onclick = () => {
  audio.setEnabled(!audio.enabled);
  if (audio.enabled) audio.play('flag');
  draw(false);
};
$('scene').addEventListener('keydown', event => {
  if (event.target !== $('scene') || $('scene').dataset.cameraMode === 'rotate') return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    play(selected);
  }
});
for (const event of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(event, () => audio.unlock(), { capture: true });
}
window.addEventListener('pagehide', save);
draw();
save();
