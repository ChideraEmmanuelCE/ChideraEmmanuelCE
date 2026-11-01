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
const hull = makeMesh(new THREE.BoxGeometry(1.7, .37, 3.7), hullMat, 0, 0, -.1);
craft.add(hull);
const nose = makeMesh(new THREE.ConeGeometry(.9, 2.1, 3), hullMat, 0, -.015, -2.13);
nose.rotation.x = -Math.PI / 2;
nose.rotation.z = Math.PI / 2;
craft.add(nose);
const cockpit = makeMesh(new THREE.SphereGeometry(1, 24, 16), glassMat, 0, .33, -.6);
cockpit.scale.set(.72, .38, 1.18);
craft.add(cockpit);
const canopyFrame = makeMesh(new THREE.BoxGeometry(.07, .07, 1.45), cyanDim, 0, .7, -.5);
craft.add(canopyFrame);
const spine = makeMesh(new THREE.BoxGeometry(.19, .12, 1.75), cyan, 0, .25, 1.0);
craft.add(spine);
for (const side of [-1, 1]) {
  const wingGeom = new THREE.BufferGeometry();
  const wingVertices = new Float32Array([
    side * .67, -.02, -.65, side * 3.05, -.17, 1.1, side * 2.65, -.17, 1.65,
    side * .67, -.02, -.65, side * 2.65, -.17, 1.65, side * .68, -.04, 1.46
  ]);
  wingGeom.setAttribute('position', new THREE.BufferAttribute(wingVertices, 3));
  wingGeom.computeVertexNormals();
  craft.add(makeMesh(wingGeom, deepHull));
  const wingTip = makeMesh(new THREE.BoxGeometry(.12, .22, .6), cyan, side * 2.84, .01, 1.15);
  wingTip.rotation.z = side * .18;
  craft.add(wingTip);
  const engine = makeMesh(new THREE.CylinderGeometry(.3, .4, 1.35, 14), dark, side * .95, -.17, 1.35);
  engine.rotation.x = Math.PI / 2;
  craft.add(engine);
  const exhaust = makeMesh(new THREE.SphereGeometry(.3, 14, 12), cyan, side * .95, -.15, 2.07);
  exhaust.scale.set(.82, .8, 1.8);
  craft.add(exhaust);
  exhaust.userData.flame = true;
  const fin = makeMesh(new THREE.BoxGeometry(.13, .48, .85), hullMat, side * 1.16, .28, 1.42);
  fin.rotation.z = side * -.25;
  craft.add(fin);
}
const engineLight = new THREE.PointLight(0x44ffe7, 28, 14, 1.8);
engineLight.position.set(0, 0, 2.5);
craft.add(engineLight);
const underglow = new THREE.PointLight(0x40cfff, 11, 11, 2);
underglow.position.set(0, -1.0, 0);
craft.add(underglow);

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
  if (i % 2 === 0) {
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
for (let i = 0; i < 76; i++) {
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

// Collectibles (cyan) and hazards (coral) recycle ahead of the player.
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
function resetItem(group, z = -random(225, 310)) {
  group.position.set(choose([-8, -5, -2, 1, 4, 7]) + random(-.8, .8), group.userData.type === 'core' ? random(1.9, 4.1) : random(1.55, 4.3), z);
  group.userData.collected = false;
  group.visible = true;
}
for (let i = 0; i < 25; i++) makeItem(i % 3 === 0 ? 'core' : 'hazard', -38 - i * 11.5);

const state = {
  started: false, running: false, paused: false, over: false, x: 0, y: 2.4, vx: 0, vy: 0,
  speed: 0, energy: 100, distance: 0, cores: 0, time: 0, invulnerable: 0,
  best: 0, cameraMode: 0, muted: true, toastTimeout: null,
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
function toast(message) {
  const element = $('toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(state.toastTimeout);
  state.toastTimeout = setTimeout(() => element.classList.remove('visible'), 1550);
}
function resetFlight() {
  state.started = state.running = true;
  state.paused = state.over = false;
  state.x = state.vx = state.vy = state.distance = state.cores = state.time = state.invulnerable = 0;
  state.y = 2.4;
  state.speed = 110;
  state.energy = 100;
  inputs.clear();
  for (let i = 0; i < items.length; i++) resetItem(items[i], -38 - i * 11.5);
  craft.position.set(0, state.y, 6);
  craft.rotation.set(0, 0, 0);
  $('intro').hidden = $('pause-overlay').hidden = $('gameover').hidden = true;
  $('pause-btn').innerHTML = 'Ⅱ <span>PAUSE</span>';
  playTone(450, .23);
  toast('FLIGHT ENGAGED // GOOD LUCK');
}
function gameOver() {
  state.running = false;
  state.over = true;
  inputs.clear();
  if (state.distance > state.best) {
    state.best = state.distance;
    try { localStorage.setItem('nova-drift-best', String(state.best)); } catch { /* Private browsing */ }
  }
  $('best').textContent = `${state.best.toFixed(2)} KM`;
  $('final-distance').textContent = `${state.distance.toFixed(2)} KM`;
  $('final-cores').textContent = String(state.cores).padStart(2, '0');
  $('gameover').hidden = false;
  playTone(100, .6, 'sawtooth');
}
function togglePause() {
  if (!state.started || state.over) return;
  state.paused = !state.paused;
  state.running = !state.paused;
  inputs.clear();
  $('pause-overlay').hidden = !state.paused;
  $('pause-btn').innerHTML = state.paused ? '▶ <span>RESUME</span>' : 'Ⅱ <span>PAUSE</span>';
}
function switchCamera() {
  state.cameraMode = (state.cameraMode + 1) % 3;
  craft.visible = state.cameraMode !== 2;
  toast(['CHASE CAMERA', 'CINEMATIC CAMERA', 'COCKPIT CAMERA'][state.cameraMode]);
}
$('start-btn').addEventListener('click', resetFlight);
$('restart-btn').addEventListener('click', resetFlight);
$('restart-pause-btn').addEventListener('click', resetFlight);
$('resume-btn').addEventListener('click', togglePause);
$('pause-btn').addEventListener('click', togglePause);
$('camera-btn').addEventListener('click', switchCamera);
$('sound-btn').addEventListener('click', () => {
  state.muted = !state.muted;
  $('sound-btn').innerHTML = state.muted ? '♫ <span>AUDIO OFF</span>' : '♫ <span>AUDIO ON</span>';
  if (!state.muted) { playTone(540, .12); toast('AUDIO ENABLED'); } else toast('AUDIO MUTED');
});

const codeControls = { KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', Space: 'boost', ShiftLeft: 'brake', ShiftRight: 'brake' };
window.addEventListener('keydown', event => {
  if (event.code in codeControls) {
    event.preventDefault();
    inputs.add(codeControls[event.code]);
  }
  if (event.repeat) return;
  if (event.code === 'KeyC') switchCamera();
  if (event.code === 'KeyP' || event.code === 'Escape') togglePause();
  if (event.code === 'KeyM') $('sound-btn').click();
  if (event.code === 'Enter' && (!state.started || state.over)) resetFlight();
});
window.addEventListener('keyup', event => {
  if (event.code in codeControls) inputs.delete(codeControls[event.code]);
});
window.addEventListener('blur', () => {
  inputs.clear();
  if (state.running) togglePause();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.running) togglePause();
});
for (const button of document.querySelectorAll('[data-control]')) {
  const control = button.dataset.control;
  const press = event => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    inputs.add(control);
    button.classList.add('pressed');
  };
  const release = event => {
    event.preventDefault();
    inputs.delete(control);
    button.classList.remove('pressed');
  };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', () => { inputs.delete(control); button.classList.remove('pressed'); });
}
// Direct swipe-to-steer also works on the rendered canvas on touchscreens.
let drag = null;
canvas.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' || !state.running) return;
  drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture?.(event.pointerId);
});
canvas.addEventListener('pointermove', event => {
  if (!drag || drag.id !== event.pointerId) return;
  drag.x = event.clientX;
  drag.y = event.clientY;
});
const stopDrag = event => { if (drag?.id === event.pointerId) drag = null; };
canvas.addEventListener('pointerup', stopDrag);
canvas.addEventListener('pointercancel', stopDrag);

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
    state.energy = clamp(state.energy - 31, 0, 100);
    state.speed *= .62;
    state.invulnerable = 1.5;
    document.body.classList.remove('hit');
    void document.body.offsetWidth;
    document.body.classList.add('hit');
    toast('⚠ IMPACT DETECTED  //  -31 SHIELD');
    playTone(160, .3, 'sawtooth');
    if (state.energy <= 0) gameOver();
  }
  item.userData.collected = true;
  item.visible = false;
}

