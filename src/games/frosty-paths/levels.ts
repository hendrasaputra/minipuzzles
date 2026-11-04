import type { Cell,Level } from './engine';
const cells=(points:number[][]):Cell[]=>points.map(([x,y])=>({x,y}));

// Stable originals, solver-verified; changing an opening requires save migration/versioning.
export const levels:readonly Level[]=[
  {id:'frost-1',title:'First glide',width:5,height:5,player:{x:0,y:4},goal:{x:4,y:0},fish:cells([[2,4]]),rocks:cells([])},
  {id:'frost-2',title:'Fish run',width:5,height:5,player:{x:0,y:4},goal:{x:0,y:0},fish:cells([[4,1]]),rocks:cells([[0,1],[1,1],[2,2]])},
  {id:'frost-3',title:'Snowy corner',width:5,height:5,player:{x:0,y:4},goal:{x:1,y:1},fish:cells([[1,4]]),rocks:cells([[0,0],[1,0],[2,1],[1,3],[2,4],[3,4]])},
  {id:'frost-4',title:'The long way',width:6,height:6,player:{x:0,y:5},goal:{x:5,y:2},fish:cells([[4,2],[2,5]]),rocks:cells([[2,0],[4,1],[1,2],[2,2],[3,3],[0,4],[4,4]])},
  {id:'frost-5',title:'Across the pond',width:6,height:6,player:{x:0,y:5},goal:{x:5,y:5},fish:cells([[4,1],[4,5]]),rocks:cells([[5,2],[4,3],[5,4]])},
  {id:'frost-6',title:'Northern loop',width:6,height:6,player:{x:0,y:5},goal:{x:0,y:1},fish:cells([[5,0],[5,1]]),rocks:cells([[0,2],[2,2],[0,4],[4,4],[2,5]])},
  {id:'frost-7',title:'Three little fish',width:7,height:7,player:{x:0,y:6},goal:{x:6,y:2},fish:cells([[5,3],[2,6],[3,6]]),rocks:cells([[1,0],[4,0],[0,1],[4,1],[3,4],[5,6]])},
  {id:'frost-8',title:'Homeward bound',width:7,height:7,player:{x:0,y:6},goal:{x:0,y:0},fish:cells([[6,5],[1,3],[5,6]]),rocks:cells([[5,0],[2,1],[4,1],[6,1],[0,3],[2,3],[2,4],[3,6]])},
];
