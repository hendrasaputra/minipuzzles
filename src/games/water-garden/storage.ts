import { createGame,rotate,type Game } from './engine';
import { levels } from './levels';
import { isDifficulty } from '../../shared/random-puzzle';
import { generateGarden, type RandomGarden } from './random';
const MAX_BYTES=1024*1024,MAX_TURNS=5000;
export function writeSave(index:number,game:Game,selected:string,completed:string[],random?:RandomGarden):string{
  const raw=JSON.stringify({version:1,level:levels[index].id,history:game.history,selected,completed,random});
  if(game.history.length>MAX_TURNS||new TextEncoder().encode(raw).byteLength>MAX_BYTES)throw new RangeError('Save too large');return raw;
}
export function readSave(raw:string|null):{index:number;game:Game;selected:string;completed:string[];random?:RandomGarden}|null{
  if(!raw||new TextEncoder().encode(raw).byteLength>MAX_BYTES)return null;
  try{
    const data=JSON.parse(raw);if(!data||data.version!==1||!Array.isArray(data.history)||data.history.length>MAX_TURNS||!Array.isArray(data.completed)||data.completed.length>levels.length)return null;
    const index=levels.findIndex(level=>level.id===data.level);if(index<0||data.completed.some((id:unknown)=>!levels.some(level=>level.id===id)))return null;
    let random: RandomGarden | undefined;
    if (data.random !== undefined) {
      const candidate = data.random;
      if (!candidate || candidate.version !== 1 || !isDifficulty(candidate.difficulty) ||
          typeof candidate.seed !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(candidate.seed)) return null;
      random = { version: 1, difficulty: candidate.difficulty, seed: candidate.seed };
    }
    const game=createGame(random ? generateGarden(random) : levels[index]);for(const id of data.history){if(typeof id!=='string'||!rotate(game,id))return null;}
    const completed=[...new Set<string>(data.completed)];if(!random&&game.status==='won'&&!completed.includes(game.level.id))completed.push(game.level.id);
    return{index,game,selected:game.pipes.some(pipe=>pipe.id===data.selected)?data.selected:game.pipes[0].id,completed,random};
  }catch{return null;}
}
