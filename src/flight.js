/** Pure, frame-rate-independent light flight model. Coordinates are meters; +Z is north. */
export const AIRCRAFT = [
  {id:'c172',name:'Cessna 172 Skyhawk',short:'C172 SKYHAWK',category:'SINGLE ENGINE · TRAINER',tagline:'The sky starts here.',speed:62,stall:22,takeoff:31,accel:6.5,span:11,body:8.2,range:1185,scale:1,kind:'prop',color:'#f6f8f4',accent:'#d0a15d',wings:'high'},
  {id:'cub',name:'Piper Super Cub',short:'PIPER SUPER CUB',category:'BUSH PLANE · TAILDRAGGER',tagline:'Born for the unbeaten path.',speed:49,stall:17,takeoff:23,accel:7.2,span:10.7,body:7.1,range:740,scale:.89,kind:'prop',color:'#f7cb4d',accent:'#222c33',wings:'high'},
  {id:'sr22',name:'Cirrus SR22',short:'CIRRUS SR22',category:'SINGLE ENGINE · TOURING',tagline:'An effortless escape.',speed:91,stall:29,takeoff:38,accel:8.7,span:11.7,body:7.9,range:2200,scale:1,kind:'prop',color:'#f5f6f3',accent:'#3a6c8c',wings:'low'},
  {id:'baron',name:'Beechcraft Baron G58',short:'BARON G58',category:'TWIN PISTON · TOURING',tagline:'Twice the power. All the freedom.',speed:108,stall:34,takeoff:44,accel:10,span:11.5,body:9.2,range:2700,scale:1.08,kind:'twin',color:'#e4e8e9',accent:'#7890a5',wings:'low'},
  {id:'kingair',name:'King Air 350i',short:'KING AIR 350i',category:'TWIN TURBOPROP · EXECUTIVE',tagline:'Business above the clouds.',speed:160,stall:46,takeoff:59,accel:12,span:17.7,body:14.2,range:3340,scale:1.28,kind:'turboprop',color:'#ededec',accent:'#263d50',wings:'low'},
  {id:'pc12',name:'Pilatus PC-12 NGX',short:'PILATUS PC-12',category:'TURBOPROP · ADVENTURE',tagline:'Find the end of the map.',speed:145,stall:40,takeoff:52,accel:11,span:16.3,body:14.4,range:3400,scale:1.22,kind:'prop',color:'#d5d8dc',accent:'#7a4037',wings:'low'},
  {id:'atr72',name:'ATR 72-600',short:'ATR 72-600',category:'REGIONAL · TURBOPROP',tagline:'City to city. Coast to coast.',speed:175,stall:55,takeoff:72,accel:14,span:27,body:27,range:1528,scale:1.95,kind:'turboprop',color:'#f5f5f2',accent:'#0f6a9e',wings:'high'},
  {id:'a320',name:'Airbus A320neo',short:'AIRBUS A320neo',category:'COMMERCIAL · NARROWBODY',tagline:'Every destination is possible.',speed:235,stall:64,takeoff:82,accel:17,span:35.8,body:37.6,range:6300,scale:2.7,kind:'jet',color:'#e6e9e9',accent:'#477ea4',wings:'low'},
  {id:'b787',name:'Boeing 787 Dreamliner',short:'BOEING 787',category:'COMMERCIAL · WIDEBODY',tagline:'A new dimension of flight.',speed:255,stall:74,takeoff:94,accel:20,span:60.1,body:57,range:13620,scale:3.7,kind:'jet',color:'#eef0ef',accent:'#214979',wings:'low'},
  {id:'f16',name:'F-16 Fighting Falcon',short:'F-16 FALCON',category:'FIGHTER · SUPERSONIC',tagline:'Leave the horizon behind.',speed:315,stall:61,takeoff:80,accel:33,span:10,body:15.1,range:4200,scale:1.3,kind:'fighter',color:'#adb6bf',accent:'#566575',wings:'low'}
];
export const REGIONS=[
  {id:'coast',name:'Verdant Bay',description:'Coastal harbours, golden fields and three airfields.',latitude:'42° 19′ N',accent:'#b5a078'},
  {id:'alpine',name:'Alpine Frontier',description:'Snow-capped peaks, pine forests and mountain approaches.',latitude:'61° 08′ N',accent:'#b7c7c6'},
  {id:'desert',name:'Red Rock Desert',description:'Endless mesas, desert airfields and blazing sunsets.',latitude:'29° 40′ N',accent:'#d7a77d'}
];
export const AIRPORTS=[
  {id:'VBI',name:'Verdant International',x:-950,z:-420,code:'VBI',runway:'18 / 36'},
  {id:'NFD',name:'Northfield Regional',x:1400,z:1050,code:'NFD',runway:'18 / 36'},
  {id:'CRL',name:'Crescent Island Airfield',x:-770,z:2600,code:'CRL',runway:'18 / 36'}
];
export const KNOTS_PER_MS=1.9438444924;
export const FEET_PER_M=3.280839895;
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const wrapAngle=(v)=>((v+Math.PI*3)%(Math.PI*2))-Math.PI;
export const groundHeight=()=>0;
export const spawn=(spec,airport=AIRPORTS[0])=>({x:airport.x,y:Math.max(1.8,spec.scale*1.9),z:airport.z-350,heading:0,pitch:0,roll:0,speed:0,vy:0,throttle:.30,airborne:false,gear:true,crashed:false,flightSeconds:0,totalDistance:0,landings:0,airport:airport.id});
export function updateFlight(state,input,dt,spec){
  if(state.crashed)return null;
  dt=clamp(dt,0,0.05);
  const groundY=Math.max(1.8,spec.scale*1.9);
  state.flightSeconds+=dt;
  if(input.throttleDelta)state.throttle=clamp(state.throttle+input.throttleDelta*dt,0,1);
  const brake=input.brake&& !state.airborne;
  const engineTarget=spec.speed*(.035+.965*state.throttle);
  const acceleration=spec.accel*(.45+state.throttle*.55);
  const drag=.012*state.speed+.00033*state.speed*state.speed;
  if(state.airborne){
    state.speed=clamp(state.speed+(acceleration*(engineTarget>state.speed?1:-.56)-drag)*dt,0,spec.speed*1.14);
    state.pitch=clamp(state.pitch+input.pitch*dt*.62,-.46,.47);
    state.pitch*=Math.pow(.997,dt*60);
    state.roll=clamp(state.roll+input.bank*dt*1.09,-1.13,1.13);
    if(!input.bank)state.roll*=Math.exp(-.35*dt);
    state.heading=wrapAngle(state.heading+(state.roll*.46*(.4+state.speed/spec.speed*.6)+input.rudder*.23)*dt);
    const stallPenalty=Math.max(0,spec.stall-state.speed)*.63;
    const liftClimb=(state.speed*Math.sin(state.pitch)*.72)+(state.speed-spec.stall)*.06-2.1-stallPenalty;
    state.vy+=(liftClimb-state.vy)*Math.min(1,dt*1.25);
    state.y+=state.vy*dt;
    state.speed=clamp(state.speed-Math.max(0,state.vy)*.006*dt,0,spec.speed*1.14);
  }else{
    const target=brake?0:engineTarget;
    const step=(target>state.speed?acceleration*1.3:10)+(brake?38:0);
    state.speed+=clamp(target-state.speed,-step*dt,step*dt);
    state.speed=Math.max(0,state.speed);
    state.roll*=Math.exp(-2.4*dt);
    state.heading=wrapAngle(state.heading+(input.rudder*.65-input.bank*.45)*dt*clamp(state.speed/15,0,1));
    state.pitch=clamp(state.pitch+input.pitch*dt*.39,-.05,.22);
    if(!input.pitch)state.pitch*=Math.exp(-.9*dt);
    state.y=groundY;state.vy=0;
    if(state.speed>spec.takeoff&&state.pitch>.065){state.airborne=true;state.vy=2.3;return 'takeoff'}
  }
  const horizontal=Math.max(0,state.speed*Math.cos(state.pitch));
  state.x+=Math.sin(state.heading)*horizontal*dt;
  state.z+=Math.cos(state.heading)*horizontal*dt;
  state.totalDistance+=horizontal*dt;
  if(state.airborne&&state.y<=groundY){
    if(state.vy< -7.7||!state.gear||Math.abs(state.roll)>.46){state.y=groundY;state.crashed=true;state.speed=0;return 'crash'}
    state.airborne=false;state.y=groundY;state.vy=0;state.pitch=0;state.roll=0;state.landings++;return 'landed';
  }
  return null;
}
export function getSeason(month=new Date().getMonth()){
  if(month===11)return {id:'winter',label:'DECEMBER · WINTER',short:'CHRISTMAS',sky:0xa4b9c4,fog:0xb5c6cf,ground:0xd8e2e5,grass:0xcbd6d5,tree:0x35584b,season:'CHRISTMAS',snow:true};
  if(month===0)return {id:'january',label:'JANUARY · FROST',short:'FROST',sky:0xb5cbd5,fog:0xbacdd3,ground:0xbac6bb,grass:0x9cad9e,tree:0x456957,season:'FROST',snow:false};
  if(month===1)return {id:'february',label:'FEBRUARY · LATE WINTER',short:'FROST',sky:0xb4c7d0,fog:0xc0cdd0,ground:0xaeb9af,grass:0x93a29b,tree:0x456453,season:'LATE WINTER',snow:false};
  if(month>=2&&month<=4)return {id:'spring',label:'SPRING · BLOOM',short:'SPRING',sky:0x92bccf,fog:0xb2ccce,ground:0x758e62,grass:0x6b915f,tree:0x4e7c4f,season:'SPRING',snow:false};
  if(month>=5&&month<=7)return {id:'summer',label:'SUMMER · CLEAR SKIES',short:'SUMMER',sky:0x83b9df,fog:0xa3cee0,ground:0x778957,grass:0x658656,tree:0x30684a,season:'SUMMER',snow:false};
  if(month===10)return {id:'november',label:'NOVEMBER · AUTUMN',short:'AUTUMN',sky:0x9fb6c2,fog:0xb7b7a6,ground:0x81816b,grass:0x7a795e,tree:0x9a6e43,season:'AUTUMN',snow:false};
  return {id:'autumn',label:'AUTUMN · GOLDEN HOUR',short:'AUTUMN',sky:0xb2b5b7,fog:0xc0bca4,ground:0x8a876b,grass:0x8b845e,tree:0x9c7b48,season:'AUTUMN',snow:false};
}
export function getPalette(region,month){const p={...getSeason(month)};if(region==='desert'){return {...p,sky:0xb9bcba,fog:0xd2b5a0,ground:0xb78c67,grass:0xb3936b,tree:0x677553}}if(region==='alpine'){return {...p,sky:0x91b2c4,fog:0xafc0c8,ground:0x9daea7,grass:0x789286,tree:0x35614e}}return p;}
export function nearestAirport(x,z){let best=AIRPORTS[0],d=Infinity;for(const a of AIRPORTS){const q=Math.hypot(x-a.x,z-a.z);if(q<d){d=q;best=a;}}return {airport:best,distance:d};}
