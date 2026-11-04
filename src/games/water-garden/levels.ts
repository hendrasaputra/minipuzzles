import type { Cell,Level,Pipe } from './engine';
function level(id:string,title:string,size:number,source:Level['source'],channels:[number,number,Pipe['kind'],number][],flowers:Cell[],rocks:Cell[]=[]):Level{
  return{id,title,width:size,height:size,source,pipes:channels.map(([x,y,kind,turn],i)=>({id:`pipe-${i+1}`,x,y,kind,turn})),flowers,rocks};
}
// Stable originals: changing these openings requires a save migration/version bump.
export const levels:readonly Level[]=[
  level('water-1','First sip',5,{x:0,y:2,dir:'e'},[[1,2,'straight',0]],[{x:2,y:2}]),
  level('water-2','Around the corner',5,{x:0,y:3,dir:'e'},[[1,3,'elbow',2],[1,2,'straight',1]],[{x:1,y:1}]),
  level('water-3','Little ribbon',5,{x:0,y:3,dir:'e'},[[1,3,'straight',0],[2,3,'elbow',2],[2,2,'elbow',0]],[{x:3,y:2}],[{x:3,y:3}]),
  level('water-4','Two thirsty flowers',5,{x:0,y:3,dir:'e'},[[1,3,'tee',3],[2,3,'elbow',1]],[{x:1,y:2},{x:2,y:2}],[{x:3,y:3}]),
  level('water-5','Garden fork',6,{x:0,y:4,dir:'e'},[[1,4,'straight',0],[2,4,'elbow',1],[2,3,'tee',0],[2,2,'elbow',2],[4,1,'elbow',0]],[{x:3,y:3},{x:1,y:2}],[{x:4,y:3}]),
  level('water-6','Courtyard channels',6,{x:0,y:4,dir:'e'},[[1,4,'tee',3],[1,3,'elbow',0],[2,4,'straight',1],[3,4,'elbow',2],[3,3,'straight',1],[3,2,'elbow',1]],[{x:2,y:3},{x:2,y:2}],[{x:4,y:4}]),
  level('water-7','Branching beds',7,{x:0,y:5,dir:'e'},[[1,5,'straight',0],[2,5,'tee',3],[2,4,'straight',1],[2,3,'elbow',0],[3,5,'straight',1],[4,5,'tee',2],[4,6,'elbow',2]],[{x:3,y:3},{x:4,y:4},{x:3,y:6}],[{x:5,y:5}]),
  level('water-8','Blooming network',7,{x:0,y:5,dir:'e'},[[1,5,'elbow',2],[1,4,'straight',1],[1,3,'tee',0],[2,3,'elbow',0],[1,2,'elbow',1],[2,2,'straight',0],[3,2,'tee',1],[4,2,'elbow',3]],[{x:2,y:4},{x:3,y:3},{x:4,y:1}],[{x:3,y:4},{x:4,y:3}]),
];
