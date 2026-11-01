import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js';

const $ = id => document.getElementById(id);
const canvas = $('scene');
const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !prefersReduced, alpha: false, powerPreference: 'high-performance' });
} catch (error) {
  console.error('WebGL initialization failed', error);
  $('fallback').hidden = false;
  $('intro').hidden = true;
  throw error;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050914);
scene.fog = new THREE.FogExp2(0x081124, 0.0105);
const camera = new THREE.PerspectiveCamera(67, innerWidth / innerHeight, .1, 440);
scene.add(new THREE.HemisphereLight(0x8feafa, 0x141321, 2.0));
const sun = new THREE.DirectionalLight(0x9cd9ff, 2.6);
sun.position.set(-20, 43, -50);
scene.add(sun);
const pinkGlow = new THREE.PointLight(0xed3887, 90, 110, 1.6);
pinkGlow.position.set(16, 15, -38);
scene.add(pinkGlow);

const mat = (color, emissive = 0x000000, intensity = 0, metallic = .15, roughness = .38) =>
  new THREE.MeshStandardMaterial({ color, emissive, emissiveIntensity: intensity, metalness: metallic, roughness, side: THREE.DoubleSide });
const dark = mat(0x0b1729, 0x051025, .2, .75, .28);
const hullMat = mat(0xc7ecf6, 0x0c2632, .14, .75, .25);
const deepHull = mat(0x122e44, 0x051c31, .35, .7, .3);
const cyan = new THREE.MeshBasicMaterial({ color: 0x5effe8 });
const cyanDim = new THREE.MeshBasicMaterial({ color: 0x1a9d9e });
const orange = new THREE.MeshBasicMaterial({ color: 0xff486e });
const gold = new THREE.MeshBasicMaterial({ color: 0xf6b57a });
const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x11334e, metalness: .35, roughness: .09, transmission: .18, transparent: true, opacity: .86, clearcoat: 1 });
const groundMat = mat(0x0b1221, 0x030815, .4, .1, .85);
const roadMat = mat(0x0b1726, 0x041c2b, .3, .2, .7);
const rockMats = [mat(0x12233c, 0x07132b, .25, .1, .9), mat(0x132c41, 0x070f28, .22, .1, .9), mat(0x18213b, 0x160a27, .15, .1, .95)];
const random = (min, max) => min + Math.random() * (max - min);
const choose = list => list[Math.floor(Math.random() * list.length)];
const clamp = THREE.MathUtils.clamp;
const makeMesh = (geo, material, x = 0, y = 0, z = 0) => {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  return mesh;
};

