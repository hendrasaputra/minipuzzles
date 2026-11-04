/** Channel connectivity and clockwise turns, independent of rendering/browser state. */
export type Direction='n'|'e'|'s'|'w';
export interface Cell{x:number;y:number}
export interface Pipe extends Cell{id:string;kind:'straight'|'elbow'|'tee';turn:number}
export interface Level{id:string;title:string;width:number;height:number;source:Cell&{dir:Direction};pipes:Pipe[];flowers:Cell[];rocks:Cell[]}
export interface Game{level:Level;pipes:Pipe[];history:string[];moves:number;status:'playing'|'won'}
export interface Flow{wet:Cell[];watered:Cell[];segments:{from:Cell;to:Cell}[]}
const directions:readonly Direction[]=['n','e','s','w'];
const vectors:Record<Direction,Cell>={n:{x:0,y:-1},e:{x:1,y:0},s:{x:0,y:1},w:{x:-1,y:0}};
const base:Record<Pipe['kind'],readonly Direction[]>={straight:['n','s'],elbow:['n','e'],tee:['n','e','w']};
const key=(cell:Cell)=>`${cell.x},${cell.y}`;
const copy=(cell:Cell):Cell=>({x:cell.x,y:cell.y});
export function pipePorts(pipe:Pipe):Direction[]{return base[pipe.kind].map(dir=>directions[(directions.indexOf(dir)+pipe.turn)%4]);}

export function validateLevel(value:unknown):Level|null{
  if(!value||typeof value!=='object')return null;
  const level=value as Level;
  if(typeof level.id!=='string'||!/^[a-z0-9-]{1,40}$/.test(level.id)||typeof level.title!=='string'||!level.title.length||level.title.length>80
    ||!Number.isInteger(level.width)||!Number.isInteger(level.height)||level.width<3||level.width>8||level.height<3||level.height>8)return null;
  const valid=(cell:Cell)=>!!cell&&Number.isInteger(cell.x)&&Number.isInteger(cell.y)&&cell.x>=0&&cell.x<level.width&&cell.y>=0&&cell.y<level.height;
  if(!valid(level.source)||!directions.includes(level.source.dir))return null;
  for(const cells of [level.pipes,level.flowers,level.rocks])if(!Array.isArray(cells)||cells.length>level.width*level.height||!cells.every(valid))return null;
  if(level.pipes.length<1||level.pipes.length>10||level.flowers.length<1||level.flowers.length>8
    ||level.pipes.some(pipe=>typeof pipe.id!=='string'||!/^[a-zA-Z0-9-]{1,24}$/.test(pipe.id)||!['straight','elbow','tee'].includes(pipe.kind)||!Number.isInteger(pipe.turn)||pipe.turn<0||pipe.turn>3)
    ||new Set(level.pipes.map(pipe=>pipe.id)).size!==level.pipes.length)return null;
  const cells=[level.source,...level.pipes,...level.flowers,...level.rocks];if(new Set(cells.map(key)).size!==cells.length)return null;
  return{id:level.id,title:level.title,width:level.width,height:level.height,source:{...copy(level.source),dir:level.source.dir},pipes:level.pipes.map(pipe=>({id:pipe.id,...copy(pipe),kind:pipe.kind,turn:pipe.turn})),flowers:level.flowers.map(copy),rocks:level.rocks.map(copy)};
}

export function flow(game:Pick<Game,'level'|'pipes'>):Flow{
  const {level,pipes}=game,byCell=new Map(pipes.map(pipe=>[key(pipe),pipe])),flowers=new Set(level.flowers.map(key));
  const wet:Cell[]=[copy(level.source)],watered:Cell[]=[],segments:Flow['segments']=[],visited=new Set([key(level.source)]),edges=new Set<string>();
  const queue:Cell[]=[level.source];
  for(let head=0;head<queue.length;head++){
    const cell=queue[head],pipe=byCell.get(key(cell)),ports=pipe?pipePorts(pipe):[level.source.dir];
    for(const dir of ports){
      const delta=vectors[dir],next={x:cell.x+delta.x,y:cell.y+delta.y},nextKey=key(next),other=byCell.get(nextKey);
      if(!flowers.has(nextKey)&&(!other||!pipePorts(other).includes(directions[(directions.indexOf(dir)+2)%4])))continue;
      const edge=[key(cell),nextKey].sort().join('|');if(!edges.has(edge)){edges.add(edge);segments.push({from:copy(cell),to:next});}
      if(visited.has(nextKey))continue;visited.add(nextKey);
      if(flowers.has(nextKey))watered.push(next);else{wet.push(next);queue.push(next);}
    }
  }
  return{wet,watered,segments};
}
const won=(game:Pick<Game,'level'|'pipes'>)=>flow(game).watered.length===game.level.flowers.length;
export function createGame(level:Level):Game{
  const valid=validateLevel(level);if(!valid)throw new RangeError('Invalid water garden');
  const game:Game={level:valid,pipes:valid.pipes.map(pipe=>({...pipe})),history:[],moves:0,status:'playing'};
  if(won(game))game.status='won';return game;
}
export function rotate(game:Game,id:string):boolean{
  if(game.status==='won')return false;const pipe=game.pipes.find(pipe=>pipe.id===id);if(!pipe)return false;
  pipe.turn=(pipe.turn+1)%4;game.history.push(id);game.moves=game.history.length;if(won(game))game.status='won';return true;
}
export function undo(game:Game):boolean{
  const id=game.history.pop();if(id===undefined)return false;
  const pipe=game.pipes.find(pipe=>pipe.id===id)!;pipe.turn=(pipe.turn+3)%4;game.moves=game.history.length;game.status=won(game)?'won':'playing';return true;
}
/** BFS merges equivalent straight orientations and minimizes actual clockwise quarter-turns. */
export function solve(game:Game,maxStates=50000):string[]|null{
  if(won(game))return[];if(!Number.isInteger(maxStates)||maxStates<1||maxStates>50000)return null;
  const periods=game.pipes.map(pipe=>pipe.kind==='straight'?2:4),start=game.pipes.map((pipe,i)=>pipe.turn%periods[i]);
  const nodes:{turns:number[];parent:number;pipe:number}[]=[{turns:start,parent:-1,pipe:-1}],visited=new Set([start.join('')]);
  for(let head=0;head<nodes.length;head++)for(let i=0;i<game.pipes.length;i++){
    const turns=nodes[head].turns.slice();turns[i]=(turns[i]+1)%periods[i];const id=turns.join('');if(visited.has(id))continue;
    if(nodes.length>=maxStates)return null;visited.add(id);nodes.push({turns,parent:head,pipe:i});
    if(won({level:game.level,pipes:game.pipes.map((pipe,j)=>({...pipe,turn:turns[j]}))})){
      const solution:string[]=[];for(let at=nodes.length-1;nodes[at].parent!==-1;at=nodes[at].parent)solution.push(game.pipes[nodes[at].pipe].id);return solution.reverse();
    }
  }
  return null;
}
