import '../water-garden/style.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { isDifficulty, randomSeed, type Difficulty } from '../../shared/random-puzzle';
import { applyMove, canPlace, colors, complete, createGame, footprint, hint, nextTurn, shapeNames, undo, vertices,
  type Level, type Move, type Placement, type Turn } from './engine';
import { levels, randomLevel, type RandomTangram } from './levels';
import { TangramScene } from './scene';
import { readSave, writeSave, type Save } from './storage';

const key = 'puzzles-tiny-tangrams-v1';
const audio = new GameAudio('tiny-tangrams');
const tiers = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
let data: Save = { game: createGame(levels[0]), completed: [] };
let selected = 0;
let draft: Placement = { x: 0, y: 0, turn: 0 };
let notice = '';

try {
  const raw = localStorage.getItem(key);
  const saved = readSave(raw);
  if (saved) data = saved;
  else if (raw) notice = 'The previous save could not be opened.';
} catch { /* The game still works without storage. */ }

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const letter = (x: number) => String.fromCharCode(65 + x);
const spot = ({ x, y }: Placement) => `${letter(x)}${y + 1}`;
document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Tiny Tangrams</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved. Keep this tab open.</p>
  <div class="stats tangram-stats">
    <div><strong id="moves"></strong><span>Pieces placed</span></div>
    <button id="show-help" aria-haspopup="dialog">See example</button>
  </div>
  <section class="play-area" aria-label="Shape puzzle">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="3D fitting board. Tap a square to place the selected piece."></div>
  </section>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="tangram-controls">
    <div class="piece-choice">
      <span id="piece-icon" aria-hidden="true"></span>
      <select id="piece-select" aria-label="Choose a piece"></select>
    </div>
    <button id="turn">Turn ↻</button>
    <div class="coordinates" aria-label="Placement square">
      <select id="column-select" aria-label="Column"></select>
      <select id="row-select" aria-label="Row"></select>
    </div>
    <button id="place" class="primary">Place</button>
  </div>
  <div class="actions">
    <button id="undo">Undo</button><button id="remove">Lift piece</button>
    <button id="hint">Hint</button><button id="retry">Retry</button>
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
  <div class="sheet-heading"><h2 id="example-title">Fit the pieces</h2><button id="close-example">Done</button></div>
  <div class="sheet-body">
    <p>Fill the tan outline with every piece. Leave no gaps or overlaps.</p>
    ${gameGuide([
      { before: '◤ + ◣', after: '◤', text: 'Choose a piece. Its preview shows where it will go.' },
      { before: '◣', after: '◢', text: 'Press Turn to rotate the piece a quarter turn.' },
      { before: '◤ + ◢', after: '■', text: 'Tap the board to place it, or choose a column and row and press Place. Two triangles can fill a square.' },
      { before: '↺', after: '▧', text: 'Drag with two fingers to rotate. With a mouse, choose Rotate and drag, then choose Play to resume.' },
    ], true)}
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
const example = $<HTMLDialogElement>('example');
const difficulty = $<HTMLSelectElement>('random-difficulty');
const pieceSelect = $<HTMLSelectElement>('piece-select');
const columnSelect = $<HTMLSelectElement>('column-select');
const rowSelect = $<HTMLSelectElement>('row-select');
difficulty.value = data.random?.difficulty ?? 'easy';
let scene: TangramScene | undefined;
try {
  scene = new TangramScene($('scene'), (x, y) => {
    draft = { ...draft, x, y };
    place();
  });
} catch {
  $('scene').textContent = '3D is unavailable. Choose a piece and square below, then press Place.';
}

function choose(index: number) {
  selected = index;
  const placed = data.game.placements[index];
  draft = placed ? { ...placed } : { x: draft.x, y: draft.y, turn: (index % 4) as Turn };
}
const firstMissing = data.game.placements.indexOf(null);
if (firstMissing !== -1) choose(firstMissing);

function save() {
  let saving = true;
  try { localStorage.setItem(key, writeSave(data)); }
  catch { saving = false; }
  $('storage-warning').hidden = saving;
  $('save-state').textContent = saving ? 'Progress saved on this device.' : 'Saving unavailable.';
}

