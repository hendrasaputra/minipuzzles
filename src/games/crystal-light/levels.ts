import type { Cell,Level } from './engine';

function level(id:string,title:string,size:number,source:Level['source'],route:[number,number,boolean][],wrong:number[],crystals:Cell[],walls:Cell[]=[],decoys:[number,number,boolean][]=[]):Level{
  return{id,title,width:size,height:size,source,crystals,walls,mirrors:[...route.map(([x,y,slash],i)=>({id:`mirror-${i+1}`,x,y,slash:wrong.includes(i)?!slash:slash})),...decoys.map(([x,y,slash],i)=>({id:`mirror-${route.length+i+1}`,x,y,slash}))]};
}

// Stable, solver-verified layouts; some mirrors already align and must be left alone.
export const levels:readonly Level[]=[
  level('crystal-1','First glow',5,{x:0,y:2,dir:'e'},[[2,2,true]],[0],[{x:2,y:0}]),
  level('crystal-2','Corner turn',5,{x:0,y:3,dir:'e'},[[3,3,true],[3,1,false]],[0,1],[{x:1,y:1}],[{x:1,y:4}]),
  level('crystal-3','Crystal trail',6,{x:0,y:4,dir:'e'},[[4,4,true],[4,1,false],[1,1,false]],[0,2],[{x:3,y:4},{x:4,y:2},{x:1,y:0}],[{x:2,y:3}],[[1,5,true]]),
  level('crystal-4','Quiet courtyard',6,{x:0,y:4,dir:'e'},[[4,4,true],[4,1,false],[1,1,true],[1,3,false]],[0,1,3],[{x:4,y:2},{x:2,y:1},{x:3,y:3}],[{x:2,y:2}],[[5,0,false]]),
  level('crystal-5','Golden ribbon',7,{x:0,y:5,dir:'e'},[[5,5,true],[5,1,false],[1,1,true],[1,4,false],[4,4,true]],[0,2,4],[{x:3,y:5},{x:5,y:3},{x:3,y:1},{x:1,y:3},{x:4,y:2}],[{x:3,y:2},{x:2,y:3}],[[6,6,true]]),
  level('crystal-6','Outer orbit',7,{x:0,y:6,dir:'e'},[[6,6,true],[6,0,false],[0,0,true],[0,4,false],[4,4,true],[4,2,false]],[0,1,3,5],[{x:3,y:6},{x:6,y:3},{x:2,y:0},{x:0,y:2},{x:2,y:4},{x:2,y:2}],[{x:2,y:3}],[[5,5,false]]),
  level('crystal-7','Folded light',7,{x:0,y:6,dir:'e'},[[6,6,true],[6,0,false],[0,0,true],[0,5,false],[5,5,true],[5,1,false],[1,1,true]],[0,1,2,4,6],[{x:3,y:6},{x:6,y:2},{x:3,y:0},{x:0,y:3},{x:2,y:5},{x:5,y:3},{x:1,y:3}],[{x:3,y:3}],[[2,2,false]]),
  level('crystal-8','Prism garden',7,{x:0,y:6,dir:'e'},[[6,6,true],[6,0,false],[0,0,true],[0,5,false],[5,5,true],[5,1,false],[1,1,true],[1,4,false]],[0,2,3,5,7],[{x:3,y:6},{x:6,y:3},{x:3,y:0},{x:0,y:2},{x:3,y:5},{x:5,y:3},{x:1,y:2},{x:3,y:4}],[{x:3,y:2},{x:4,y:3}],[[3,3,true]]),
];
