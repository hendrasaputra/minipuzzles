import './style.css';
import { startGame, retryGame, reveal, toggleFlag, chord, clueNeighbors, type Game } from './engine';
import { BoardScene } from './scene';
import { BoardGesture, type GestureAction } from './gestures';
import { campaign } from './campaign';
import { BOARD_SIZES, randomConfig, findBoardSize, type BoardSizeId } from './presets';
import { nextDeduction } from './solver';
import { readSession, writeSession, type Session } from './storage';

const KEY = 'petal-save-v2';
const chapters = ['classic', 'layered', 'connected'] as const;
type Chapter = typeof chapters[number];
const ids = campaign.map(level => level.id);
let game = startGame(randomConfig('beginner',1,newSeed()));
let active = 0, exploded = false, elapsed = 0;
let action: Session['action'] = 'reveal';
let levelId: string | null = null;
let completed: string[] = [];
const flatGesture=new BoardGesture();
let flatHold:ReturnType<typeof setTimeout>|undefined;
let inspected: {floor:number;index:number} | undefined;
let notice = '', storageAvailable = true;
let lastTick = performance.now(), elapsedRemainder = 0;
function newSeed() { return Array.from(crypto.getRandomValues(new Uint32Array(4)), n => n.toString(16).padStart(8,'0')).join(''); }
try {
  const raw = localStorage.getItem(KEY) ?? localStorage.getItem('petal-save-v1');
  const session = readSession(raw, ids);
  if (session) {
    ({game,active,elapsed,exploded,action,levelId,completed} = session);
    // A campaign save must still describe the shipped level, including its fixed opening.
    const level = campaign.find(l => l.id === levelId);
    if (level && JSON.stringify(game.config) !== JSON.stringify(startGame(level.config).config)) {
      game = startGame(level.config); elapsed = 0; active = 0;
      notice = 'This level was updated. Your attempt has restarted; chapter progress is kept.';
    }
  } else if (raw) notice = 'The previous save could not be restored. A fresh puzzle is ready.';
} catch { storageAvailable = false; }

const $ = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
if (action === 'inspect') action = 'reveal';
if(!levelId&&game.config.floors>1&&game.config.mode!=='connected'){
  notice='Saved independent floors. New puzzles are connected.';
}
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<header class="topbar">
  <span class="brand"><span class="brand-cube" aria-hidden="true"></span>petal</span>
  <button id="open-menu" class="menu-button" aria-haspopup="dialog">Menu</button>
</header>
<main class="game-shell">
  <section class="game-heading"><p id="chapter"></p><h1 id="subtitle"></h1></section>
  <p id="storage-warning" class="storage-warning" hidden>Progress isn’t being saved on this device.</p>
  <div class="stats" aria-label="Puzzle status">
    <div><strong id="mines"></strong><span>Mines left</span></div>
    <div><strong id="progress"></strong><span>Cleared</span></div>
  </div>
  <section class="play-area" aria-label="Minesweeper game">
    <div class="scene" id="scene" aria-label="3D puzzle board. Tap to reveal, hold to flag, double-tap a number to chord."></div>
    <span id="floor-caption" class="sr-only" aria-live="polite"></span>
  </section>
  <nav id="floor-nav" class="floor-nav" aria-label="Choose floor"><div id="floor-buttons"></div></nav>
  <div class="context-slot">
    <p id="notice" class="notice" role="status" aria-live="polite" hidden></p>
    <p id="context-tip">Double-tap numbers · Pinch to zoom</p>
    <div id="result" class="result" role="status" hidden></div>
    <section id="inspector" class="inspector" aria-label="Selected clue" hidden>
      <div class="clue-summary"><strong id="clue-title"></strong><span id="clue-targets"></span></div>
      <button id="target-floor" class="context-action">View floor</button>
      <button id="chord" class="context-action">Open tiles</button>
      <button id="clear-inspect" class="close-clue" aria-label="Clear selected clue">×</button>
    </section>
  </div>
  <div class="bottom-bar">
    <div id="play-actions" class="action-strip" aria-label="Board actions">
      <button id="reveal-mode" aria-pressed="true">Reveal</button>
      <button id="flag-mode" aria-pressed="false">Flag</button>
      <button id="hint">Hint</button>
    </div>
    <button id="continue" class="primary full" hidden>Next level</button>
    <button id="retry-now" class="primary full" hidden>Try again</button>
  </div>