// A fixed craft with a moving procedural environment avoids precision drift on long runs.
const craft = new THREE.Group();
scene.add(craft);
// Three distinct aircraft are built entirely from geometry: no external model downloads.
const planeSpecs = {
  nova:  { name:'NOVA X', color:0xd8f6fc, trim:0x7cffe5, glow:0x4df9ed, span:3.0, length:3.8, sweep:.31, speed:176, handling:15.2 },
  strix: { name:'STRIX GT', color:0xe0e8ff, trim:0xff9f78, glow:0xffb36f, span:2.25, length:4.85, sweep:.56, speed:203, handling:18.0 },
  manta: { name:'AURORA M', color:0xbcd9ff, trim:0xc89eff, glow:0x9a86ff, span:4.35, length:3.25, sweep:.14, speed:158, handling:13.2 }
};
const craftModels = {};
let selectedPlane = 'nova';
function makeAircraft(spec, id) {
  const model = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color:spec.color, metalness:.72, roughness:.24, side:THREE.DoubleSide });
  const wings = new THREE.MeshStandardMaterial({ color:spec.color, metalness:.7, roughness:.27, side:THREE.DoubleSide });
  const accent = new THREE.MeshBasicMaterial({ color:spec.trim });
  const exhaustMat = new THREE.MeshBasicMaterial({ color:spec.glow });
  const len = spec.length, half = len / 2;
  const body = makeMesh(new THREE.CylinderGeometry(.35,.65,len,12),shell,0,0,0);
  body.rotation.x = Math.PI/2;
  model.add(body);
  const tip = makeMesh(new THREE.ConeGeometry(.44,id==='strix'?1.6:1.2,12),shell,0,0,-half-.45);
  tip.rotation.x = -Math.PI/2;
  model.add(tip);
  const canopy = makeMesh(new THREE.SphereGeometry(1,20,12),glassMat,0,.36,-.55);
  canopy.scale.set(id==='manta'?.88:.58,.33,id==='strix'?1.16:.92);
  model.add(canopy);
  model.add(makeMesh(new THREE.BoxGeometry(.07,.07,1.15),accent,0,.68,-.55));
  for (const s of [-1,1]) {
    const g = new THREE.BufferGeometry();
    const span=spec.span;
    const v = [
      s*.42,-.05,-.98, s*span,-.12,span*spec.sweep+.02, s*span*.96,-.12,span*spec.sweep+.57,
      s*.42,-.05,-.98, s*span*.96,-.12,span*spec.sweep+.57, s*.5,-.05,1.16
    ];
    g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));
    g.computeVertexNormals();
    model.add(makeMesh(g,wings));
    const wingtip = makeMesh(new THREE.BoxGeometry(.14,.18,.63),accent,s*span*.95,.015,span*spec.sweep+.32);
    wingtip.rotation.z=s*.2;model.add(wingtip);
    const engine = makeMesh(new THREE.CylinderGeometry(.31,.38,1.34,12),dark,s*(id==='manta'?1.37:.86),-.15,half-.28);
    engine.rotation.x=Math.PI/2;model.add(engine);
    const flame=makeMesh(new THREE.SphereGeometry(.29,12,10),exhaustMat,s*(id==='manta'?1.37:.86),-.12,half+.43);
    flame.scale.set(.88,.78,1.6);flame.userData.flame=true;model.add(flame);
    if(id==='strix'){
      const fin=makeMesh(new THREE.BoxGeometry(.10,.68,.82),shell,s*.75,.41,half-.48);
      fin.rotation.z=s*.32;model.add(fin);
    }else{
      const tail=new THREE.Mesh(new THREE.BoxGeometry(.14,.46,.73),shell);
      tail.position.set(s*(id==='manta'?1.15:.65),.29,half-.38);
      tail.rotation.z=s*.25;model.add(tail);
    }
  }
  if(id==='manta'){
    const belly=makeMesh(new THREE.BoxGeometry(2.4,.11,1.05),accent,0,-.14,.88);
    model.add(belly);
  }else if(id==='strix'){
    model.add(makeMesh(new THREE.BoxGeometry(.12,.45,1.12),accent,0,.28,half-.47));
  }
  model.visible=false;
  return model;
}
for(const [id,spec] of Object.entries(planeSpecs)){
  craftModels[id]=makeAircraft(spec,id);
  craft.add(craftModels[id]);
}
craftModels.nova.visible=true;
const engineLight=new THREE.PointLight(0x44ffe7,30,16,1.8);
engineLight.position.set(0,0,2.3);craft.add(engineLight);
const underglow=new THREE.PointLight(0x40cfff,10,11,2);
underglow.position.set(0,-1.0,0);craft.add(underglow);

// Persistent lane tiles with center stripes, glowing edges and side pylons.
const tileLength = 22;
const tileCount = 13;
const tiles = [];
const planeGeo = new THREE.PlaneGeometry(25, tileLength);
const stripeGeo = new THREE.BoxGeometry(.075, .025, 2.8);
for (let i = 0; i < tileCount; i++) {
  const group = new THREE.Group();
  group.position.z = 18 - i * tileLength;
  const road = makeMesh(planeGeo, roadMat, 0, -.1, 0);
  road.rotation.x = -Math.PI / 2;
  group.add(road);
  const ground = makeMesh(new THREE.PlaneGeometry(190, tileLength), groundMat, 0, -.22, 0);
  ground.rotation.x = -Math.PI / 2;
  group.add(ground);
  for (let x of [-10.7, 10.7]) {
    group.add(makeMesh(new THREE.BoxGeometry(.11, .035, tileLength), cyanDim, x, -.055, 0));
  }
  for (let x of [-5.4, 0, 5.4]) {
    for (let z of [-8, -1, 6]) group.add(makeMesh(stripeGeo, cyanDim, x, -.07, z));
  }
  for (const s of [-1, 1]) {
    for (const z of [-9, 1, 10]) {
      const post = makeMesh(new THREE.CylinderGeometry(.065, .11, 1.1, 6), deepHull, s * 12.8, .46, z);
      const cap = makeMesh(new THREE.BoxGeometry(.32, .12, .36), cyan, s * 12.8, 1.08, z);
      group.add(post, cap);
    }
  }
  if (i % 4 === 0) {
    const frame = new THREE.Group();
    const frameMat = mat(0x163c51, 0x084358, .4, .6, .3);
    for (const s of [-1, 1]) {
      frame.add(makeMesh(new THREE.BoxGeometry(.48, 10, .5), frameMat, s * 14.1, 4.8, 0));
      frame.add(makeMesh(new THREE.BoxGeometry(.09, 9.7, .1), cyanDim, s * 13.84, 4.85, -.02));
    }
    frame.add(makeMesh(new THREE.BoxGeometry(28.8, .55, .58), frameMat, 0, 9.7, 0));
    frame.add(makeMesh(new THREE.BoxGeometry(28.2, .085, .11), cyan, 0, 9.42, 0));
    group.add(frame);
  }
  tiles.push(group);
  scene.add(group);
}

