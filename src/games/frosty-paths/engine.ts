/** Sliding ice rules and shortest-slide hints, independent of rendering/browser state. */
export type Direction='n'|'e'|'s'|'w';
export interface Cell{x:number;y:number}
export interface Level{id:string;title:string;width:number;height:number;player:Cell;goal:Cell;fish:Cell[];rocks:Cell[]}
export interface Snapshot{player:Cell;collected:Cell[];direction:Direction}
export interface Game{level:Level;player:Cell;collected:Cell[];history:Snapshot[];moves:number;status:'playing'|'won'}
export const DIRECTIONS:readonly Direction[]=['n','e','s','w'];
const vectors:Record<Direction,Cell>={n:{x:0,y:-1},e:{x:1,y:0},s:{x:0,y:1},w:{x:-1,y:0}};
const key=(cell:Cell)=>`${cell.x},${cell.y}`;
const same=(a:Cell,b:Cell)=>a.x===b.x&&a.y===b.y;
const copy=(cells:Cell[])=>cells.map(cell=>({...cell}));
const completed=(level:Level,player:Cell,collected:Cell[])=>same(player,level.goal)&&collected.length===level.fish.length;

export function validateLevel(value:unknown):Level|null{
  if(!value||typeof value!=='object')return null;
  const level=value as Level;
  if(typeof level.id!=='string'||!/^[a-z0-9-]{1,40}$/.test(level.id)||typeof level.title!=='string'||!level.title.length||level.title.length>80
    ||!Number.isInteger(level.width)||!Number.isInteger(level.height)||level.width<3||level.width>8||level.height<3||level.height>8)return null;
  const valid=(cell:Cell)=>!!cell&&Number.isInteger(cell.x)&&Number.isInteger(cell.y)&&cell.x>=0&&cell.x<level.width&&cell.y>=0&&cell.y<level.height;
  if(!valid(level.player)||!valid(level.goal))return null;
  for(const cells of [level.fish,level.rocks])if(!Array.isArray(cells)||cells.length>level.width*level.height||!cells.every(valid)||new Set(cells.map(key)).size!==cells.length)return null;
  if(level.fish.length>4)return null;
  const rocks=new Set(level.rocks.map(key));
  if([level.player,level.goal,...level.fish].some(cell=>rocks.has(key(cell)))||level.fish.some(fish=>same(fish,level.player)||same(fish,level.goal)))return null;
  return{id:level.id,title:level.title,width:level.width,height:level.height,player:{...level.player},goal:{...level.goal},fish:copy(level.fish),rocks:copy(level.rocks)};
}
export function createGame(level:Level):Game{
  const valid=validateLevel(level);if(!valid)throw new RangeError('Invalid frosty path');
  return{level:valid,player:{...valid.player},collected:[],history:[],moves:0,status:completed(valid,valid.player,[])?'won':'playing'};
}
function slide(level:Level,player:Cell,collected:Cell[],direction:Direction):{player:Cell;collected:Cell[]}|null{
  if(!DIRECTIONS.includes(direction))return null;
  const delta=vectors[direction],result={player:{...player},collected:copy(collected)};
  for(;;){
    const next={x:result.player.x+delta.x,y:result.player.y+delta.y};
    if(next.x<0||next.x>=level.width||next.y<0||next.y>=level.height||level.rocks.some(rock=>same(rock,next)))break;
    result.player=next;
    if(level.fish.some(fish=>same(fish,next))&&!result.collected.some(fish=>same(fish,next)))result.collected.push({...next});
  }
  return same(player,result.player)?null:result;
}
export function move(game:Game,direction:Direction):boolean{
  if(game.status==='won')return false;const next=slide(game.level,game.player,game.collected,direction);if(!next)return false;
  game.history.push({player:{...game.player},collected:copy(game.collected),direction});game.player=next.player;game.collected=next.collected;game.moves=game.history.length;
  if(completed(game.level,game.player,game.collected))game.status='won';return true;
}
export function undo(game:Game):boolean{
  const previous=game.history.pop();if(!previous)return false;
  game.player={...previous.player};game.collected=copy(previous.collected);game.moves=game.history.length;game.status=completed(game.level,game.player,game.collected)?'won':'playing';return true;
}
/** BFS visits each penguin-position/fish-mask state once, counting an entire slide as one move. */
export function solve(game:Game,maxStates=50000):Direction[]|null{
  if(completed(game.level,game.player,game.collected))return[];
  if(!Number.isInteger(maxStates)||maxStates<1||maxStates>50000)return null;
  const stateKey=(player:Cell,collected:Cell[])=>`${key(player)}:${game.level.fish.reduce((mask,fish,i)=>mask|(collected.some(cell=>same(cell,fish))?1<<i:0),0)}`;
  type Node={player:Cell;collected:Cell[];parent:number;direction?:Direction};
  const nodes:Node[]=[{player:game.player,collected:game.collected,parent:-1}],visited=new Set([stateKey(game.player,game.collected)]);
  for(let head=0;head<nodes.length;head++)for(const direction of DIRECTIONS){
    const next=slide(game.level,nodes[head].player,nodes[head].collected,direction);if(!next)continue;
    const id=stateKey(next.player,next.collected);if(visited.has(id))continue;
    if(nodes.length>=maxStates)return null;visited.add(id);nodes.push({...next,parent:head,direction});
    if(completed(game.level,next.player,next.collected)){
      const path:Direction[]=[];for(let at=nodes.length-1;nodes[at].parent!==-1;at=nodes[at].parent)path.push(nodes[at].direction!);return path.reverse();
    }
  }
  return null;
}
