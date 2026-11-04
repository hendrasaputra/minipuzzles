import '../water-garden/style.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { randomSeed, isDifficulty } from '../../shared/random-puzzle';
import { clues, complete, createGame, hint, levels, markCell, randomPuzzle, undo, type Mark, type Puzzle } from './engine';
import { IslandScene } from './scene';
import { readSave, saveKey, writeSave, type RandomSetup } from './storage';

const audio = new GameAudio('picture-islands');
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let game = createGame(levels[0]);
let finished: string[] = [];
let random: RandomSetup | undefined;
let mode: 1 | -1 = 1;
let focusCell = 0;
let flat = false;
let notice = '';

try {
  const raw = localStorage.getItem(saveKey);
  const saved = readSave(raw);
  if (saved) ({ game, finished, random } = saved);
  else if (raw) notice = 'The previous save could not be opened.';
} catch { /* The game still works without storage. */ }

document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Picture Islands</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <div class="stats picture-tools">
    <button id="board-view" aria-pressed="false">Flat board</button>
    <button id="show-example" aria-haspopup="dialog">See example</button>
  </div>
  <section class="play-area" aria-label="Picture puzzle">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="3D picture board"></div>
    <div id="flat-board" class="flat-board" hidden></div>
  </section>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="channel-controls modes" role="group" aria-label="Tile mode">
    <button id="fill" aria-pressed="true">■ Fill</button><button id="cross" aria-pressed="false">× Mark empty</button>
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
    ${gameGuide([
      { before: '2 □ □ □', after: '■ ■ □', text: 'A clue of 2 means two filled tiles together.' },
      { before: '1 1 □ □ □', after: '■ × ■', text: 'Leave at least one empty tile between groups.' },
      { before: '□', after: '×', text: 'Choose Mark empty to cross out a tile. Tap the same mark to clear it.' },
      { before: '▧', after: '▦', text: 'Use Flat board for a clear view of the clues. Arrow keys move between tiles.' },
    ])}
    <button id="sound" class="menu-row" aria-pressed="true">Sound: on</button>
    <p id="save-state" class="muted"></p>
  </div>
</dialog>
<dialog id="example" class="sheet" aria-labelledby="example-title">
  <div class="sheet-heading"><h2 id="example-title">How to read the clues</h2><button id="close-example">Done</button></div>
  <div class="sheet-body picture-example">
    <p>Fill the right tiles to reveal a picture. Match every row and column clue.</p>
    <figure>
      <div class="example-line" aria-hidden="true">
        <b>2 1</b><span class="ink"></span><span class="ink"></span><span>×</span><span class="ink"></span><span>×</span>
      </div>
      <figcaption><strong>2 1</strong> means two filled tiles together, a gap, then one filled tile. Read rows left to right and columns top to bottom.</figcaption>
    </figure>
    <p>Choose <strong>Fill</strong> to color a tile. Choose <strong>Mark empty</strong> to put an × on a blank tile. Tap the same mark again to clear it.</p>
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
let scene: IslandScene | undefined;
try {
  scene = new IslandScene($('scene'), cell => apply(cell, game.marks[cell] === mode ? 0 : mode));
} catch {
  flat = true;
  $('board-view').hidden = true;
}

function save() {
  try {
    if (game.history.length > 1000) throw new RangeError('Save too large');
    localStorage.setItem(saveKey, writeSave(game, finished, random));
    $('save-state').textContent = 'Progress saved on this device.';
  } catch {
    $('save-state').textContent = 'Saving unavailable. Keep this tab open.';
  }
}

