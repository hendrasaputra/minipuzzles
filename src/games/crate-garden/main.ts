import './style.css';
import { createGame, move, undo, solve, type Direction } from './engine';
import { levels } from './levels';
import { CrateScene } from './scene';
import { readSave, writeSave } from './storage';
import { GameAudio } from '../../shared/audio';

const KEY='puzzles-crate-garden-v1';
const audio=new GameAudio();
let index=0,completed:string[]=[],game=createGame(levels[0]),notice='',saving=true;
try{const saved=readSave(localStorage.getItem(KEY));if(saved){index=saved.index;game=saved.game;completed=saved.completed;}}catch{saving=false;}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<header class="topbar"><a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a><span class="brand">Crate Garden</span><button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button></header>
<main class="game-shell"><div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div><p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved. Keep this tab open.</p>
<div class="stats"><div><strong id="moves">0</strong><span>Steps</span></div><div><strong id="pushes">0</strong><span>Pushes</span></div></div>
<section class="play-area" aria-label="Crate puzzle"><div id="scene" class="scene" tabindex="0" role="group" aria-label="Isometric crate garden. Swipe or use arrow keys to walk. Push every crate onto a planting spot."></div></section>
<p id="status" class="status" role="status" aria-live="polite"></p>
<div class="walk-controls" aria-label="Walk"><button data-dir="n" aria-label="Walk north">↗</button><button data-dir="e" aria-label="Walk east">↘</button><button data-dir="s" aria-label="Walk south">↙</button><button data-dir="w" aria-label="Walk west">↖</button></div>
<div class="actions"><button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Retry</button><button id="next" class="primary" hidden>Next garden</button></div></main>
<dialog id="menu" class="sheet" aria-labelledby="menu-title"><div class="sheet-heading"><h2 id="menu-title">Your garden</h2><button id="close-menu">Done</button></div><div class="sheet-body"><label>Choose a garden<select id="level-select"></select></label><p id="progress" class="muted"></p><section class="instructions"><h3>A place for every crate</h3><p>Walk the gardener around the paths and push each seed crate onto a green planting spot. You can push one crate at a time. You cannot pull crates, push two together, or walk through walls.</p><p>Swipe in a path’s direction, tap a neighboring tile, or use the four large arrows. Swipes follow the current view. Keyboard arrows and WASD always follow grid north/east/south/west. Choose Rotate to drag the camera around and tilt it; pinch or scroll to zoom. Choose Play to move again. The ↺ button resets the camera.</p><p>Undo any step, even after finishing. Retry starts this garden again. Hint plays one step of a solution, including walking. If a crate gets stuck, undo or retry. There is no timer.</p></section><button id="sound" class="menu-row" aria-pressed="true">Sound: on</button><p id="save-state" class="muted"></p></div></dialog>`;
const menu=$<HTMLDialogElement>('menu');
let scene:CrateScene|undefined;
try{scene=new CrateScene($('scene'),step);}catch{$('scene').textContent='The garden could not render. Please try a browser with Canvas support.';}
function cameraArrows(){for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dir]')))if(scene)button.textContent=scene.screenDirection(button.dataset.dir as Direction);}
$('scene').addEventListener('camerachange',cameraArrows);
function save(){try{localStorage.setItem(KEY,writeSave(index,game,completed));}catch{saving=false;}$('storage-warning').hidden=saving;$('save-state').textContent=saving?'Progress saved on this device.':'Saving unavailable. Keep this tab open.';}
function step(dir:Direction){if(menu.open)return;if(move(game,dir)){notice='';if(game.status==='won'&&!completed.includes(game.level.id))completed.push(game.level.id);audio.play(game.status==='won'?'win':'reveal');draw();save();if(game.status==='won')$('next').focus();}else{notice=game.status==='won'?'This garden is complete. Choose the next one.':'That path is blocked. Try another direction.';draw();}}
function draw(){const won=game.status==='won';scene?.update(game);$('title').textContent=game.level.title;$('level-number').textContent=`${index+1} / ${levels.length}`;$('moves').textContent=String(game.moves);$('pushes').textContent=String(game.pushes);$('status').textContent=won?'Every crate is planted. Lovely work.':notice||'Push every crate onto a green planting spot.';$<HTMLButtonElement>('undo').disabled=!game.history.length;for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dir]')))button.disabled=won;$('hint').hidden=won;$('next').hidden=!won;$('next').textContent=index===levels.length-1?'Choose a garden':'Next garden';$('level-select').innerHTML=levels.map((level,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1}. ${level.title}${completed.includes(level.id)?' ✓':''}</option>`).join('');$('progress').textContent=`${completed.length} of ${levels.length} gardens planted.`;$('sound').textContent=audio.enabled?'Sound: on':'Sound: off';$('sound').setAttribute('aria-pressed',String(audio.enabled));}
function load(next:number){scene?.cancelInput();index=next;game=createGame(levels[index]);notice='';menu.close();draw();save();$('scene').focus();}
for(const button of Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dir]')))button.onclick=()=>step(button.dataset.dir as Direction);
$('undo').onclick=()=>{scene?.cancelInput();if(undo(game)){notice='';draw();save();}};
$('retry').onclick=()=>load(index);
$('hint').onclick=()=>{scene?.cancelInput();const solution=solve(game);if(solution?.length){step(solution[0]);if(game.status!=='won'){notice='Hint: one step along the solution.';draw();}}else{notice='No hint found within the search limit. Undo a push or retry this garden.';draw();}};
$('next').onclick=()=>{if(index<levels.length-1)load(index+1);else menu.showModal();};
$('open-menu').onclick=()=>{scene?.cancelInput();menu.showModal();};$('close-menu').onclick=()=>menu.close();menu.addEventListener('close',()=>$('open-menu').focus());
$('level-select').onchange=e=>load(Number((e.target as HTMLSelectElement).value));
$('sound').onclick=()=>{audio.setEnabled(!audio.enabled);if(audio.enabled)audio.play('flag');draw();};
const keys:Record<string,Direction>={ArrowUp:'n',ArrowRight:'e',ArrowDown:'s',ArrowLeft:'w',w:'n',d:'e',s:'s',a:'w'};
window.addEventListener('keydown',e=>{if(menu.open||$('scene').dataset.cameraMode==='rotate'||e.target instanceof HTMLSelectElement||e.ctrlKey||e.metaKey||e.altKey)return;const dir=keys[e.key];if(dir){e.preventDefault();step(dir);}});
for(const event of ['pointerdown','pointerup','keydown'])document.addEventListener(event,()=>audio.unlock(),{capture:true});
document.addEventListener('pointerdown',e=>{if(!(e.target instanceof Element)||!e.target.closest('#scene'))scene?.cancelInput();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)scene?.cancelInput();save();});window.addEventListener('pagehide',save);
draw();save();