// Procedural low-poly spires and distant city architecture.
const props = [];
for (let i = 0; i < 54; i++) {
  const group = new THREE.Group();
  const s = Math.random() > .5 ? -1 : 1;
  const x = s * random(20, 95);
  group.position.set(x, -.2, random(-285, 35));
  if (i % 3 !== 0) {
    const h = random(5, 44);
    const tower = makeMesh(new THREE.BoxGeometry(random(3, 8), h, random(3, 10)), choose(rockMats), 0, h / 2, 0);
    tower.rotation.y = random(-.3, .3);
    group.add(tower);
    if (i % 4 === 0) group.add(makeMesh(new THREE.BoxGeometry(1.5, .13, 1.5), cyanDim, 0, h, 0));
    if (i % 5 === 0) {
      for (let j = 0; j < 3; j++) group.add(makeMesh(new THREE.BoxGeometry(.12, .3, .15), gold, -.6 + j * .6, random(3, h - 1), 4.1));
    }
  } else {
    const rock = makeMesh(new THREE.ConeGeometry(random(5, 16), random(16, 58), 4), choose(rockMats), 0, random(1, 11), 0);
    rock.rotation.z = random(-.17, .17);
    group.add(rock);
  }
  scene.add(group);
  props.push(group);
}
const starsPositions = new Float32Array(750 * 3);
for (let i = 0; i < 750; i++) {
  starsPositions[i * 3] = random(-240, 240);
  starsPositions[i * 3 + 1] = random(14, 145);
  starsPositions[i * 3 + 2] = random(-260, 50);
}
const starsGeo = new THREE.BufferGeometry();
starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPositions, 3));
const stars = new THREE.Points(starsGeo, new THREE.PointsMaterial({ color: 0x8dbed5, size: .4, transparent: true, opacity: .69, sizeAttenuation: true }));
scene.add(stars);

// Extra atmospheric details live outside the flight corridor so the sky stays readable.
const moon = new THREE.Mesh(
  new THREE.SphereGeometry(20,32,20),
  new THREE.MeshBasicMaterial({ color:0x8caeff, transparent:true, opacity:.83 })
);
moon.position.set(-115,80,-280);
scene.add(moon);
const moonHalo = new THREE.Mesh(
  new THREE.RingGeometry(24,30,48),
  new THREE.MeshBasicMaterial({color:0x7de8ff,transparent:true,opacity:.15,side:THREE.DoubleSide,depthWrite:false})
);
moonHalo.position.copy(moon.position);moonHalo.rotation.y=.18;scene.add(moonHalo);
const cloudMaterial=new THREE.MeshStandardMaterial({color:0x405b89,transparent:true,opacity:.28,roughness:1,flatShading:true,depthWrite:false});
const clouds=[];
for(let i=0;i<32;i++){
  const c=new THREE.Group();
  for(let j=0;j<3;j++){
    const puff=makeMesh(new THREE.IcosahedronGeometry(random(3.5,8.5),1),cloudMaterial,random(-6,6),random(-1,1),random(-3,3));
    puff.scale.set(1.8,.37,1.15);c.add(puff);
  }
  let x=random(-145,145);if(Math.abs(x)<29)x+=x<0?-38:38;
  c.position.set(x,random(19,55),random(-360,45));
  scene.add(c);clouds.push(c);
}
// Lightweight warp-speed streaks; only visible when the timed boost is active.
const streakCount=52,streakPoints=new Float32Array(streakCount*6);
function seedStreak(i){
  const n=i*6,x=random(-24,24),y=random(1,25),z=random(-170,-5),length=random(2,9);
  streakPoints[n]=streakPoints[n+3]=x;
  streakPoints[n+1]=streakPoints[n+4]=y;
  streakPoints[n+2]=z;
  streakPoints[n+5]=z+length;
}
for(let i=0;i<streakCount;i++)seedStreak(i);
const streakGeo=new THREE.BufferGeometry();
streakGeo.setAttribute('position',new THREE.BufferAttribute(streakPoints,3));
const streaks=new THREE.LineSegments(streakGeo,new THREE.LineBasicMaterial({color:0x92ffe8,transparent:true,opacity:.4,depthWrite:false}));
streaks.visible=false;scene.add(streaks);

// Collectibles and sparse, clearly visible hazards recycle ahead of the player.

