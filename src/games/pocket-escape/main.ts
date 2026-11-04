import '../water-garden/style.css';
import './style.css';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { isDifficulty, randomSeed } from '../../shared/random-puzzle';
import { digit, randomRoom, rooms, symbols, unlock, type RandomRoom, type Room } from './engine';
import { EscapeScene, places } from './scene';
import { readSave, writeSave, type Save } from './storage';

const key = 'puzzles-pocket-escape-v1';
const audio = new GameAudio();
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const blank = (room: Room, completed: string[], random?: RandomRoom): Save => ({
  room, completed, random, inspected: [], code: room.clues.map(() => ''), won: false,
});
let saved = blank(rooms[0], []);
let notice = '';
try {
  const raw = localStorage.getItem(key);
  const restored = readSave(raw);
  if (restored) saved = restored;
  else if (raw) notice = 'The saved room could not be opened.';
} catch { /* Play is available without storage. */ }

document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Pocket Escape</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved.</p>
  <div class="stats escape-stats">
    <div><strong id="clue-count"></strong><span>Clues found</span></div>
    <button id="show-help" aria-haspopup="dialog">See example</button>
  </div>
  <section class="play-area" aria-label="Escape room">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="3D room"></div>
  </section>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div id="clue-buttons" class="clue-buttons" role="group" aria-label="Inspect a clue"></div>
  <div class="code-area"><strong>Door code</strong><div id="code" class="door-code" role="group" aria-label="Door code"></div></div>
  <div class="actions">
    <button id="hint">Hint</button><button id="retry">Retry</button>
    <button id="unlock" class="primary">Unlock</button><button id="next" class="primary" hidden>Next</button>
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
<dialog id="clue" class="sheet" aria-labelledby="clue-title">
  <div class="sheet-heading"><h2 id="clue-title"></h2><button id="close-clue">Done</button></div>
  <div id="clue-body" class="sheet-body"></div>
</dialog>
<dialog id="example" class="sheet" aria-labelledby="example-title">
  <div class="sheet-heading"><h2 id="example-title">How to open the door</h2><button id="close-example">Done</button></div>
  <div class="sheet-body">${gameGuide([
    { before: '● ★ ● ◆ ●', after: '① 3', text: 'Clue 1 asks how many circles there are. Count three circles for the first digit.' },
    { before: '② 1 3 ?', after: '② 5', text: 'The numbers go up by 2. The next number is 5.' },
    { before: '① 3  ② 5', after: '🔓', text: 'Enter the digits in clue order and press Unlock.' },
  ], true)}</div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
const clueDialog = $<HTMLDialogElement>('clue');
const example = $<HTMLDialogElement>('example');
const difficulty = $<HTMLSelectElement>('difficulty');
difficulty.value = saved.random?.difficulty ?? 'easy';

let scene: EscapeScene | undefined;
try {
  scene = new EscapeScene($('scene'), inspect);
} catch {
  $('scene').textContent = 'Use the numbered clue buttons below to inspect the room.';
}

function save() {
  try {
    localStorage.setItem(key, writeSave(saved));
    $('storage-warning').hidden = true;
    $('save-state').textContent = 'Progress saved on this device.';
  } catch {
    $('storage-warning').hidden = false;
    $('save-state').textContent = 'Saving unavailable.';
  }
}