</main>
<dialog id="menu" class="sheet" aria-labelledby="menu-title">
  <div class="sheet-heading"><h2 id="menu-title">Your game</h2><button id="close-menu" class="sheet-close">Done</button></div>
  <div class="sheet-body">
    <section class="menu-section" aria-label="Choose puzzle">
      <label>Play<select id="play-type"><option value="free">Random puzzles</option><option value="campaign">Learn the rules · fixed puzzles</option></select></label>
      <label id="level-label">Level<select id="level-select"></select></label>
      <label id="mode-label" hidden>Game mode<select id="free-mode"><option value="classic">Classic · one floor</option><option value="connected">Connected floors</option></select></label>
      <label id="size-label" hidden>Board size<select id="board-size">${BOARD_SIZES.map(size=>`<option value="${size.id}">${size.label} · ${size.width}×${size.height} · ${size.mines} mines</option>`).join('')}</select></label>
      <label id="count-label" hidden>Floors<select id="floor-count"><option value="2">2 floors</option><option value="3">3 floors</option></select></label>
      <p id="campaign-progress" class="muted"></p>
      <p id="lesson" class="lesson"></p>
    </section>
    <section class="menu-section menu-pair" aria-label="Puzzle actions"><button id="retry">Retry puzzle</button><button id="new">New random puzzle</button></section>
    <section class="menu-section" aria-label="Camera">
      <div id="camera-modes" class="view-controls"><button id="focus" aria-pressed="true">One floor</button><button id="explode" aria-pressed="false">All floors</button></div>
      <button id="reset-view" class="menu-row">Reset camera</button>
    </section>
    <section class="menu-section"><button id="help" class="menu-row">How to play <span aria-hidden="true">→</span></button><button id="open-flat" class="menu-row">2D & keyboard board <span aria-hidden="true">→</span></button></section>
    <p class="muted">Time played: <span id="timer">00:00</span></p><p id="save-state" class="muted"></p><p id="seed" class="puzzle-id"></p>
  </div>
</dialog>
<dialog id="rules" class="sheet" aria-labelledby="rules-title">
  <div class="sheet-heading"><h2 id="rules-title">How to play</h2><button id="close-help" class="sheet-close">Back</button></div>
  <div class="sheet-body rules-copy">
    <p>Reveal every safe tile on every floor. A mine ends the attempt.</p>
    <ul>
      <li><strong>Reveal:</strong> tap a hidden tile.</li>
      <li><strong>Flag:</strong> select Flag, hold a tile, or right-click.</li>
      <li><strong>Open around a number:</strong> double-click or double-tap it when its flag count matches. Wrong flags can expose a mine.</li>
      <li><strong>Look around:</strong> drag to rotate, pinch or scroll to zoom. Once zoomed in, drag to move around the board. Camera options are in Menu.</li>
    </ul>
    <h3>Follow the clues</h3>
    <p>Plain numbers count eight same-floor neighbors. Layered floors are independent.</p>
    <p>Connected arrows ↑ and ↓ count the 3×3 footprint on the immediately adjacent floor, including the aligned tile. Edges clip the footprint. Tap a revealed clue to highlight its targets; View floor takes you there.</p>
    <p>Zeros and chording use that same neighborhood. Hints assume your flags are correct.</p>
    <h3>Random puzzles or learning</h3>
    <p>Random puzzles use a fresh seed for every new game. Choose Small, Beginner, Intermediate or Expert in Menu. Multiple floors use connected ↑ and ↓ clues. Random puzzles can require guesses. The optional learning campaign uses fixed, validated layouts and introduces independent floors before connected clues. Retry and resume keep the current layout; New random puzzle creates a new one.</p>
    <button id="start-play" class="primary full">Back to game</button>
  </div>