function drawFlat(guide: readonly number[]) {
  const { rows, columns } = clues(game.puzzle);
  const { size } = game.puzzle;
  const text = (line: number[]) => line.length ? line.join(' ') : '0';
  const hadFocus = $('flat-board').contains(document.activeElement);
  $('flat-board').innerHTML = `<table aria-label="Picture puzzle with row and column clues">
    <thead><tr><td></td>${columns.map((line, i) => `<th scope="col" aria-label="Column ${i + 1}, ${text(line)}">${(line.length ? line : [0]).join('<br>')}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((line, row) => `<tr><th scope="row" aria-label="Row ${row + 1}, ${text(line)}">${text(line)}</th>
      ${Array.from({ length: size }, (_, col) => {
        const cell = row * size + col;
        const mark = game.marks[cell];
        const name = mark === 1 ? 'filled' : mark === -1 ? 'marked empty' : 'unmarked';
        return `<td><button data-cell="${cell}" data-mark="${mark}" ${guide.includes(cell) && mark !== 1 ? 'class="guide-tile"' : ''} tabindex="${cell === focusCell ? 0 : -1}" aria-label="Row ${row + 1}, column ${col + 1}, ${name}. Row clues ${text(line)}. Column clues ${text(columns[col])}.">${mark === -1 ? '×' : ''}</button></td>`;
      }).join('')}</tr>`).join('')}</tbody></table>`;
  if (hadFocus) $('flat-board').querySelector<HTMLButtonElement>(`[data-cell="${focusCell}"]`)?.focus({ preventScroll: true });
}

function draw(filled?: number) {
  const won = complete(game);
  const levelIndex = levels.findIndex(level => level.id === game.puzzle.id);
  $('title').textContent = won ? game.puzzle.title : random ? 'Random picture' : `Picture ${levelIndex + 1}`;
  $('level-number').textContent = random
    ? random.difficulty[0].toUpperCase() + random.difficulty.slice(1)
    : `${levelIndex + 1} / ${levels.length}`;
  const firstColumn = [2, 7, 12, 17, 22];
  const middleRow = [10, 11, 12, 13, 14];
  const columnDone = firstColumn.every(cell => game.marks[cell] === 1);
  const guide = !won && game.puzzle.id === levels[0].id && mode === 1
    ? columnDone ? middleRow : firstColumn
    : [];
  const instruction = guide.length
    ? `The ${columnDone ? 'middle row' : 'middle column'} has a clue of 5. Fill all five tiles there.`
    : 'Match every row and column clue to reveal the picture.';
  $('status').textContent = won ? 'Picture complete!' : notice || instruction;
  $('scene').hidden = flat;
  $('flat-board').hidden = !flat;
  $('board-view').textContent = flat ? '3D board' : 'Flat board';
  $('board-view').setAttribute('aria-pressed', String(flat));
  $('fill').setAttribute('aria-pressed', String(mode === 1));
  $('cross').setAttribute('aria-pressed', String(mode === -1));
  $<HTMLButtonElement>('undo').disabled = game.history.length === 0;
  $('hint').hidden = won;
  $('next').hidden = !won;
  $('next').textContent = random ? 'New puzzle' : levelIndex === levels.length - 1 ? 'Levels' : 'Next';
  $('level-select').innerHTML = (random ? '<option value="" selected>Random puzzle</option>' : '')
    + levels.map((level, index) => `<option value="${level.id}" ${level.id === game.puzzle.id ? 'selected' : ''}>Picture ${index + 1}${finished.includes(level.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${finished.length} of ${levels.length} pictures complete.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
  if (flat) {
    scene?.clearFeedback();
    $('flat-board').dataset.complete = String(won);
    drawFlat(guide);
  } else scene?.draw(game, guide, filled, won);
}

function apply(cell: number, mark: Mark) {
  if (!markCell(game, cell, mark)) return;
  audio.unlock();
  notice = '';
  focusCell = cell;
  const won = complete(game);
  if (won && !random && !finished.includes(game.puzzle.id)) finished.push(game.puzzle.id);
  draw(mark === 1 ? cell : undefined);
  save();
  audio.play(won ? 'win' : mark === 1 ? 'reveal' : 'flag');
}

function load(puzzle: Puzzle, setup?: RandomSetup) {
  game = createGame(puzzle);
  random = setup;
  focusCell = 0;
  mode = 1;
  notice = '';
  if (menu.open) menu.close();
  draw();
  save();
}
function newRandom() {
  const difficulty = $<HTMLSelectElement>('difficulty').value;
  if (!isDifficulty(difficulty)) return;
  const seed = randomSeed();
  load(randomPuzzle(seed, difficulty), { seed, difficulty });
}
$<HTMLSelectElement>('difficulty').value = random?.difficulty ?? 'easy';
$('fill').onclick = () => { mode = 1; draw(); };
$('cross').onclick = () => { mode = -1; draw(); };
$('board-view').onclick = () => { flat = !flat; draw(); };
$('undo').onclick = () => { undo(game); notice = ''; draw(); save(); };
$('hint').onclick = () => { const move = hint(game); if (move) apply(move.cell, move.mark); };
$('retry').onclick = () => load(game.puzzle, random);
$('next').onclick = () => {
  if (random) return newRandom();
  const next = levels[levels.findIndex(level => level.id === game.puzzle.id) + 1];
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
$('show-example').onclick = () => $<HTMLDialogElement>('example').showModal();
$('close-example').onclick = () => $<HTMLDialogElement>('example').close();
$('sound').onclick = () => { audio.setEnabled(!audio.enabled); draw(); };
$('flat-board').onclick = event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-cell]');
  if (!button) return;
  const cell = Number(button.dataset.cell);
  apply(cell, game.marks[cell] === mode ? 0 : mode);
};
$('flat-board').onkeydown = event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-cell]');
  if (!button) return;
  const cell = Number(button.dataset.cell);
  const { size } = game.puzzle;
  const next = {
    ArrowLeft: cell % size > 0 ? cell - 1 : cell,
    ArrowRight: cell % size < size - 1 ? cell + 1 : cell,
    ArrowUp: cell >= size ? cell - size : cell,
    ArrowDown: cell < size * (size - 1) ? cell + size : cell,
  }[event.key];
  if (next === undefined) return;
  event.preventDefault();
  focusCell = next;
  button.tabIndex = -1;
  const target = $('flat-board').querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)!;
  target.tabIndex = 0;
  target.focus();
};
draw();
