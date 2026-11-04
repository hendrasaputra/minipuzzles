import '../water-garden/style.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { isDifficulty, randomSeed, type Difficulty } from '../../shared/random-puzzle';
import { applyMove, complete, createGame, hint, totals, undo, type Count, type Level, type Move } from './engine';
import { levels, randomLevel, type RandomBridge } from './levels';
import { BridgeScene, islandName } from './scene';
import { readSave, writeSave, type Save } from './storage';

const key = 'puzzles-bridge-islands-v1';
const audio = new GameAudio();
const tiers = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
let saveData: Save = { game: createGame(levels[0]), completed: [] };
let selected = 0;
let neighbor = 1;
let pending = false;
let notice = '';

try {
  const raw = localStorage.getItem(key);
  const saved = readSave(raw);
  if (saved) saveData = saved;
  else if (raw) notice = 'The previous save could not be opened.';
} catch {
  // Play remains available when storage is blocked.
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Bridge Islands</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved. Keep this tab open.</p>
  <p class="bridge-goal">Connect every island. Match each bridge count.</p>
  <div class="stats bridge-stats">
    <div><strong id="moves"></strong><span>Islands matched</span></div>
    <button id="show-help" aria-haspopup="dialog">See example</button>
  </div>
  <section class="play-area" aria-label="Bridge puzzle">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="3D island board. Tap two islands in the same row or column to connect them."></div>
  </section>
  <div class="bridge-cards" aria-live="polite">
    <div><span id="target-label">Island A · Goal</span><strong id="target-count"></strong></div>
    <div><span id="current-label">Island A · Current</span><strong id="current-count"></strong></div>
  </div>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="bridge-controls">
    <label class="car-choice"><span class="sr-only">From island</span><select id="island-select" aria-label="From island"></select></label>
    <label class="car-choice"><span class="sr-only">To island</span><select id="neighbor-select" aria-label="To island"></select></label>
  </div>
  <div class="actions">
    <button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Retry</button>
    <button id="connect" class="primary">Add bridge</button><button id="next" class="primary" hidden>Next</button>
  </div>
</main>
<dialog id="menu" class="sheet" aria-labelledby="menu-title">
  <div class="sheet-heading"><h2 id="menu-title">Menu</h2><button id="close-menu">Done</button></div>
  <div class="sheet-body">
    <label>Levels<select id="level-select"></select></label>
    <label>Random difficulty<select id="random-difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
    <div class="menu-pair"><button id="new-random">New random puzzle</button></div>
    <p id="progress" class="muted"></p>
    <p>Connect every island. Each label shows bridges built / bridges needed. An island marked 1/2 still needs one bridge.</p>
    ${gameGuide([
      { before: '<span class="bridge-example"><b>1</b> <b>3</b></span>',
        after: '<span class="bridge-example"><b>1</b><i></i><b>3</b></span>',
        text: 'Tap one island, then its neighbor. Or pick them in the lists and press Add bridge.' },
      { before: '<span class="bridge-example"><b>3</b><i></i><b>2</b></span>',
        after: '<span class="bridge-example"><b>3</b><i class="double"></i><b>2</b></span>',
        text: 'Repeat the same pair for two bridges. Repeat once more to clear both.' },
      { before: '<span class="bridge-example"><b>1</b><i></i><b>3</b> <b>2</b></span>',
        after: '<span class="bridge-example"><b>1</b><i></i><b>3</b><i class="double"></i><b>2</b></span>',
        text: 'The middle island has three bridges in total. One goes left and two go right. All three islands are joined.' },
      { before: '↘ ✕', after: '↔ ✓', text: 'Bridges go straight to the nearest island in the same row or column. They cannot cross.' },
      { before: '↺', after: '▧', text: 'Choose Rotate and drag to look around. Choose Play to add bridges.' },
    ])}
    <button id="sound" class="menu-row" aria-pressed="true">Sound: on</button>
    <p id="save-state" class="muted"></p>
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
const difficulty = $<HTMLSelectElement>('random-difficulty');
const islandSelect = $<HTMLSelectElement>('island-select');
const neighborSelect = $<HTMLSelectElement>('neighbor-select');
difficulty.value = saveData.random?.difficulty ?? 'easy';

let scene: BridgeScene | undefined;
try {
  scene = new BridgeScene($('scene'), tapIsland);
} catch {
  $('scene').textContent = '3D is unavailable. You can still connect islands using the lists below.';
}

function save() {
  let saving = true;
  try { localStorage.setItem(key, writeSave(saveData)); }
  catch { saving = false; }
  $('storage-warning').hidden = saving;
  $('save-state').textContent = saving ? 'Progress saved on this device.' : 'Saving unavailable.';
}

function neighbors(island: number) {
  return saveData.game.level.edges.flatMap(({ a, b }) => a === island ? [b] : b === island ? [a] : []);
}

function edgeIndex(a: number, b: number): number {
  return saveData.game.level.edges.findIndex(edge =>
    (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a));
}

function draw(updateBoard = true, extended?: number) {
  const { game, completed, random } = saveData;
  const { level, bridges } = game;
  const won = complete(game);
  const index = levels.findIndex(candidate => candidate.id === level.id);
  const counts = totals(level, bridges);
  const matched = counts.filter((count, i) => count === level.islands[i].goal).length;
  const adjacent = neighbors(selected);
  if (!adjacent.includes(neighbor)) neighbor = adjacent[0] ?? -1;
  const edge = edgeIndex(selected, neighbor);
  const count = bridges[edge] ?? 0;

  if (updateBoard) scene?.draw(game, selected, counts, extended);
  $('title').textContent = level.title;
  $('level-number').textContent = random ? tiers[random.difficulty] : `${index + 1} / ${levels.length}`;
  $('moves').textContent = `${matched} / ${level.islands.length}`;
  $('target-label').textContent = `Island ${islandName(selected)} · Goal`;
  $('current-label').textContent = `Island ${islandName(selected)} · Current`;
  $('target-count').textContent = String(level.islands[selected].goal);
  $('current-count').textContent = String(counts[selected]);
  let instruction = 'Tap an island, then a neighbor. 0/2 means 0 built, 2 needed.';
  if (level.id === 'bridge-1' && !game.history.length && !pending) {
    instruction = 'Tap A, then B. Watch A change from 0/1 to 1/1.';
  }
  if (pending) instruction = `Island ${islandName(selected)} selected. Tap a neighboring island.`;
  if (matched === level.islands.length && !won) instruction = 'The numbers match. Join all islands into one group.';
  $('status').textContent = won ? 'All islands are connected and every number matches!' : notice || instruction;
  islandSelect.innerHTML = level.islands.map(({ goal }, i) =>
    `<option value="${i}">From ${islandName(i)} · ${counts[i]}/${goal}</option>`).join('');
  islandSelect.value = String(selected);
  neighborSelect.innerHTML = adjacent.map(i =>
    `<option value="${i}">To ${islandName(i)} · ${counts[i]}/${level.islands[i].goal}</option>`).join('');
  neighborSelect.value = String(neighbor);
  islandSelect.disabled = won;
  neighborSelect.disabled = won;
  $<HTMLButtonElement>('connect').disabled = won || edge < 0;
  $('connect').textContent = count === 2 ? 'Clear pair' : count === 1 ? 'Add second' : 'Add bridge';
  $<HTMLButtonElement>('undo').disabled = game.history.length === 0;
  $('hint').hidden = won;
  $('connect').hidden = won;
  $('next').hidden = !won;
  $('next').textContent = random ? 'New puzzle' : index === levels.length - 1 ? 'Levels' : 'Next';
  $('level-select').innerHTML = (random ? '<option value="" disabled selected>Random crossing</option>' : '') +
    levels.map(item => `<option value="${item.id}" ${item.id === level.id ? 'selected' : ''}>${item.title}${completed.includes(item.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${completed.length} of ${levels.length} levels done.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

function load(level: Level, random?: RandomBridge) {
  saveData = { game: createGame(level), completed: saveData.completed, random };
  selected = 0;
  pending = false;
  notice = '';
  if (menu.open) menu.close();
  draw();
  save();
  $('scene').focus();
}

function newRandom(tier: Difficulty) {
  const random: RandomBridge = { version: 1, seed: randomSeed(), difficulty: tier };
  load(randomLevel(random), random);
}

function change(move: Move) {
  const { game, completed, random } = saveData;
  const previous = game.bridges[move.edge];
  if (!applyMove(game, move)) {
    notice = 'Bridges cannot cross. Clear the other bridge first.';
    scene?.reject(game, move.edge);
    draw(false);
    return;
  }
  const won = complete(game);
  if (won && !random && !completed.includes(game.level.id)) completed.push(game.level.id);
  audio.play(won ? 'win' : 'flag');
  draw(true, move.count > previous ? move.edge : undefined);
  save();
  if (won) {
    scene?.celebrate();
    $('next').focus();
  }
}

function connect() {
  if (menu.open || complete(saveData.game)) return;
  const edge = edgeIndex(selected, neighbor);
  if (edge < 0) return;
  const count = ((saveData.game.bridges[edge] + 1) % 3) as Count;
  pending = false;
  notice = count === 0 ? 'Pair cleared.' : count === 1 ? 'One bridge added.' : 'Second bridge added.';
  change({ edge, count });
}

function tapIsland(island: number) {
  if (menu.open || complete(saveData.game)) return;
  if (pending && edgeIndex(selected, island) >= 0) {
    neighbor = island;
    connect();
    return;
  }
  if (pending && island !== selected) {
    notice = 'Those islands are not neighbors. Tap a neighbor of the newly selected island.';
  } else {
    notice = '';
  }
  selected = island;
  pending = true;
  draw();
}

islandSelect.onchange = () => { selected = Number(islandSelect.value); pending = false; notice = ''; draw(); };
neighborSelect.onchange = () => { neighbor = Number(neighborSelect.value); notice = ''; draw(false); };
$('connect').onclick = connect;
$('undo').onclick = () => {
  if (!undo(saveData.game)) return;
  pending = false;
  notice = 'Last change undone.';
  draw();
  save();
};
$('hint').onclick = () => {
  const move = hint(saveData.game);
  if (!move) return;
  const { a, b } = saveData.game.level.edges[move.edge];
  selected = a;
  neighbor = b;
  pending = false;
  notice = `Hint adjusted the bridges between ${islandName(a)} and ${islandName(b)}.`;
  change(move);
};
$('retry').onclick = () => load(saveData.game.level, saveData.random);
$('next').onclick = () => {
  if (saveData.random) return newRandom(saveData.random.difficulty);
  const next = levels[levels.findIndex(level => level.id === saveData.game.level.id) + 1];
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
    connect();
  }
});
for (const event of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(event, () => audio.unlock(), { capture: true });
}
window.addEventListener('pagehide', save);
draw();
save();
