import './style.css';
import { createGame, move, undo, solve, type Direction } from './engine';
import { levels } from './levels';
import { FrostScene } from './scene';
import { readSave, writeSave } from './storage';
import { GameAudio } from '../../shared/audio';
import { gameGuide } from '../../shared/game-guide';
import { isDifficulty, randomSeed } from '../../shared/random-puzzle';
import { generatePath, type RandomPath } from './random';

const KEY='puzzles-frosty-paths-v1';
const audio=new GameAudio();
let index=0,completed:string[]=[],game=createGame(levels[0]),notice='',saving=true;
let random:RandomPath|undefined;
try{const saved=readSave(localStorage.getItem(KEY));if(saved){index=saved.index;game=saved.game;completed=saved.completed;random=saved.random;}}catch{saving=false;}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<header class="topbar"><a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a><span class="brand">Frosty Paths</span><button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button></header>
<main class="game-shell"><div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div><p id="storage-warning" class="storage-warning" hidden>Save failed. Keep this tab open.</p>
<div class="stats"><div><strong id="moves">0</strong><span>Slides</span></div><div><strong id="fish">0</strong><span>Fish</span></div></div>
<section class="play-area" aria-label="Ice puzzle"><div id="scene" class="scene" tabindex="0" role="group" aria-label="3D board. Swipe or use the arrows to slide. Collect all fish and stop on the blue tile."></div></section>
<p id="status" class="status" role="status" aria-live="polite"></p>
<div class="walk-controls" aria-label="Slide direction"><button data-dir="n" aria-label="Slide north">↗</button><button data-dir="e" aria-label="Slide east">↘</button><button data-dir="s" aria-label="Slide south">↙</button><button data-dir="w" aria-label="Slide west">↖</button></div>
<div class="actions"><button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Restart</button><button id="next" class="primary" hidden>Next level</button></div></main>
<dialog id="menu" class="sheet" aria-labelledby="menu-title"><div class="sheet-heading"><h2 id="menu-title">Menu</h2><button id="close-menu">Done</button></div><div class="sheet-body"><label>Levels<select id="level-select"></select></label><p id="progress" class="muted"></p><label>Random difficulty<select id="difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label><button id="new-random" class="menu-row">New random puzzle</button>${gameGuide([
  { before: '🐧 🧊 🪨', after: '🧊 🐧 🪨', text: 'Tap, swipe, or use arrows or WASD. Rocks and edges stop slides.' },
  { before: '🐧 🐟 🧊', after: '🧊 🧊 🐧', text: 'Slide over fish to pick them up.' },
  { before: '🐧 🧊 🟦', after: '🧊 🧊 🐧', text: 'Collect all fish and stop on the blue tile.' },
  { before: '▦', after: '◈', text: 'Choose Rotate and drag. Pinch or scroll to zoom. Use ↺ to reset.' }
])}<button id="sound" class="menu-row" aria-pressed="true">Sound: on</button><p id="save-state" class="muted"></p></div></dialog>`;
const menu=$<HTMLDialogElement>('menu');
const difficultySelect=$<HTMLSelectElement>('difficulty');
if(random)difficultySelect.value=random.difficulty;
let scene:FrostScene|undefined;
try{scene=new FrostScene($('scene'),step);}catch{$('scene').textContent='3D is unavailable. Use a browser with 3D graphics support.';}
function cameraArrows(){for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dir]')))if(scene)button.textContent=scene.screenDirection(button.dataset.dir as Direction);}
$('scene').addEventListener('camerachange',cameraArrows);
function save(){try{localStorage.setItem(KEY,writeSave(game,completed,random));}catch{saving=false;}$('storage-warning').hidden=saving;$('save-state').textContent=saving?'Progress saved.':'Save failed.';}
function step(dir:Direction){if(menu.open)return;if(move(game,dir)){notice='';if(game.status==='won'&&!random&&!completed.includes(game.level.id))completed.push(game.level.id);audio.play(game.status==='won'?'win':'reveal');draw();save();if(game.status==='won')$('next').focus();}else{notice=game.status==='won'?'Level complete.':'Blocked. Try another direction.';draw();}}
function draw(){
  const won=game.status==='won';
  scene?.update(game);
  $('title').textContent=game.level.title;
  $('level-number').textContent=random?'Random':`${index+1} / ${levels.length}`;
  $('moves').textContent=String(game.moves);
  $('fish').textContent=`${game.collected.length} / ${game.level.fish.length}`;
  $('status').textContent=won?'Level complete.':notice||'Collect all fish and stop on the blue tile.';
  $<HTMLButtonElement>('undo').disabled=!game.history.length;
  document.querySelectorAll<HTMLButtonElement>('[data-dir]').forEach(button=>button.disabled=won);
  $('hint').hidden=won;
  $('next').hidden=!won;
  $('next').textContent=random?'New random puzzle':index===levels.length-1?'Levels':'Next level';
  const curated=levels.map((level,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1}. ${level.title}${completed.includes(level.id)?' ✓':''}</option>`);
  $('level-select').innerHTML=(random?'<option value="" selected disabled>Random level</option>':'')+curated.join('');
  $('progress').textContent=`${completed.length} of ${levels.length} levels complete.`;
  $('sound').textContent=audio.enabled?'Sound: on':'Sound: off';
  $('sound').setAttribute('aria-pressed',String(audio.enabled));
}
function restart(nextGame:typeof game){
  scene?.cancelInput();
  game=nextGame;notice='';
  if(menu.open)menu.close();
  draw();save();$('scene').focus();
}
function load(next:number){
  const nextGame=createGame(levels[next]);
  index=next;random=undefined;
  restart(nextGame);
}
function newRandom(){
  const difficulty=difficultySelect.value;
  if(!isDifficulty(difficulty))return;
  const selection={seed:randomSeed(),difficulty};
  const nextGame=createGame(generatePath(selection));
  random=selection;index=-1;
  restart(nextGame);
}
for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dir]')))button.onclick=()=>step(button.dataset.dir as Direction);
$('undo').onclick=()=>{scene?.cancelInput();if(undo(game)){notice='';draw();save();}};
$('retry').onclick=()=>restart(createGame(game.level));
$('new-random').onclick=newRandom;
$('hint').onclick=()=>{scene?.cancelInput();const solution=solve(game);if(solution?.length){step(solution[0]);if(game.status!=='won'){notice='Hint slid the penguin once.';draw();}}else{notice='No hint available. Try Undo or Restart.';draw();}};
$('next').onclick=()=>{if(random)newRandom();else if(index<levels.length-1)load(index+1);else menu.showModal();};
$('open-menu').onclick=()=>{scene?.cancelInput();menu.showModal();};$('close-menu').onclick=()=>menu.close();menu.addEventListener('close',()=>$('open-menu').focus());
$('level-select').onchange=e=>load(Number((e.target as HTMLSelectElement).value));
$('sound').onclick=()=>{audio.setEnabled(!audio.enabled);if(audio.enabled)audio.play('flag');draw();};
const keys:Record<string,Direction>={ArrowUp:'n',ArrowRight:'e',ArrowDown:'s',ArrowLeft:'w',w:'n',d:'e',s:'s',a:'w'};
window.addEventListener('keydown',e=>{if(menu.open||$('scene').dataset.cameraMode==='rotate'||e.target instanceof HTMLSelectElement||e.ctrlKey||e.metaKey||e.altKey)return;const dir=keys[e.key];if(dir){e.preventDefault();step(dir);}});
for(const event of ['pointerdown','pointerup','keydown'])document.addEventListener(event,()=>audio.unlock(),{capture:true});
document.addEventListener('pointerdown',e=>{if(!(e.target instanceof Element)||!e.target.closest('#scene'))scene?.cancelInput();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)scene?.cancelInput();save();});window.addEventListener('pagehide',save);
draw();save();
