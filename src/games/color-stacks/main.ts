import '../water-garden/style.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { isDifficulty, randomSeed, type Difficulty } from '../../shared/random-puzzle';
import { applyMove, canMove, complete, createGame, solve, sorted, undo, type Level, type Move } from './engine';
import { levels, randomLevel, type RandomStacks } from './levels';
import { palette, StackScene, stackName } from './scene';
import { readSave, writeSave, type Save } from './storage';

const key = 'puzzles-color-stacks-v1';
const audio = new GameAudio();
const tierNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
let data: Save = { game: createGame(levels[0]), completed: [] };
let from = 0;
let to = 2;
let pending = false;
let notice = '';

try {
  const raw = localStorage.getItem(key);
  const saved = readSave(raw);
  if (saved) data = saved;
  else if (raw) notice = 'The previous save could not be opened.';
} catch {
  // Play remains available when storage is blocked.
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
function miniStack(colors: number[]) {
  return `<span class="mini-stack">${colors.map(color =>
    `<i style="--paint:${palette[color].paint}">${palette[color].mark}</i>`).join('')}</span>`;
}
document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Color Stacks</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved. Keep this tab open.</p>
  <div class="stats stack-stats">
    <div><strong id="moves"></strong><span>Colors sorted</span></div>
    <button id="show-help" aria-haspopup="dialog">See example</button>
  </div>
  <section class="play-area" aria-label="Block sorting puzzle">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="3D stacks. Tap a stack, then its destination."></div>
  </section>
  <section class="stack-comparison" aria-label="Sorting goal and current stacks">
    <div><strong>Goal</strong><div id="goal-stacks" class="stack-map"></div></div>
    <div><strong>Your stacks</strong><div id="current-stacks" class="stack-map"></div></div>
  </section>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="stack-controls">
    <label class="car-choice"><span class="sr-only">From stack</span><select id="stack-select" aria-label="From stack"></select></label>
    <label class="car-choice"><span class="sr-only">To stack</span><select id="target-select" aria-label="To stack"></select></label>
  </div>
  <div class="actions">
    <button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Retry</button>
    <button id="move" class="primary">Move</button><button id="next" class="primary" hidden>Next</button>
  </div>
</main>
<dialog id="menu" class="sheet" aria-labelledby="menu-title">
  <div class="sheet-heading"><h2 id="menu-title">Menu</h2><button id="close-menu">Done</button></div>
  <div class="sheet-body">
    <label>Levels<select id="level-select"></select></label>
    <label>Random difficulty<select id="random-difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
    <div class="menu-pair"><button id="new-random">New random puzzle</button></div>
    <p id="progress" class="muted"></p>
    <p>Fill one stack for each color. Move the top block onto an empty stack or onto a block of the same color.</p>
    ${gameGuide([
      { before: miniStack([0, 1]) + miniStack([]), after: miniStack([0]) + miniStack([1]),
        text: 'Tap the mixed stack, then the empty space. Only the top blue block moves.' },
      { before: miniStack([0, 1]) + miniStack([1]), after: miniStack([0]) + miniStack([1, 1]),
        text: 'You can also move blue onto blue if there is space.' },
      { before: '↺', after: '▧', text: 'Choose Rotate and drag to look around. Choose Play to move blocks.' },
    ])}
    <button id="sound" class="menu-row" aria-pressed="true">Sound: on</button>
    <p id="save-state" class="muted"></p>
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
const difficulty = $<HTMLSelectElement>('random-difficulty');
const sourceSelect = $<HTMLSelectElement>('stack-select');
const targetSelect = $<HTMLSelectElement>('target-select');
difficulty.value = data.random?.difficulty ?? 'easy';

let scene: StackScene | undefined;
try {
  scene = new StackScene($('scene'), tapStack);
} catch {
  $('scene').textContent = '3D is unavailable. Use the stack lists and Move to play.';
}

function save() {
  let saving = true;
  try { localStorage.setItem(key, writeSave(data)); }
  catch { saving = false; }
  $('storage-warning').hidden = saving;
  $('save-state').textContent = saving ? 'Progress saved on this device.' : 'Saving unavailable.';
}

function names(stack: number[]) {
  return stack.length ? stack.map(color => palette[color].name).join(', ') : 'Empty';
}

function stackMap(stacks: number[][], current: boolean) {
  return stacks.map((stack, index) => {
    const name = current ? stackName(index) : palette[stack[0]].mark;
    const done = current && sorted(stack, data.game.level.capacity);
    const summary = current ? `Stack ${name}. From bottom to top, ${names(stack)}${done ? '. Sorted.' : ''}` : names(stack);
    return `<div class="map-column${current && index === from ? ' source' : ''}${done ? ' sorted' : ''}" role="img" aria-label="${summary}">
      ${miniStack(stack)}<small aria-hidden="true">${name}</small>
    </div>`;
  }).join('');
}

function resetSelection() {
  const { game } = data;
  const opening = game.level.id === levels[0].id ? solve(game)?.[0] : undefined;
  from = opening?.from ?? game.stacks.findIndex(stack => stack.length > 0);
  to = opening?.to ?? game.stacks.findIndex((_, index) => canMove(game, { from, to: index }));
  if (to < 0) to = from === 0 ? 1 : 0;
}

function draw(updateBoard = true, move?: Move) {
  const { game, completed, random } = data;
  const { level, stacks } = game;
  const won = complete(game);
  const levelIndex = levels.findIndex(item => item.id === level.id);
  const colors = [...new Set(level.stacks.flat())].sort((a, b) => a - b);
  const count = stacks.filter(stack => sorted(stack, level.capacity)).length;
  if (updateBoard) scene?.draw(game, from, move);
  $('title').textContent = level.title;
  $('level-number').textContent = random ? tierNames[random.difficulty] : `${levelIndex + 1} / ${levels.length}`;
  $('moves').textContent = `${count} / ${colors.length}`;
  let instruction = 'Move top blocks to sort each color into one stack.';
  const tutorial = level.id === levels[0].id && !won ? solve(game)?.[0] : undefined;
  if (tutorial) {
    const name = palette[stacks[tutorial.from].at(-1)!].name.toLowerCase();
    instruction = `Move the top ${name} block from ${stackName(tutorial.from)} to ${stackName(tutorial.to)}.`;
  }
  $('status').textContent = won ? 'Every color has its own stack!' : notice || instruction;
  $('goal-stacks').innerHTML = stackMap(colors.map(color => Array(level.capacity).fill(color)), false);
  $('current-stacks').innerHTML = stackMap(stacks, true);

  sourceSelect.innerHTML = stacks.map((stack, index) =>
    `<option value="${index}">From ${stackName(index)} · ${names(stack)}</option>`).join('');
  targetSelect.innerHTML = stacks.map((stack, index) =>
    `<option value="${index}">To ${stackName(index)} · ${names(stack)}</option>`).join('');
  sourceSelect.value = String(from);
  targetSelect.value = String(to);
  sourceSelect.disabled = won;
  targetSelect.disabled = won;
  $<HTMLButtonElement>('move').disabled = won || !canMove(game, { from, to });
  $<HTMLButtonElement>('undo').disabled = game.history.length === 0;
  $('hint').hidden = won;
  $('move').hidden = won;
  $('next').hidden = !won;
  $('next').textContent = random ? 'New puzzle' : levelIndex === levels.length - 1 ? 'Levels' : 'Next';
  $('level-select').innerHTML = (random ? '<option value="" disabled selected>Random stacks</option>' : '') +
    levels.map(item => `<option value="${item.id}" ${item.id === level.id ? 'selected' : ''}>${item.title}${completed.includes(item.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${completed.length} of ${levels.length} levels done.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

function load(level: Level, random?: RandomStacks) {
  data = { game: createGame(level), completed: data.completed, random };
  pending = false;
  notice = '';
  resetSelection();
  if (menu.open) menu.close();
  draw();
  save();
  $('scene').focus();
}

function newRandom(tier: Difficulty) {
  const random: RandomStacks = { version: 1, seed: randomSeed(), difficulty: tier };
  load(randomLevel(random), random);
}

function change(move: Move) {
  const { game, completed, random } = data;
  if (menu.open || complete(game)) return;
  if (!applyMove(game, move)) {
    notice = 'Move a top block to an empty stack or a matching color with room.';
    draw(false);
    return;
  }
  pending = false;
  notice = '';
  resetSelection();
  const won = complete(game);
  if (won && !random && !completed.includes(game.level.id)) completed.push(game.level.id);
  audio.play(won ? 'win' : 'flag');
  draw(true, move);
  save();
  if (won) $('next').focus();
}

function tapStack(index: number) {
  if (menu.open || complete(data.game)) return;
  if (pending && index !== from) {
    to = index;
    if (canMove(data.game, { from, to })) {
      change({ from, to });
      return;
    }
    notice = `Stack ${stackName(to)} cannot take that block. Tap another stack or tap the source again.`;
    draw(false);
    return;
  }
  pending = !pending && data.game.stacks[index].length > 0;
  from = index;
  notice = pending ? `Stack ${stackName(index)} selected. Tap an empty stack or one with the same top color.` : '';
  draw();
}

sourceSelect.onchange = () => { from = Number(sourceSelect.value); pending = false; notice = ''; draw(); };
targetSelect.onchange = () => { to = Number(targetSelect.value); notice = ''; draw(false); };
$('move').onclick = () => change({ from, to });
$('undo').onclick = () => {
  if (!undo(data.game)) return;
  pending = false;
  notice = '';
  resetSelection();
  draw();
  save();
};
$('hint').onclick = () => {
  const move = solve(data.game)?.[0];
  if (move) change(move);
  else {
    notice = 'No route found. Undo a move or try the puzzle again.';
    draw(false);
  }
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
    change({ from, to });
  }
});
for (const event of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(event, () => audio.unlock(), { capture: true });
}
window.addEventListener('pagehide', save);
resetSelection();
draw();
save();
