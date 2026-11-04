import { isDifficulty } from '../../shared/random-puzzle';
import { createGame, move, validateLevel, type Game, type Direction } from './engine';
import { levels } from './levels';
import { fitsDifficulty, randomTitle, type RandomPath } from './random';

const MAX_BYTES=1024*1024,MAX_MOVES=5000;
export function writeSave(game:Game,completed:string[],random?:RandomPath):string{
  const raw=JSON.stringify({
    version:1, level:game.level.id,
    history:game.history.map(step=>step.direction), completed,
    random:random?{...random,opening:game.level}:undefined,
  });
  if(game.history.length>MAX_MOVES||new TextEncoder().encode(raw).byteLength>MAX_BYTES)throw new RangeError('Save too large');
  return raw;
}
export function readSave(raw:string|null):{index:number;game:Game;completed:string[];random?:RandomPath}|null{
  if(!raw||new TextEncoder().encode(raw).byteLength>MAX_BYTES)return null;
  try{
    const data=JSON.parse(raw);
    if(!data||data.version!==1||!Array.isArray(data.history)||data.history.length>MAX_MOVES||!Array.isArray(data.completed)||data.completed.length>levels.length)return null;
    if(data.completed.some((id:unknown)=>typeof id!=='string'||!levels.some(level=>level.id===id)))return null;

    const index=levels.findIndex(level=>level.id===data.level);
    let opening=levels[index];
    let random:RandomPath|undefined;
    if(data.random!==undefined){
      const metadata=data.random;
      if(!metadata||typeof metadata.seed!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(metadata.seed)||!isDifficulty(metadata.difficulty))return null;
      const level=validateLevel(metadata.opening);
      if(!level||data.level!=='frost-random'||level.id!==data.level||!fitsDifficulty(level,metadata.difficulty))return null;
      random={seed:metadata.seed,difficulty:metadata.difficulty};
      opening={...level,title:randomTitle(random.difficulty)};
    }
    if(!opening)return null;
    const game=createGame(opening);
    for(const dir of data.history){if(!['n','e','s','w'].includes(dir)||!move(game,dir as Direction))return null;}
    const completed=[...new Set<string>(data.completed)];
    if(!random&&game.status==='won'&&!completed.includes(game.level.id))completed.push(game.level.id);
    return {index,game,completed,random};
  }catch{return null;}
}
