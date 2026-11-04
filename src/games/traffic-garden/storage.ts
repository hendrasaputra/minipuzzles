import { createGame, moveCar, validatePuzzle, type Game } from './engine';

const MAX_BYTES=1024*1024;
const MAX_MOVES=5000;
export interface SavedTraffic {game:Game;selected:string}

export function writeSave(game:Game,selected:string):string {
  const raw=JSON.stringify({version:1,puzzle:game.puzzle,history:game.history,selected});
  if(game.history.length>MAX_MOVES||new TextEncoder().encode(raw).byteLength>MAX_BYTES)throw new RangeError('Save too large');
  return raw;
}

/** Replay validated moves instead of trusting saved positions or win flags. */
export function readSave(raw:string|null):SavedTraffic|null {
  if(!raw||new TextEncoder().encode(raw).byteLength>MAX_BYTES)return null;
  try {
    const data=JSON.parse(raw);
    if(!data||data.version!==1||!Array.isArray(data.history)||data.history.length>MAX_MOVES)return null;
    const puzzle=validatePuzzle(data.puzzle);if(!puzzle)return null;
    const game=createGame(puzzle);
    for(const move of data.history){
      if(!move||typeof move.id!=='string'||!Number.isInteger(move.delta)||Math.abs(move.delta)>6||!moveCar(game,move.id,move.delta))return null;
    }
    return {game,selected:game.cars.some(car=>car.id===data.selected)?data.selected:'coral'};
  }catch{return null;}
}