</dialog>
<dialog id="flat-board" class="sheet flat-sheet" aria-labelledby="flat-title">
  <div class="sheet-heading"><h2 id="flat-title">2D board</h2><button id="close-flat" class="sheet-close">Back</button></div>
  <div class="sheet-body">
    <label id="flat-floor-label">Floor<select id="flat-floor" aria-label="2D board floor"></select></label>
    <p class="keyboard-help">Arrows move. Enter uses the selected action; F flags; I inspects; C opens around a clue.</p>
    <div class="grid-scroll"><div id="accessible-board" role="grid" aria-label="Current floor" aria-describedby="clue-description"></div></div>
    <section class="flat-inspector" aria-label="Clue neighborhood"><p id="clue-description" aria-live="polite">Tap a revealed clue to see its neighborhood.</p><div class="menu-pair"><button id="flat-target">View target floor</button><button id="flat-chord">Open tiles</button></div></section>
    <p id="flat-notice" class="flat-notice" role="status"></p>
  </div>
  <div class="flat-actions"><div id="flat-play-actions" class="action-strip" aria-label="2D board actions"><button id="flat-reveal" aria-pressed="true">Reveal</button><button id="flat-flag" aria-pressed="false">Flag</button><button id="flat-hint">Hint</button></div><button id="flat-continue" class="primary full" hidden>Next level</button><button id="flat-retry" class="primary full" hidden>Try again</button></div>
