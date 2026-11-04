import './style.css';
import { gameGuide } from '../../shared/game-guide';
import { randomSeed } from '../../shared/random-puzzle';
import { startGame, retryGame, reveal, toggleFlag, chord, clueNeighbors, type Game } from './engine';
import { BoardScene, type TileFeedback } from './scene';
import { GameAudio, type SoundCue } from '../../shared/audio';
import { BoardGesture, type GestureAction, type TileHit } from '../../shared/gestures';
import { campaign } from './campaign';
import { BOARD_SIZES, randomConfig, findBoardSize, type BoardSizeId } from './presets';
import { nextDeduction } from './solver';
import { readSession, readTransfer, matchesLevel, MAX_SAVE_BYTES, writeSession, type Session } from './storage';

const KEY = 'petal-save-v2';
const sounds=new GameAudio('petals');
type Chapter = (typeof campaign)[number]['chapter'];
const ids = campaign.map(level => level.id);
let game = startGame(randomConfig('beginner',1,randomSeed()));
let active = 0, exploded = false, elapsed = 0;
let action: Session['action'] = 'reveal';
let levelId: string | null = null;
let completed: string[] = [];
const flatGesture=new BoardGesture();
let flatHold:ReturnType<typeof setTimeout>|undefined;
let inspected: {floor:number;index:number} | undefined;
let notice = '', storageAvailable = true;
let lastTick = performance.now(), elapsedRemainder = 0;
function applySession(session:Session) {
  ({game,active,elapsed,exploded,action,levelId,completed}=session);
  if(action==='inspect')action='reveal';
  const level=campaign.find(level=>level.id===levelId);
  if(level&&!matchesLevel(game.config,level.config)) {
    game=startGame(level.config);elapsed=0;active=0;
    notice='This level changed. Your saved progress is kept, and this level has restarted.';
  }
}
function currentSession():Session {return {game,active,elapsed,exploded,action,levelId,completed};}

try {
  const raw = localStorage.getItem(KEY) ?? localStorage.getItem('petal-save-v1');
  const session = readSession(raw, ids);
  if (session) applySession(session);
  else if (raw) notice = 'Could not load the save. A new puzzle is ready.';
} catch { storageAvailable = false; }

const $ = <T extends HTMLElement = HTMLElement>(id:string) => document.getElementById(id) as T;
if(!levelId&&chapter()==='layered'){
  notice='This save has separate floors. New puzzles connect them.';
}
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<header class="topbar">
  <a class="hub-back" href="../../" aria-label="Back to Puzzles">←</a>
  <span class="brand"><span class="brand-cube" aria-hidden="true"></span>Petals</span>
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
    <div class="scene" id="scene" aria-label="3D board. Tap to open a tile. Hold to flag. Double-tap a number to open nearby tiles when the flags match."></div>
    <span id="floor-caption" class="sr-only" aria-live="polite"></span>
  </section>
  <nav id="floor-nav" class="floor-nav" aria-label="Choose floor"><div id="floor-buttons"></div></nav>
  <div class="context-slot">
    <p id="notice" class="notice" role="status" aria-live="polite" hidden></p>
    <p id="context-tip">Tap to open · Hold to flag</p>
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
  <div class="sheet-heading"><h2 id="menu-title">Game options</h2><button id="close-menu" class="sheet-close">Done</button></div>
  <div class="sheet-body">
    <section class="menu-section" aria-label="Choose puzzle">
      <label>Play<select id="play-type"><option value="free">Random puzzles</option><option value="campaign">Learn with levels</option></select></label>
      <label id="level-label">Level<select id="level-select"></select></label>
      <label id="mode-label" hidden>Game mode<select id="free-mode"><option value="classic">One floor</option><option value="connected">Connected floors</option></select></label>
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
    <section class="menu-section"><button id="sound-toggle" class="menu-row" aria-pressed="true">Sound: on</button><button id="help" class="menu-row">How to play <span aria-hidden="true">→</span></button><button id="open-flat" class="menu-row">2D & keyboard board <span aria-hidden="true">→</span></button></section>
    <section class="menu-section" aria-label="Move saved game"><div class="menu-pair"><button id="export-save">Export save</button><button id="import-save">Import save</button></div><input id="save-file" type="file" accept=".json,application/json" aria-label="Import Petals save file" hidden><p class="muted">Export a file to move your game to another browser or site. Use Import save there.</p><p id="transfer-notice" class="muted" role="status" aria-live="polite"></p></section>
    <p class="muted">Time played: <span id="timer">00:00</span></p><p id="save-state" class="muted"></p><p id="seed" class="puzzle-id"></p>
  </div>
