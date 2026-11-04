import './style.css';
import { createGame,rotate,undo,solve,flow,pipePorts } from './engine';
import { levels } from './levels';
import { WaterScene } from './scene';
import { readSave,writeSave } from './storage';
import { GameAudio } from '../../shared/audio';
import { isDifficulty, randomSeed, type Difficulty } from '../../shared/random-puzzle';
import { generateGarden, type RandomGarden } from './random';

const KEY='puzzles-water-garden-v1',audio=new GameAudio();
let random: RandomGarden | undefined;
let index=0,game=createGame(levels[0]),selected=game.pipes[0].id,completed:string[]=[],notice='',saving=true;
try{const raw=localStorage.getItem(KEY),saved=readSave(raw);if(saved){({index,game,selected,completed,random}=saved);}else if(raw)notice='Previous save could not be restored. A fresh water puzzle is ready.';}catch{saving=false;}
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<header class="topbar"><a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a><span class="brand">Water Garden</span><button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button></header>
<main class="game-shell"><div class="puzzle-heading"><h1 id="title"></h1><span id="level-number"></span></div><p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved. Keep this tab open.</p>
<div class="stats"><div><strong id="moves">0</strong><span>Turns</span></div><div><strong id="lit">0</strong><span>Flowers watered</span></div></div>
<section class="play-area" aria-label="Water puzzle"><div id="scene" class="scene" tabindex="0" role="group" aria-label="3D water garden. Tap a channel to turn it. Choose Rotate to look around without turning channels."></div></section>
<p id="status" class="status" role="status" aria-live="polite"></p>
<div class="channel-controls"><label class="car-choice"><span class="sr-only">Choose a channel</span><select id="channel-select" aria-label="Choose a channel"></select></label><button id="turn">Turn ↻</button></div>
<div class="actions"><button id="undo">Undo</button><button id="hint">Hint</button><button id="retry">Retry</button><button id="next" class="primary" hidden>Next garden</button></div></main>
<dialog id="menu" class="sheet" aria-labelledby="menu-title"><div class="sheet-heading"><h2 id="menu-title">Your water garden</h2><button id="close-menu">Done</button></div><div class="sheet-body"><label>Choose a garden<select id="level-select"></select></label>
<label>Random difficulty<select id="random-difficulty"><option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></label>
<div class="menu-pair"><button id="new-random">New random puzzle</button></div><p id="progress" class="muted"></p><section class="instructions"><h3>A drink for every flower</h3><p>Turn the little channels until water from the spring reaches every flower. Water only crosses between matching openings. Flowers drink from any side; they do not pass water onward. Open channel ends simply stop the flow.</p><p>Tap a channel to turn it clockwise, or choose one below the board and press Turn. Straight, corner and branching channels stay in their sockets. Dry channels are sandy; flowing water is blue.</p><p>Choose Rotate and drag to orbit or tilt. Pinch or scroll to zoom; ↺ resets the camera. Choose Play to turn channels again. Camera gestures never count as turns.</p><p>Keyboard: select a channel from the dropdown and press Turn, or focus the board and press Enter or Space. In Rotate, board arrow keys move the camera and Home resets it.</p><p>Hint turns one channel along a shortest solution. Undo reverses a turn, including a winning turn. Retry resets this garden; completed gardens keep their marks. There is no timer.</p></section><button id="sound" class="menu-row" aria-pressed="true">Sound: on</button><p id="save-state" class="muted"></p></div></dialog>`;
const menu=$<HTMLDialogElement>('menu');
const difficultySelect=$<HTMLSelectElement>('random-difficulty');
difficultySelect.value=random?.difficulty ?? 'easy';
const difficultyNames: Record<Difficulty, string>={easy:'Easy',medium:'Medium',hard:'Hard'};
let scene:WaterScene|undefined;
try{scene=new WaterScene($('scene'),id=>{if(menu.open)return;selected=id;draw();save();},id=>{if(!menu.open)turn(id);});}catch{$('scene').textContent='The garden could not render. Use a browser with 3D graphics support.';}
function save(){try{localStorage.setItem(KEY,writeSave(index,game,selected,completed,random));}catch{saving=false;}$('storage-warning').hidden=saving;$('save-state').textContent=saving?'Progress saved on this device.':'Saving unavailable. Keep this tab open.';}
function turn(id:string){if(!rotate(game,id))return;selected=id;notice='';if(!random&&game.status==='won'&&!completed.includes(game.level.id))completed.push(game.level.id);audio.play(game.status==='won'?'win':'flag');draw();save();if(game.status==='won')$('next').focus();}
function draw(){const won=game.status==='won',water=flow(game);scene?.update(game,selected);$('title').textContent=game.level.title;$('level-number').textContent=random?difficultyNames[random.difficulty]:`${index+1} / ${levels.length}`;$('moves').textContent=String(game.moves);$('lit').textContent=`${water.watered.length} / ${game.level.flowers.length}`;$('status').textContent=won?'Every flower is watered. Beautifully done.':notice||'Turn the channels to water every flower.';$('channel-select').innerHTML=game.pipes.map((pipe,i)=>`<option value="${pipe.id}" ${pipe.id===selected?'selected':''}>Channel ${i+1} · row ${pipe.y+1}, column ${pipe.x+1} · ${pipe.kind==='elbow'?'corner':pipe.kind==='tee'?'branch':'straight'} · opens ${pipePorts(pipe).map(dir=>({n:'north',e:'east',s:'south',w:'west'})[dir]).join(' + ')}</option>`).join('');$<HTMLSelectElement>('channel-select').disabled=won;$<HTMLButtonElement>('turn').disabled=won;$<HTMLButtonElement>('undo').disabled=!game.history.length;$('hint').hidden=won;$('next').hidden=!won;$('next').textContent=random?'New random puzzle':index===levels.length-1?'Choose a garden':'Next garden';$('level-select').innerHTML=(random?'<option value="" disabled selected>Random garden</option>':'')+levels.map((level,i)=>`<option value="${i}" ${!random&&index===i?'selected':''}>${i+1}. ${level.title}${completed.includes(level.id)?' ✓':''}</option>`).join('');$('progress').textContent=`${completed.length} of ${levels.length} gardens watered.`;$('sound').textContent=audio.enabled?'Sound: on':'Sound: off';$('sound').setAttribute('aria-pressed',String(audio.enabled));}
function load(next: number, puzzle?: RandomGarden) {
  const nextGame = createGame(puzzle ? generateGarden(puzzle) : levels[next]);
  scene?.cancelInput();
  index = next;
  random = puzzle;
  game = nextGame;
  selected = game.pipes[0].id;
  notice = '';
  menu.close();
  draw();
  save();
  $('scene').focus();
}
function newRandom(difficulty: Difficulty) {
  load(index, { version: 1, seed: randomSeed(), difficulty });
}
$('new-random').onclick = () => {
  if (isDifficulty(difficultySelect.value)) newRandom(difficultySelect.value);
};
$('channel-select').onchange=e=>{scene?.cancelInput();selected=(e.target as HTMLSelectElement).value;notice='';draw();save();};$('turn').onclick=()=>turn(selected);
$('undo').onclick=()=>{scene?.cancelInput();if(undo(game)){notice='';draw();save();}};$('retry').onclick=()=>load(index,random);
$('hint').onclick=()=>{scene?.cancelInput();const solution=solve(game);if(solution?.length){turn(solution[0]);if(game.status!=='won'){notice='Hint: one channel turned toward the solution.';draw();}}else{notice='No hint found within the search limit. Try undo or retry.';draw();}};
$('next').onclick = () => {
  if (random) newRandom(random.difficulty);
  else if (index < levels.length - 1) load(index + 1);
  else menu.showModal();
};$('level-select').onchange=e=>load(Number((e.target as HTMLSelectElement).value));
$('open-menu').onclick=()=>{scene?.cancelInput();menu.showModal();};$('close-menu').onclick=()=>menu.close();menu.addEventListener('close',()=>$('open-menu').focus());
$('sound').onclick=()=>{audio.setEnabled(!audio.enabled);if(audio.enabled)audio.play('flag');draw();};
$('scene').addEventListener('keydown',e=>{if(menu.open||$('scene').dataset.cameraMode==='rotate'||(e.target as HTMLElement).closest('button'))return;if(e.key==='Enter'||e.key===' '){e.preventDefault();turn(selected);}});
for(const event of ['pointerdown','pointerup','keydown'])document.addEventListener(event,()=>audio.unlock(),{capture:true});
document.addEventListener('pointerdown',e=>{if(!(e.target instanceof Element)||!e.target.closest('#scene'))scene?.cancelInput();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)scene?.cancelInput();save();});window.addEventListener('pagehide',save);
draw();save();
