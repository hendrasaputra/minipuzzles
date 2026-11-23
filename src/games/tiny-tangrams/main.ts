import '../../shared/game-base.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { addMusic } from '../../shared/ambient';
import { cameraOther, cameraStep, gameGuide, showGuideOnFirstVisit } from '../../shared/game-guide';
import { isDifficulty, randomSeed, type Difficulty } from '../../shared/random-puzzle';
import { applyMove, canPlace, centre, colors, complete, createGame, footprint, hint, nextTurn, pieceAt, placementAt, shapeNames, undo, vertices,
  type Level, type Move, type Placement, type Point, type Turn } from './engine';
import { levels, randomLevel, type RandomTangram } from './levels';
import { TangramScene } from './scene';
import { readSave, writeSave, type Save } from './storage';
import { PlayTracker } from '../../shared/play-tracking';

const key = 'puzzles-tiny-tangrams-v1';
const audio = new GameAudio('tiny-tangrams');
const tiers = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
let data: Save = { game: createGame(levels[0]), completed: [] };
let selected = 0;
let draft: Placement = { x: 0, y: 0, turn: 0 };
let notice = '';
const play = new PlayTracker('tiny-tangrams');
const levelName = () => data.random ? data.random.difficulty : `${String(levels.findIndex(level => level.id === data.game.level.id) + 1).padStart(2, '0')}-${data.game.level.id}`;

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
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="3D fitting board. Tap a square to place the selected piece. Tap a placed piece to choose it, tap again to turn it, hold to lift it."></div>
  </section>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="tangram-controls">
    <div id="piece-tray" class="piece-tray" role="group" aria-label="Pieces"></div>
    <div class="piece-choice touch-optional">
      <span id="piece-icon" aria-hidden="true"></span>
      <select id="piece-select" aria-label="Choose a piece"></select>
    </div>
    <button id="turn">Turn ↻</button>
    <div class="coordinates touch-optional" aria-label="Placement square">
      <select id="column-select" aria-label="Column"></select>
      <select id="row-select" aria-label="Row"></select>
    </div>
    <button id="place" class="primary touch-optional">Place</button>
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
      { gesture: 'tap-two', before: '◤ + ◢', after: '■', text: 'Tap a piece in the tray, then tap the board to place it.' },
      { gesture: 'tap', before: '◣', after: '◢', text: 'Press Turn to turn the chosen piece. Tap a placed piece twice to turn it where it sits.' },
      { gesture: 'hold', before: '◤', after: '·', text: 'Hold a placed piece to lift it off the board.' },
      cameraStep,
    ], true, `With a mouse, click the board to place. You can also choose a piece, column and row from the lists and press Place. Right-click a piece to lift it. On the board, arrow keys move the spot and Enter or Space places. ${cameraOther}`)}
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
  scene = new TangramScene($('scene'), (cell, [px, py]) => {
    const hit = pieceAt(data.game, px, py);
    if (hit === selected) turnPlaced();
    else if (hit !== -1) { choose(hit); notice = ''; draw(); }
    else if (cell) {
      const tapped = { ...draft, x: cell[0], y: cell[1] };
      draft = canPlace(data.game, selected, tapped) ? tapped : placementAt(data.game, selected, [px, py], draft.turn) ?? tapped;
      place();
    }
  }, ([px, py]) => {
    const hit = pieceAt(data.game, px, py);
    if (hit === -1 || complete(data.game)) return;
    choose(hit);
    change({ piece: hit, placement: null });
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
  const here = placements[selected];
  if (here && here.x === draft.x && here.y === draft.y && here.turn === draft.turn) instruction = `Tap piece ${selected + 1} again to turn it, or hold it to lift it off.`;
  // First level: point at the next step from the hint, and say the same thing in the status line.
  const tutorial = !random && index === 0 && !won ? hint(game) : undefined;
  let finger: Point | undefined;
  if (tutorial) {
    const name = ['first triangle', 'second triangle'][tutorial.piece] ?? `piece ${tutorial.piece + 1}`;
    const target = tutorial.placement;
    if (!target) {
      finger = centre(footprint(level.pieces[tutorial.piece], placements[tutorial.piece]!));
      instruction = `Hold the ${name} where the finger points to lift it off.`;
    } else if (tutorial.piece !== selected) instruction = `Choose the ${name} from the pieces.`;
    else if (draft.turn !== target.turn) instruction = `Press Turn until the ${name} matches the empty space.`;
    else {
      finger = centre(footprint(level.pieces[tutorial.piece], target));
      instruction = `Tap where the finger points to place the ${name}.`;
    }
  }
  scene?.pointAt(finger);
  $('status').textContent = won ? 'All pieces fit!' : notice || instruction;

  const shape = footprint(level.pieces[selected], { x: 0, y: 0, turn: draft.turn });
  $('piece-icon').innerHTML = `<svg viewBox="-.1 -.1 2.2 2.2" width="29" height="29">${shape.map(tile =>
    `<polygon points="${vertices(tile).map(point => point.join(',')).join(' ')}" fill="${colors[selected]}"/>`).join('')}</svg>`;
  pieceSelect.innerHTML = level.pieces.map(({ shape }, i) =>
    `<option value="${i}">${i + 1}. ${shapeNames[shape]}${placements[i] ? ' ✓' : ''}</option>`).join('');
  pieceSelect.value = String(selected);
  $('piece-tray').innerHTML = level.pieces.map((piece, i) => {
    const tiles = footprint(piece, { x: 0, y: 0, turn: i === selected ? draft.turn : placements[i]?.turn ?? (i % 4) as Turn });
    return `<button type="button" data-piece="${i}" aria-pressed="${i === selected}" aria-label="Piece ${i + 1}, ${shapeNames[piece.shape]}${placements[i] ? ', placed' : ''}"${won ? ' disabled' : ''}>`
      + `<svg viewBox="-.1 -.1 2.2 2.2" width="28" height="28" aria-hidden="true">${tiles.map(tile =>
        `<polygon points="${vertices(tile).map(point => point.join(',')).join(' ')}" fill="${colors[i]}"/>`).join('')}</svg>`
      + `${placements[i] ? '<span aria-hidden="true">✓</span>' : ''}</button>`;
  }).join('');
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

function load(level: Level, random?: RandomTangram, restart = false) {
  data = { game: createGame(level), completed: data.completed, random };
  draft = { x: 0, y: 0, turn: 0 };
  choose(0);
  notice = '';
  if (menu.open) menu.close();
  draw();
  save();
  if (restart) play.count('restarts'); else play.start(levelName());
}

function newRandom(tier: Difficulty) {
  const random: RandomTangram = { version: 1, seed: randomSeed(), difficulty: tier };
  load(randomLevel(random), random);
}

function change(move: Move, keepSelection = false) {
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
  if (move.placement && missing !== -1 && !keepSelection) choose(missing);
  notice = '';
  audio.play(won ? 'win' : 'flag');
  if (won) play.finish({ moves: data.game.history.length, pieces: data.game.level.pieces.length });
  draw(move.placement ? move.piece : undefined);
  save();
  if (won) $('next').focus();
}

function place() { change({ piece: selected, placement: draft }); }

/** Turn the selected placed piece where it sits, skipping turns that do not fit. */
function turnPlaced() {
  const placed = data.game.placements[selected];
  if (!placed || complete(data.game)) return;
  let turn = placed.turn;
  for (let i = 0; i < 3; i++) {
    turn = nextTurn(turn);
    const candidate = { ...placed, turn };
    if (canPlace(data.game, selected, candidate)) { draft = candidate; change({ piece: selected, placement: candidate }, true); return; }
  }
  notice = 'This piece has no room to turn here. Hold it to lift it off.';
  draw();
}
$('piece-tray').addEventListener('click', event => {
  const button = (event.target as Element).closest<HTMLButtonElement>('[data-piece]');
  if (!button) return;
  choose(Number(button.dataset.piece)); notice = ''; draw();
});
pieceSelect.onchange = () => { choose(Number(pieceSelect.value)); notice = ''; draw(); };
columnSelect.onchange = () => { draft.x = Number(columnSelect.value); notice = ''; draw(); };
rowSelect.onchange = () => { draft.y = Number(rowSelect.value); notice = ''; draw(); };
$('turn').onclick = () => { draft.turn = nextTurn(draft.turn); notice = ''; draw(); };
$('place').onclick = place;
$('remove').onclick = () => change({ piece: selected, placement: null });
$('undo').onclick = () => {
  const piece = data.game.history.at(-1)?.piece;
  if (piece === undefined || !undo(data.game)) return;
  play.count('undos');
  choose(piece);
  notice = '';
  draw();
  save();
};
$('hint').onclick = () => {
  const move = hint(data.game);
  play.count('hints');
  if (move) change(move);
};
$('retry').onclick = () => load(data.game.level, data.random, true);
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
if (!complete(data.game)) play.start(levelName());
addMusic('tiny-tangrams');
showGuideOnFirstVisit('tiny-tangrams');
