import '../water-garden/style.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { isDifficulty, randomSeed, type Difficulty } from '../../shared/random-puzzle';
import { directions, isDirection, maxCommands, run, seedCount, solve, startPosition, type Direction } from './engine';
import { levels, randomLevel } from './levels';
import { RobotScene } from './scene';
import { readSave, writeSave, type Save } from './storage';

const key = 'puzzles-robot-garden-v1';
const audio = new GameAudio('robot-garden');
const names = { n: 'North', e: 'East', s: 'South', w: 'West' };
const arrows = { n: '↑', e: '→', s: '↓', w: '←' };
const tiers = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
let saved: Save = { level: levels[0], commands: [], won: false, completed: [] };
let notice = '';
let moving = false;
let step = 0;

try {
  const raw = localStorage.getItem(key);
  const restored = readSave(raw);
  if (restored) saved = restored;
  else if (raw) notice = 'The previous save could not be opened.';
} catch {
  // Play is still available when storage is blocked.
}

let position = saved.won ? run(saved.level, saved.commands).position : startPosition(saved.level);
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Robot Garden</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved. Keep this tab open.</p>
  <p class="robot-goal">Collect every seed, then stop on the blue dock marked D.</p>
  <div class="stats robot-stats">
    <div><strong id="seed-count"></strong><span>Seeds collected</span></div>
    <button id="show-help" aria-haspopup="dialog">See example</button>
  </div>
  <section class="play-area" aria-label="Robot puzzle">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="Robot garden board. Use arrow commands to plan a route."></div>
  </section>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="robot-plan">
    <strong>Your steps</strong>
    <ol id="program" aria-label="Queued steps"></ol>
  </div>
  <div class="command-controls" role="group" aria-label="Add a step">
    ${directions.map(direction => `<button id="command-${direction}" aria-label="Add ${names[direction]} step"><span aria-hidden="true"></span>${names[direction]}</button>`).join('')}
  </div>
  <div class="actions">
    <button id="undo">Undo</button><button id="hint">Hint</button><button id="clear">Clear</button>
    <button id="run" class="primary">Run</button><button id="next" class="primary" hidden>Next</button>
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
  <div class="sheet-heading"><h2 id="example-title">How to guide the robot</h2><button id="close-example">Done</button></div>
  <div class="sheet-body">
    <p>Collect every gold seed. End on the blue dock marked <strong>D</strong>.</p>
    ${gameGuide([
      { before: '<span class="example-board"><i></i><i class="example-dock">D</i><i>🤖</i><i>◆</i></span>',
        after: '<span class="example-board"><i></i><i class="example-dock">🤖</i><i></i><i></i></span>',
        text: 'In this map, queue East to collect the seed, then North to reach D. Press Run.' },
      { before: '🤖 → ▧', after: '↶', text: 'A rock or an edge stops the robot. Edit your steps and run again from the start.' },
      { before: '↺', after: '▧', text: 'Drag with two fingers to rotate. With a mouse, choose Rotate and drag. The arrows turn with the board. The N, E, S and W labels stay on their edges.' },
    ], true)}
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
const example = $<HTMLDialogElement>('example');
const difficulty = $<HTMLSelectElement>('random-difficulty');
difficulty.value = saved.random?.difficulty ?? 'easy';

let scene: RobotScene | undefined;
try {
  scene = new RobotScene($('scene'));
} catch {
  $('scene').textContent = '3D is unavailable. Use the arrow buttons and read the run result below.';
}

function save() {
  let saving = true;
  try { localStorage.setItem(key, writeSave(saved)); }
  catch { saving = false; }
  $('storage-warning').hidden = saving;
  $('save-state').textContent = saving ? 'Progress saved on this device.' : 'Saving unavailable. Keep this tab open.';
}

function drawProgram() {
  const program = $('program');
  program.innerHTML = saved.commands.length
    ? saved.commands.map((direction, i) =>
      `<li${moving && step === i ? ' class="active" aria-current="step"' : ''}><span aria-hidden="true">${scene?.arrow(direction) ?? arrows[direction]}</span><span class="sr-only">${names[direction]}</span></li>`).join('')
    : '<li class="program-empty">Tap an arrow below.</li>';
  const active = program.querySelector<HTMLElement>('.active');
  if (active) program.scrollLeft = Math.max(0, active.offsetLeft + active.offsetWidth - program.clientWidth);
}

