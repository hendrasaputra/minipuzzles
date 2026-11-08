import './style.css';
import { createGame, move, undo, solve, type Direction, type Level } from './engine';
import { levels } from './levels';
import { CrateScene, type StepCue } from './scene';
import { readSave, writeSave } from './storage';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { randomSeed, type Difficulty } from '../../shared/random-puzzle';
import { randomGarden, type RandomGarden } from './random';

const KEY='puzzles-crate-garden-v1';
const audio=new GameAudio('crate-garden');
let index=0,completed:string[]=[],game=createGame(levels[0]),notice='',saving=true;
let random: RandomGarden | undefined;
try {
  const saved = readSave(localStorage.getItem(KEY));
  if (saved) ({ index, game, completed, random } = saved);
} catch {
  saving = false;
}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<header class="topbar"><a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a><span class="brand">Crate Garden</span><button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button></header>
<main class="game-shell"><div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div><p id="storage-warning" class="storage-warning" hidden>Save failed. Keep this tab open.</p>
<div class="stats"><div><strong id="moves">0</strong><span>Steps</span></div><div><strong id="pushes">0</strong><span>Pushes</span></div></div>
<section class="play-area" aria-label="Crate puzzle"><div id="scene" class="scene" tabindex="0" role="group" aria-label="3D board. Swipe or use the arrow keys to move. Push each crate onto a green tile."></div></section>
<p id="status" class="status" role="status" aria-live="polite"></p>
<div class="walk-controls" aria-label="Walk"><button data-dir="n" aria-label="Walk north">↗</button><button data-dir="e" aria-label="Walk east">↘</button><button data-dir="s" aria-label="Walk south">↙</button><button data-dir="w" aria-label="Walk west">↖</button></div>
<div class="actions"><button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Restart</button><button id="next" class="primary" hidden>Next level</button></div></main>
<dialog id="menu" class="sheet" aria-labelledby="menu-title"><div class="sheet-heading"><h2 id="menu-title">Menu</h2><button id="close-menu">Done</button></div><div class="sheet-body"><label>Levels<select id="level-select"></select></label><p id="progress" class="muted"></p>
<label>Random difficulty<select id="random-difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
<div class="menu-pair"><button id="new-random">New random puzzle</button></div><p id="seed" class="puzzle-id" hidden></p>${gameGuide([
  { before: '🧑 ⬜', after: '⬜ 🧑', text: 'Tap a tile next to you, swipe, or use the arrows or WASD to move.' },
  { before: '🧑 📦 🟩', after: '⬜ 🧑 📦', text: 'Walk into one crate to push it. Put every crate on a green tile.' },
  { before: '📦 🧱', after: '↶ 📦', text: 'Stuck? Use Undo or Restart.' },
  { before: '▦', after: '◈', text: 'Drag with two fingers to turn the board. Pinch to zoom. Use ↺ to reset.' }
])}<p class="muted">Grain Sack by <a href="https://polyfork.dev/asset/grain-sack-401d96">Polyfork</a>, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>. Rescaled and tinted.</p>
<button id="sound" class="menu-row" aria-pressed="true">Sound: on</button><p id="save-state" class="muted"></p></div></dialog>`;
const menu=$<HTMLDialogElement>('menu');
let scene:CrateScene|undefined;
try{scene=new CrateScene($('scene'),step);}catch{$('scene').textContent='3D is unavailable. Use a browser with 3D graphics support.';}
function cameraArrows(){for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dir]')))if(scene)button.textContent=scene.screenDirection(button.dataset.dir as Direction);}
$('scene').addEventListener('camerachange',cameraArrows);
function save(){try{localStorage.setItem(KEY,writeSave(index,game,completed,random));}catch{saving=false;}$('storage-warning').hidden=saving;$('save-state').textContent=saving?'Progress saved.':'Save failed.';}
function step(dir: Direction, message = '') {
  if (menu.open) return;
  const pushes = game.pushes;
  if (move(game, dir)) {
    notice = message;
    if (game.status === 'won' && !random && !completed.includes(game.level.id)) completed.push(game.level.id);
    audio.play(game.status === 'won' ? 'win' : game.pushes > pushes ? 'reveal' : 'flag');
    draw('move');
    save();
    if (game.status === 'won') $('next').focus();
  } else {
    notice = game.status === 'won' ? 'Level complete.' : 'Blocked. Try another direction.';
    draw(game.status === 'won' ? undefined : { blocked: dir });
  }
}
function draw(cue?: StepCue) {
  const won = game.status === 'won';
  scene?.update(game, cue);
  $('title').textContent = game.level.title;
  $('level-number').textContent = random ? difficultyName(random.difficulty) : `${index + 1} / ${levels.length}`;
  $('moves').textContent = String(game.moves);
  $('pushes').textContent = String(game.pushes);
  $('status').textContent = won ? 'Level complete.' : notice || 'Push every crate onto a green tile.';
  $<HTMLButtonElement>('undo').disabled = !game.history.length;
  for (const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dir]'))) button.disabled = won;
  $('hint').hidden = won;
  $('next').hidden = !won;
  $('next').textContent = random ? 'New random puzzle' : index === levels.length - 1 ? 'Levels' : 'Next level';
  const curatedOptions = levels.map((level, i) => {
    const selected = i === index ? 'selected' : '';
    const check = completed.includes(level.id) ? ' ✓' : '';
    return `<option value="${i}" ${selected}>${i + 1}. ${level.title}${check}</option>`;
  }).join('');
  $('level-select').innerHTML = (random ? '<option value="random" selected>Random level</option>' : '') + curatedOptions;
  $('seed').hidden = !random;
  $('seed').textContent = random ? `Seed ${random.seed}` : '';
  $('progress').textContent = `${completed.length} of ${levels.length} levels complete.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}