function update(dt, timestamp) {
  state.time += dt;
  const active = state.running;
  if (state.paused || state.over) return;
  if (active) {
    const horizontal = Number(inputs.has('right')) - Number(inputs.has('left'));
    const vertical = Number(inputs.has('up')) - Number(inputs.has('down'));
    const boost = inputs.has('boost') && state.energy > 6;
    const brake = inputs.has('brake');
    const targetSpeed = boost ? 315 : brake ? 68 : 175;
    state.speed = THREE.MathUtils.damp(state.speed, targetSpeed, boost ? 1.6 : 1.0, dt);
    state.vx = THREE.MathUtils.damp(state.vx, horizontal * 16, 4.2, dt);
    state.vy = THREE.MathUtils.damp(state.vy, vertical * 7.5, 4.1, dt);
    state.x = clamp(state.x + state.vx * dt, -9.4, 9.4);
    state.y = clamp(state.y + state.vy * dt, 1.5, 5.5);
    if (Math.abs(state.x) >= 9.4) state.vx *= .2;
    if (state.y === 1.5 || state.y === 5.5) state.vy *= .2;
    state.energy = clamp(state.energy + (boost ? -13.5 : 2.2) * dt, 0, 100);
    if (state.energy <= 0) { gameOver(); return; }
    state.distance += state.speed * dt / 3600;
    state.invulnerable = Math.max(0, state.invulnerable - dt);
  }
  const motionSpeed = active ? state.speed / 6.6 : (!state.started ? 8 : 0);
  const travel = motionSpeed * dt;
  for (const tile of tiles) {
    tile.position.z += travel;
    if (tile.position.z > 40) tile.position.z -= tileLength * tileCount;
  }
  for (const prop of props) {
    prop.position.z += travel * .9;
    if (prop.position.z > 48) prop.position.z -= random(290, 335);
  }
  for (const item of items) {
    item.position.z += travel;
    item.rotation.z += dt * (item.userData.type === 'core' ? .5 : -.45);
    item.userData.spin.rotation.y += dt * 1.55;
    if (item.userData.halo) item.userData.halo.rotation.y += dt;
    item.position.y += Math.sin(timestamp * .0017 + item.id) * dt * .2;
    if (active && !item.userData.collected) collide(item);
    if (item.position.z > 20) resetItem(item);
  }
  craft.position.x = THREE.MathUtils.damp(craft.position.x, state.x, 8, dt);
  craft.position.y = THREE.MathUtils.damp(craft.position.y, state.y + Math.sin(timestamp * .0023) * .13, 7, dt);
  craft.rotation.z = THREE.MathUtils.damp(craft.rotation.z, active ? -state.vx * .036 : Math.sin(timestamp * .0005) * .035, 5, dt);
  craft.rotation.x = THREE.MathUtils.damp(craft.rotation.x, active ? state.vy * .022 : -.015, 4, dt);
  for (const part of craft.children) {
    if (part.userData.flame) part.scale.z = (active && inputs.has('boost') ? 2.8 : 1.55) + Math.sin(timestamp * .024) * .22;
  }
  engineLight.intensity = active && inputs.has('boost') ? 60 : 26 + Math.sin(timestamp * .012) * 6;
  craft.visible = state.cameraMode !== 2 && !(state.invulnerable > 0 && Math.floor(timestamp * .014) % 2 === 0);
  const mode = state.cameraMode;
  const camX = mode === 2 ? state.x : mode === 1 ? state.x + 5.5 : state.x * .55;
  const camY = mode === 2 ? state.y + .63 : mode === 1 ? state.y + 5.8 : state.y + 4.25;
  const camZ = mode === 2 ? 5.45 : mode === 1 ? 19.4 : 17.2;
  camera.position.lerp(new THREE.Vector3(camX, camY, camZ), Math.min(1, dt * (mode === 2 ? 9 : 3.1)));
  camera.lookAt(mode === 2 ? state.x : state.x * .65, mode === 2 ? state.y + .2 : state.y + .24, mode === 1 ? -17 : -33);
  camera.fov = THREE.MathUtils.damp(camera.fov, active && inputs.has('boost') ? 78 : 67, 3, dt);
  camera.updateProjectionMatrix();
  if (active) updateHud();
}
function updateHud() {
  $('speed').textContent = String(Math.round(state.speed)).padStart(3, '0');
  $('speed-bar').style.width = `${Math.min(100, state.speed / 320 * 100)}%`;
  $('distance').textContent = state.distance.toFixed(2);
  $('cores').textContent = String(state.cores).padStart(2, '0');
  $('energy').textContent = `${Math.ceil(state.energy)}%`;
  $('energy-bar').style.width = `${state.energy}%`;
  $('energy-bar').parentElement.classList.toggle('low', state.energy < 30);
  $('thrust').textContent = inputs.has('boost') && state.energy > 6 ? 'BOOST / MAX' : inputs.has('brake') ? 'BRAKING' : 'NOMINAL';
  $('state-label').textContent = state.energy < 30 ? 'CRITICAL' : 'STABLE';
  $('state-label').style.color = state.energy < 30 ? '#ff7595' : '#81e9d4';
  $('zone').textContent = state.distance < 2 ? 'THE NEON EXPANSE' : state.distance < 5 ? 'THE GLASS CANYON' : state.distance < 10 ? 'MIDNIGHT CORRIDOR' : 'THE OUTER LIMIT';
  if (state.distance > state.best) $('best').textContent = `${state.distance.toFixed(2)} KM`;
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
craft.position.set(0, 2.4, 6);
camera.position.set(0, 6.7, 17);
camera.lookAt(0, 2.3, -20);
requestAnimationFrame(frame);