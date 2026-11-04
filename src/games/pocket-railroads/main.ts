import '../water-garden/style.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { isDifficulty, randomSeed, type Difficulty } from '../../shared/random-puzzle';
import { applyMove, complete, createGame, hint, trace, undo, type Level } from './engine';
import { generateRailroad, levels, type RandomRailroad } from './levels';
import { RailScene, stations } from './scene';
import { readSave, writeSave } from './storage';

const key = 'puzzles-pocket-railroads-v1';
const audio = new GameAudio('pocket-railroads');
const tierNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
let game = createGame(levels[0]);
let completed: string[] = [];
let random: RandomRailroad | undefined;
let selected = 0;
let notice = '';
let moving = false;

try {
  const raw = localStorage.getItem(key);
  const saved = readSave(raw);
  if (saved) ({ game, completed, random } = saved);
  else if (raw) notice = 'The previous save could not be opened.';
} catch {
  // Play is still available when storage is blocked.
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Pocket Railroads</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved. Keep this tab open.</p>
  <div class="stats rail-stats">
    <div><strong id="moves"></strong><span>Trains sent</span></div>
    <button id="show-help" aria-haspopup="dialog">See example</button>
  </div>
  <section class="play-area" aria-label="Rail puzzle">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="3D railway. Tap a switch to change its branch or tap the train to send it."></div>
  </section>
  <div class="route-cards">
    <div><span>Train’s station</span><strong id="target-station"></strong></div>
    <div><span>Your route ends at</span><strong id="route-station"></strong></div>
  </div>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="channel-controls">
    <label class="car-choice"><span class="sr-only">Choose a switch</span><select id="switch-select" aria-label="Choose a switch"></select></label>
    <button id="turn">Flip switch</button>
  </div>
  <div class="actions">
    <button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Retry</button>
    <button id="send" class="primary">Send train</button><button id="next" class="primary" hidden>Next</button>
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
      { before: '🚂 B', after: 'B', text: 'Send each train to the station with the same letter.' },
      { before: '⑴ ↗ A', after: '⑴ ↘ B', text: 'Tap a numbered switch or choose it and press Flip switch. The gold line shows the route.' },
      { before: '🚂 B → A', after: '🚂 B → B', text: 'Tap the train or press Send train. A train sent to the wrong station returns to the yard.' },
      { before: '↺', after: '▧', text: 'Choose Rotate and drag to turn the board.' },
    ])}
    <button id="sound" class="menu-row" aria-pressed="true">Sound: on</button>
    <p id="save-state" class="muted"></p>
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
const difficulty = $<HTMLSelectElement>('random-difficulty');
const switchSelect = $<HTMLSelectElement>('switch-select');
difficulty.value = random?.difficulty ?? 'easy';
let scene: RailScene | undefined;
try {
  scene = new RailScene($('scene'), owner => {
    if (owner === 'send') send();
    else flip(Number(owner));
  });
} catch {
  $('scene').textContent = '3D is unavailable. Use the switch and train buttons below.';
}

function save() {
  let saving = true;
  try { localStorage.setItem(key, writeSave(game, completed, random)); }
  catch { saving = false; }
  $('storage-warning').hidden = saving;
  $('save-state').textContent = saving ? 'Progress saved on this device.' : 'Saving unavailable.';
}

function stationLabel(id: number) {
  const station = stations[id];
  return `<i style="background:${station.color}" aria-hidden="true"></i>Station ${station.name}`;
}

