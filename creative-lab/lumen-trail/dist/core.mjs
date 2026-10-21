export const SIZE=5, START=10, GOAL=14;
export const DIRECTIONS=['north','east','south','west'];
export const LEVELS=[
 {name:'First spark',note:'A few turns can change everything.',path:[10,11,6,7,8,13,14]},
 {name:'Take the scenic route',note:'Sometimes the way forward starts with a turn.',path:[10,5,6,1,2,3,8,9,14]},
 {name:'A little detour',note:'Follow the glow, one connection at a time.',path:[10,15,20,21,16,11,6,7,12,17,18,13,14]},
 {name:'Around the bend',note:'The long way has its own kind of beauty.',path:[10,5,0,1,2,7,6,11,16,21,22,23,18,19,14]},
 {name:'The winding way',note:'There is a path through the tangle.',path:[10,11,6,5,0,1,2,3,4,9,8,7,12,17,16,15,20,21,22,23,24,19,14]},
 {name:'Bring it home',note:'One last trail. Make every connection count.',path:[10,15,20,21,16,11,6,5,0,1,2,7,12,17,22,23,18,13,8,3,4,9,14]}
];
export function neighbor(index,direction){const x=index%SIZE,y=Math.floor(index/SIZE),nx=x+[0,1,0,-1][direction],ny=y+[-1,0,1,0][direction];return nx<0||nx>=SIZE||ny<0||ny>=SIZE?-1:ny*SIZE+nx;}
export function direction(from,to){for(let d=0;d<4;d++)if(neighbor(from,d)===to)return d;throw new Error('Path contains nonadjacent tiles');}
export function rotate(ports,turns=1){return ports.map(p=>(p+turns)%4);}
export function samePorts(a,b){return a.length===b.length&&a.every(p=>b.includes(p));}
export const copyBoard=board=>board.map(t=>({ports:[...t.ports],locked:t.locked}));
export function trace(board){let index=START,entry=3;const lit=[],seen=new Set();for(let count=0;count<100;count++){const tile=board[index];if(!tile||tile.ports.length!==2||!tile.ports.includes(entry))return{lit,solved:false};const key=index+':'+entry;if(seen.has(key))return{lit,solved:false};seen.add(key);lit.push(index);const exit=tile.ports.find(p=>p!==entry);if(index===GOAL&&exit===1)return{lit,solved:true};const next=neighbor(index,exit);if(next<0)return{lit,solved:false};index=next;entry=(exit+2)%4;}return{lit,solved:false};}
function randomFor(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
export function createLevel(number){const level=LEVELS[number];if(!level)throw new Error('Unknown level');const random=randomFor((number+1)*1729);const board=Array.from({length:SIZE*SIZE},()=>({ports:rotate(random()>.4?[0,1]:[0,2],Math.floor(random()*4)),locked:false}));const solution=copyBoard(board);level.path.forEach((index,p)=>{const entry=p===0?3:direction(index,level.path[p-1]),exit=p===level.path.length-1?1:direction(index,level.path[p+1]);solution[index]={ports:[entry,exit],locked:index===START||index===GOAL};board[index]={ports:rotate([entry,exit],Math.floor(random()*4)),locked:solution[index].locked};if(board[index].locked)board[index].ports=[entry,exit];});
 // Every initial board is unsolved, even if a filler path happens to connect.
 if(trace(board).solved){const index=level.path[1],entry=direction(index,START);while(board[index].ports.includes(entry))board[index].ports=rotate(board[index].ports);}
 return{board,solution};}
export function nextHint(board,number){const{solution}=createLevel(number);return LEVELS[number].path.find(i=>!board[i].locked&&!samePorts(board[i].ports,solution[i].ports))??null;}
export function validateProgress(value){if(!Array.isArray(value)||value.length!==LEVELS.length)throw new Error('Invalid progress');return value.map(v=>{if(v===null)return null;if(!v||v.complete!==true||!(v.best===null||Number.isInteger(v.best)&&v.best>=0&&v.best<1000000))throw new Error('Invalid level record');return{complete:true,best:v.best};});}