function draw(updateBoard = true) {
  if (updateBoard) scene?.draw(saved.level, position);
  const index = levels.findIndex(level => level.id === saved.level.id);
  $('title').textContent = saved.level.title;
  $('level-number').textContent = saved.random ? tiers[saved.random.difficulty] : `${index + 1} / ${levels.length}`;
  $('seed-count').textContent = `${seedCount(saved.level, position)} / ${saved.level.seeds.length}`;
  const instruction = saved.level.id === levels[0].id
    ? 'Queue East, then North. Press Run.'
    : 'Queue steps to the seeds, then to the dock.';
  $('status').textContent = saved.won ? 'All seeds collected. Robot docked!' : notice || instruction;
  for (const direction of directions) {
    const button = $<HTMLButtonElement>(`command-${direction}`);
    button.disabled = moving || saved.won || saved.commands.length >= maxCommands;
    button.querySelector('span')!.textContent = scene?.arrow(direction) ?? arrows[direction];
  }
  drawProgram();
  for (const id of ['undo', 'clear']) $<HTMLButtonElement>(id).disabled = moving || saved.commands.length === 0;
  for (const id of ['hint', 'open-menu', 'show-help']) $<HTMLButtonElement>(id).disabled = moving;
  $('hint').hidden = saved.won;
  $('run').hidden = saved.won;
  $<HTMLButtonElement>('run').disabled = moving || saved.commands.length === 0;
  $('run').textContent = moving ? 'Running…' : 'Run';
  $('next').hidden = !saved.won;
  $('next').textContent = saved.random ? 'New puzzle' : index === levels.length - 1 ? 'Levels' : 'Next';
  $('level-select').innerHTML = (saved.random ? '<option value="" disabled selected>Random garden</option>' : '') +
    levels.map(level => `<option value="${level.id}" ${level.id === saved.level.id ? 'selected' : ''}>${level.title}${saved.completed.includes(level.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${saved.completed.length} of ${levels.length} levels done.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

function edit(commands: Direction[], message = '', newLevel = false) {
  const resetBoard = newLevel || position.cell !== saved.level.start || position.picked !== 0;
  saved.commands = commands;
  saved.won = false;
  position = startPosition(saved.level);
  notice = message;
  draw(resetBoard);
  save();
  $('program').scrollLeft = $('program').scrollWidth;
}

function add(direction: Direction) {
  if (moving || saved.won || saved.commands.length >= maxCommands) return;
  edit([...saved.commands, direction]);
}

function load(level: Save['level'], random?: Save['random']) {
  saved.level = level;
  saved.random = random;
  if (menu.open) menu.close();
  edit([], '', true);
  $('scene').focus();
}

function newRandom(tier: Difficulty) {
  const spec = { version: 1, seed: randomSeed(), difficulty: tier } as const;
  load(randomLevel(spec), spec);
}

function startRun() {
  if (moving || saved.won || !saved.commands.length) return;
  const result = run(saved.level, saved.commands);
  moving = true;
  step = 0;
  position = startPosition(saved.level);
  notice = 'The robot is following your steps.';
  audio.play('reveal');
  draw(false);
  const finish = () => {
    moving = false;
    position = result.position;
    saved.won = result.won;
    if (result.won) {
      if (!saved.random && !saved.completed.includes(saved.level.id)) saved.completed.push(saved.level.id);
      audio.play('win');
    }
    if (result.blocked) {
      notice = `Step ${result.path.length} is blocked. Change your steps and run again.`;
      audio.play('loss');
    }
    else if (position.cell !== saved.level.dock) notice = 'The robot must finish on the blue dock marked D.';
    else if (!result.won) notice = 'The robot reached the dock. Collect every seed first.';
    draw(false);
    save();
    $(saved.won ? 'next' : 'run').focus();
  };
  if (scene) scene.play(result.path, (current, index) => {
    step = index;
    position = current;
    $('seed-count').textContent = `${seedCount(saved.level, current)} / ${saved.level.seeds.length}`;
    drawProgram();
  }, finish, result.won, result.blocked ? saved.commands[result.path.length - 1] : undefined);
  else finish();
}

for (const direction of directions) $(`command-${direction}`).onclick = () => add(direction);
$('run').onclick = startRun;
$('clear').onclick = () => { if (!moving) edit([]); };
$('undo').onclick = () => { if (!moving) edit(saved.commands.slice(0, -1)); };
$('hint').onclick = () => {
  const result = run(saved.level, saved.commands);
  if (result.blocked) {
    notice = `Step ${result.path.length} is blocked. Undo that step and any after it.`;
    draw(false);
    return;
  }
  const route = solve(saved.level, result.position);
  if (result.won) notice = 'Your steps reach the goal. Press Run.';
  else if (route?.length && saved.commands.length + route.length <= maxCommands) {
    edit([...saved.commands, route[0]], `Hint added ${names[route[0]]}.`);
    return;
  } else notice = 'Undo a few steps or clear the plan to try a shorter route.';
  draw(false);
};
$('next').onclick = () => {
  if (saved.random) return newRandom(saved.random.difficulty);
  const index = levels.findIndex(level => level.id === saved.level.id);
  const next = levels[index + 1];
  if (next) load(next);
  else menu.showModal();
};
$('new-random').onclick = () => { if (isDifficulty(difficulty.value)) newRandom(difficulty.value); };
$<HTMLSelectElement>('level-select').onchange = event => {
  const level = levels.find(candidate => candidate.id === (event.target as HTMLSelectElement).value);
  if (level) load(level);
};
$('open-menu').onclick = () => menu.showModal();
$('close-menu').onclick = () => menu.close();
$('show-help').onclick = () => example.showModal();
$('close-example').onclick = () => example.close();
$('sound').onclick = () => { audio.setEnabled(!audio.enabled); draw(false); };

$('scene').addEventListener('camerachange', () => {
  for (const direction of directions) {
    $(`command-${direction}`).querySelector('span')!.textContent = scene?.arrow(direction) ?? arrows[direction];
  }
  drawProgram();
});
$('scene').addEventListener('keydown', event => {
  if ($('scene').dataset.cameraMode === 'rotate' || event.target !== $('scene')) return;
  const keys: Record<string, Direction> = { ArrowUp: 'n', ArrowRight: 'e', ArrowDown: 's', ArrowLeft: 'w' };
  const direction = keys[event.key];
  if (isDirection(direction)) {
    event.preventDefault();
    add(direction);
  }
});
for (const event of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(event, () => audio.unlock(), { capture: true });
}
window.addEventListener('pagehide', save);
draw();
save();