const items = [];
function makeItem(type, z) {
  const group = new THREE.Group();
  group.userData.type = type;
  group.userData.radius = type === 'core' ? 1.1 : 1.3;
  if (type === 'core') {
    const ring = makeMesh(new THREE.TorusGeometry(.83, .095, 10, 28), cyan, 0, 0, 0);
    group.add(ring);
    const core = makeMesh(new THREE.OctahedronGeometry(.46, 0), mat(0x8bfff0, 0x0fe8b4, .7, .1, .15));
    group.add(core);
    const halo = makeMesh(new THREE.TorusGeometry(1.12, .026, 5, 32), cyanDim);
    group.add(halo);
    group.userData.spin = core;
    group.userData.halo = halo;
  } else {
    const body = makeMesh(new THREE.OctahedronGeometry(1.08, 0), mat(0x621b3a, 0xfa1f55, .8, .4, .25));
    body.scale.set(1.1, 1.15, 1.1);
    group.add(body);
    const wire = makeMesh(new THREE.OctahedronGeometry(1.14, 0), new THREE.MeshBasicMaterial({ color: 0xff6e88, wireframe: true }));
    wire.scale.copy(body.scale);
    group.add(wire);
    for (let side of [-1, 1]) group.add(makeMesh(new THREE.BoxGeometry(.13, 1.75, .13), orange, side * .7, 0, 0));
    group.userData.spin = body;
  }
  resetItem(group, z);
  scene.add(group);
  items.push(group);
}
function resetItem(group,z) {
  const hazard=group.userData.type==='hazard';
  let nextZ=typeof z==='number'?z:-random(hazard?175:115,hazard?305:315);
  if(hazard && typeof z!=='number'){
    // Avoid unfair obstacle clusters in front of the player.
    for(const other of items){
      if(other!==group && other.userData.type==='hazard' &&
         Math.abs(other.position.z-nextZ)<85) nextZ-=110;
    }
  }
  group.position.set(choose([-7,-3.5,0,3.5,7])+random(-.4,.4),hazard?2.75:2.8,nextZ);
  group.userData.collected=false;group.visible=true;
}
// Four spaced-out hazards with a long safe opening and extra collectible cores.
for(let i=0;i<18;i++){
  const hazard=i%5===0;
  makeItem(hazard?'hazard':'core',hazard?-145-(i/5)*108:-76-i*21);
}

const state = {
  started: false, running: false, paused: false, over: false, x: 0, y: 2.4, vx: 0, vy: 0,
  speed: 0, energy: 100, distance: 0, cores: 0, time: 0, invulnerable: 0,
  best: 0, cameraMode: 0, muted: false, toastTimeout: null, boostEnd: 0, boostCooldownEnd: 0, tapUntil: 0, tapDirection: 0,
};
try { state.best = Number(localStorage.getItem('nova-drift-best') || 0) || 0; } catch { /* Storage can be blocked. */ }
$('best').textContent = `${state.best.toFixed(2)} KM`;
const inputs = new Set();
let audioContext = null;
function playTone(freq, duration = .14, type = 'sine') {
  if (state.muted) return;
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioContext.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * .7), audioContext.currentTime + duration);
    gain.gain.setValueAtTime(.036, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + duration);
    osc.connect(gain).connect(audioContext.destination);
    osc.start(); osc.stop(audioContext.currentTime + duration);
  } catch (error) { console.debug('Optional audio unavailable', error); }
}
let engineOsc=null,engineGain=null,engineFilter=null;
function ensureEngineAudio(){
  if(state.muted) return;
  try{
    audioContext ||= new (window.AudioContext||window.webkitAudioContext)();
    audioContext.resume?.();
    if(engineOsc) return;
    engineOsc=audioContext.createOscillator();
    engineOsc.type='sawtooth';
    engineFilter=audioContext.createBiquadFilter();
    engineFilter.type='lowpass';engineFilter.frequency.value=230;
    engineGain=audioContext.createGain();engineGain.gain.value=0;
    engineOsc.connect(engineFilter).connect(engineGain).connect(audioContext.destination);
    engineOsc.frequency.value=65;engineOsc.start();
  }catch(e){console.debug('Optional synthesizer unavailable',e);}
}
function syncAudioUI(){
  $('sound-btn').setAttribute('aria-pressed',String(!state.muted));
  $('sound-btn').setAttribute('aria-label',state.muted?'Enable sound':'Mute sound');
}
function updateEngineAudio(boost){
  if(!engineGain||!audioContext) return;
  const now=audioContext.currentTime;
  engineGain.gain.setTargetAtTime(!state.muted&&state.running?.013:0,now,.12);
  engineOsc.frequency.setTargetAtTime(48+state.speed*.28+(boost?48:0),now,.13);
  engineFilter.frequency.setTargetAtTime(190+state.speed*2.1+(boost?350:0),now,.14);
}
function toast(message){
  const element=$('toast');
  element.textContent=message;
  element.classList.add('visible');
  clearTimeout(state.toastTimeout);
  state.toastTimeout=setTimeout(()=>element.classList.remove('visible'),1600);
}
function startBoost(){
  if(!state.running) return;
  if(state.time<state.boostEnd) return;
  if(state.time<state.boostCooldownEnd){
    toast('BOOST CHARGING · READY SOON');
    return;
  }
  state.boostEnd=state.time+8;
  state.boostCooldownEnd=state.time+16;
  playTone(320,.21,'sawtooth');
  playTone(640,.30,'triangle');
  toast('HYPERBOOST // 8 SECONDS');
}