function draw(updateBoard = true) {
  const won = complete(game);
  const index = levels.findIndex(level => level.id === game.level.id);
  const target = game.level.trains[game.delivered];
  const end = trace(game).station;
  if (updateBoard) scene?.draw(game, selected);
  $('title').textContent = game.level.title;
  $('level-number').textContent = random ? tierNames[random.difficulty] : `${index + 1} / ${levels.length}`;
  $('moves').textContent = `${game.delivered} / ${game.level.trains.length}`;
  $('target-station').innerHTML = won ? 'All trains sent' : stationLabel(target);
  $('route-station').innerHTML = stationLabel(end);
  const instruction = end === target ? 'The route matches. Send the train.'
    : game.level.id === levels[0].id ? 'Tap switch 1 to change the route.'
    : 'Flip a switch to match the train’s station.';
  $('status').textContent = won ? 'All trains reached their stations!' : notice || instruction;
  switchSelect.innerHTML = game.switches.map((lower, i) =>
    `<option value="${i}">Switch ${i + 1} · Branch ${lower ? 2 : 1}</option>`).join('');
  switchSelect.value = String(selected);
  switchSelect.disabled = won || moving;
  $<HTMLButtonElement>('turn').disabled = won || moving;
  $<HTMLButtonElement>('undo').disabled = moving || game.history.length === 0;
  for (const id of ['retry', 'hint', 'open-menu', 'show-help', 'send']) {
    $<HTMLButtonElement>(id).disabled = moving;
  }
  $('hint').hidden = won;
  $('send').hidden = won;
  $('send').textContent = moving ? 'On track…' : 'Send train';
  $('next').hidden = !won;
  $('next').textContent = random ? 'New puzzle' : index === levels.length - 1 ? 'Levels' : 'Next';
  $('level-select').innerHTML = (random ? '<option value="" disabled selected>Random yard</option>' : '') +
    levels.map(level => `<option value="${level.id}" ${level.id === game.level.id ? 'selected' : ''}>${level.title}${completed.includes(level.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${completed.length} of ${levels.length} levels done.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

function load(level: Level, spec?: RandomRailroad) {
  game = createGame(level);
  random = spec;
  selected = 0;
  notice = '';
  if (menu.open) menu.close();
  draw();
  save();
  $('scene').focus();
}

function newRandom(tier: Difficulty) {
  const spec: RandomRailroad = { version: 1, seed: randomSeed(), difficulty: tier };
  load(generateRailroad(spec), spec);
}

function flip(index: number) {
  if (moving || menu.open || !applyMove(game, index)) return;
  selected = index;
  notice = '';
  audio.play('flag');
  draw();
  save();
}

function send() {
  if (moving || menu.open || complete(game)) return;
  const route = trace(game);
  moving = true;
  notice = 'The train is on its way.';
  audio.play('reveal');
  draw(false);
  const finish = () => {
    moving = false;
    if (applyMove(game, 'send')) {
      notice = complete(game) ? '' : `Train delivered to Station ${stations[route.station].name}. Set the route for the next train.`;
      if (complete(game) && !random && !completed.includes(game.level.id)) completed.push(game.level.id);
      audio.play('win');
    } else {
      notice = `The train reached Station ${stations[route.station].name} and returned to the yard. Flip a switch and try again.`;
    }
    draw();
    save();
    $(complete(game) ? 'next' : 'send').focus();
  };
  if (scene) scene.send(route.points, route.station === game.level.trains[game.delivered], finish);
  else finish();
}

switchSelect.onchange = () => { selected = Number(switchSelect.value); draw(); };
$('turn').onclick = () => flip(selected);
$('send').onclick = send;
$('undo').onclick = () => { if (!moving && undo(game)) { notice = ''; draw(); save(); } };
$('hint').onclick = () => {
  const move = hint(game);
  if (move === 'send') {
    notice = 'The route matches. Send the train.';
    draw(false);
  } else if (move !== undefined) {
    flip(move);
    notice = `Hint flipped switch ${move + 1}.`;
    draw(false);
  }
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
$('sound').onclick = () => {
  audio.setEnabled(!audio.enabled);
  if (audio.enabled) audio.play('flag');
  draw(false);
};
$('scene').addEventListener('keydown', event => {
  if (event.target !== $('scene') || $('scene').dataset.cameraMode === 'rotate') return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    flip(selected);
  }
});
for (const event of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(event, () => audio.unlock(), { capture: true });
}
window.addEventListener('pagehide', save);
draw();
save();
