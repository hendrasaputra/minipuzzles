import '../water-garden/style.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { isDifficulty, randomSeed } from '../../shared/random-puzzle';
import { complete, conflicts, createGame, enter, hint, levels, randomLevel, undo, values, type Level, type Value } from './engine';
import { GardenScene } from './scene';
import { readSave, saveKey, writeSave, type RandomSetup } from './storage';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const audio = new GameAudio();
const icons = ['', '🌱', '🌷', '🌻', '🍀'];
const names = ['', 'Sprout', 'Tulip', 'Sunflower', 'Clover'];
let game = createGame(levels[0]);
let finished: string[] = [];
let random: RandomSetup | undefined;
let notice = '';
let flat = false;

try {
  const raw = localStorage.getItem(saveKey);
  const restored = readSave(raw);
  if (restored) ({ game, finished, random } = restored);
  else if (raw) notice = 'The previous save could not be opened.';
} catch { /* The board still works without storage. */ }

let selected = Math.max(0, game.cells.indexOf(0));

document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Garden Sudoku</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <div class="stats sudoku-tools">
    <button id="board-view" aria-pressed="false">Flat board</button>
    <button id="show-help" aria-haspopup="dialog">See example</button>
  </div>
  <section class="play-area" aria-label="Garden Sudoku puzzle">
    <div id="scene" class="scene" tabindex="0"></div>
    <div id="flat-board" class="sudoku-flat" hidden></div>
  </section>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="plant-controls" role="group" aria-label="Plant choices">
    ${values.map(value => `<button id="plant-${value}" aria-label="Place ${value}, ${names[value]}">${icons[value]} ${value}</button>`).join('')}
    <button id="erase" aria-label="Clear selected square">Clear</button>
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
  <div class="sheet-heading"><h2 id="example-title">How to plant</h2><button id="close-example">Done</button></div>
  <div class="sheet-body">
    <p>Use each plant once in every row, column, and 2×2 box. The numbers 1–4 stand for the four plants.</p>
    <figure>
      <div class="sudoku-example" aria-hidden="true"><span>🌱 1</span><span>🌷 2</span><span class="answer">🌻 3</span><span>🍀 4</span></div>
      <figcaption>This row already has 1, 2, and 4. Check the column and box before filling the missing square with 3.</figcaption>
    </figure>
    ${gameGuide([
      { before: '1 2 □ 4', after: '1 2 3 4', text: 'Choose an empty square and press its plant button.' },
      { before: '2 2', after: '2 □', text: 'Red squares repeat a plant. Clear or change your entry.' },
      { before: '▧', after: '▦', text: 'Choose Flat board to play with arrow keys and numbers 1–4. Backspace clears a square.' },
    ], true)}
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
let scene: GardenScene | undefined;
try {
  scene = new GardenScene($('scene'), cell => {
    selected = cell;
    notice = '';
    draw();
  });
} catch {
  flat = true;
  $('board-view').hidden = true;
}

function save() {
  try {
    localStorage.setItem(saveKey, writeSave(game, finished, random));
    $('save-state').textContent = 'Progress saved on this device.';
  } catch {
    $('save-state').textContent = 'Saving unavailable. Keep this tab open.';
  }
}

function cellName(cell: number) {
  return `Row ${Math.floor(cell / 4) + 1}, column ${cell % 4 + 1}`;
}

function drawFlat(clashes: Set<number>) {
  const board = $('flat-board');
  const focused = board.contains(document.activeElement);
  board.innerHTML = `<div class="sudoku-grid" role="group" aria-label="Four by four Sudoku grid">
    ${game.cells.map((value, cell) => {
      const given = Boolean(game.level.givens[cell]);
      const name = value ? `${names[value]} ${value}` : 'empty';
      return `<button data-cell="${cell}" data-given="${given}" data-conflict="${clashes.has(cell)}"
        tabindex="${cell === selected ? 0 : -1}" aria-pressed="${cell === selected}"
        aria-label="${cellName(cell)}, ${name}${given ? ', given' : ''}${clashes.has(cell) ? ', repeated' : ''}">
        ${value ? `${icons[value]} ${value}` : '·'}
      </button>`;
    }).join('')}
  </div>`;
  if (focused) board.querySelector<HTMLButtonElement>(`[data-cell="${selected}"]`)?.focus({ preventScroll: true });
}

