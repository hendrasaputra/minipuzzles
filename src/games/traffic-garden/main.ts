import './style.css';
import { gameGuide } from '../../shared/game-guide';
import { randomSeed } from '../../shared/random-puzzle';
import { createGame, moveCar, undo, canMove, legalMoves, type Car, type Game, type Move, type Puzzle } from './engine';
import { generatePuzzle } from './puzzles';
import { solve } from './solver';
import { TrafficScene } from './scene';
import { readSave, writeSave } from './storage';
import { GameAudio } from '../../shared/audio';

type Difficulty=Puzzle['difficulty'];
const KEY='puzzles-traffic-garden-v1';
const sounds=new GameAudio();
let game:Game,selected='coral',notice='',storageAvailable=true;
let loading=false;
try {
  const raw=localStorage.getItem(KEY),saved=readSave(raw);
  if(saved){game=saved.game;selected=saved.selected;}
  else{game=createGame(generatePuzzle(randomSeed(),'easy'));if(raw)notice='Could not load the save. A new puzzle is ready.';}
}catch{game=createGame(generatePuzzle(randomSeed(),'easy'));storageAvailable=false;}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<header class="topbar"><a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a><span class="brand">Traffic Garden</span><button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button></header>
<main class="game-shell">
  <div class="puzzle-heading"><h1>Free the red car</h1><span id="difficulty-label"></span></div>
  <p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved. Keep this tab open.</p>
  <div class="stats"><div><strong id="moves">0</strong><span>Moves</span></div><div><strong id="par">—</strong><span>Fewest moves</span></div></div>
  <section class="play-area" aria-label="Parking puzzle"><div id="scene" class="scene" role="group" tabindex="0" aria-label="3D parking board. Drag a car along its length, or select it and use the arrows."></div></section>
  <p id="status" class="status" role="status" aria-live="polite"></p>
  <div class="slide-controls" id="slide-controls"><button id="backward" aria-label="Move selected car backward">↖</button><label class="car-choice"><span class="sr-only">Choose a car</span><select id="car-select" aria-label="Choose a car"></select></label><button id="forward" aria-label="Move selected car forward">↘</button></div>
  <div class="actions"><button id="undo">Undo</button><button id="hint">Hint</button><button id="exit" class="primary" hidden>Drive out →</button><button id="next" class="primary" hidden>New puzzle</button></div>
</main>
<dialog id="menu" class="sheet" aria-labelledby="menu-title"><div class="sheet-heading"><h2 id="menu-title">Game options</h2><button id="close-menu">Done</button></div><div class="sheet-body">
  <label>Difficulty<select id="difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
  <div class="menu-pair"><button id="restart">Retry</button><button id="new">New random puzzle</button></div>
  ${gameGuide([
    { before: '🚙 ▫', after: '▫ 🚙', text: 'Drag a car along its length, or select it and use the arrow buttons.' },
    { before: '🚗', after: '🏁', text: 'Clear a path for the red car, then press Drive out.' },
    { before: '▦', after: '↻', text: 'Choose Rotate and drag to look around. Pinch or scroll to zoom.' },
    { before: '← →', after: '⇥', text: 'Arrow keys move the selected car. Hold Shift with an arrow key to slide it as far as it can go.' },
  ])}
  <button id="sound" class="menu-row" aria-pressed="true">Sound: on</button><p id="save-state" class="muted"></p><p id="seed" class="puzzle-id"></p>