function draw() {
  const { room, random, inspected, won, completed } = saved;
  const index = rooms.findIndex(level => level.id === room.id);
  $('title').textContent = room.title;
  $('level-number').textContent = random
    ? random.difficulty[0].toUpperCase() + random.difficulty.slice(1)
    : `${index + 1} / ${rooms.length}`;
  $('clue-count').textContent = `${inspected.length} / ${room.clues.length}`;
  $('status').textContent = won ? 'Door unlocked!' : notice || 'Read the numbered clues. Enter their digits to unlock the door.';
  $('clue-buttons').innerHTML = room.clues.map((_, i) =>
    `<button data-clue="${i}">${i + 1}. ${places[i]}${inspected.includes(i) ? ' ✓' : ''}</button>`).join('');
  $('code').querySelectorAll('input').forEach((input, i) => {
    input.value = saved.code[i];
    input.disabled = won;
  });
  $('unlock').hidden = won;
  $('next').hidden = !won;
  $('hint').hidden = won;
  $('level-select').innerHTML = (random ? '<option value="" selected>Random room</option>' : '') +
    rooms.map(level => `<option value="${level.id}" ${level.id === room.id ? 'selected' : ''}>${level.title}${completed.includes(level.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${completed.length} of ${rooms.length} rooms unlocked.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

function buildCode() {
  $('code').innerHTML = saved.code.map((_, i) =>
    `<input type="text" inputmode="numeric" maxlength="1" aria-label="Digit ${i + 1}">`).join('');
}

function inspect(index: number) {
  if (menu.open || example.open || clueDialog.open) return;
  const clue = saved.room.clues[index];
  if (!clue) return;
  if (!saved.inspected.includes(index)) saved.inspected.push(index);
  const title = `Clue ${index + 1} · ${places[index]}`;
  $('clue-title').textContent = title;
  if (clue.kind === 'count' || clue.kind === 'order') {
    $('clue-body').innerHTML = `<div class="clue-tiles">${clue.symbols.map(symbol =>
      `<span role="img" aria-label="${symbol}">${symbols[symbol]}</span>`).join('')}</div>
      <p>${clue.kind === 'count' ? `How many ${clue.find}s are there?` : `From the left, what position is the ${clue.find} in? Count from 1.`}</p>`;
  } else if (clue.kind === 'sequence') {
    $('clue-body').innerHTML = `<div class="clue-tiles"><span>${clue.start}</span><span>${clue.start + clue.step}</span><span>?</span></div>
      <p>The numbers change by the same amount each time. What comes next?</p>`;
  } else if (clue.kind === 'sum') {
    $('clue-body').innerHTML = `<div class="clue-tiles"><span>Clue ${clue.first + 1}</span> + <span>Clue ${clue.second + 1}</span></div>
      <p>Add the two digits you found in those clues.</p>`;
  }
  draw();
  scene?.draw(saved.room, saved.inspected, saved.won);
  save();
  clueDialog.dataset.index = String(index);
  clueDialog.showModal();
}

function load(room: Room, random?: RandomRoom) {
  saved = blank(room, saved.completed, random);
  notice = '';
  if (menu.open) menu.close();
  buildCode();
  draw();
  scene?.draw(room, [], false);
  save();
}

function newRandom() {
  if (!isDifficulty(difficulty.value)) return;
  const random: RandomRoom = { version: 1, seed: randomSeed(), difficulty: difficulty.value };
  load(randomRoom(random), random);
}

$('code').addEventListener('input', event => {
  if (!(event.target instanceof HTMLInputElement) || saved.won) return;
  const inputs = [...Array.from($('code').querySelectorAll('input'))];
  const index = inputs.indexOf(event.target);
  const value = event.target.value.replace(/[^0-9]/g, '').slice(0, 1);
  saved.code[index] = value;
  event.target.value = value;
  if (value) inputs[index + 1]?.focus();
  save();
});
$('code').addEventListener('keydown', event => {
  if (event.key === 'Enter') $('unlock').click();
});
$('clue-buttons').onclick = event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-clue]');
  if (button) inspect(Number(button.dataset.clue));
};
$('unlock').onclick = () => {
  if (saved.won) return;
  if (saved.inspected.length !== saved.room.clues.length) notice = 'Read every clue before trying the lock.';
  else if (!saved.code.every(Boolean)) notice = 'Enter one digit for each clue.';
  else if (!unlock(saved.room, saved.inspected, saved.code)) notice = 'The code does not match. Check the clues in number order.';
  else {
    saved.won = true;
    if (!saved.random && !saved.completed.includes(saved.room.id)) saved.completed.push(saved.room.id);
    audio.play('win');
    scene?.open();
  }
  draw();
  save();
  if (saved.won) $('next').focus();
};
$('hint').onclick = () => {
  const index = saved.code.findIndex((value, i) => value !== String(digit(saved.room, i)));
  if (index < 0) {
    const unread = saved.room.clues.findIndex((_, i) => !saved.inspected.includes(i));
    if (unread >= 0) inspect(unread);
    else { notice = 'The code is ready. Press Unlock.'; draw(); }
    return;
  }
  if (!saved.inspected.includes(index)) { inspect(index); return; }
  saved.code[index] = String(digit(saved.room, index));
  notice = `Hint filled digit ${index + 1}.`;
  draw();
  save();
};
$('retry').onclick = () => load(saved.room, saved.random);
$('next').onclick = () => {
  if (saved.random) return newRandom();
  const next = rooms[rooms.findIndex(room => room.id === saved.room.id) + 1];
  if (next) load(next);
  else menu.showModal();
};
$('new-random').onclick = newRandom;
$<HTMLSelectElement>('level-select').onchange = event => {
  const next = rooms.find(room => room.id === (event.target as HTMLSelectElement).value);
  if (next) load(next);
};
$('open-menu').onclick = () => menu.showModal();
$('close-menu').onclick = () => menu.close();
$('close-clue').onclick = () => clueDialog.close();
clueDialog.addEventListener('close', () => {
  $('code').querySelectorAll('input')[Number(clueDialog.dataset.index)]?.focus();
});
$('show-help').onclick = () => example.showModal();
$('close-example').onclick = () => example.close();
$('sound').onclick = () => { audio.setEnabled(!audio.enabled); draw(); };
for (const event of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(event, () => audio.unlock(), { capture: true });
}
buildCode();
draw();
scene?.draw(saved.room, saved.inspected, saved.won);
save();