function draw() {
  const won = complete(game);
  const clashes = conflicts(game.cells);
  const index = levels.findIndex(level => level.id === game.level.id);
  $('title').textContent = game.level.title;
  $('level-number').textContent = random ? random.difficulty[0].toUpperCase() + random.difficulty.slice(1) : `${index + 1} / ${levels.length}`;
  let instruction = 'Use each plant once per row, column, and 2×2 box.';
  if (game.history.length === 0 && game.level.id === levels[0].id) instruction = 'The first row has 1, 2, and 4. Put 3 in the highlighted square.';
  if (game.level.givens[selected]) instruction = 'This plant is given. Choose a square you can change.';
  $('status').textContent = won ? 'Garden complete!' : notice || (clashes.size ? 'A plant repeats in a row, column, or box.' : instruction);
  $('scene').hidden = flat;
  $('flat-board').hidden = !flat;
  $('board-view').textContent = flat ? '3D board' : 'Flat board';
  $('board-view').setAttribute('aria-pressed', String(flat));
  const locked = Boolean(game.level.givens[selected]) || won;
  for (const value of values) $<HTMLButtonElement>(`plant-${value}`).disabled = locked;
  $<HTMLButtonElement>('erase').disabled = locked || !game.cells[selected];
  $<HTMLButtonElement>('undo').disabled = game.history.length === 0;
  $('hint').hidden = won;
  $('next').hidden = !won;
  $('next').textContent = random ? 'New puzzle' : index === levels.length - 1 ? 'Levels' : 'Next';
  $('level-select').innerHTML = (random ? '<option value="" selected>Random garden</option>' : '')
    + levels.map(level => `<option value="${level.id}" ${level.id === game.level.id ? 'selected' : ''}>${level.title}${finished.includes(level.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${finished.length} of ${levels.length} gardens complete.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
  if (flat) drawFlat(clashes);
  else scene?.draw(game, selected);
}

function place(cell: number, value: Value) {
  if (!enter(game, cell, value)) return;
  audio.unlock();
  selected = cell;
  notice = '';
  const won = complete(game);
  if (won && !random && !finished.includes(game.level.id)) finished.push(game.level.id);
  draw();
  save();
  audio.play(won ? 'win' : value ? 'reveal' : 'flag');
}

function load(level: Level, setup?: RandomSetup) {
  game = createGame(level);
  random = setup;
  selected = Math.max(0, game.cells.indexOf(0));
  notice = '';
  if (menu.open) menu.close();
  draw();
  save();
}

function newRandom() {
  const difficulty = $<HTMLSelectElement>('difficulty').value;
  if (!isDifficulty(difficulty)) return;
  const seed = randomSeed();
  load(randomLevel(seed, difficulty), { seed, difficulty });
}
$<HTMLSelectElement>('difficulty').value = random?.difficulty ?? 'easy';
for (const value of values) $(`plant-${value}`).onclick = () => place(selected, value);
$('erase').onclick = () => place(selected, 0);
$('board-view').onclick = () => { flat = !flat; draw(); };
$('undo').onclick = () => {
  selected = undo(game) ?? selected;
  notice = '';
  draw();
  save();
};
$('hint').onclick = () => {
  const move = hint(game, selected);
  if (move) place(move.cell, move.value);
};
$('retry').onclick = () => load(game.level, random);
$('next').onclick = () => {
  if (random) return newRandom();
  const next = levels[levels.findIndex(level => level.id === game.level.id) + 1];
  if (next) load(next);
  else menu.showModal();
};
$('new-random').onclick = newRandom;
$<HTMLSelectElement>('level-select').onchange = event => {
  const level = levels.find(candidate => candidate.id === (event.target as HTMLSelectElement).value);
  if (level) load(level);
};
$('open-menu').onclick = () => menu.showModal();
$('close-menu').onclick = () => menu.close();
$('show-help').onclick = () => $<HTMLDialogElement>('example').showModal();
$('close-example').onclick = () => $<HTMLDialogElement>('example').close();
$('sound').onclick = () => { audio.setEnabled(!audio.enabled); draw(); };

const board = $('flat-board');
board.onclick = event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-cell]');
  if (!button) return;
  selected = Number(button.dataset.cell);
  notice = '';
  draw();
};
board.onkeydown = event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-cell]');
  if (!button) return;
  const cell = Number(button.dataset.cell);
  if (/^[1-4]$/.test(event.key) || event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault();
    place(cell, (/^[1-4]$/.test(event.key) ? Number(event.key) : 0) as Value);
    return;
  }
  const next = {
    ArrowLeft: cell % 4 > 0 ? cell - 1 : cell,
    ArrowRight: cell % 4 < 3 ? cell + 1 : cell,
    ArrowUp: cell >= 4 ? cell - 4 : cell,
    ArrowDown: cell < 12 ? cell + 4 : cell,
  }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  selected = next;
  notice = '';
  draw();
};
draw();