function resetFlight(){
  state.started=state.running=true;state.paused=state.over=false;
  state.x=state.vx=state.vy=state.distance=state.cores=state.time=state.invulnerable=0;
  state.y=2.8;state.speed=120;state.energy=100;
  state.boostEnd=state.boostCooldownEnd=state.tapUntil=state.tapDirection=0;
  inputs.clear();tiltSteer=0;
  let hazardIndex=0,coreIndex=0;
  for(const item of items){
    const hazard=item.userData.type==='hazard';
    resetItem(item,hazard?-145-hazardIndex++*108:-76-coreIndex++*21);
  }
  craft.position.set(0,state.y,6);craft.rotation.set(0,0,0);
  $('intro').hidden=$('pause-overlay').hidden=$('gameover').hidden=true;
  $('settings-panel').hidden=$('hangar-panel').hidden=true;
  $('pause-btn').textContent='Ⅱ';
  ensureEngineAudio();playTone(520,.18,'triangle');
  toast('SKIES CLEAR // HAPPY FLYING');
}
function gameOver(){
  state.running=false;state.over=true;inputs.clear();
  if(state.distance>state.best){
    state.best=state.distance;
    try{localStorage.setItem('nova-drift-best',String(state.best));}catch{}
  }
  $('best').textContent=state.best.toFixed(2)+' KM';
  $('final-distance').textContent=state.distance.toFixed(2)+' KM';
  $('final-cores').textContent=String(state.cores).padStart(2,'0');
  $('gameover').hidden=false;
  playTone(120,.45,'triangle');
}
function togglePause(){
  if(!state.started||state.over)return;
  state.paused=!state.paused;state.running=!state.paused;
  inputs.clear();
  $('pause-overlay').hidden=!state.paused;
  $('pause-btn').textContent=state.paused?'▶':'Ⅱ';
}
function switchCamera(){
  state.cameraMode=(state.cameraMode+1)%3;
  craft.visible=state.cameraMode!==2;
  toast(['CHASE VIEW','CINEMATIC VIEW','COCKPIT VIEW'][state.cameraMode]);
}

