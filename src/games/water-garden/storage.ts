import { createGame,rotate,type Game } from './engine';
import { levels } from './levels';
const MAX_BYTES=1024*1024,MAX_TURNS=5000;
export function writeSave(index:number,game:Game,selected:string,completed:string[]):string{
  const raw=JSON.stringify({version:1,level:levels[index].id,history:game.history,selected,completed});
  if(game.history.length>MAX_TURNS||new TextEncoder().encode(raw).byteLength>MAX_BYTES)throw new RangeError('Save too large');return raw;
}
export function readSave(raw:string|null):{index:number;game:Game;selected:string;completed:string[]}|null{
  if(!raw||new TextEncoder().encode(raw).byteLength>MAX_BYTES)return null;
  try{
    const data=JSON.parse(raw);if(!data||data.version!==1||!Array.isArray(data.history)||data.history.length>MAX_TURNS||!Array.isArray(data.completed)||data.completed.length>levels.length)return null;
    const index=levels.findIndex(level=>level.id===data.level);if(index<0||data.completed.some((id:unknown)=>!levels.some(level=>level.id===id)))return null;
    const game=createGame(levels[index]);for(const id of data.history){if(typeof id!=='string'||!rotate(game,id))return null;}
    const completed=[...new Set<string>(data.completed)];if(game.status==='won'&&!completed.includes(game.level.id))completed.push(game.level.id);
    return{index,game,selected:game.pipes.some(pipe=>pipe.id===data.selected)?data.selected:game.pipes[0].id,completed};
  }catch{return null;}
}
