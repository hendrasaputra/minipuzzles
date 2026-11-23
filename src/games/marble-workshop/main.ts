import '../../shared/game-base.css';
import './style.css';
import { cameraOther, cameraStep, gameGuide, showGuideOnFirstVisit } from '../../shared/game-guide';
import { createGame, rotate, undo, solve, trace, run, trackPorts, type Level } from './engine';
import { levels } from './levels';
import { generateWorkshop, type RandomWorkshop } from './random';
import { MarbleScene } from './scene';
import { readSave, writeSave } from './storage';
import { GameAudio } from '../../shared/audio';
import { addMusic } from '../../shared/ambient';
import { PlayTracker } from '../../shared/play-tracking';
import { isDifficulty, randomSeed, type Difficulty } from '../../shared/random-puzzle';

const key = 'puzzles-marble-workshop-v1';
const audio = new GameAudio('marble-workshop');
const play = new PlayTracker('marble-workshop');
const levelName = () => random ? random.difficulty : `${String(levels.findIndex(level => level.id === game.level.id) + 1).padStart(2, '0')}-${game.level.id}`;
const difficultyNames = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };
const directionNames = { n: 'north', e: 'east', s: 'south', w: 'west' };
let game = createGame(levels[0]);
let selected = game.tracks[0].id;
let completed: string[] = [];
let random: RandomWorkshop | undefined;
let notice = '';
let rolling = false;
let saving = true;

try {
  const raw = localStorage.getItem(key);
  const saved = readSave(raw);
  if (saved) ({ game, selected, completed, random } = saved);
  else if (raw) notice = 'The previous save could not be restored.';
} catch {
  saving = false;
}

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
document.querySelector('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand">Marble Workshop</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div>
  <p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved. Keep this tab open.</p>
  <div class="stats"><div><strong id="moves">0</strong><span>Turns</span></div></div>
  <section class="play-area" aria-label="Marble puzzle">
    <div id="scene" class="scene" tabindex="0" role="group" aria-label="3D marble run. Tap a track to turn it. Tap the marble or press Roll to test your route."></div>
  </section>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="channel-controls touch-optional">
    <label class="car-choice"><span class="sr-only">Choose a track</span><select id="track-select" aria-label="Choose a track"></select></label>
    <button id="turn">Turn ↻</button>
  </div>
  <div class="actions">
    <button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Retry</button>
    <button id="roll" class="primary">Roll</button><button id="next" class="primary" hidden>Next</button>
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
      { gesture: 'tap', before: '│', after: '─', text: 'Tap a track to turn it. Line up the grooves from the marble to the cup.' },
      { gesture: 'tap', before: '🔴 ─', after: '◎ 🔴', text: 'Tap the marble to roll it. You can also press Roll.' },
      { before: '🔴 ╵', after: '↻ ─', text: 'If the marble stops, turn a track and roll again.' },
      cameraStep,
    ], false, `Pick a track from the list and press Turn, or press Enter or Space on the board. ${cameraOther}`)}
    <button id="sound" class="menu-row" aria-pressed="true">Sound: on</button>
    <p id="save-state" class="muted"></p>
  </div>
</dialog>`;

const menu = $<HTMLDialogElement>('menu');
const difficulty = $<HTMLSelectElement>('random-difficulty');
const trackSelect = $<HTMLSelectElement>('track-select');
difficulty.value = random?.difficulty ?? 'easy';
let scene: MarbleScene | undefined;
try {
  scene = new MarbleScene($('scene'), id => { selected = id; }, turn, rollMarble);
} catch {
  $('scene').textContent = '3D is unavailable. Choose a track and use Turn and Roll below.';
}

function save() {
  try {
    localStorage.setItem(key, writeSave(game, selected, completed, random));
    saving = true;
  } catch {
    saving = false;
  }
  $('storage-warning').hidden = saving;
  $('save-state').textContent = saving ? 'Progress saved on this device.' : 'Saving unavailable. Keep this tab open.';
}

function draw(updateBoard = true) {
  const won = game.status === 'won';
  const index = levels.findIndex(level => level.id === game.level.id);
  if (updateBoard) scene?.update(game, selected);
  // On the first level, point at the next track to turn, then at the marble once the route is lined up.
  if (!random && index === 0 && !won && !rolling) {
    const [id] = solve(game);
    scene?.pointAt(id ? game.tracks.find(track => track.id === id) : 'marble');
  } else scene?.pointAt();
  $('title').textContent = game.level.title;
  $('level-number').textContent = random ? difficultyNames[random.difficulty] : `${index + 1} / ${levels.length}`;
  $('moves').textContent = String(game.moves);
  $('status').textContent = won ? 'Marble in the cup!' : notice || 'Line up the tracks, then tap the marble.';
  trackSelect.innerHTML = game.tracks.map((track, i) =>
    `<option value="${track.id}">Track ${i + 1} · row ${track.y + 1}, column ${track.x + 1} · ${trackPorts(track).map(dir => directionNames[dir]).join(' + ')}</option>`).join('');
  trackSelect.value = selected;
  trackSelect.disabled = won || rolling;
  $<HTMLButtonElement>('turn').disabled = won || rolling;
  $<HTMLButtonElement>('undo').disabled = rolling || game.history.length === 0;
  $<HTMLButtonElement>('retry').disabled = rolling;
  $<HTMLButtonElement>('hint').disabled = rolling;
  $<HTMLButtonElement>('open-menu').disabled = rolling;
  $('hint').hidden = won;
  $('roll').hidden = won;
  $<HTMLButtonElement>('roll').disabled = rolling;
  $('roll').textContent = rolling ? 'Rolling…' : 'Roll';
  $('next').hidden = !won;
  $('next').textContent = random ? 'New puzzle' : index === levels.length - 1 ? 'Levels' : 'Next';
  $('level-select').innerHTML = (random ? '<option value="" disabled selected>Random workshop</option>' : '') +
    levels.map(level => `<option value="${level.id}" ${level.id === game.level.id ? 'selected' : ''}>${level.title}${completed.includes(level.id) ? ' ✓' : ''}</option>`).join('');
  $('progress').textContent = `${completed.length} of ${levels.length} workshops completed.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

