/** Light tracing and mirror puzzles, independent of browser state and rendering. */
export type Direction='n'|'e'|'s'|'w';
export interface Cell{x:number;y:number}
export interface Mirror extends Cell{id:string;slash:boolean}
export interface Level{id:string;title:string;width:number;height:number;source:Cell&{dir:Direction};mirrors:Mirror[];crystals:Cell[];walls:Cell[]}
export interface Game{level:Level;mirrors:Mirror[];history:string[];status:'playing'|'won';moves:number}
export interface Trace{segments:{from:Cell;to:Cell}[];lit:Cell[];loop:boolean}
const directions:readonly Direction[]=['n','e','s','w'];
const vectors:Record<Direction,Cell>={n:{x:0,y:-1},e:{x:1,y:0},s:{x:0,y:1},w:{x:-1,y:0}};
const slash:Record<Direction,Direction>={n:'e',e:'n',s:'w',w:'s'};
const backslash:Record<Direction,Direction>={n:'w',w:'n',s:'e',e:'s'};
const key=(cell:Cell)=>`${cell.x},${cell.y}`;
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.y===b.y;

export function validateLevel(value:unknown):Level|null{
  if(!value||typeof value!=='object')return null;
  const level=value as Level;
  if(typeof level.id!=='string'||!/^[a-z0-9-]{1,40}$/.test(level.id)||typeof level.title!=='string'||!level.title.length||level.title.length>80
    ||!Number.isInteger(level.width)||!Number.isInteger(level.height)||level.width<3||level.width>8||level.height<3||level.height>8)return null;
  const valid=(cell:Cell)=>!!cell&&Number.isInteger(cell.x)&&Number.isInteger(cell.y)&&cell.x>=0&&cell.x<level.width&&cell.y>=0&&cell.y<level.height;
  if(!valid(level.source)||!directions.includes(level.source.dir))return null;
  for(const cells of [level.mirrors,level.crystals,level.walls]){
    if(!Array.isArray(cells)||cells.length>level.width*level.height||!cells.every(valid)||new Set(cells.map(key)).size!==cells.length)return null;
  }
  if(level.mirrors.length<1||level.mirrors.length>12||level.crystals.length<1||level.crystals.length>12
    ||level.mirrors.some(m=>typeof m.id!=='string'||!/^[a-zA-Z0-9-]{1,24}$/.test(m.id)||typeof m.slash!=='boolean')
    ||new Set(level.mirrors.map(m=>m.id)).size!==level.mirrors.length)return null;
  const cells=[level.source,...level.mirrors,...level.crystals,...level.walls];
  if(new Set(cells.map(key)).size!==cells.length)return null;
  return{id:level.id,title:level.title,width:level.width,height:level.height,source:{x:level.source.x,y:level.source.y,dir:level.source.dir},mirrors:level.mirrors.map(m=>({...m})),crystals:level.crystals.map(c=>({x:c.x,y:c.y})),walls:level.walls.map(c=>({x:c.x,y:c.y}))};
}

export function trace(game:Pick<Game,'level'|'mirrors'>):Trace{
  const {level,mirrors}=game,segments:Trace['segments']=[],lit:Cell[]=[],visited=new Set<string>();
  let cell:Cell={x:level.source.x,y:level.source.y},dir=level.source.dir;
  for(;;){
    const state=`${key(cell)}:${dir}`;
    if(visited.has(state))return{segments,lit,loop:true};
    visited.add(state);
    const delta=vectors[dir],next={x:cell.x+delta.x,y:cell.y+delta.y};
    if(next.x<0||next.x>=level.width||next.y<0||next.y>=level.height||level.walls.some(w=>same(w,next))){
      segments.push({from:cell,to:{x:cell.x+delta.x*.5,y:cell.y+delta.y*.5}});return{segments,lit,loop:false};
    }
    segments.push({from:cell,to:next});
    if(level.crystals.some(c=>same(c,next))&&!lit.some(c=>same(c,next)))lit.push({...next});
    const mirror=mirrors.find(m=>same(m,next));if(mirror)dir=(mirror.slash?slash:backslash)[dir];
    cell=next;
  }
}
const won=(game:Pick<Game,'level'|'mirrors'>)=>trace(game).lit.length===game.level.crystals.length;
export function createGame(level:Level):Game{
  const valid=validateLevel(level);if(!valid)throw new RangeError('Invalid crystal puzzle');
  const game:Game={level:valid,mirrors:valid.mirrors.map(m=>({...m})),history:[],status:'playing',moves:0};
  if(won(game))game.status='won';return game;
}
export function rotate(game:Game,id:string):boolean{
  if(game.status==='won')return false;
  const mirror=game.mirrors.find(m=>m.id===id);if(!mirror)return false;
  mirror.slash=!mirror.slash;game.history.push(id);game.moves=game.history.length;
  if(won(game))game.status='won';return true;
}
export function undo(game:Game):boolean{
  const id=game.history.pop();if(id===undefined)return false;
  const mirror=game.mirrors.find(m=>m.id===id)!;mirror.slash=!mirror.slash;game.moves=game.history.length;game.status=won(game)?'won':'playing';return true;
}
/** Each binary mirror orientation is visited once; breadth-first search minimizes flips. */
export function solve(game:Game,maxStates=4096):string[]|null{
  if(won(game))return[];
  if(!Number.isInteger(maxStates)||maxStates<1||maxStates>4096)return null;
  const nodes:{mask:number;parent:number;mirror:number}[]=[{mask:0,parent:-1,mirror:-1}],visited=new Set([0]);
  for(let head=0;head<nodes.length;head++)for(let i=0;i<game.mirrors.length;i++){
    const mask=nodes[head].mask^(1<<i);if(visited.has(mask))continue;
    if(nodes.length>=maxStates)return null;
    visited.add(mask);nodes.push({mask,parent:head,mirror:i});
    const mirrors=game.mirrors.map((m,j)=>({...m,slash:m.slash!==Boolean(mask&(1<<j))}));
    if(won({level:game.level,mirrors})){
      const path:string[]=[];for(let at=nodes.length-1;nodes[at].parent!==-1;at=nodes[at].parent)path.push(game.mirrors[nodes[at].mirror].id);return path.reverse();
    }
  }
  return null;
}