function draw(placedPiece?: number) {
  const { game, random } = data;
  const { level, placements } = game;
  const won = complete(game);
  const index = levels.findIndex(candidate => candidate.id === level.id);
  const fits = canPlace(game, selected, draft);
  scene?.draw(game, selected, draft, placedPiece);
  $('title').textContent = level.title;
  $('level-number').textContent = random ? tiers[random.difficulty] : `${index + 1} / ${levels.length}`;
  $('moves').textContent = `${placements.filter(Boolean).length} / ${placements.length}`;
  let instruction = fits ? `Place piece ${selected + 1} at ${spot(draft)}, or tap another square.`
    : 'The piece does not fit here. Turn it or try another square.';
  if (index === 0 && !placements[0] && selected === 0 && fits) instruction = 'Place the first triangle at A1.';
  else if (index === 0 && placements[0] && !placements[1] && !fits) instruction = 'Turn the second triangle until it fits at A1.';
  $('status').textContent = won ? 'All pieces fit!' : notice || instruction;

  const shape = footprint(level.pieces[selected], { x: 0, y: 0, turn: draft.turn });
  $('piece-icon').innerHTML = `<svg viewBox="-.1 -.1 2.2 2.2" width="29" height="29">${shape.map(tile =>
    `<polygon points="${vertices(tile).map(point => point.join(',')).join(' ')}" fill="${colors[selected]}"/>`).join('')}</svg>`;
  pieceSelect.innerHTML = level.pieces.map(({ shape }, i) =>
    `<option value="${i}">${i + 1}. ${shapeNames[shape]}${placements[i] ? ' ✓' : ''}</option>`).join('');
  pieceSelect.value = String(selected);
  columnSelect.innerHTML = Array.from({ length: level.width }, (_, x) =>
    `<option value="${x}">Col ${letter(x)}</option>`).join('');
  rowSelect.innerHTML = Array.from({ length: level.height }, (_, y) =>
    `<option value="${y}">Row ${y + 1}</option>`).join('');
  columnSelect.value = String(draft.x);
  rowSelect.value = String(draft.y);
  $('place').hidden = won;
  $('hint').hidden = won;
  $('next').hidden = !won;
  $('next').textContent = random ? 'New puzzle' : index === levels.length - 1 ? 'Levels' : 'Next';
  for (const control of [pieceSelect, columnSelect, rowSelect, $<HTMLButtonElement>('turn')]) control.disabled = won;
  $<HTMLButtonElement>('place').disabled = !fits;
  $<HTMLButtonElement>('undo').disabled = !game.history.length;
  $<HTMLButtonElement>('remove').disabled = won || placements[selected] === null;
  $('level-select').innerHTML = (random ? '<option value="" disabled selected>Random puzzle</option>' : '')
    + levels.map(level => `<option value="${level.id}" ${level.id === game.level.id ? 'selected' : ''}>${level.title}${data.completed.includes(level.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${data.completed.length} of ${levels.length} levels done.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

function load(level: Level, random?: RandomTangram) {
  data = { game: createGame(level), completed: data.completed, random };
  draft = { x: 0, y: 0, turn: 0 };
  choose(0);
  notice = '';
  if (menu.open) menu.close();
  draw();
  save();
}

function newRandom(tier: Difficulty) {
  const random: RandomTangram = { version: 1, seed: randomSeed(), difficulty: tier };
  load(randomLevel(random), random);
}

function change(move: Move) {
  if (menu.open || example.open || complete(data.game)) return;
  if (!applyMove(data.game, move)) {
    notice = canPlace(data.game, selected, draft) ? 'The piece is already here.'
      : 'The piece must fit inside the outline without covering another piece.';
    draw();
    return;
  }
  const won = complete(data.game);
  if (won && !data.random && !data.completed.includes(data.game.level.id)) data.completed.push(data.game.level.id);
  const missing = data.game.placements.indexOf(null);
  if (move.placement && missing !== -1) choose(missing);
  notice = '';
  audio.play(won ? 'win' : 'flag');
  draw(move.placement ? move.piece : undefined);
  save();
  if (won) $('next').focus();
}

function place() { change({ piece: selected, placement: draft }); }
pieceSelect.onchange = () => { choose(Number(pieceSelect.value)); notice = ''; draw(); };
columnSelect.onchange = () => { draft.x = Number(columnSelect.value); notice = ''; draw(); };
rowSelect.onchange = () => { draft.y = Number(rowSelect.value); notice = ''; draw(); };
$('turn').onclick = () => { draft.turn = nextTurn(draft.turn); notice = ''; draw(); };
$('place').onclick = place;
$('remove').onclick = () => change({ piece: selected, placement: null });
$('undo').onclick = () => {
  const piece = data.game.history.at(-1)?.piece;
  if (piece === undefined || !undo(data.game)) return;
  choose(piece);
  notice = '';
  draw();
  save();
};
$('hint').onclick = () => {
  const move = hint(data.game);
  if (move) change(move);
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
$('close-menu').onclick = () => menu.close();
$('show-help').onclick = () => { scene?.cancelInput(); example.showModal(); };
$('close-example').onclick = () => example.close();
$('sound').onclick = () => { audio.setEnabled(!audio.enabled); draw(); };
$('scene').addEventListener('keydown', event => {
  if (event.target !== $('scene') || $('scene').dataset.cameraMode === 'rotate' || complete(data.game)) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    place();
    return;
  }
  const offsets: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const offset = offsets[event.key];
  if (!offset) return;
  event.preventDefault();
  draft.x = Math.max(0, Math.min(data.game.level.width - 1, draft.x + offset[0]));
  draft.y = Math.max(0, Math.min(data.game.level.height - 1, draft.y + offset[1]));
  notice = '';
  draw();
});
for (const event of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(event, () => audio.unlock(), { capture: true });
}
window.addEventListener('pagehide', save);
draw();
save();