function load(level: Level, puzzle?: RandomWorkshop) {
  const next = createGame(level);
  scene?.cancelInput();
  game = next;
  random = puzzle;
  selected = game.tracks[0].id;
  notice = '';
  if (menu.open) menu.close();
  draw();
  save();
  $('scene').focus();
}

function newRandom(tier: Difficulty) {
  const puzzle: RandomWorkshop = { version: 1, seed: randomSeed(), difficulty: tier };
  load(generateWorkshop(puzzle), puzzle);
  play.start(levelName());
}

function turn(id: string) {
  if (rolling || menu.open || !rotate(game, id)) return;
  selected = id;
  notice = '';
  audio.play('flag');
  draw();
  save();
}

function rollMarble() {
  if (rolling || game.status === 'won') return;
  const route = trace(game);
  rolling = true;
  notice = 'The marble is rolling.';
  audio.play('reveal');
  draw(false);
  const finish = () => {
    rolling = false;
    if (run(game)) {
      if (!random && !completed.includes(game.level.id)) completed.push(game.level.id);
      audio.play('win');
      play.finish({ moves: game.moves, tracks: game.tracks.length });
    } else {
      play.count('fails');
      notice = 'Track has a gap. Turn a piece and roll again.';
    }
    draw(false);
    save();
    $(game.status === 'won' ? 'next' : 'roll').focus();
  };
  if (scene) scene.roll(route.points, route.reached, finish);
  else finish();
}

trackSelect.onchange = () => {
  scene?.cancelInput();
  selected = trackSelect.value;
  draw();
  save();
};
$('turn').onclick = () => turn(selected);
$('roll').onclick = rollMarble;
$('undo').onclick = () => {
  scene?.cancelInput();
  if (!undo(game)) return;
  play.count('undos');
  notice = '';
  draw();
  save();
};
$('hint').onclick = () => {
  scene?.cancelInput();
  const [id] = solve(game);
  if (id) { play.count('hints'); turn(id); }
  notice = id ? 'Hint turned a track.' : 'Tracks lined up. Press Roll.';
  draw(false);
};
$('retry').onclick = () => { play.count('restarts'); load(game.level, random); };
$('next').onclick = () => {
  if (random) return newRandom(random.difficulty);
  const next = levels[levels.findIndex(level => level.id === game.level.id) + 1];
  if (next) { load(next); play.start(levelName()); }
  else menu.showModal();
};
$('new-random').onclick = () => {
  if (isDifficulty(difficulty.value)) newRandom(difficulty.value);
};
$<HTMLSelectElement>('level-select').onchange = event => {
  const level = levels.find(candidate => candidate.id === (event.target as HTMLSelectElement).value);
  if (level) { load(level); play.start(levelName()); }
};
$('open-menu').onclick = () => { scene?.cancelInput(); menu.showModal(); };
$('close-menu').onclick = () => menu.close();
menu.addEventListener('close', () => $('open-menu').focus());
$('sound').onclick = () => {
  audio.setEnabled(!audio.enabled);
  if (audio.enabled) audio.play('flag');
  draw(false);
};
$('scene').addEventListener('keydown', event => {
  if (event.target !== $('scene') || $('scene').dataset.cameraMode === 'rotate') return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    turn(selected);
  }
});
for (const event of ['pointerdown', 'pointerup', 'keydown']) {
  document.addEventListener(event, () => audio.unlock(), { capture: true });
}
document.addEventListener('pointerdown', event => {
  if (!(event.target instanceof Element) || !event.target.closest('#scene')) scene?.cancelInput();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) scene?.cancelInput();
  save();
});
window.addEventListener('pagehide', save);
draw();
save();
if (game.status !== 'won') play.start(levelName());
addMusic('marble-workshop');
showGuideOnFirstVisit('marble-workshop');