let controlMode='tap', tiltSteer=0, tiltNeutral=null, tiltSeen=false;
let pointerSteer=null,lastTapAt=0,lastTapX=0;
let panelToResume=false,openedPanel=null;
function selectPlane(id){
  if(!planeSpecs[id])return;
  selectedPlane=id;
  for(const [key,model] of Object.entries(craftModels))model.visible=key===id;
  for(const button of document.querySelectorAll('[data-plane]')){
    const yes=button.dataset.plane===id;button.classList.toggle('selected',yes);
    button.setAttribute('aria-pressed',String(yes));
  }
  $('craft-label').textContent=planeSpecs[id].name;
  engineLight.color.setHex(planeSpecs[id].glow);
  underglow.color.setHex(planeSpecs[id].glow);
  try{localStorage.setItem('nova-drift-plane',id);}catch{}
}
function updateControlHints(){
  document.body.dataset.controlMode=controlMode;
  const label={tap:'TAP TO STEER',buttons:'BUTTON STEERING',tilt:'TILT TO STEER'}[controlMode];
  $('control-label').textContent=label;
  $('help-hint').textContent=controlMode==='tilt'?'TILT TO STEER · DOUBLE TAP TO BOOST':
    controlMode==='buttons'?'USE ARROWS · DOUBLE TAP TO BOOST':'TAP SIDES · DOUBLE TAP TO BOOST';
  for(const b of document.querySelectorAll('[data-mode]')){
    const yes=b.dataset.mode===controlMode;
    b.classList.toggle('selected',yes);b.setAttribute('aria-pressed',String(yes));
  }
  try{localStorage.setItem('nova-drift-mode',controlMode);}catch{}
}
function orientationInput(event){
  if(controlMode!=='tilt')return;
  const angle=screen.orientation?.angle??window.orientation??0;
  const axis=Math.abs(angle)===90?event.beta:event.gamma;
  if(!Number.isFinite(axis))return;
  const value=angle===90?-axis:axis;
  if(tiltNeutral===null){
    tiltNeutral=value;tiltSeen=true;
    $('tilt-status').textContent='Tilt connected. Hold the phone naturally to steer.';
    toast('TILT STEERING CONNECTED');
  }
  tiltSteer=clamp((value-tiltNeutral)/23,-1,1);
}
window.addEventListener('deviceorientation',orientationInput,{passive:true});
async function chooseMode(mode){
  if(!['tap','buttons','tilt'].includes(mode))return;
  if(mode==='tilt'){
    if(!('DeviceOrientationEvent' in window)){
      $('tilt-status').textContent='No motion sensor available. Using tap steering instead.';
      toast('TILT NOT AVAILABLE');return;
    }
    try{
      if(typeof DeviceOrientationEvent.requestPermission==='function'){
        const result=await DeviceOrientationEvent.requestPermission();
        if(result!=='granted'){
          $('tilt-status').textContent='Tilt permission denied. Tap or buttons still work.';
          toast('TILT PERMISSION NEEDED');return;
        }
      }
    }catch(e){
      $('tilt-status').textContent='Tilt permission unavailable; try the browser settings.';
      toast('TILT NOT AVAILABLE');return;
    }
    tiltNeutral=null;tiltSteer=0;tiltSeen=false;
    $('tilt-status').textContent='Tilt selected. Hold your phone level to calibrate.';
  }else{tiltSteer=0;tiltNeutral=null;}
  controlMode=mode;inputs.clear();updateControlHints();
  toast({tap:'TAP-TO-STEER ENABLED',buttons:'LEFT / RIGHT BUTTONS ENABLED',tilt:'TILT MODE ENABLED'}[mode]);
}
function openPanel(id){
  if(openedPanel)return;
  panelToResume=state.running;
  if(state.running)togglePause();
  openedPanel=id;$(id).hidden=false;
}
function closePanel(){
  if(!openedPanel)return;
  const id=openedPanel;$(id).hidden=true;openedPanel=null;
  if(panelToResume&&state.paused)togglePause();
  else if(state.over&&id==='hangar-panel')$('gameover').hidden=false;
  panelToResume=false;
}
function registerTap(x){
  if(!state.running)return;
  const now=performance.now();
  if(now-lastTapAt<345&&Math.abs(x-lastTapX)<105){
    lastTapAt=0;
    startBoost();
  }else{lastTapAt=now;lastTapX=x;}
}
$('start-btn').addEventListener('click',resetFlight);
$('restart-btn').addEventListener('click',resetFlight);
$('restart-pause-btn').addEventListener('click',resetFlight);
$('resume-btn').addEventListener('click',togglePause);
$('pause-btn').addEventListener('click',togglePause);
$('camera-btn').addEventListener('click',switchCamera);
$('sound-btn').addEventListener('click',()=>{
  state.muted=!state.muted;
  syncAudioUI();
  if(!state.muted){ensureEngineAudio();playTone(610,.17);toast('SOUND ON');}
  else{toast('SOUND OFF');updateEngineAudio(false);}
});
$('settings-btn').addEventListener('click',()=>openPanel('settings-panel'));
$('hangar-btn').addEventListener('click',()=>openPanel('hangar-panel'));
$('close-settings').addEventListener('click',closePanel);
$('settings-done').addEventListener('click',closePanel);
$('close-hangar').addEventListener('click',closePanel);
$('hangar-done').addEventListener('click',()=>{
  closePanel();
  if(state.over)resetFlight();
});
$('change-plane-over').addEventListener('click',()=>{
  $('gameover').hidden=true;openPanel('hangar-panel');
});
for(const b of document.querySelectorAll('[data-plane]'))
  b.addEventListener('click',()=>{selectPlane(b.dataset.plane);playTone(760,.07);});
for(const b of document.querySelectorAll('[data-mode]'))
  b.addEventListener('click',()=>chooseMode(b.dataset.mode));