</dialog>
`;
const menu=$<HTMLDialogElement>('menu'), rules=$<HTMLDialogElement>('rules'), flat=$<HTMLDialogElement>('flat-board');
let displayedStatus=game.status;
let scene: BoardScene | undefined;
try { scene = new BoardScene($('scene'), (...args)=>{if(!menu.open&&!rules.open&&!flat.open)act(...args);}); }
catch { $('scene').innerHTML = '<p class="webgl-error">3D graphics are unavailable.<br>Open Menu → 2D board to play.</p>'; flat.showModal(); }
function chapter(): Chapter { return game.config.mode === 'connected' ? 'connected' : game.config.floors > 1 ? 'layered' : 'classic'; }
function unlocked(index:number) { return index === 0 || completed.includes(campaign[index-1].id); }
function save() {
  try { localStorage.setItem(KEY,writeSession({game,active,elapsed,exploded,action,levelId,completed})); }
  catch { storageAvailable = false; }
  $('save-state').textContent = storageAvailable ? 'Progress saved on this device.' : 'Saving unavailable. Keep this tab open.';
  $('storage-warning').hidden=storageAvailable;
}
function inspect(floor:number,index:number) {
  if (!game.cells[floor][index].revealed || game.cells[floor][index].mine) { notice = 'Reveal a safe clue before inspecting its neighborhood.'; return; }
  inspected = {floor,index}; notice = '';
}
function markCompletion() {
  if (game.status === 'won' && levelId && !completed.includes(levelId)) completed.push(levelId);
}
function act(floor:number,index:number,flag:boolean,doubleTap=false) {
  if (menu.open || rules.open || floor !== active) return;
  const cell = game.cells[floor][index]; notice = '';
  if (doubleTap && cell.revealed && !cell.mine) {performChord(floor,index);return;}
  if (cell.revealed && !flag) inspect(floor,index);
  else if (flag || action === 'flag') toggleFlag(game,floor,index);
  else reveal(game,floor,index);
  markCompletion(); draw(); save();
}
function performChord(floor:number,index:number) {
  notice='';
  if(!chord(game,floor,index)) {
    const cell=game.cells[floor][index];
    if(!cell.revealed) notice='Reveal a number first.';
    else if(clueNeighbors(game,floor,index).filter(p=>game.cells[p.floor][p.index].flagged).length!==cell.adjacent) notice='Flag count must match the number.';
  }
  markCompletion(); draw(); save();
}
function draw() {
  const statusChanged=displayedStatus!==game.status;displayedStatus=game.status;
  scene?.update(game,active,exploded,inspected);
  const cells=game.cells.flat(), cleared=cells.filter(c=>c.revealed&&!c.mine).length;
  const c=chapter(), level=campaign.find(l=>l.id===levelId), terminal=game.status==='won'||game.status==='lost';
  $('mines').textContent=String(game.config.mines*game.config.floors-cells.filter(c=>c.flagged).length).padStart(2,'0');
  $('progress').textContent=`${cleared} / ${cells.length-game.config.mines*game.config.floors}`;
  $('chapter').textContent=`${c==='connected'?'Connected floors':c[0].toUpperCase()+c.slice(1)}${level?' · Learn':' · Random'}`;
  $('subtitle').textContent=level?level.title:`${game.config.width} × ${game.config.height} board`;
  $('lesson').textContent=level?level.lesson:c==='layered'?'This saved puzzle has independent floors. New random puzzles connect floors with ↑ and ↓ clues.':c==='connected'?'↑ and ↓ clues connect neighboring floors. Zoom in and drag to reach distant tiles. Random puzzles may require guesses.':'Fresh seeded layouts with safe openings. Zoom in and drag on larger boards. Random puzzles may require guesses.';
  $<HTMLSelectElement>('play-type').value=levelId?'campaign':'free';
  $('level-label').hidden=!levelId; $('mode-label').hidden=!!levelId; $('size-label').hidden=!!levelId;
  $('count-label').hidden=!!levelId||c!=='connected';
  $<HTMLSelectElement>('board-size').value=findBoardSize(game.config);
  $<HTMLSelectElement>('floor-count').value=String(game.config.floors);
  $('free-mode').innerHTML=`<option value="classic">Classic · one floor</option>${c==='layered'&&!level?'<option value="layered" disabled>Independent floors · saved game</option>':''}<option value="connected">Connected floors</option>`;
  $<HTMLSelectElement>('free-mode').value=c;
  $('level-select').innerHTML=campaign.map((l,i)=>`<option value="${l.id}" ${l.id===levelId?'selected':''} ${unlocked(i)?'':'disabled'}>${completed.includes(l.id)?'✓ ':''}${i+1}. ${l.title}${unlocked(i)?'':' · locked'}</option>`).join('');
  $('campaign-progress').textContent=level?`${completed.length} of ${campaign.length} lessons cleared · ${game.config.mines} mines per floor`:game.config.floors>1?`${game.config.mines} mines per floor · ${game.config.mines*game.config.floors} total`:`${game.config.mines} mines`;
  const next=level?campaign.findIndex(l=>l.id===levelId)+1:-1;
  const nextLabel=level?next<campaign.length?'Next lesson':'Play random puzzles':'New puzzle';
  $('continue').textContent=nextLabel;
  $('floor-caption').textContent=`Floor ${active+1} of ${game.config.floors}`;
  $('floor-nav').hidden=game.config.floors===1;
  $('floor-buttons').innerHTML=game.cells.map((floor,f)=>`<button class="floor-button ${f===active?'selected':''}" data-floor="${f}" aria-pressed="${f===active}">Floor ${f+1}${floor.every(cell=>cell.mine||cell.revealed)?' ✓':''}</button>`).join('');
  $('floor-buttons').querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.onclick=()=>setFloor(Number(b.dataset.floor)));
  $('flat-floor-label').hidden=game.config.floors===1;
  $('flat-floor').innerHTML=game.cells.map((_,f)=>`<option value="${f}" ${active===f?'selected':''}>Floor ${f+1}</option>`).join('');
  $('result').hidden=!terminal;
  $('result').textContent=game.status==='won'?'Every safe tile is clear.':'A mine. Try the same puzzle again.';
  $('result').classList.toggle('loss',game.status==='lost');
  $('play-actions').hidden=terminal; $('continue').hidden=game.status!=='won'; $('retry-now').hidden=game.status!=='lost';
  $('context-tip').hidden=!!inspected||terminal||!!notice;
  $('camera-modes').hidden=game.config.floors===1;
  $('flat-play-actions').hidden=terminal;
  $('flat-continue').hidden=game.status!=='won';
  $('flat-retry').hidden=game.status!=='lost';
  $('flat-continue').textContent=nextLabel;
  $('flat-title').textContent=level?level.title:'2D board';
  $('seed').textContent=`${levelId?'Lesson '+levelId:'Seed '+game.config.seed} · Generator 1`;
  $('notice').textContent=notice; $('notice').hidden=!notice||flat.open||terminal;
  $('flat-notice').textContent=terminal?$('result').textContent:notice;
  for(const [id,on] of [['focus',!exploded],['explode',exploded],['reveal-mode',action==='reveal'],['flag-mode',action==='flag'],['flat-reveal',action==='reveal'],['flat-flag',action==='flag']] as const){$(id).classList.toggle('selected',on);$(id).setAttribute('aria-pressed',String(on));}
  drawInspector(); drawAccessible(); tick();
  if(statusChanged&&terminal) $(flat.open?(game.status==='won'?'flat-continue':'flat-retry'):(game.status==='won'?'continue':'retry-now')).focus();
}
function drawInspector() {
  $('inspector').hidden=!inspected||!!notice||game.status==='won'||game.status==='lost';
  if(!inspected){
    $('clue-description').textContent='Tap a revealed clue to highlight its neighborhood.';
    $<HTMLButtonElement>('flat-chord').disabled=$<HTMLButtonElement>('flat-target').disabled=true;
    return;
  }
  const {floor,index}=inspected, cell=game.cells[floor][index], targets=clueNeighbors(game,floor,index), type=cell.clueType??'local';
  const flags=targets.filter(p=>game.cells[p.floor][p.index].flagged).length;
  const targetFloor=targets[0]?.floor??floor;
  const canChord=flags===cell.adjacent&&targets.some(p=>!game.cells[p.floor][p.index].revealed&&!game.cells[p.floor][p.index].flagged)&&game.status!=='lost'&&game.status!=='won';
  const visiting=type!=='local'&&active!==targetFloor;
  $('clue-title').textContent=`${type==='above'?'↑ ':type==='below'?'↓ ':''}${cell.adjacent} ${type==='local'?'nearby':`on floor ${targetFloor+1}`}`;
  $('clue-targets').textContent=`${flags} of ${cell.adjacent} flags${type==='local'?'':` · from floor ${floor+1}`}`;
  $('clue-description').textContent=`Floor ${floor+1}, row ${Math.floor(index/game.config.width)+1}, column ${index%game.config.width+1}: ${type} ${cell.adjacent}. Counts ${targets.length} cells on floor ${targetFloor+1}. ${flags} flags. ${type==='local'?'The clue cell is excluded.':'The aligned tile is included; the source floor is excluded.'}`;
  $('target-floor').hidden=!visiting; $('target-floor').textContent=`View floor ${targetFloor+1}`;
  $('chord').hidden=visiting;
  for(const id of ['chord','flat-chord'])$<HTMLButtonElement>(id).disabled=!canChord;
  $<HTMLButtonElement>('flat-target').disabled=type==='local';
}
function drawAccessible() {
  const board=$('accessible-board'), w=game.config.width;
  const focused=(document.activeElement as HTMLElement)?.dataset.cell;
  const targets=inspected?clueNeighbors(game,inspected.floor,inspected.index):[];
  board.style.gridTemplateColumns=`repeat(${w}, minmax(48px, 1fr))`;
  board.setAttribute('aria-label',`Floor ${active+1}`);
  board.innerHTML=Array.from({length:game.config.height},(_,row)=>`<div role="row" class="board-row">${game.cells[active].slice(row*w,(row+1)*w).map((cell,col)=>{
    const i=row*w+col, mine=cell.mine&&(cell.revealed||game.status==='lost'), type=cell.clueType??'local';
    const target=targets.some(p=>p.floor===active&&p.index===i), source=inspected?.floor===active&&inspected.index===i;
    const arrow=type==='above'?'↑':type==='below'?'↓':'';
    const state=mine?'Mine':cell.flagged?'Flagged':cell.revealed?`${type} clue ${cell.adjacent}`:'Hidden';
    return `<button role="gridcell" data-cell="${i}" tabindex="${i===Number(focused??0)?0:-1}" aria-label="Row ${row+1}, column ${col+1}: ${state}${target?', clue target':''}${source?', inspected clue':''}" class="${cell.revealed?'open':''} ${target?'target':''} ${source?'source':''}">${mine?'✹':cell.flagged?'⚑':cell.revealed?`${arrow}${type!=='local'?cell.adjacent:cell.adjacent||'·'}`:'◇'}</button>`;
  }).join('')}</div>`).join('');
  board.querySelectorAll<HTMLButtonElement>('button').forEach(b=>{
    const i=Number(b.dataset.cell);
    b.onclick=e=>{if(e.detail===0)act(active,i,false);};
    b.onkeydown=e=>{
      cancelFlatInput();
      if(['f','i','c'].includes(e.key.toLowerCase())){e.preventDefault();if(e.key.toLowerCase()==='f')act(active,i,true);else if(e.key.toLowerCase()==='i'){inspect(active,i);draw();}else performChord(active,i);return;}
      let next=i;
      if(e.key==='ArrowRight')next=Math.min(i+1,w*game.config.height-1);else if(e.key==='ArrowLeft')next=Math.max(i-1,0);else if(e.key==='ArrowDown')next=Math.min(i+w,w*game.config.height-1);else if(e.key==='ArrowUp')next=Math.max(i-w,0);else return;
      e.preventDefault();b.tabIndex=-1;const target=board.querySelector<HTMLButtonElement>(`[data-cell="${next}"]`)!;target.tabIndex=0;target.focus();
    };
  });
  if(focused!==undefined)board.querySelector<HTMLButtonElement>(`[data-cell="${focused}"]`)?.focus();
}
function resetUI() {
  cancelFlatInput();active=0;elapsed=0;elapsedRemainder=0;lastTick=performance.now();inspected=undefined;notice='';
  scene?.reset();markCompletion();draw();
  if(flat.open)$('accessible-board').querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  else if(!menu.open&&!rules.open)$(action==='flag'?'flag-mode':'reveal-mode').focus();
  save();
}
function loadLevel(id:string) {const index=campaign.findIndex(l=>l.id===id);if(index<0||!unlocked(index))return;levelId=id;game=startGame(campaign[index].config);resetUI();}
function freePlay(c:Chapter,floors=c==='classic'?1:2,size=findBoardSize(game.config)) {
  levelId=null;game=startGame(randomConfig(size,c==='classic'?1:Math.max(2,floors),newSeed()));resetUI();
}
function setFloor(floor:number) {if(floor<game.config.floors){cancelFlatInput();active=floor;draw();save();}}
$('retry').onclick=()=>{menu.close();try {game=retryGame(game);resetUI();}catch{notice='This legacy puzzle cannot be reproduced from its seed. Choose New puzzle to continue.';draw();}};
function nextPuzzle() {if(levelId){const next=campaign.findIndex(l=>l.id===levelId)+1;if(next<campaign.length)loadLevel(campaign[next].id);else freePlay('connected');}else freePlay(chapter(),game.config.floors);}
$('new').onclick=()=>{menu.close();freePlay(chapter(),game.config.floors);};
$('continue').onclick=$('flat-continue').onclick=nextPuzzle;
$('retry-now').onclick=$('flat-retry').onclick=()=>$('retry').click();
$<HTMLSelectElement>('level-select').onchange=e=>{loadLevel((e.target as HTMLSelectElement).value);menu.close();};
$<HTMLSelectElement>('free-mode').onchange=e=>freePlay((e.target as HTMLSelectElement).value as Chapter);
$<HTMLSelectElement>('board-size').onchange=e=>freePlay(chapter(),game.config.floors,(e.target as HTMLSelectElement).value as BoardSizeId);
$<HTMLSelectElement>('play-type').onchange=e=>{
  if((e.target as HTMLSelectElement).value==='free')freePlay(chapter(),game.config.floors);
  else {const first=campaign.findIndex(l=>l.chapter===chapter());loadLevel(campaign[unlocked(first)?first:0].id);}
};
$<HTMLSelectElement>('floor-count').onchange=e=>freePlay('connected',Number((e.target as HTMLSelectElement).value));
$('focus').onclick=()=>{exploded=false;draw();save();};$('explode').onclick=()=>{exploded=true;draw();save();};$('reset-view').onclick=()=>scene?.reset();
for(const a of ['reveal','flag'] as const){const choose=()=>{action=a;draw();save();};$(`${a}-mode`).onclick=choose;$(`flat-${a}`).onclick=choose;}
function targetFloor() {if(inspected){const targets=clueNeighbors(game,inspected.floor,inspected.index);if(targets.length)setFloor(targets[0].floor);}}
$('target-floor').onclick=$('flat-target').onclick=targetFloor;
$('chord').onclick=$('flat-chord').onclick=()=>{if(inspected)performChord(inspected.floor,inspected.index);};
$('clear-inspect').onclick=()=>{inspected=undefined;draw();};
$('hint').onclick=$('flat-hint').onclick=()=>{
  if(game.status==='won'||game.status==='lost'){notice='Retry or start the next puzzle to continue.';draw();return;}
  const step=nextDeduction(game);
  if(step==='contradiction'){notice='Check your flags before using Hint.';draw();return;}
  if(!step){notice='No logical move found. Check flags or try a new puzzle.';draw();return;}
  active=step.floor;
  if(step.action==='flag')toggleFlag(game,step.floor,step.index);else reveal(game,step.floor,step.index);
  inspected=step.sources[0];notice=`Hint: ${step.action==='flag'?'flagged':'opened'} floor ${step.floor+1}, row ${Math.floor(step.index/game.config.width)+1}, column ${step.index%game.config.width+1}.`;
  markCompletion();draw();save();
};
function openSheet(dialog:HTMLDialogElement) {
  scene?.cancelInput();cancelFlatInput();menu.close();
  dialog.showModal();lastTick=performance.now();draw();
}
$('open-menu').onclick=()=>openSheet(menu);
$('close-menu').onclick=()=>menu.close();
$('help').onclick=()=>openSheet(rules);
$('close-help').onclick=$('start-play').onclick=()=>rules.close();
$('open-flat').onclick=()=>openSheet(flat);
$('close-flat').onclick=()=>flat.close();
$<HTMLSelectElement>('flat-floor').onchange=e=>setFloor(Number((e.target as HTMLSelectElement).value));
for(const dialog of [menu,rules,flat])dialog.addEventListener('close',()=>{cancelFlatInput();lastTick=performance.now();if(!menu.open&&!rules.open&&!flat.open)$('open-menu').focus();draw();});
window.addEventListener('keydown',e=>{if(menu.open||rules.open||e.target instanceof HTMLSelectElement||e.altKey||e.ctrlKey||e.metaKey)return;if(e.key.toLowerCase()==='e'){exploded=!exploded;draw();save();}else if(/^[1-3]$/.test(e.key))setFloor(Number(e.key)-1);});
function cancelFlatInput(){clearTimeout(flatHold);flatGesture.cancel();}
function applyFlatInput(input:GestureAction|undefined){
  if(flat.open&&(input?.type==='tap'||input?.type==='flag'||input?.type==='chord'))act(input.tile.floor,input.tile.index,input.type==='flag',input.type==='chord');
}
const flatGrid=$('accessible-board');
flatGrid.addEventListener('pointerdown',e=>{
  const button=(e.target as Element).closest<HTMLButtonElement>('button[data-cell]');
  if(!button||(e.button!==0&&e.button!==2)){cancelFlatInput();return;}
  e.preventDefault();button.focus({preventScroll:true});flatGrid.setPointerCapture(e.pointerId);clearTimeout(flatHold);
  const index=Number(button.dataset.cell),cell=game.cells[active][index];
  applyFlatInput(flatGesture.down(e.pointerId,e.clientX,e.clientY,e.button,{floor:active,index,revealed:cell.revealed&&!cell.mine}));
  if(e.button===0)flatHold=setTimeout(()=>applyFlatInput(flatGesture.hold()),480);
});
flatGrid.addEventListener('pointermove',e=>{flatGesture.move(e.pointerId,e.clientX,e.clientY);});
flatGrid.addEventListener('pointerup',e=>{clearTimeout(flatHold);applyFlatInput(flatGesture.up(e.pointerId));});
flatGrid.addEventListener('pointercancel',cancelFlatInput);
flatGrid.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('pointerdown',e=>{
  const target=e.target instanceof Element?e.target:null;
  if(!target?.closest('#scene'))scene?.cancelInput();
  if(!target?.closest('#accessible-board'))cancelFlatInput();
});
window.addEventListener('blur',cancelFlatInput);
function tick(){$('timer').textContent=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;}
setInterval(()=>{const now=performance.now();if(game.status==='playing'&&!document.hidden&&!rules.open&&!menu.open){elapsedRemainder+=Math.min(2000,now-lastTick);elapsed+=Math.floor(elapsedRemainder/1000);elapsedRemainder%=1000;tick();save();}lastTick=now;},1000);
document.addEventListener('visibilitychange',()=>{lastTick=performance.now();save();});window.addEventListener('pagehide',save);
markCompletion();draw();save();