</div></dialog>`;
const menu=$<HTMLDialogElement>('menu');
let scene:TrafficScene|undefined;
try{scene=new TrafficScene($('scene'),id=>{if(menu.open||loading)return;selected=id;notice='';draw();save();},(id,delta)=>{if(!menu.open&&!loading)performMove(id,delta);});}
catch{$('scene').textContent='3D graphics are unavailable. Use the car list and arrows to play.';}
function cameraArrows(){if(!scene)return;const car=current();$('backward').textContent=scene.screenDirection(car.axis,-1);$('forward').textContent=scene.screenDirection(car.axis,1);}
$('scene').addEventListener('camerachange',cameraArrows);
function label(car:Car){return car.id==='coral'?'Red car':`Car ${car.id.replace(/^car-/, '').toUpperCase()}`;}
function current(){return game.cars.find(car=>car.id===selected)??game.cars[0];}
function exitDelta(){const car=game.cars.find(car=>car.id==='coral')!;return 6-car.x;}
function exitClear(){return canMove(game,'coral',exitDelta());}
function save(){
  try{localStorage.setItem(KEY,writeSave(game,selected));}catch{storageAvailable=false;}
  $('storage-warning').hidden=storageAvailable;
  $('save-state').textContent=storageAvailable?'Progress saved on this device.':'Saving unavailable. Keep this tab open.';
}
function performMove(id:string,delta:number,message=''){
  if(!moveCar(game,id,delta))return;
  selected=id;notice=message;sounds.play(game.status==='won'?'win':'reveal');draw({ id, delta });save();
  if(game.status==='won')$('next').focus();
}
function direction(sign:number,far=false){
  const car=current();const moves=legalMoves(game).filter(move=>move.id===car.id&&Math.sign(move.delta)===sign);
  const move=far?moves.sort((a,b)=>Math.abs(b.delta)-Math.abs(a.delta))[0]:moves.find(move=>move.delta===sign)??(car.id==='coral'&&sign>0?moves.find(move=>move.delta===exitDelta()):undefined);
  if(move)performMove(move.id,move.delta);
  else if (game.status !== 'won') scene?.showBlocked(car, sign);
}
function draw(move?: Move){
  const car=current(),won=game.status==='won';
  scene?.update(game,selected,move);
  $('moves').textContent=String(game.history.length);$('par').textContent=game.puzzle.par===undefined?'—':String(game.puzzle.par);
  $('difficulty-label').textContent=game.puzzle.difficulty[0].toUpperCase()+game.puzzle.difficulty.slice(1);
  $('status').textContent=loading?'Loading puzzle…':won?`You won in ${game.history.length} moves.`:notice|| (exitClear()?'Press Drive out to win.':'Select or drag a car.');
  $('slide-controls').classList.toggle('finished',won);
  const focused=document.activeElement?.id;
  $('car-select').innerHTML=game.cars.map(c=>`<option value="${c.id}" ${c.id===selected?'selected':''}>${label(c)} · ${c.axis==='h'?'horizontal':'vertical'} · ${c.length} spaces · row ${c.y+1}, column ${c.x+1}</option>`).join('');
  $<HTMLSelectElement>('car-select').disabled=won||loading;
  cameraArrows();
  $<HTMLButtonElement>('backward').disabled=loading||!canMove(game,car.id,-1);
  $<HTMLButtonElement>('forward').disabled=loading||!(canMove(game,car.id,1)||(car.id==='coral'&&exitClear()));
  $('backward').setAttribute('aria-label',`Move ${label(car)} backward`);$('forward').setAttribute('aria-label',`Move ${label(car)} forward`);
  $<HTMLButtonElement>('undo').disabled=loading||game.history.length===0;
  $('hint').hidden=won;$<HTMLButtonElement>('hint').disabled=loading;
  $('exit').hidden=won||!exitClear();$('next').hidden=!won;$<HTMLButtonElement>('next').disabled=loading;
  $<HTMLSelectElement>('difficulty').value=game.puzzle.difficulty;
  for(const id of ['difficulty','restart','new'])($<HTMLButtonElement>(id)).disabled=loading;
  $('sound').textContent=sounds.enabled?'Sound: on':'Sound: off';$('sound').setAttribute('aria-pressed',String(sounds.enabled));
  $('seed').textContent=`Puzzle code ${game.puzzle.seed}`;
  if(focused==='car-select')$('car-select').focus();
}
async function newPuzzle(difficulty:Difficulty){
  if(loading)return;scene?.cancelInput();loading=true;notice='';draw();menu.close();
  // Let the loading message paint before bounded puzzle search.
  await new Promise(resolve=>setTimeout(resolve,0));
  try{game=createGame(generatePuzzle(randomSeed(),difficulty));selected='coral';notice='';}
  catch{notice='Could not make a puzzle. Try again.';}
  loading=false;draw();save();$('scene').focus();
}
$('car-select').onchange=e=>{scene?.cancelInput();selected=(e.target as HTMLSelectElement).value;notice='';draw();save();};
$('backward').onclick=()=>direction(-1);$('forward').onclick=()=>direction(1);
$('exit').onclick=()=>performMove('coral',exitDelta());
$('undo').onclick=()=>{scene?.cancelInput();if(undo(game)){notice='';sounds.play('reveal');draw();save();}};
$('hint').onclick=()=>{
  if(loading||game.status==='won')return;
  const solution=solve(game);
  if(solution?.length){const step=solution[0];performMove(step.id,step.delta,`Hint: moved ${label(game.cars.find(car=>car.id===step.id)!)}.`);}
  else{notice='No hint found. Try Undo or Retry.';draw();}
};
$('open-menu').onclick=()=>{scene?.cancelInput();menu.showModal();};$('close-menu').onclick=()=>menu.close();
menu.addEventListener('close',()=>$('open-menu').focus());
$('restart').onclick=()=>{scene?.cancelInput();game=createGame(game.puzzle);selected='coral';notice='';menu.close();draw();save();};
$('new').onclick=$('next').onclick=()=>newPuzzle(game.puzzle.difficulty);
$('difficulty').onchange=e=>newPuzzle((e.target as HTMLSelectElement).value as Difficulty);
$('sound').onclick=()=>{sounds.setEnabled(!sounds.enabled);if(sounds.enabled)sounds.play('flag');draw();};
for(const event of ['pointerdown','pointerup','keydown'])document.addEventListener(event,()=>sounds.unlock(),{capture:true});
document.addEventListener('pointerdown',e=>{if(!(e.target instanceof Element)||!e.target.closest('#scene'))scene?.cancelInput();});
window.addEventListener('keydown',e=>{
  if(menu.open||loading||$('scene').dataset.cameraMode==='rotate'||e.target instanceof HTMLSelectElement||e.altKey||e.ctrlKey||e.metaKey)return;
  const car=current();
  if((car.axis==='h'&&['ArrowLeft','ArrowRight'].includes(e.key))||(car.axis==='v'&&['ArrowUp','ArrowDown'].includes(e.key))){e.preventDefault();direction(['ArrowLeft','ArrowUp'].includes(e.key)?-1:1,e.shiftKey);}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)scene?.cancelInput();save();});window.addEventListener('pagehide',save);
draw();save();