</dialog>
<dialog id="rules" class="sheet" aria-labelledby="rules-title">
  <div class="sheet-heading"><h2 id="rules-title">How to play</h2><button id="close-help" class="sheet-close">Back</button></div>
  <div class="sheet-body rules-copy">
    <p>Open every safe tile. Hitting a mine ends the game.</p>
    ${gameGuide([
      { before: '◇', after: '2', text: 'Tap a tile to open it. The number counts nearby mines.' },
      { before: '◇', after: '⚑', text: 'Hold or right-click a tile to flag it. You can also choose Flag.' },
      { before: '⚑ 1 ◇', after: '⚑ 1 □', text: 'Place the right flags, then double-tap the number to open the other tiles.' },
      { before: '↑ 1', after: '▦', text: 'An arrow counts mines in a 3×3 square one floor up or down. Tap it to see the tiles it counts.' },
      { before: '▦  12  ▦', after: '▦', text: 'In Volume, a number counts nearby mines across up to three floors. Tap it to see the tiles on each floor.' },
    ], true)}
    <p>Drag to turn the board. Pinch or scroll to zoom. When zoomed in, drag to move the view.</p>
    <button id="start-play" class="primary full">Back to game</button>
  </div>
</dialog>
<dialog id="flat-board" class="sheet flat-sheet" aria-labelledby="flat-title">
  <div class="sheet-heading"><h2 id="flat-title">2D board</h2><button id="close-flat" class="sheet-close">Back</button></div>
  <div class="sheet-body">
    <label id="flat-floor-label">Floor<select id="flat-floor" aria-label="2D board floor"></select></label>
    <p class="keyboard-help">Arrows move. Enter uses the selected action. F flags, I shows nearby tiles, and C opens them.</p>
    <div class="grid-scroll"><div id="accessible-board" role="grid" aria-label="Current floor" aria-describedby="clue-description"></div></div>
    <section class="flat-inspector" aria-label="Clue neighborhood"><p id="clue-description" aria-live="polite">Tap a number to see the tiles it counts.</p><div class="menu-pair"><button id="flat-target">View target floor</button><button id="flat-chord">Open tiles</button></div></section>
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
function chapter(): Chapter {
  const {mode,floors}=game.config;
  return mode ?? (floors>1?'layered':'classic');
}
function unlocked(index:number) { return index === 0 || completed.includes(campaign[index-1].id); }
function save() {
  try { localStorage.setItem(KEY,writeSession(currentSession())); }
  catch { storageAvailable = false; }
  $('save-state').textContent = storageAvailable ? 'Progress saved on this device.' : 'Saving unavailable. Keep this tab open.';
  $('storage-warning').hidden=storageAvailable;
}
function inspect(floor:number,index:number) {
  if (!game.cells[floor][index].revealed || game.cells[floor][index].mine) { notice = 'Open a number first.'; return; }
  inspected = {floor,index}; notice = '';
}
function moveSound(changed:boolean,cue:SoundCue) {
  if(changed)sounds.play(game.status==='won'?'win':game.status==='lost'?'loss':cue);
}
function markCompletion() {
  if (game.status === 'won' && levelId && !completed.includes(levelId)) completed.push(levelId);
}
function act(floor:number,index:number,flag:boolean,doubleTap=false) {
  if (menu.open || rules.open || floor !== active) return;
  const cell = game.cells[floor][index]; notice = '';
  if (doubleTap && cell.revealed && !cell.mine) {performChord(floor,index);return;}
  let feedback: TileFeedback | undefined;
  if (cell.revealed && !flag) inspect(floor,index);
  else if (flag || action === 'flag') {
    const changed = toggleFlag(game,floor,index);
    moveSound(changed,'flag');
    if (changed) feedback = { floor, index, kind: cell.flagged ? 'flag' : 'unflag' };
  }
  else {
    const changed = reveal(game, floor, index);
    moveSound(changed, 'reveal');
    const opened = game.cells[floor][index];
    if (changed && !opened.mine) feedback = { floor, index, kind: opened.adjacent === 0 ? 'flood' : 'reveal' };
  }
  markCompletion(); draw(feedback); save();
}
function performChord(floor:number,index:number) {
  notice='';
  const origin = floor === active ? { floor, index } : clueNeighbors(game,floor,index).find(p => {
    const cell = game.cells[p.floor][p.index];
    return p.floor === active && !cell.revealed && !cell.flagged;
  });
  const changed=chord(game,floor,index);moveSound(changed,'reveal');
  if(!changed) {
    const cell=game.cells[floor][index];
    if(!cell.revealed) notice='Reveal a number first.';
    else if(clueNeighbors(game,floor,index).filter(p=>game.cells[p.floor][p.index].flagged).length!==cell.adjacent) notice='Match the number with flags first.';
  }
  markCompletion(); draw(changed && origin ? { ...origin, kind: 'chord' } : undefined); save();
}
function draw(feedback?: TileFeedback) {
  const statusChanged=displayedStatus!==game.status;displayedStatus=game.status;
  scene?.update(game,active,exploded,inspected,feedback);
  const cells=game.cells.flat(), cleared=cells.filter(c=>c.revealed&&!c.mine).length;
  const c=chapter(), level=campaign.find(l=>l.id===levelId), terminal=game.status==='won'||game.status==='lost';
  $('sound-toggle').textContent=sounds.enabled?'Sound: on':'Sound: off';
  $('sound-toggle').setAttribute('aria-pressed',String(sounds.enabled));
  $('mines').textContent=String(game.config.mines*game.config.floors-cells.filter(c=>c.flagged).length).padStart(2,'0');
  $('progress').textContent=`${cleared} / ${cells.length-game.config.mines*game.config.floors}`;
  $('chapter').textContent=`${c==='connected'?'Connected floors':c[0].toUpperCase()+c.slice(1)}${level?' · Learn':' · Random'}`;
  $('subtitle').textContent=level?level.title:`${game.config.width} × ${game.config.height} board`;
  $('lesson').textContent=level?level.lesson:c==='volume'?'Each number counts nearby mines on this floor and the floors directly above and below.':c==='layered'?'This puzzle has separate floors.':c==='connected'?'↑ and ↓ count mines one floor up or down. You may need to guess.':'The first tile is safe. You may need to guess later.';
  $<HTMLSelectElement>('play-type').value=levelId?'campaign':'free';
  $('level-label').hidden=!levelId; $('mode-label').hidden=!!levelId; $('size-label').hidden=!!levelId;
  $('count-label').hidden=!!levelId||(c!=='connected'&&c!=='volume');
  $<HTMLSelectElement>('board-size').value=findBoardSize(game.config);
  $('floor-count').innerHTML=(c==='volume'?[3,4]:[2,3]).map(n=>`<option value="${n}">${n} floors</option>`).join('');
  $<HTMLSelectElement>('floor-count').value=String(game.config.floors);
  $('free-mode').innerHTML=`<option value="classic">One floor</option>${c==='layered'&&!level?'<option value="layered" disabled>Separate floors (saved)</option>':''}<option value="connected">Connected floors</option><option value="volume">Volume</option>`;
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
  $('result').textContent=game.status==='won'?'You win! All safe tiles are open.':'You hit a mine.';
  $('result').classList.toggle('loss',game.status==='lost');
  $('play-actions').hidden=terminal; $('continue').hidden=game.status!=='won'; $('retry-now').hidden=game.status!=='lost';
  $('context-tip').hidden=!!inspected||terminal||!!notice;
  $('camera-modes').hidden=game.config.floors===1;
  $('flat-play-actions').hidden=terminal;
  $('flat-continue').hidden=game.status!=='won';
  $('flat-retry').hidden=game.status!=='lost';
  $('flat-continue').textContent=nextLabel;
  $('flat-title').textContent=level?level.title:'2D board';
  $('seed').textContent=`${levelId?'Lesson '+(campaign.findIndex(l=>l.id===levelId)+1):'Puzzle code '+game.config.seed}`;
  $('notice').textContent=notice; $('notice').hidden=!notice||flat.open||terminal;
  $('flat-notice').textContent=terminal?$('result').textContent:notice;
  for(const [id,on] of [['focus',!exploded],['explode',exploded],['reveal-mode',action==='reveal'],['flag-mode',action==='flag'],['flat-reveal',action==='reveal'],['flat-flag',action==='flag']] as const){$(id).classList.toggle('selected',on);$(id).setAttribute('aria-pressed',String(on));}
  drawInspector(); drawAccessible(); tick();
  if(statusChanged&&terminal) $(flat.open?(game.status==='won'?'flat-continue':'flat-retry'):(game.status==='won'?'continue':'retry-now')).focus();
}
function drawInspector() {
  $('inspector').hidden=!inspected||!!notice||game.status==='won'||game.status==='lost';
  if(!inspected){
    $('clue-description').textContent='Tap a number to see the tiles it counts.';
    $<HTMLButtonElement>('flat-chord').disabled=$<HTMLButtonElement>('flat-target').disabled=true;
    return;
  }
  const {floor,index}=inspected, cell=game.cells[floor][index], targets=clueNeighbors(game,floor,index), type=cell.clueType??'local';
  const flags=targets.filter(p=>game.cells[p.floor][p.index].flagged).length;
  const targetFloor=targets[0]?.floor??floor;
  const canChord=flags===cell.adjacent&&targets.some(p=>!game.cells[p.floor][p.index].revealed&&!game.cells[p.floor][p.index].flagged)&&game.status!=='lost'&&game.status!=='won';
  const visiting=(type==='above'||type==='below')&&active!==targetFloor;
  const targetFloors=[...new Set(targets.map(p=>p.floor))].sort((a,b)=>a-b);
  const nextFloor=nextClueFloor(targets);
  if(type==='volume'){
    const range=`${targetFloors[0]+1}–${targetFloors[targetFloors.length-1]+1}`;
    $('clue-title').textContent=`${cell.adjacent} nearby · floors ${range}`;
    $('clue-description').textContent=`Volume clue ${cell.adjacent}. Checks ${targets.length} tiles across floors ${range}. ${flags} flags.`;
  }else{
  $('clue-title').textContent=`${type==='above'?'↑ ':type==='below'?'↓ ':''}${cell.adjacent} ${type==='local'?'nearby':`on floor ${targetFloor+1}`}`;
  $('clue-description').textContent=`Floor ${floor+1}, row ${Math.floor(index/game.config.width)+1}, column ${index%game.config.width+1}: ${type} ${cell.adjacent}. Checks ${targets.length} tiles on floor ${targetFloor+1}. ${flags} flags. ${type==='local'?'The number’s tile is skipped.':'The tile straight up or down is included.'}`;
  }
  $('clue-targets').textContent=`${flags} of ${cell.adjacent} flags${type==='local'?'':` · from floor ${floor+1}`}`;
  for(const id of ['target-floor','flat-target'])$(id).textContent=nextFloor===undefined?'View target floor':`View floor ${nextFloor+1}`;
  $('target-floor').hidden=nextFloor===undefined;
  $('chord').hidden=visiting;
  for(const id of ['chord','flat-chord'])$<HTMLButtonElement>(id).disabled=!canChord;
  $<HTMLButtonElement>('flat-target').disabled=nextFloor===undefined;
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
  const depth=c==='volume'?Math.max(3,floors):c==='classic'?1:Math.min(3,Math.max(2,floors));
  levelId=null;game=startGame(randomConfig(size,depth,randomSeed(),c==='volume'));resetUI();
}
function setFloor(floor:number) {if(floor<game.config.floors){cancelFlatInput();active=floor;draw();save();}}
$('retry').onclick=()=>{menu.close();try {game=retryGame(game);resetUI();}catch{notice='This old puzzle cannot restart. Choose New puzzle.';draw();}};
function nextPuzzle() {if(levelId){const next=campaign.findIndex(l=>l.id===levelId)+1;if(next<campaign.length)loadLevel(campaign[next].id);else freePlay(chapter());}else freePlay(chapter(),game.config.floors);}
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
$<HTMLSelectElement>('floor-count').onchange=e=>freePlay(chapter(),Number((e.target as HTMLSelectElement).value));
$('focus').onclick=()=>{exploded=false;draw();save();};$('explode').onclick=()=>{exploded=true;draw();save();};$('reset-view').onclick=()=>scene?.reset();
for(const a of ['reveal','flag'] as const){const choose=()=>{action=a;draw();save();};$(`${a}-mode`).onclick=choose;$(`flat-${a}`).onclick=choose;}
function nextClueFloor(targets: ReturnType<typeof clueNeighbors>) {
  const floors=[...new Set(targets.map(p=>p.floor))].filter(f=>f!==active).sort((a,b)=>a-b);
  return floors.find(f=>f>active)??floors[0];
}
function targetFloor() {
  if(!inspected)return;
  const next=nextClueFloor(clueNeighbors(game,inspected.floor,inspected.index));
  if(next!==undefined)setFloor(next);
}
$('target-floor').onclick=$('flat-target').onclick=targetFloor;
$('chord').onclick=$('flat-chord').onclick=()=>{if(inspected)performChord(inspected.floor,inspected.index);};
$('clear-inspect').onclick=()=>{inspected=undefined;draw();};
$('hint').onclick=$('flat-hint').onclick=()=>{
  if(game.status==='won'||game.status==='lost'){notice='Retry or start the next puzzle to continue.';draw();return;}
  const step=nextDeduction(game);
  if(step==='contradiction'){notice='Check your flags before using Hint.';draw();return;}
  if(!step){notice='No hint found. Check your flags or try a new puzzle.';draw();return;}
  active=step.floor;
  const changed = step.action==='flag'?toggleFlag(game,step.floor,step.index):reveal(game,step.floor,step.index);
  moveSound(changed,step.action==='flag'?'flag':'reveal');
  inspected=step.sources[0];notice=`Hint: ${step.action==='flag'?'flagged':'opened'} floor ${step.floor+1}, row ${Math.floor(step.index/game.config.width)+1}, column ${step.index%game.config.width+1}.`;
  markCompletion();draw(changed ? { floor: step.floor, index: step.index, kind: step.action } : undefined);save();
};
function openSheet(dialog:HTMLDialogElement) {
  scene?.cancelInput();cancelFlatInput();menu.close();
  dialog.showModal();lastTick=performance.now();draw();
}
$('export-save').onclick=()=>{
  const blob=new Blob([writeSession(currentSession())],{type:'application/json'});
  const url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='petals-save.json';menu.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  $('transfer-notice').textContent='Save file exported. Import it where you want to play.';
};
$('import-save').onclick=()=>$('save-file').click();
$<HTMLInputElement>('save-file').onchange=async e=>{
  const input=e.target as HTMLInputElement,file=input.files?.[0];input.value='';
  if(!file)return;
  try {
    const session=file.size<=MAX_SAVE_BYTES?readTransfer(await file.text(),campaign):null;
    if(!session){$('transfer-notice').textContent='Choose a Petals save file under 1 MB.';return;}
    scene?.cancelInput();cancelFlatInput();applySession(session);inspected=undefined;elapsedRemainder=0;lastTick=performance.now();notice='Save imported.';
    markCompletion();draw();save();$('transfer-notice').textContent='Save imported.';
  }catch{$('transfer-notice').textContent='Could not read the save file.';}
};
$('sound-toggle').onclick=()=>{sounds.setEnabled(!sounds.enabled);if(sounds.enabled)sounds.play('flag');draw();};
for(const event of ['pointerdown','pointerup','keydown'])document.addEventListener(event,()=>sounds.unlock(),{capture:true});
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