try{
  const previousPlane=localStorage.getItem('nova-drift-plane');
  if(planeSpecs[previousPlane])selectPlane(previousPlane);
  const savedMode=localStorage.getItem('nova-drift-mode');
  if(savedMode==='tap'||savedMode==='buttons')controlMode=savedMode;
}catch{}
updateControlHints();syncAudioUI();
const codeControls={KeyA:'left',ArrowLeft:'left',KeyD:'right',ArrowRight:'right',ShiftLeft:'brake',ShiftRight:'brake'};
window.addEventListener('keydown',e=>{
  if(e.code in codeControls){e.preventDefault();inputs.add(codeControls[e.code]);}
  if(e.repeat)return;
  if(e.code==='Space'){e.preventDefault();startBoost();}
  if(e.code==='KeyC')switchCamera();
  if(e.code==='KeyP'||e.code==='Escape'){
    if(openedPanel)closePanel();else togglePause();
  }
  if(e.code==='KeyM')$('sound-btn').click();
  if(e.code==='Enter'&&(!state.started||state.over))resetFlight();
});
window.addEventListener('keyup',e=>{
  if(e.code in codeControls)inputs.delete(codeControls[e.code]);
});
window.addEventListener('blur',()=>{inputs.clear();pointerSteer=null;if(state.running)togglePause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.running)togglePause();});
for(const b of document.querySelectorAll('[data-control]')){
  const ctrl=b.dataset.control;
  const release=()=>{
    inputs.delete(ctrl);b.classList.remove('pressed');
  };
  b.addEventListener('pointerdown',e=>{
    if(!state.running)return;
    e.preventDefault();b.setPointerCapture?.(e.pointerId);
    registerTap(e.clientX);inputs.add(ctrl);b.classList.add('pressed');
  });
  b.addEventListener('pointerup',release);
  b.addEventListener('pointercancel',release);
  b.addEventListener('lostpointercapture',release);
}
canvas.addEventListener('pointerdown',e=>{
  if(!state.running)return;
  e.preventDefault();
  canvas.setPointerCapture?.(e.pointerId);
  registerTap(e.clientX);
  if(controlMode==='tap'){
    const direction=e.clientX<innerWidth/2?'left':'right';
    pointerSteer={id:e.pointerId,direction};
    inputs.add(direction);
    state.tapDirection=direction==='left'?-1:1;
    state.tapUntil=state.time+.2;
  }
});
const releaseCanvas=e=>{
  if(pointerSteer?.id!==e.pointerId)return;
  inputs.delete(pointerSteer.direction);pointerSteer=null;
};
canvas.addEventListener('pointerup',releaseCanvas);
canvas.addEventListener('pointercancel',releaseCanvas);
canvas.addEventListener('lostpointercapture',releaseCanvas);

function collide(item) {
  if (item.userData.collected) return;
  const x = Math.abs(item.position.x - state.x);
  const y = Math.abs(item.position.y - state.y);
  const z = Math.abs(item.position.z - 6);
  if (z > 1.7 || x > item.userData.radius + .7 || y > item.userData.radius + .55) return;
  if (item.userData.type === 'core') {
    state.cores++;
    state.energy = clamp(state.energy + 17, 0, 100);
    toast('+1 ENERGY CORE  //  +17 SHIELD');
    playTone(910, .14); playTone(1350, .2);
  } else if (state.invulnerable <= 0) {
    state.energy = clamp(state.energy - 23, 0, 100);
    state.speed *= .62;
    state.invulnerable = 1.5;
    document.body.classList.remove('hit');
    void document.body.offsetWidth;
    document.body.classList.add('hit');
    toast('CAREFUL! // SHIELD -23');
    playTone(160, .3, 'sawtooth');
    if (state.energy <= 0) gameOver();
  }
  item.userData.collected = true;
  item.visible = false;
}

