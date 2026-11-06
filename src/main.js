import * as THREE from 'three';
import {AIRCRAFT, REGIONS, AIRPORTS, KNOTS_PER_MS, FEET_PER_M, clamp, spawn, updateFlight, getPalette, getSeason, nearestAirport} from './flight.js';

/* SKYBOUND: procedural, asset-free real-time WebGL flight world. All units are metres. */
const $ = id => document.getElementById(id);
const V = (x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const ui = {home:$('home'),hud:$('hud'),walk:$('walkHud'),modal:$('modal'),crash:$('crashOverlay')};
let renderer,scene,camera,world,airportWorld,aircraftWorld,activeMesh,avatar,sun,sky,ambient,clouds,snowParticles;
let parked=[],selected=0,region='coast',monthOverride=null,flightState=spawn(AIRCRAFT[0]),mode='home',paused=false;
let cameraIndex=0,gearVisual=true,ready=false,last=performance.now(),clock=0,toastTimer=0,viewYaw=.25;
const cameraModes=['CHASE','COCKPIT','WING','TOWER'];
const inputKeys=new Set();
const touch={bank:0,pitch:0,walkX:0,walkY:0,brake:false};
const onFoot={position:V(),heading:0};
const temp=V(),camTarget=V(),camLook=V(),cameraAim=V(),camPos=V();
const PI=Math.PI,up=V(0,1,0);
const mat=(color,metalness=0,roughness=.65)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const baseMat=mat('#f2f3f2',.4,.3), darkMat=mat('#13232d',.3,.23),glassMat=new THREE.MeshPhysicalMaterial({color:'#1a3b52',metalness:.25,roughness:.11,transparent:true,opacity:.77,clearcoat:1,clearcoatRoughness:.1});
let engineAudio=null,engineSoundOn=true;

function seeded(seed){let n=seed>>>0;return()=>{n=(Math.imul(1664525,n)+1013904223)>>>0;return n/4294967296;};}
function mesh(parent,geometry,material,x=0,y=0,z=0,cast=false){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=cast;m.receiveShadow=true;parent.add(m);return m;}
function box(parent,w,h,d,material,x=0,y=0,z=0,cast=false){return mesh(parent,new THREE.BoxGeometry(w,h,d),material,x,y,z,cast)}
function sphere(parent,w,h,d,material,x=0,y=0,z=0){const m=mesh(parent,new THREE.SphereGeometry(1,16,10),material,x,y,z);m.scale.set(w,h,d);return m}
function cylinder(parent,top,bottom,length,material,x=0,y=0,z=0,axis='y'){const o=mesh(parent,new THREE.CylinderGeometry(top,bottom,length,12),material,x,y,z,true);if(axis==='z')o.rotation.x=Math.PI/2;if(axis==='x')o.rotation.z=Math.PI/2;return o}
function planeWing(parent,rootX,rootLeading,rootTrailing,tipX,tipLeading,tipTrailing,y,material,thickness=.2){
  const s=new THREE.Shape();s.moveTo(rootX,rootLeading);s.lineTo(tipX,tipLeading);s.lineTo(tipX,tipTrailing);s.lineTo(rootX,rootTrailing);s.closePath();
  const g=new THREE.ExtrudeGeometry(s,{depth:thickness,bevelEnabled:true,bevelThickness:thickness*.22,bevelSize:thickness*.35,bevelSegments:1,steps:1,curveSegments:1});g.rotateX(Math.PI/2);
  const m=mesh(parent,g,material,0,y,0,true);return m;
}
function fuselage(parent,length,radius,material){
  const profile=[[-.52,.03],[-.48,.53],[-.35,.78],[-.12,1],[.14,1],[.33,.85],[.43,.54],[.5,.03]];
  const points=profile.map(([z,r])=>new THREE.Vector2(radius*r,length*z));
  const geo=new THREE.LatheGeometry(points,22);geo.rotateX(Math.PI/2);
  return mesh(parent,geo,material,0,0,0,true);
}
function aircraftModel(spec,staticModel=false){
  const g=new THREE.Group();g.userData.spec=spec;const len=spec.body,span=spec.span,large=spec.kind==='jet'||spec.kind==='fighter';
  const radius=clamp(len*.066,.49,3.4),wingY=spec.wings==='high'?radius*.78:-radius*.25;
  const paint=mat(spec.color,.42,.3),stripe=mat(spec.accent,.48,.31),edge=mat('#dadde0',.67,.28),tire=mat('#1a2228',.08,.95),metal=mat('#8f969b',.75,.38),lightMaterial=new THREE.MeshBasicMaterial({color:'#eafff5'});
  fuselage(g,len,radius,paint);
  // A slightly raised, glass-panelled flight deck, with detailed frames.
  if(large){
    sphere(g,radius*.84,radius*.38,len*.092,glassMat,0,radius*.59,len*.31);
    for(let s of [-1,1]){
      for(let i=0;i<(spec.kind==='fighter'?0:Math.min(19,Math.floor(len/2.5)));i++){
        const z=len*.13-i*len*.035;
        if(z<-len*.38)break;
        sphere(g,.075*radius,.10*radius,.16*radius,glassMat,s*radius*.97,radius*.36,z);
      }
    }
  } else {
    sphere(g,radius*.94,radius*.50,len*.135,glassMat,0,radius*.71,len*.13);
    for(const side of [-1,1])box(g,.018,radius*.6,.042*len,edge,side*radius*.55,radius*.95,len*.13);
  }
  const sweep=spec.kind==='fighter'?.30:spec.kind==='jet'?.19:.06;
  for(let side of [-1,1]){
    const wing=planeWing(g,side*.2,len*.115,-len*.165,side*span*.5,len*(.115-sweep),-len*(.08+sweep),wingY,paint,large?.38:.17);
    wing.material.side=THREE.DoubleSide;
    // Painted wingtip, aileron and navigation strobes.
    box(g,span*.075,.065,len*.038,stripe,side*span*.457,wingY+.04,-len*(.08+sweep));
    sphere(g,.13,.13,.13,new THREE.MeshBasicMaterial({color:side<0?'#ff5360':'#50ffac'}),side*span*.50,wingY+.13,-len*.095);
    const tailSpan=span*(spec.kind==='fighter'?.34:.30);
    planeWing(g,0,-len*.33,-len*.46,side*tailSpan*.5,-len*.39,-len*.49,-radius*.0,paint,large?.23:.12);
  }
  // Vertical stabiliser; planform in Z/Y coordinates.
  const f=new THREE.Shape();f.moveTo(-len*.47,0);f.lineTo(-len*.31,radius*2.25);f.lineTo(-len*.38,radius*2.35);f.lineTo(-len*.52,0);f.closePath();
  const finGeo=new THREE.ExtrudeGeometry(f,{depth:Math.max(.09,radius*.13),bevelEnabled:false});
  // Shape x => aircraft z, shape y => aircraft y.
  finGeo.rotateY(-PI/2);finGeo.translate(0,radius*.20,0);
  mesh(g,finGeo,stripe,0,0,0,true);
  // Fuselage livery and small forward fuselage stripe.
  for(const side of [-1,1]){
    const line=box(g,radius*.07,radius*.065,len*.49,stripe,side*radius*.965,-radius*.05,-len*.066);
    line.rotation.z=side*-.02;
  }
  const propellers=[];
  if(spec.kind==='prop'||spec.kind==='twin'||spec.kind==='turboprop'){
    const isTwin=spec.kind==='twin'||spec.kind==='turboprop';
    const motorPositions=isTwin?[-span*.22,span*.22]:[0];
    for(const px of motorPositions){
      const pz=isTwin?len*.055:len*.51;
      if(isTwin){cylinder(g,radius*.25,radius*.24,len*.24,edge,px,wingY-radius*.28,pz-len*.035,'z');}
      const prop=new THREE.Group();prop.position.set(px,isTwin?wingY-radius*.25:0,pz+(isTwin?len*.075:0));
      cylinder(prop,.17,.22,.5,metal,0,0,.02,'z');
      for(let j=0;j<(spec.kind==='turboprop'?4:2);j++){
        const blade=box(prop,.14,Math.max(.95,radius*2.6),.06,darkMat,0,0,0);blade.rotation.z=j*PI/(spec.kind==='turboprop'?2:1);
      }
      g.add(prop);propellers.push(prop);
    }
  }
  if(spec.kind==='jet'){
    for(const side of [-1,1]){
      const px=side*span*.25;
      cylinder(g,radius*.46,radius*.52,len*.19,edge,px,wingY-radius*.7,-len*.045,'z');
      cylinder(g,radius*.32,radius*.32,len*.013,darkMat,px,wingY-radius*.7,len*.06,'z');
      sphere(g,radius*.33,radius*.32,radius*.11,metal,px,wingY-radius*.7,len*.06);
    }
  }
  if(spec.kind==='fighter'){
    const intake=box(g,radius*.95,radius*.48,len*.16,darkMat,0,-radius*.93,len*.08);
    intake.rotation.x=.08;
    cylinder(g,radius*.50,radius*.58,len*.11,darkMat,0,-radius*.20,-len*.51,'z');
  }
  // Main undercarriage, including tyres, brake hubs, struts and nose gear.
  const wheelY=-(Math.max(1.15,radius*1.55));const gear=new THREE.Group();
  for(const side of [-1,1]){
    const px=side*Math.max(radius*.8,span*.105),pz=-len*.12;
    cylinder(gear,.066,.066,Math.abs(wheelY)+radius*.25,metal,px,wheelY*.45,pz);
    const tyre=cylinder(gear,Math.max(.28,radius*.25),Math.max(.28,radius*.25),Math.max(.18,radius*.13),tire,px,wheelY,pz,'x');
    cylinder(gear,Math.max(.13,radius*.12),Math.max(.13,radius*.12),Math.max(.20,radius*.14),metal,px,wheelY,pz,'x');
  }
  cylinder(gear,.048,.048,Math.abs(wheelY)+radius*.18,metal,0,wheelY*.47,len*.34);
  cylinder(gear,Math.max(.23,radius*.17),Math.max(.23,radius*.17),.22,tire,0,wheelY,len*.34,'x');
  g.add(gear);g.userData.gearMesh=gear;g.userData.props=propellers;g.userData.radius=radius;g.userData.groundOffset=wheelY;
  if(!staticModel){const beacon=sphere(g,.11,.10,.11,lightMaterial,0,radius*1.10,-len*.20);beacon.userData.blink=true;}
  return g;
}
function makeNoiseTexture(base='#383d40'){
  const c=document.createElement('canvas');c.width=c.height=128;
  const ctx=c.getContext('2d');ctx.fillStyle=base;ctx.fillRect(0,0,128,128);const r=seeded(12);
  for(let i=0;i<14000;i++){const v=Math.floor(r()*100)+55;ctx.fillStyle=`rgba(${v},${v},${v},${r()*.10})`;ctx.fillRect(r()*128,r()*128,1,1)}
  const tex=new THREE.CanvasTexture(c);tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(1,15);tex.anisotropy=4;return tex;
}
function addHangar(parent,x,z,w=90){
  const wall=mat('#a6aeb0',.36,.6),roof=mat('#59676c',.47,.6),glass=mat('#273b45',.35,.24);
  box(parent,w,20,75,wall,x,10,z,true);box(parent,w+5,3,81,roof,x,22,z,true);
  for(let i=-1;i<=1;i++)box(parent,w*.28,15,.5,glass,x+i*w*.30,9.5,z+38);
  box(parent,w+7,2,2,mat('#c8b9a4'),x,1,z+39);
}
function makeAirport(a,i){
  const parent=new THREE.Group();parent.position.set(a.x,0,a.z);airportWorld.add(parent);
  const asphalt=mat('#252c31',.1,.9),tarmac=new THREE.MeshStandardMaterial({map:makeNoiseTexture('#63696d'),roughness:.96,metalness:.04}),line=mat('#e8e7de',0,.95),yellow=mat('#e4b462',0,.9),grass=mat('#7c8468',0,1),metal=mat('#667780',.3,.6),glass=mat('#1b3c51',.4,.25);
  box(parent,125,.1,1650,grass,0,.045,0);
  const runway=box(parent,64,.18,1610,asphalt,0,.16,0);runway.receiveShadow=true;
  // Threshold bars, runway centreline, edge markings and taxi lighting.
  for(let n=-11;n<=11;n++)box(parent,1.6,.03,37,line,0,.27,n*63);
  for(const side of [-1,1]){
    box(parent,.65,.03,1550,line,side*28,.28,0);
    for(let j=-10;j<=10;j++){
      const lamp=sphere(parent,.55,.09,.55,new THREE.MeshBasicMaterial({color:'#eadcbb'}),side*35,.27,j*75);
      lamp.material.depthWrite=false;
    }
    for(let k=0;k<7;k++)box(parent,3.1,.04,21,line,side*(4+k*3.1),.29,-725);
    for(let k=0;k<7;k++)box(parent,3.1,.04,21,line,side*(4+k*3.1),.29,725);
    for(let j of [-450,420])for(let k=0;k<3;k++)box(parent,2.5,.025,42,line,side*(12+k*5),.3,j);
  }
  // Taxiway and stand aprons.
  box(parent,25,.14,1100,tarmac,115,.18,20);
  for(let offset of [-300,300]){
    box(parent,110,.14,24,tarmac,60,.18,offset);
    box(parent,110,.02,.6,yellow,60,.29,offset);
  }
  box(parent,280,.15,380,tarmac,240,.2,140);
  box(parent,.75,.02,1010,yellow,115,.31,20);
  // Terminal with two volumes, airside glass and a real control tower.
  box(parent,145,19,70,metal,270,9.6,405,true);
  box(parent,153,2,80,mat('#bbc5c5',.35,.42),270,20,405,true);
  box(parent,139,14,1,glass,270,10.5,365);
  for(let j=-5;j<=5;j++)box(parent,1.1,14,.4,mat('#bbc6cd'),270+j*12,10.5,364.4);
  box(parent,13,66,13,metal,367,33,430,true);
  box(parent,23,9,23,glass,367,66,430,true);
  box(parent,27,2,27,mat('#d0d4d2'),367,72,430);
  box(parent,1,8,1,metal,367,77,430);
  for(let n=0;n<3;n++)addHangar(parent,240+n*115,-280,88);
  for(let j=0;j<7;j++)box(parent,1.1,.03,15,line,158+j*26,.30,115);
  // Airfield service vehicles.
  for(let j=0;j<5;j++){
    box(parent,6,2.9,12,mat(j%2?'#e8aa4a':'#ebeded'),150+j*26,1.75,358+j%2*20,true);
    for(const side of [-1,1])for(const dz of [-3.3,3.3])cylinder(parent,1,1,.65,mat('#22272d'),150+j*26+side*3,.8,358+j%2*20+dz,'x');
  }
  // Illuminated windsock and runway guidance.
  cylinder(parent,.2,.2,11,mat('#d9d8ca'),-58,5.5,-240);
  const sock=cylinder(parent,.18,1.8,5,mat('#e5a25d'),-58,11,-240,'z');sock.rotation.y=.55;
  const sign=box(parent,18,4,.6,mat('#123749'),-76,2,-405);sign.rotation.y=-.15;
  a.userData={parent};
}
function makeTrees(rand,palette){
  const coords=[];for(let i=0;i<950;i++){
    const x=(rand()-.5)*9800,z=(rand()-.5)*9800;
    if(AIRPORTS.some(a=>Math.abs(x-a.x)<670&&Math.abs(z-a.z)<1040))continue;
    if(region==='coast'&&x<-2600)continue;
    coords.push([x,z,rand()*2.8+2.5,rand()]);
  }
  const autumn=palette.id==='november'||palette.id==='autumn';
  const leafColors=region==='desert'?['#61765a','#7c825c','#8a8c68']:autumn?['#a97349','#bd8e52','#6b764f','#b56d45']:palette.snow?['#46685b','#52746c','#35554b']:['#3b745b','#4e875d','#679469'];
  const coneGeo=new THREE.ConeGeometry(1,2.9,6),trunkGeo=new THREE.CylinderGeometry(.15,.25,1.3,5);
  const crowns=new THREE.InstancedMesh(coneGeo,new THREE.MeshStandardMaterial({color:'#fff',roughness:1,flatShading:true}),coords.length),trunks=new THREE.InstancedMesh(trunkGeo,mat('#5d4d3b'),coords.length);
  const dummy=new THREE.Object3D();coords.forEach(([x,z,h,c],i)=>{
    dummy.position.set(x,h*.56,z);dummy.scale.set(h*.56,h*.78,h*.56);dummy.rotation.y=c*PI*2;dummy.updateMatrix();crowns.setMatrixAt(i,dummy.matrix);
    crowns.setColorAt(i,new THREE.Color(leafColors[Math.floor(c*leafColors.length)]));
    dummy.position.set(x,h*.2,z);dummy.scale.set(h*.35,h*.60,h*.35);dummy.rotation.y=0;dummy.updateMatrix();trunks.setMatrixAt(i,dummy.matrix);
  });crowns.instanceMatrix.needsUpdate=true;trunks.instanceMatrix.needsUpdate=true;
  crowns.castShadow=false;trunks.castShadow=false;world.add(crowns,trunks);
}
function makeMountains(rand,palette){
  const mountainMat=mat(region==='desert'?'#9b7867':'#8a9591',.02,1);
  for(let i=0;i<35;i++){
    const a=rand()*PI*2,r=3900+rand()*1900,x=Math.cos(a)*r,z=Math.sin(a)*r;
    // avoid airports, runway corridors.
    const radius=230+rand()*520,height=(region==='alpine'?530:220)+rand()*(region==='alpine'?860:540);
    const mountain=mesh(world,new THREE.ConeGeometry(radius,height,5),mountainMat,x,height*.47,z);mountain.rotation.y=rand()*PI*2;
    if(region==='alpine'||palette.snow){
      const snowCap=mesh(world,new THREE.ConeGeometry(radius*.48,height*.32,5),mat('#e9f0ec',0,.95),x,height*.47+height*.33,z);
      snowCap.rotation.y=mountain.rotation.y;
    }
  }
}
function makeClouds(rand){clouds=new THREE.Group();world.add(clouds);
  const cloudmat=new THREE.MeshLambertMaterial({color:'#f0f4f3',transparent:true,opacity:.72,depthWrite:false});
  for(let i=0;i<45;i++){
    const cluster=new THREE.Group();const x=(rand()-.5)*8500,z=(rand()-.5)*8500;
    cluster.position.set(x,280+rand()*490,z);
    for(let j=0;j<5;j++)sphere(cluster,60+rand()*65,15+rand()*17,25+rand()*32,cloudmat,(j-2)*37,rand()*7,(rand()-.5)*24);
    clouds.add(cluster);
  }
}
function makeCity(rand){
  const materials=[mat('#6e7e80'),mat('#8d999b'),mat('#788992'),mat('#526a71')];
  for(let i=0;i<120;i++){
    const x=2500+rand()*1100,z=-600+rand()*1350,y=15+rand()*110;
    box(world,15+rand()*27,y,15+rand()*27,materials[Math.floor(rand()*materials.length)],x,y*.5,z);
  }
}
function makeSnow(rand){const count=650,positions=new Float32Array(count*3);for(let i=0;i<count;i++){positions[i*3]=(rand()-.5)*350;positions[i*3+1]=rand()*200;positions[i*3+2]=(rand()-.5)*350;}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));
  snowParticles=new THREE.Points(geo,new THREE.PointsMaterial({color:'#fff',size:1.7,transparent:true,opacity:.82,depthWrite:false}));world.add(snowParticles);
}
function disposeWorld(){if(!world)return;scene.remove(world);world.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const m=Array.isArray(o.material)?o.material:[o.material];for(const one of m){if(one.map)one.map.dispose();one.dispose();}}});parked=[];}
function buildWorld(){
  disposeWorld();const palette=getPalette(region,monthOverride??new Date().getMonth());
  scene.background=new THREE.Color(palette.sky);scene.fog=new THREE.FogExp2(palette.fog,region==='alpine'?.00013:.000105);
  ambient.color.set('#dbe5e6');ambient.intensity=region==='desert'?1.8:1.5;
  sun.color.set(palette.snow?'#eef4ff':'#ffe5be');sun.intensity=region==='desert'?3.0:2.5;
  const rand=seeded(20261106);
  world=new THREE.Group();world.name='Seasonal open world';scene.add(world);
  airportWorld=new THREE.Group();world.add(airportWorld);
  aircraftWorld=new THREE.Group();world.add(aircraftWorld);
  box(world,18000,.22,18000,mat(palette.ground,0,.96),0,-.2,0);
  // grass strips along terrain and fields.
  for(let i=0;i<65;i++){
    const x=(rand()-.5)*8500,z=(rand()-.5)*8500;if(AIRPORTS.some(a=>Math.abs(a.x-x)<560&&Math.abs(a.z-z)<950))continue;
    const patch=box(world,100+rand()*370,.015,120+rand()*280,mat(i%2?palette.grass:palette.ground,0,1),x,-.025,z);patch.rotation.y=(rand()-.5)*.6;
  }
  if(region==='coast'){
    const water=mesh(world,new THREE.PlaneGeometry(9000,18000,1,1),new THREE.MeshPhysicalMaterial({color:'#557d91',metalness:.15,roughness:.20,transparent:true,opacity:.89}),-7100,.06,0);water.rotation.x=-PI/2;
    box(world,220,.16,16000,mat('#a0a08b'),-2650,-.01,0);
  }
  for(let i=0;i<AIRPORTS.length;i++)makeAirport(AIRPORTS[i],i);
  makeTrees(rand,palette);makeMountains(rand,palette);makeClouds(rand);makeCity(rand);
  if(palette.snow)makeSnow(rand);
  // Ten distinct aircraft are also physically parked at airport stands.
  AIRCRAFT.forEach((spec,i)=>{
    const a=AIRPORTS[Math.floor(i/4)%AIRPORTS.length];const slot=i%4;
    const group=aircraftModel(spec,true);
    group.position.set(a.x+173+(slot%2)*65,Math.max(1.8,spec.scale*1.9),a.z-65+Math.floor(slot/2)*110);
    group.rotation.y=PI*.5;
    aircraftWorld.add(group);parked.push({spec,index:i,group,position:group.position});
  });
  activeMesh=aircraftModel(AIRCRAFT[selected]);aircraftWorld.add(activeMesh);
  avatar=new THREE.Group();
  const pilotSuit=mat('#dfab72',.05,.88),trousers=mat('#253d4d'),skin=mat('#c7a27f');
  sphere(avatar,.25,.28,.24,skin,0,1.65,0);box(avatar,.65,.75,.33,pilotSuit,0,1.04,0);
  for(const side of [-1,1]){box(avatar,.22,.76,.22,trousers,side*.17,.38,0);box(avatar,.17,.7,.23,pilotSuit,side*.45,1.0,0)}
  sphere(avatar,.3,.13,.30,mat('#18242d'),0,1.88,0);avatar.visible=false;aircraftWorld.add(avatar);
  syncPlane();
  $('headerSeason').textContent=palette.label;$('homeSeason').textContent=monthOverride===null?new Date().toLocaleDateString('en-US',{month:'long',year:'numeric'}).toUpperCase():palette.label;
  $('worldLabel').textContent=REGIONS.find(r=>r.id===region).name.toUpperCase();
  for(const b of document.querySelectorAll('.season-btn'))b.classList.toggle('active',b.dataset.month===String(monthOverride));
  for(const b of document.querySelectorAll('.region-btn'))b.classList.toggle('active',b.dataset.region===region);
}
function syncPlane(){if(!activeMesh)return;activeMesh.position.set(flightState.x,flightState.y,flightState.z);
  activeMesh.rotation.order='YXZ';activeMesh.rotation.y=flightState.heading;
  activeMesh.rotation.x=-flightState.pitch;activeMesh.rotation.z=-flightState.roll;
  activeMesh.userData.gearMesh.visible=flightState.gear;
}
function initThree(){
  scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(66,window.innerWidth/window.innerHeight,.15,18000);camera.position.set(0,28,-55);
  renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance',alpha:false});
  renderer.setSize(window.innerWidth,window.innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio||1,matchMedia('(max-width: 760px)').matches?1.15:1.55));renderer.shadowMap.enabled=!matchMedia('(max-width: 760px)').matches;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.24;
  $('scene').appendChild(renderer.domElement);
  ambient=new THREE.HemisphereLight('#e3f0fa','#746853',1.5);scene.add(ambient);
  sun=new THREE.DirectionalLight('#ffefdb',2.5);sun.position.set(-150,380,180);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-130;sun.shadow.camera.right=130;sun.shadow.camera.top=130;sun.shadow.camera.bottom=-130;sun.shadow.camera.near=2;sun.shadow.camera.far=1200;sun.shadow.bias=-.0001;scene.add(sun);
  buildWorld();renderFleet();renderMenu();
  window.addEventListener('resize',()=>{camera.aspect=window.innerWidth/window.innerHeight;camera.updateProjectionMatrix();renderer.setSize(window.innerWidth,window.innerHeight);});
  ready=true;requestAnimationFrame(tick);
}
function renderFleet(){
  const spec=AIRCRAFT[selected];$('planeCategory').textContent=spec.category;$('planeName').textContent=spec.name;$('planeTagline').textContent=spec.tagline;
  $('planeSpeed').innerHTML=`${Math.round(spec.speed*3.6)} <small>KM/H</small>`;$('planeRange').innerHTML=`${spec.range.toLocaleString()} <small>KM</small>`;
  $('planeCount').textContent=`${String(selected+1).padStart(2,'0')} / 10`;
  $('fleetList').innerHTML=AIRCRAFT.map((a,i)=>`<button class="fleet-entry ${i===selected?'active':''}" data-plane="${i}"><span class="fleet-index">${String(i+1).padStart(2,'0')}</span><strong>${a.name}</strong><small>${a.kind.toUpperCase()}</small></button>`).join('');
  document.querySelectorAll('.fleet-entry').forEach(el=>el.addEventListener('click',()=>chooseAircraft(+el.dataset.plane)));
  $('modalFleet').innerHTML=AIRCRAFT.map((a,i)=>`<button class="modal-plane ${i===selected?'active':''}" data-plane="${i}"><span>${String(i+1).padStart(2,'0')}. ${a.name}</span><small>${Math.round(a.speed*3.6)} KM/H</small></button>`).join('');
  document.querySelectorAll('.modal-plane').forEach(el=>el.addEventListener('click',()=>{chooseAircraft(+el.dataset.plane);closeModal();if(mode==='home')startFlight();else showToast('AIRCRAFT CHANGED',AIRCRAFT[selected].name);}));
}
function renderMenu(){
  $('regionList').innerHTML=REGIONS.map(r=>`<button class="region-btn ${region===r.id?'active':''}" data-region="${r.id}"><strong>${r.name}</strong><span>${r.description}</span><span>${r.latitude}</span></button>`).join('');
  $('seasonList').innerHTML=[{m:null,label:'LIVE CALENDAR'},...Array.from({length:12},(_,m)=>({m,label:new Date(2026,m,1).toLocaleDateString('en-US',{month:'long'}).toUpperCase()}))].map(x=>`<button class="season-btn ${monthOverride===x.m?'active':''}" data-month="${x.m===null?'null':x.m}">${x.label}</button>`).join('');
  document.querySelectorAll('.region-btn').forEach(b=>b.addEventListener('click',()=>{
    region=b.dataset.region;flightState=spawn(AIRCRAFT[selected]);buildWorld();renderMenu();showToast('WORLD LOADED',REGIONS.find(r=>r.id===region).name);
  }));
  document.querySelectorAll('.season-btn').forEach(b=>b.addEventListener('click',()=>{
    monthOverride=b.dataset.month==='null'?null:+b.dataset.month;buildWorld();renderMenu();showToast('ATMOSPHERE UPDATED',getSeason(monthOverride??new Date().getMonth()).label);
  }));
}
function chooseAircraft(i){
  if(i<0||i>=AIRCRAFT.length)return;selected=i;
  const near=nearestAirport(flightState.x,flightState.z).airport;
  flightState=spawn(AIRCRAFT[selected],near);avatar&&(avatar.visible=false);
  if(activeMesh){aircraftWorld.remove(activeMesh);activeMesh=aircraftModel(AIRCRAFT[selected]);aircraftWorld.add(activeMesh)}
  syncPlane();renderFleet();$('aircraftHud').textContent=AIRCRAFT[selected].short;
  if(mode==='walk'){mode='flight';toggleScreens()}
}
function toggleScreens(){
  ui.home.classList.toggle('hidden',mode!=='home');ui.hud.classList.toggle('hidden',mode!=='flight');ui.walk.classList.toggle('hidden',mode!=='walk');
  document.body.classList.toggle('in-flight',mode==='flight');document.body.classList.toggle('walking',mode==='walk');
}
function showToast(title,description,symbol='✦'){
  clearTimeout(toastTimer);$('toastTitle').textContent=title;$('toastDescription').textContent=description;$('toastSymbol').textContent=symbol;
  $('eventToast').classList.remove('hidden');toastTimer=setTimeout(()=>$('eventToast').classList.add('hidden'),3800);
}
function startFlight(){mode='flight';paused=false;ui.modal.classList.add('hidden');ui.crash.classList.add('hidden');toggleScreens();initAudio();showToast('CLEARED FOR TAKEOFF','Hold SHIFT to accelerate · W to rotate above takeoff speed');}
function resetFlight(){flightState=spawn(AIRCRAFT[selected],nearestAirport(flightState.x,flightState.z).airport);syncPlane();avatar.visible=false;mode='flight';paused=false;ui.crash.classList.add('hidden');ui.modal.classList.add('hidden');toggleScreens();showToast('READY FOR DEPARTURE','Taxi to the runway and rotate at takeoff speed');}
function openModal(tab='aircraft'){paused=true;ui.modal.classList.remove('hidden');selectTab(tab)}
function closeModal(){ui.modal.classList.add('hidden');paused=false}
function selectTab(tab){document.querySelectorAll('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===tab));for(const t of ['Aircraft','World','Controls'])$('tab'+t).classList.toggle('hidden',t.toLowerCase()!==tab);}
function cycleCamera(d=1){cameraIndex=(cameraIndex+d+cameraModes.length)%cameraModes.length;$('cameraLabel').textContent=cameraModes[cameraIndex];showToast('CAMERA',cameraModes[cameraIndex]+' VIEW');}
function nearWalkingPlane(){
  const options=[...parked.map(p=>({spec:p.spec,index:p.index,position:p.position,parked:true})),{spec:AIRCRAFT[selected],index:selected,position:activeMesh.position,parked:false}];
  let closest=null,d=Infinity;for(const p of options){const q=Math.hypot(onFoot.position.x-p.position.x,onFoot.position.z-p.position.z);if(q<d){d=q;closest=p;}}
  return {...closest,distance:d};
}
function walkOrBoard(){
  if(mode==='flight'){
    if(flightState.airborne||flightState.speed>3){showToast('PARK FIRST','Stop on the ground before leaving your aircraft','!');return}
    mode='walk';onFoot.position.set(flightState.x+7,0,flightState.z-4);onFoot.heading=flightState.heading;avatar.visible=true;avatar.position.copy(onFoot.position);toggleScreens();showToast('ON FOOT','Walk up to a nearby aircraft to board');
  }else if(mode==='walk'){
    const target=nearWalkingPlane();if(target.distance>28){$('walkingTarget').textContent='MOVE CLOSER TO AN AIRCRAFT';return;}
    if(target.parked){selected=target.index;const spec=AIRCRAFT[selected];flightState=spawn(spec,nearestAirport(target.position.x,target.position.z).airport);flightState.x=target.position.x;flightState.z=target.position.z;flightState.heading=PI*.5;flightState.y=Math.max(1.8,spec.scale*1.9);aircraftWorld.remove(activeMesh);activeMesh=aircraftModel(spec);aircraftWorld.add(activeMesh);renderFleet();}
    mode='flight';avatar.visible=false;syncPlane();$('aircraftHud').textContent=AIRCRAFT[selected].short;toggleScreens();showToast('WELCOME ON BOARD',AIRCRAFT[selected].name);
  }
}
function bindUi(){
  $('startBtn').addEventListener('click',startFlight);$('exploreBtn').addEventListener('click',()=>openModal('aircraft'));
  $('pauseBtn').addEventListener('click',()=>openModal('aircraft'));$('weatherMenuBtn').addEventListener('click',()=>openModal('world'));
  $('cameraBtn').addEventListener('click',()=>cycleCamera());$('gearBtn').addEventListener('click',toggleGear);$('walkBtn').addEventListener('click',walkOrBoard);$('boardBtn').addEventListener('click',walkOrBoard);
  $('closeModal').addEventListener('click',closeModal);$('modalBack').addEventListener('click',closeModal);$('resumeBtn').addEventListener('click',()=>{if(mode==='home')startFlight();else closeModal()});
  $('resetBtn').addEventListener('click',resetFlight);$('retryBtn').addEventListener('click',resetFlight);
  $('soundBtn').addEventListener('click',()=>{engineSoundOn=!engineSoundOn;initAudio();updateAudio();$('soundBtn').style.opacity=engineSoundOn?'1':'.4'});
  document.querySelectorAll('.tab').forEach(b=>b.addEventListener('click',()=>selectTab(b.dataset.tab)));
  window.addEventListener('keydown',e=>{
    if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
    inputKeys.add(e.code);if(e.repeat)return;
    if(e.code==='Escape'){if(!ui.modal.classList.contains('hidden'))closeModal();else if(mode!=='home')openModal('controls')}
    if(!ui.modal.classList.contains('hidden')||mode==='home')return;
    if(e.code==='KeyC')cycleCamera();if(e.code==='KeyV')cycleCamera(-1);
    if(e.code==='KeyG'&&mode==='flight')toggleGear();if(e.code==='KeyF')walkOrBoard();if(e.code==='KeyR')resetFlight();
  });
  window.addEventListener('keyup',e=>inputKeys.delete(e.code));window.addEventListener('blur',()=>inputKeys.clear());
  bindAnalog('joystickZone','joystickKnob',(x,y)=>{touch.bank=x;touch.pitch=-y});
  bindAnalog('walkJoystick','walkKnob',(x,y)=>{touch.walkX=x;touch.walkY=-y});
  const throttleArea=$('throttleTouch');const setThrottle=e=>{
    const r=throttleArea.querySelector('.touch-throttle-track').getBoundingClientRect();flightState.throttle=clamp(1-(e.clientY-r.top)/r.height,0,1);
  };
  throttleArea.addEventListener('pointerdown',e=>{throttleArea.setPointerCapture(e.pointerId);setThrottle(e)});
  throttleArea.addEventListener('pointermove',e=>{if(throttleArea.hasPointerCapture(e.pointerId))setThrottle(e)});
  $('brakeTouch').addEventListener('pointerdown',e=>{e.preventDefault();touch.brake=true});for(const name of ['pointerup','pointercancel','pointerleave'])$('brakeTouch').addEventListener(name,()=>touch.brake=false);
  $('scene').addEventListener('pointerdown',e=>{if(mode==='walk')viewYaw=e.clientX;});
  $('scene').addEventListener('pointermove',e=>{if(mode==='walk'&&e.buttons===1){onFoot.heading+=(e.movementX||0)*.006;}});
}
function bindAnalog(areaId,knobId,callback){const el=$(areaId),knob=$(knobId);const update=e=>{
  const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2-8;
  const nx=clamp((e.clientX-cx)/(r.width*.35),-1,1),ny=clamp((e.clientY-cy)/(r.height*.35),-1,1);
  knob.style.transform=`translate(${nx*30}px,${ny*30}px)`;callback(nx,ny);
};
  el.addEventListener('pointerdown',e=>{e.preventDefault();el.setPointerCapture(e.pointerId);update(e)});
  el.addEventListener('pointermove',e=>{if(el.hasPointerCapture(e.pointerId))update(e)});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])el.addEventListener(event,()=>{knob.style.transform='translate(0,0)';callback(0,0)});
}
function toggleGear(){if(!flightState) return;flightState.gear=!flightState.gear;syncPlane();$('gearBtn').innerHTML=flightState.gear?'<span>⌄</span> GEAR DOWN':'<span>⌃</span> GEAR UP';showToast('LANDING GEAR',flightState.gear?'EXTENDED':'RETRACTED');}
function initAudio(){if(engineAudio||!engineSoundOn)return;try{
  const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
  const ctx=new Ctx(),master=ctx.createGain();master.gain.value=0;master.connect(ctx.destination);
  const low=ctx.createBiquadFilter();low.type='lowpass';low.frequency.value=900;low.connect(master);
  const osc=ctx.createOscillator();osc.type='sawtooth';osc.frequency.value=47;osc.connect(low);osc.start();
  const osc2=ctx.createOscillator();osc2.type='triangle';osc2.frequency.value=92;const sub=ctx.createGain();sub.gain.value=.33;osc2.connect(sub);sub.connect(low);osc2.start();
  const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate);const data=buffer.getChannelData(0),r=seeded(883);for(let i=0;i<data.length;i++)data[i]=r()*2-1;
  const noise=ctx.createBufferSource();noise.buffer=buffer;noise.loop=true;const noiseGain=ctx.createGain();noiseGain.gain.value=.12;noise.connect(noiseGain);noiseGain.connect(low);noise.start();
  engineAudio={ctx,master,low,osc,osc2,noiseGain};
  }catch(e){console.info('Audio unavailable',e);}
}
function updateAudio(){if(!engineAudio)return;const {ctx,master,low,osc,osc2,noiseGain}=engineAudio;
  if(ctx.state==='suspended'&&engineSoundOn&&mode==='flight')ctx.resume().catch(()=>{});
  const throttle=flightState.throttle,spec=AIRCRAFT[selected],jet=spec.kind==='jet'||spec.kind==='fighter';const loud=engineSoundOn&&mode==='flight'&&!paused&&!flightState.crashed;
  master.gain.setTargetAtTime(loud?.075+throttle*.09:0,ctx.currentTime,.12);
  low.frequency.setTargetAtTime((jet?650:340)+throttle*(jet?1100:900),ctx.currentTime,.12);
  osc.frequency.setTargetAtTime((jet?73:38)+throttle*(jet?68:55),ctx.currentTime,.10);
  osc2.frequency.setTargetAtTime((jet?107:75)+throttle*130,ctx.currentTime,.10);
  noiseGain.gain.setTargetAtTime((jet?.28:.13)*(.35+throttle),ctx.currentTime,.15);
}
function readInputs(dt){const k=code=>inputKeys.has(code)?1:0;
  const joyPitch=touch.pitch,joyBank=touch.bank;
  let pitch=clamp(k('KeyW')+k('ArrowUp')-k('KeyS')-k('ArrowDown')+joyPitch,-1,1);
  let bank=clamp(k('KeyD')+k('ArrowRight')-k('KeyA')-k('ArrowLeft')+joyBank,-1,1);
  let rudder=k('KeyE')-k('KeyQ');let throttleDelta=k('ShiftLeft')+k('ShiftRight')-k('ControlLeft')-k('ControlRight');let brake=k('Space')+ +touch.brake>0;
  if(navigator.getGamepads){const gp=navigator.getGamepads()[0];if(gp){
    pitch=clamp(pitch-(Math.abs(gp.axes[1])>.15?gp.axes[1]:0),-1,1);bank=clamp(bank+(Math.abs(gp.axes[0])>.15?gp.axes[0]:0),-1,1);
    rudder+=((gp.buttons[5]?.pressed?1:0)-(gp.buttons[4]?.pressed?1:0));
    throttleDelta+=gp.buttons[7]?.value||0;throttleDelta-=gp.buttons[6]?.value||0;brake ||=!!gp.buttons[0]?.pressed;
  }}
  return {pitch,bank,rudder,throttleDelta,brake};
}
function updateWalk(dt){
  const k=code=>inputKeys.has(code)?1:0;
  const forward=clamp(k('KeyW')+k('ArrowUp')-k('KeyS')-k('ArrowDown')+touch.walkY,-1,1),strafe=clamp(k('KeyD')-k('KeyA')+touch.walkX,-1,1);
  const length=Math.max(1,Math.hypot(forward,strafe));const moveSpeed=(inputKeys.has('ShiftLeft')?9:5)*dt/length;
  onFoot.position.x+=(Math.sin(onFoot.heading)*forward+Math.cos(onFoot.heading)*strafe)*moveSpeed;
  onFoot.position.z+=(Math.cos(onFoot.heading)*forward-Math.sin(onFoot.heading)*strafe)*moveSpeed;
  avatar.position.copy(onFoot.position);avatar.rotation.y=onFoot.heading;
  const target=nearWalkingPlane();$('walkingTarget').textContent=target.distance<=28?`PRESS F TO BOARD ${target.spec.name.toUpperCase()}`:`NEAREST AIRCRAFT · ${Math.round(target.distance)} M`;
  $('boardBtn').classList.toggle('hidden',target.distance>28);
}
function updateCamera(dt){
  const spec=AIRCRAFT[selected];
  if(mode==='home'){
    const t=clock*.10, radius=spec.body*.8+22;
    camPos.set(flightState.x+Math.sin(t+2)*radius,flightState.y+10+spec.scale*1.8,flightState.z+Math.cos(t+2)*radius);
    camLook.set(flightState.x,flightState.y+1,flightState.z+spec.body*.12);
  }else if(mode==='walk'){
    camPos.set(onFoot.position.x-Math.sin(onFoot.heading)*9,onFoot.position.y+5,onFoot.position.z-Math.cos(onFoot.heading)*9);
    camLook.set(onFoot.position.x+Math.sin(onFoot.heading)*5,2.0,onFoot.position.z+Math.cos(onFoot.heading)*5);
  }else{
    const theta=flightState.heading,forward=V(Math.sin(theta),Math.sin(flightState.pitch),Math.cos(theta));
    if(cameraIndex===0){
      const back=spec.body*.53+23;
      camPos.set(flightState.x-forward.x*back,flightState.y+spec.scale*3.0+9,flightState.z-forward.z*back);
      camLook.set(flightState.x+forward.x*spec.body*.32,flightState.y+Math.sin(flightState.pitch)*10,flightState.z+forward.z*spec.body*.32);
    }else if(cameraIndex===1){
      camPos.set(flightState.x+forward.x*spec.body*.21,flightState.y+activeMesh.userData.radius*.60,flightState.z+forward.z*spec.body*.21);
      camLook.copy(camPos).addScaledVector(forward,160);
    }else if(cameraIndex===2){
      const right=V(Math.cos(theta),0,-Math.sin(theta));
      camPos.copy(activeMesh.position).addScaledVector(right,spec.span*.40).addScaledVector(forward,-spec.body*.06);
      camPos.y+=1.8;camLook.copy(camPos).addScaledVector(forward,120);
    }else{
      const air=nearestAirport(flightState.x,flightState.z).airport;
      camPos.set(air.x+370,70,air.z+430);camLook.copy(activeMesh.position);
    }
  }
  const easing=mode==='home'?1-Math.exp(-dt*1.5):1-Math.exp(-dt*4.5);
  camera.position.lerp(camPos,easing);cameraAim.lerp(camLook,easing);camera.lookAt(cameraAim);
  const targetFov=mode==='flight'&&cameraIndex===0?clamp(60+flightState.speed*.045,65,78):mode==='home'?59:68;
  camera.fov+=(targetFov-camera.fov)*Math.min(1,dt*2.5);camera.updateProjectionMatrix();
  sun.position.set(cameraAim.x-150,380,cameraAim.z+180);sun.target.position.copy(cameraAim);sun.target.updateMatrixWorld();
}
function drawMinimap(){const c=$('minimap'),ctx=c.getContext('2d');if(!ctx)return;const w=c.width,h=c.height;
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#17303e';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#56717f40';ctx.lineWidth=1;
  for(let x=0;x<w;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke()}
  for(let y=0;y<h;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke()}
  const scale=.064,px=flightState.x,pz=flightState.z;
  for(const a of AIRPORTS){const x=w/2+(a.x-px)*scale,y=h/2-(a.z-pz)*scale;
    if(x<0||x>w||y<0||y>h)continue;
    ctx.strokeStyle='#ead7b3';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x,y-16);ctx.lineTo(x,y+16);ctx.stroke();
    ctx.fillStyle='#d5dedf';ctx.font='bold 11px sans-serif';ctx.fillText(a.code,x+9,y-8);
  }
  ctx.save();ctx.translate(w/2,h/2);ctx.rotate(flightState.heading);ctx.fillStyle='#e9b573';ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(-7,9);ctx.lineTo(0,5);ctx.lineTo(7,9);ctx.closePath();ctx.fill();ctx.restore();
}
function updateHUD(){
  const v=flightState,spec=AIRCRAFT[selected];$('speedReadout').textContent=String(Math.round(v.speed*KNOTS_PER_MS)).padStart(3,'0');
  $('altReadout').textContent=String(Math.max(0,Math.round((v.y-Math.max(1.8,spec.scale*1.9))*FEET_PER_M))).padStart(4,'0');
  $('vsReadout').textContent=(v.vy>=0?'+':'')+Math.round(v.vy*FEET_PER_M*60);
  const bearing=((Math.round(v.heading*180/PI)%360)+360)%360;
  const direction=['N','NE','E','SE','S','SW','W','NW'][Math.round(bearing/45)%8];
  $('compassReadout').textContent=`${direction} ${String(bearing).padStart(3,'0')}°`;
  $('engineReadout').textContent=Math.round(v.throttle*100)+'%';$('throttleFill').style.width=(v.throttle*100)+'%';
  $('groundReadout').textContent=Math.round(v.speed*3.6)+' KM/H';
  const total=Math.floor(v.flightSeconds);$('timeReadout').textContent=`${String(Math.floor(total/60)).padStart(2,'0')}:${String(total%60).padStart(2,'0')}`;
  $('touchThrottleFill').style.height=(v.throttle*100)+'%';$('touchThrottleThumb').style.bottom=`calc(${v.throttle*100}% - 5px)`;$('touchThrottlePercent').textContent=Math.round(v.throttle*100)+'%';
  $('flightMode').textContent=v.airborne?'IN FLIGHT':v.speed>2?'TAXI / TAKEOFF':'ON THE GROUND';
  const {airport,distance}=nearestAirport(v.x,v.z);$('nearestAirport').textContent=airport.name.toUpperCase();$('nearestDist').textContent=(distance/1000).toFixed(1)+' KM';$('mapHeading').textContent=`${direction} ${bearing}°`;
  drawMinimap();
}
function updateSnow(dt){if(!snowParticles)return;const a=snowParticles.geometry.attributes.position;
  for(let i=0;i<a.count;i++){let y=a.getY(i)-dt*12,x=a.getX(i)+dt*2;if(y<0)y+=200;if(x>175)x-=350;a.setXYZ(i,x,y,a.getZ(i))}
  a.needsUpdate=true;snowParticles.position.set(mode==='walk'?onFoot.position.x:flightState.x,0,mode==='walk'?onFoot.position.z:flightState.z);
}
function tick(now){requestAnimationFrame(tick);let dt=Math.min(.045,(now-last)/1000||.016);last=now;clock+=dt;
  try{
    if(mode==='flight'&&!paused&&!flightState.crashed){
      const event=updateFlight(flightState,readInputs(dt),dt,AIRCRAFT[selected]);syncPlane();
      if(event==='takeoff')showToast('AIRBORNE','Positive rate of climb — enjoy your flight');
      if(event==='landed')showToast('TOUCHDOWN','A smooth landing. Welcome back to the ground.');
      if(event==='crash'){
        paused=true;ui.crash.classList.remove('hidden');
        showToast('CRITICAL DAMAGE','The aircraft sustained damage on impact');
      }
      if(region==='coast'&&flightState.airborne&&flightState.x < -2700&&flightState.y < 3){flightState.crashed=true;paused=true;ui.crash.classList.remove('hidden');}
    }
    if(mode==='walk'&&!paused)updateWalk(dt);
    // Animate all visible aircraft, with real spinning propellers.
    if(activeMesh)for(const prop of activeMesh.userData.props)prop.rotation.z+=dt*(15+flightState.throttle*100);
    for(const p of parked){for(const prop of p.group.userData.props)prop.rotation.z+=dt*6;}
    if(clouds)clouds.position.x=Math.sin(clock*.014)*90;
    updateSnow(dt);updateCamera(dt);
    if(mode==='flight'&&Math.floor(clock*8)%2===0)updateHUD();
    updateAudio();renderer.render(scene,camera);
  }catch(e){console.error('Skybound simulation error',e);ui.hud.classList.add('hidden');$('errorScreen').classList.remove('hidden');throw e;}
}
function boot(){
  try{initThree();bindUi();toggleScreens();$('aircraftHud').textContent=AIRCRAFT[selected].short;}
  catch(e){console.error('Unable to start Skybound',e);$('errorScreen').classList.remove('hidden');}
}
boot();
