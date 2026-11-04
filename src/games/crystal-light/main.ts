import './style.css';
import { gameGuide } from '../../shared/game-guide';
import { createGame,rotate,undo,solve,trace,type Level } from './engine';
import { levels } from './levels';
import { CrystalScene } from './scene';
import { readSave,writeSave } from './storage';
import { GameAudio } from '../../shared/audio';
import { isDifficulty, randomSeed } from '../../shared/random-puzzle';
import { generateRandomLight, type RandomLight } from './random';

const KEY='puzzles-crystal-light-v1',audio=new GameAudio('crystal-light');
let index=0,game=createGame(levels[0]),selected=game.mirrors[0].id,completed:string[]=[],notice='',saving=true;
let random: RandomLight | undefined;
try{const raw=localStorage.getItem(KEY),saved=readSave(raw);if(saved){({index,game,selected,completed,random}=saved);}else if(raw)notice='Could not load your save. A new puzzle is open.';}catch{saving=false;}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<header class="topbar"><a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a><span class="brand">Crystal Light</span><button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button></header>
<main class="game-shell"><div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div><p id="storage-warning" class="storage-warning" hidden>Progress is not saved. Keep this tab open.</p>
<div class="stats"><div><strong id="moves">0</strong><span>Turns</span></div><div><strong id="lit">0</strong><span>Crystals lit</span></div></div>
<section class="play-area" aria-label="Light puzzle"><div id="scene" class="scene" tabindex="0" role="group" aria-label="Tap a mirror to turn it. Choose Rotate to look around."></div></section>
<p id="status" class="status" role="status" aria-live="polite"></p>
<div class="mirror-controls"><label class="car-choice"><span class="sr-only">Choose a mirror</span><select id="mirror-select" aria-label="Choose a mirror"></select></label><button id="turn">Turn ↻</button></div>
<div class="actions"><button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Retry</button><button id="next" class="primary" hidden>Next level</button></div></main>
<dialog id="menu" class="sheet" aria-labelledby="menu-title"><div class="sheet-heading"><h2 id="menu-title">Puzzle menu</h2><button id="close-menu">Done</button></div><div class="sheet-body"><label>Levels<select id="level-select"></select></label><p id="progress" class="muted"></p><label>Random difficulty<select id="difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><div class="actions"><button id="new-random">New random puzzle</button></div>
${gameGuide([
  { before: '☀ ━ ╲', after: '☀ ━ ╱', text: 'Tap a mirror to turn it. Aim the beam at the crystals.' },
  { before: '☀ · ◇', after: '☀ ━ ◆', text: 'Light every crystal to win. Blocks stop the beam.' },
  { before: 'Rotate', after: '↔ ↻', text: 'Choose Rotate and drag to look around. Pinch or scroll to zoom.' },
  { before: 'Choose', after: 'Turn ↻', text: 'Pick a mirror and press Turn. On the board, use Enter or Space.' },
])}
<button id="sound" class="menu-row" aria-pressed="true">Sound: on</button><p id="save-state" class="muted"></p></div></dialog>`;
const menu = $<HTMLDialogElement>('menu');
const difficulty = $<HTMLSelectElement>('difficulty');
if (random) difficulty.value = random.difficulty;
let scene:CrystalScene|undefined;
try{scene=new CrystalScene($('scene'),id=>{if(menu.open)return;selected=id;draw();save();},id=>{if(!menu.open)turn(id);});}catch{$('scene').textContent='The 3D board did not load. Try another browser.';}
function save() {
  try {
    localStorage.setItem(KEY, writeSave(index, game, selected, completed, random));
    saving = true;
  } catch {
    saving = false;
  }
  $('storage-warning').hidden = saving;
  $('save-state').textContent = saving ? 'Progress saved.' : 'Could not save.';
}

function turn(id: string) {
  if (!rotate(game, id)) return;
  selected = id;
  notice = '';
  if (!random && game.status === 'won' && !completed.includes(game.level.id)) completed.push(game.level.id);
  audio.play(game.status === 'won' ? 'win' : 'flag');
  draw();
  save();
  if (game.status === 'won') $('next').focus();
}

function draw(updateScene = true) {
  const won = game.status === 'won';
  const beam = trace(game);
  if (updateScene) scene?.update(game, selected);
  $('title').textContent = game.level.title;
  $('level-number').textContent = random ? random.difficulty[0].toUpperCase() + random.difficulty.slice(1) : `${index + 1} / ${levels.length}`;
  $('moves').textContent = String(game.moves);
  $('lit').textContent = `${beam.lit.length} / ${game.level.crystals.length}`;
  $('status').textContent = won ? 'All crystals lit!' : notice || (
    beam.loop ? 'The beam is looping. Turn a mirror.' : 'Turn the mirrors to light every crystal.'
  );
  $('mirror-select').innerHTML = game.mirrors.map((mirror, i) =>
    `<option value="${mirror.id}" ${mirror.id === selected ? 'selected' : ''}>Mirror ${i + 1} · row ${mirror.y + 1}, column ${mirror.x + 1} · ${mirror.slash ? '/' : '\\'}</option>`
  ).join('');
  $<HTMLSelectElement>('mirror-select').disabled = won;
  $<HTMLButtonElement>('turn').disabled = won;
  $<HTMLButtonElement>('undo').disabled = !game.history.length;
  $('hint').hidden = won;
  $('next').hidden = !won;
  $('next').textContent = random ? 'New random puzzle' : index === levels.length - 1 ? 'Choose a level' : 'Next level';
  const curated = levels.map((level, i) =>
    `<option value="${i}" ${index === i ? 'selected' : ''}>${i + 1}. ${level.title}${completed.includes(level.id) ? ' ✓' : ''}</option>`
  ).join('');
  $('level-select').innerHTML = (random ? '<option value="" selected disabled>Choose a level</option>' : '') + curated;
  $('progress').textContent = `${completed.length} of ${levels.length} levels complete.`;
  $('sound').textContent = audio.enabled ? 'Sound: on' : 'Sound: off';
  $('sound').setAttribute('aria-pressed', String(audio.enabled));
}

function load(level: Level, next: number, spec?: RandomLight) {
  scene?.cancelInput();
  game = createGame(level);
  index = next;
  random = spec;
  selected = game.mirrors[0].id;
  notice = '';
  menu.close();
  draw();
  save();
  $('scene').focus();
}

function newRandom() {
  const chosen = difficulty.value;
  if (!isDifficulty(chosen)) return;
  const spec: RandomLight = { version: 1, seed: randomSeed(), difficulty: chosen };
  load(generateRandomLight(spec), -1, spec);
}

$('mirror-select').onchange = event => {
  scene?.cancelInput();
  selected = (event.target as HTMLSelectElement).value;
  notice = '';
  draw();
  save();
};
$('turn').onclick = () => turn(selected);
$('undo').onclick = () => {
  scene?.cancelInput();
  if (undo(game)) {
    notice = '';
    draw();
    save();
  }
};
$('retry').onclick = () => load(game.level, index, random);
$('hint').onclick = () => {
  scene?.cancelInput();
  const solution = solve(game);
  if (solution?.length) {
    turn(solution[0]);
    if (game.status !== 'won') {
      notice = 'Hint turned a mirror.';
      draw(false);
    }
  } else {
    notice = 'No hint found. Try Undo or Retry.';
    draw();
  }
};
$('next').onclick = () => {
  if (random) newRandom();
  else if (index < levels.length - 1) load(levels[index + 1], index + 1);
  else menu.showModal();
};
$('new-random').onclick = newRandom;
$('level-select').onchange = event => {
  const next = Number((event.target as HTMLSelectElement).value);
  load(levels[next], next);
};
$('open-menu').onclick=()=>{scene?.cancelInput();menu.showModal();};$('close-menu').onclick=()=>menu.close();menu.addEventListener('close',()=>$('open-menu').focus());
$('sound').onclick=()=>{audio.setEnabled(!audio.enabled);if(audio.enabled)audio.play('flag');draw();};
$('scene').addEventListener('keydown',e=>{if(menu.open||$('scene').dataset.cameraMode==='rotate'||(e.target as HTMLElement).closest('button'))return;if(e.key==='Enter'||e.key===' '){e.preventDefault();turn(selected);}});
for(const event of ['pointerdown','pointerup','keydown'])document.addEventListener(event,()=>audio.unlock(),{capture:true});
document.addEventListener('pointerdown',e=>{if(!(e.target instanceof Element)||!e.target.closest('#scene'))scene?.cancelInput();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)scene?.cancelInput();save();});window.addEventListener('pagehide',save);
draw();save();