function update(dt,timestamp){
  if(state.paused||state.over){updateEngineAudio(false);return;}
  state.time+=dt;
  const active=state.running;
  const boost=active&&state.time<state.boostEnd;
  if(active){
    const keySteer=Number(inputs.has('right'))-Number(inputs.has('left'));
    const touchImpulse=(controlMode==='tap'&&state.time<state.tapUntil)?state.tapDirection:0;
    const horizontal=clamp(keySteer||(controlMode==='tilt'?tiltSteer:touchImpulse),-1,1);
    const target=inputs.has('brake')?75:boost?335:planeSpecs[selectedPlane].speed;
    state.speed=THREE.MathUtils.damp(state.speed,target,boost?1.8:1.2,dt);
    state.vx=THREE.MathUtils.damp(state.vx,horizontal*planeSpecs[selectedPlane].handling,4.5,dt);
    state.x=clamp(state.x+state.vx*dt,-9.3,9.3);
    if(Math.abs(state.x)>=9.3)state.vx*=.2;
    state.y=THREE.MathUtils.damp(state.y,2.8,2,dt);
    // Shields regenerate naturally. Boost uses a separate cooldown instead of draining life.
    state.energy=clamp(state.energy+3.8*dt,0,100);
    state.distance+=state.speed*dt/3600;
    state.invulnerable=Math.max(0,state.invulnerable-dt);
  }
  const travel=(active?state.speed/6.6:(!state.started?8:0))*dt;
  for(const tile of tiles){
    tile.position.z+=travel;
    if(tile.position.z>40)tile.position.z-=tileLength*tileCount;
  }
  for(const prop of props){
    prop.position.z+=travel*.9;
    if(prop.position.z>48)prop.position.z-=random(290,335);
  }
  for(const cloud of clouds){
    cloud.position.z+=travel*.19;
    if(cloud.position.z>65)cloud.position.z=-random(270,370);
  }
  moon.rotation.y+=dt*.007;
  for(const item of items){
    item.position.z+=travel;
    item.rotation.z+=dt*(item.userData.type==='core'?.5:-.33);
    item.userData.spin.rotation.y+=dt*1.55;
    if(item.userData.halo)item.userData.halo.rotation.y+=dt;
    item.position.y+=Math.sin(timestamp*.0017+item.id)*dt*.18;
    if(active&&!item.userData.collected)collide(item);
    if(item.position.z>20)resetItem(item);
  }
  streaks.visible=boost;
  if(boost){
    for(let i=0;i<streakCount;i++){
      const n=i*6;
      streakPoints[n+2]+=travel*3.6;streakPoints[n+5]+=travel*3.6;
      if(streakPoints[n+2]>20)seedStreak(i);
    }
    streakGeo.attributes.position.needsUpdate=true;
  }
  craft.position.x=THREE.MathUtils.damp(craft.position.x,state.x,8,dt);
  craft.position.y=THREE.MathUtils.damp(craft.position.y,state.y+Math.sin(timestamp*.0025)*.12,7,dt);
  craft.rotation.z=THREE.MathUtils.damp(craft.rotation.z,active?-state.vx*.033:Math.sin(timestamp*.0006)*.03,5,dt);
  craft.rotation.x=THREE.MathUtils.damp(craft.rotation.x,active?-.02:Math.sin(timestamp*.0003)*.02,4,dt);
  craft.traverse(part=>{
    if(part.userData.flame)part.scale.z=(boost?2.8:1.5)+Math.sin(timestamp*.025)*.17;
  });
  engineLight.intensity=boost?50:27+Math.sin(timestamp*.01)*4;
  craft.visible=state.cameraMode!==2&&!(state.invulnerable>0&&Math.floor(timestamp*.014)%2===0);
  const mode=state.cameraMode;
  const cx=mode===2?state.x:mode===1?state.x+5.2:state.x*.55;
  const cy=mode===2?state.y+.60:mode===1?state.y+5.8:state.y+4.2;
  const cz=mode===2?5.4:mode===1?19.4:17.7;
  camera.position.lerp(new THREE.Vector3(cx,cy,cz),Math.min(1,dt*(mode===2?9:3.4)));
  camera.lookAt(mode===2?state.x:state.x*.65,mode===2?state.y+.2:state.y+.25,mode===1?-19:-34);
  camera.fov=THREE.MathUtils.damp(camera.fov,boost?79:67,3,dt);
  camera.updateProjectionMatrix();
  updateEngineAudio(boost);
  if(active)updateHud(boost);
}
function updateHud(boost){
  $('speed').textContent=String(Math.round(state.speed)).padStart(3,'0');
  $('distance').textContent=state.distance.toFixed(2);
  $('cores').textContent=String(state.cores).padStart(2,'0');
  $('energy').textContent=Math.ceil(state.energy)+'%';
  $('energy-bar').style.width=state.energy+'%';
  $('energy-bar').parentElement.classList.toggle('low',state.energy<30);
  const remain=Math.max(0,state.boostEnd-state.time);
  const cooldown=Math.max(0,state.boostCooldownEnd-state.time);
  if(boost){
    $('boost-label').textContent='BOOST ACTIVE · '+Math.ceil(remain)+'S';
    $('boost-progress').style.width=remain/8*100+'%';
  }else if(cooldown){
    $('boost-label').textContent='BOOST CHARGING · '+Math.ceil(cooldown)+'S';
    $('boost-progress').style.width=(1-cooldown/8)*100+'%';
  }else{
    $('boost-label').textContent='DOUBLE TAP TO BOOST';
    $('boost-progress').style.width='100%';
  }
}

function resize() {
  renderer.setSize(innerWidth, innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, innerWidth < 720 ? 1.45 : 1.75));
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
const clock = new THREE.Clock();
function frame(timestamp) {
  requestAnimationFrame(frame);
  const dt = Math.min(.045, clock.getDelta());
  update(dt, timestamp);
  renderer.render(scene, camera);
}
craft.position.set(0, 2.8, 6);
camera.position.set(0, 6.7, 17);
camera.lookAt(0, 2.3, -20);
requestAnimationFrame(frame);