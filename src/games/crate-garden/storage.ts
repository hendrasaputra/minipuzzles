import { createGame, move, type Game, type Direction } from './engine';
import { levels } from './levels';

const MAX_BYTES=1024*1024,MAX_MOVES=5000;
export function writeSave(index:number,game:Game,completed:string[]):string{
  const raw=JSON.stringify({version:1,level:levels[index].id,history:game.history.map(step=>step.direction),completed});
  if(game.history.length>MAX_MOVES||new TextEncoder().encode(raw).byteLength>MAX_BYTES)throw new RangeError('Save too large');
  return raw;
}
export function readSave(raw:string|null):{index:number;game:Game;completed:string[]}|null{
  if(!raw||new TextEncoder().encode(raw).byteLength>MAX_BYTES)return null;
  try{
    const data=JSON.parse(raw);
    if(!data||data.version!==1||!Array.isArray(data.history)||data.history.length>MAX_MOVES||!Array.isArray(data.completed)||data.completed.length>levels.length)return null;
    const index=levels.findIndex(level=>level.id===data.level);if(index<0)return null;
    if(data.completed.some((id:unknown)=>typeof id!=='string'||!levels.some(level=>level.id===id)))return null;
    const game=createGame(levels[index]);
    for(const dir of data.history){if(!['n','e','s','w'].includes(dir)||!move(game,dir as Direction))return null;}
    const completed=[...new Set<string>(data.completed)];if(game.status==='won'&&!completed.includes(game.level.id))completed.push(game.level.id);
    return {index,game,completed};
  }catch{return null;}
}