function difficultyName(difficulty: Difficulty): string {
  return difficulty[0].toUpperCase() + difficulty.slice(1);
}
function load(level: Level, next: number, puzzle?: RandomGarden) {
  scene?.cancelInput();
  index = next;
  random = puzzle;
  game = createGame(level);
  notice = '';
  menu.close();
  draw();
  save();
  $('scene').focus();
}
function newRandom(difficulty: Difficulty) {
  const puzzle = { seed: randomSeed(), difficulty, generator: 1 } as const;
  load(randomGarden(puzzle), -1, puzzle);
}
if (random) $<HTMLSelectElement>('random-difficulty').value = random.difficulty;
for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dir]')))button.onclick=()=>step(button.dataset.dir as Direction);
$('undo').onclick=()=>{scene?.cancelInput();if(undo(game)){notice='';draw();save();}};
$('retry').onclick=()=>load(game.level, index, random);
$('hint').onclick=()=>{scene?.cancelInput();const solution=solve(game);if(solution?.length){step(solution[0], 'Hint moved the gardener one step.');}else{notice='No hint available. Try Undo or Restart.';draw();}};
$('next').onclick=()=>{
  if (random) newRandom(random.difficulty);
  else if (index < levels.length - 1) load(levels[index + 1], index + 1);
  else menu.showModal();
};
$('new-random').onclick=()=>newRandom($<HTMLSelectElement>('random-difficulty').value as Difficulty);
$('open-menu').onclick=()=>{scene?.cancelInput();menu.showModal();};$('close-menu').onclick=()=>menu.close();menu.addEventListener('close',()=>$('open-menu').focus());
$('level-select').onchange=e=>{
  const value = (e.target as HTMLSelectElement).value;
  if (value === 'random') return;
  const next = Number(value);
  load(levels[next], next);
};
$('sound').onclick=()=>{audio.setEnabled(!audio.enabled);if(audio.enabled)audio.play('flag');draw();};
const keys:Record<string,Direction>={ArrowUp:'n',ArrowRight:'e',ArrowDown:'s',ArrowLeft:'w',w:'n',d:'e',s:'s',a:'w'};
window.addEventListener('keydown',e=>{if(menu.open||$('scene').dataset.cameraMode==='rotate'||e.target instanceof HTMLSelectElement||e.ctrlKey||e.metaKey||e.altKey)return;const dir=keys[e.key];if(dir){e.preventDefault();step(dir);}});
for(const event of ['pointerdown','pointerup','keydown'])document.addEventListener(event,()=>audio.unlock(),{capture:true});
document.addEventListener('pointerdown',e=>{if(!(e.target instanceof Element)||!e.target.closest('#scene'))scene?.cancelInput();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)scene?.cancelInput();save();});window.addEventListener('pagehide',save);
draw();save();
