import * as THREE from 'three';
import {AIRPORTS, AIRCRAFT,getPalette} from './flight.js';
import {buildAircraft} from './aircraft.js';

const M=(color,rough=.75,metal=.0)=>new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});
const groundGeo=new THREE.PlaneGeometry(9000,9000,1,1);
const buildingGeo=new THREE.BoxGeometry(1,1,1);
const pColor=(x)=>new THREE.Color(x);
const seeded=(s)=>()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296};
function box(parent,x,y,z,w,h,d,mat){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m}
function plane(parent,x,y,z,w,d,mat){const m=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat);m.rotation.x=-Math.PI/2;m.position.set(x,y,z);m.receiveShadow=true;parent.add(m);return m}
function cone(parent,x,y,z,r,h,material){const m=new THREE.Mesh(new THREE.ConeGeometry(r,h,5),material);m.position.set(x,y,z);m.castShadow=true;parent.add(m);return m}
function panel(parent,x,y,z,w,h,color){const tx=document.createElement('canvas');tx.width=512;tx.height=128;const ctx=tx.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,512,128);ctx.fillStyle='#e7eced';ctx.textAlign='center';ctx.font='bold 62px system-ui';ctx.fillText('SKYBOUND AIR',256,86);let material=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(tx),side:THREE.DoubleSide});let m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);m.position.set(x,y,z);parent.add(m);return m}
function makeNoiseTexture(){const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),id=ctx.createImageData(128,128);let rand=seeded(1280);for(let i=0;i<id.data.length;i+=4){let v=170+Math.floor(rand()*32);id.data[i]=v;id.data[i+1]=v;id.data[i+2]=v;id.data[i+3]=255;}ctx.putImageData(id,0,0);const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(160,160);t.colorSpace=THREE.SRGBColorSpace;return t}
function airport(parent,a,index,palette,rand){const g=new THREE.Group();g.position.set(a.x,0,a.z);parent.add(g);
 const asphalt=M('#303a40',.92),taxi=M('#495259',.87),border=M('#606a68'),white=M('#e2e7e1',.68),yellow=M('#d9b766'),gravel=M('#5d695d');
 // Runway 17/35, its approach lights, stop-ends and side markings.
 plane(g,0,.09,0,83,1520,asphalt);plane(g,0,.086,0,104,1540,gravel);
 for(let i=-7;i<=7;i++){plane(g,0,.12,i*96,2.6,44,white);if(i!==0){plane(g,-34,.119,i*96,2,55,white);plane(g,34,.119,i*96,2,55,white)}}
 for(let end of [-1,1]){for(let j=0;j<6;j++){let z=end*(675+j*4.1);plane(g,(j%2?9:-9),.128,z,6,1.4,white);plane(g,(j%2?-9:9),.128,z,6,1.4,white)}for(let i=0;i<9;i++){let z=end*(750+i*21);const l=new THREE.Mesh(new THREE.BoxGeometry(1.4,.45,1.4),new THREE.MeshBasicMaterial({color:0xf4dfb6}));l.position.set(0,.32,z);g.add(l)}}
 // Taxiway + apron are on east side to avoid interfering with takeoff.
 plane(g,158,.095,-70,235,390,taxi);
 plane(g,98,.1,-320,15,600,taxi);
 plane(g,94,.112,-430,1.5,560,yellow);
 for(let i=0;i<6;i++)plane(g,88+i*41,.112,-265,1.6,190,yellow);
 for(let i=0;i<5;i++){const z=-355+i*101;box(g,255,16,z,63,30,81,M(i%2?'#c1c8c5':'#aeb6b3',.52));box(g,256,32,z,67,3,85,M('#54636a'));box(g,222,14,z,2,21,45,M('#546a78',.2));}
 // Glass-front terminal and control tower.
 box(g,298,21,65,104,42,180,M('#8399a1',.26,.18));box(g,248,20,65,3,29,165,M('#243e4c',.13,.36));box(g,302,44,65,113,4,190,M('#cad0ce',.46));
 for(let k=0;k<10;k++){box(g,247,25, -18+k*18,1.2,28,1.5,M('#c4d0d2'))}
 box(g,352,61,-110,17,122,17,M('#aab3b5'));box(g,352,125,-110,29,12,29,M('#233a44',.2));box(g,352,134,-110,33,5,33,M('#d0d5d0'));
 panel(g,242,34,67,1,1,'#50616c'); // logo sign plane replaced by runway-world signage below
 box(g,170,1,-70,160,.5,3,M('#c4cdd0',.6));
 // Windsock and runway indicator.
 box(g,-91,8,-410,.55,16,.55,M('#b0b6b8'));const windsock=cone(g,-91,17,-410,2.8,6,M('#da5c46'));windsock.rotation.z=Math.PI/2;
 for(let i=-7;i<8;i++){const z=i*104;for(let sign of [-1,1]){const light=new THREE.Mesh(new THREE.SphereGeometry(.75,5,4),new THREE.MeshBasicMaterial({color:0x70a6e4}));light.position.set(sign*46,.9,z);g.add(light)}}
 // Holiday lights in December, around the terminal.
 if(palette.snow){for(let j=0;j<32;j++){const l=new THREE.Mesh(new THREE.SphereGeometry(1.05,6,5),new THREE.MeshBasicMaterial({color:j%3===0?0xffd471:j%3===1?0xdd6464:0xcde9ed}));l.position.set(246,34,-12+j*5);g.add(l)}}
 // Airport objects are navigational landmarks.
 const parking=[[-1.0,-210],[1.0,-90],[1.0,40]];
 const parked=[];
 for(let i=0;i<parking.length;i++){const spec=AIRCRAFT[(index*3+i+2)%AIRCRAFT.length],ship=buildAircraft(spec,{parked:true});let [sign,oz]=parking[i];ship.position.set(a.x+140+i*45,Math.max(1.8,spec.scale*1.9),a.z-180+i*105);ship.rotation.y=-Math.PI/2;parent.add(ship);parked.push({mesh:ship,spec,x:ship.position.x,z:ship.position.z,airport:a.id});}
 // Ground crew vehicles, light posts and taxi signs.
 for(let j=0;j<8;j++){const z=-350+j*83;box(g,202,.8,z,3,1.6,5,M(j%2?'#f6e4ad':'#fff9e8'));box(g,202,1.9,z,2,.7,1.8,M('#173b47'));}
 for(let j=0;j<7;j++){const z=-300+j*98;box(g,208,11,z,.45,22,.45,M('#bcc9c9'));box(g,207,22,z,5,.3,1.9,M('#f7f0d7'))}
 return {group:g,parked};
}
function distanceToAirfield(x,z){return Math.min(...AIRPORTS.map(a=>Math.hypot(x-a.x,z-a.z)))}
function mountain(parent,x,z,r,h,mat){const g=new THREE.ConeGeometry(r,h,7,3);const a=g.attributes.position;for(let i=0;i<a.count;i++){let px=a.getX(i),pz=a.getZ(i),py=a.getY(i);const wave=Math.sin(px*.005+pz*.008)*6;if(py>0)a.setY(i,py+wave)}g.computeVertexNormals();const m=new THREE.Mesh(g,mat);m.position.set(x,h*.45,z);m.receiveShadow=true;m.castShadow=false;parent.add(m)}
export function createWorld(scene,region='coast',month=new Date().getMonth(),lowPower=false){
 const palette=getPalette(region,month),rng=seeded(region==='desert'?339:region==='alpine'?779:1209);
 const parent=new THREE.Group();scene.add(parent);scene.background=new THREE.Color(palette.sky);scene.fog=new THREE.FogExp2(palette.fog,region==='alpine'?.00019:.000145);
 const hemi=new THREE.HemisphereLight(0xcde0f5,region==='desert'?0x765a41:0x4c584c,2.05);scene.add(hemi);
 const sun=new THREE.DirectionalLight(region==='desert'?0xffc9a3:0xffe3ba,2.18);sun.position.set(-870,1320,-1400);sun.castShadow=true;sun.shadow.mapSize.set(lowPower?1024:2048,lowPower?1024:2048);sun.shadow.camera.left=-850;sun.shadow.camera.right=850;sun.shadow.camera.top=850;sun.shadow.camera.bottom=-850;sun.shadow.camera.far=3500;sun.shadow.bias=-.00018;sun.shadow.normalBias=.04;scene.add(sun);
 const terrainMaterial=M(palette.ground,.99);const tex=makeNoiseTexture();terrainMaterial.map=tex;terrainMaterial.color=new THREE.Color(palette.ground);terrainMaterial.map.colorSpace=THREE.SRGBColorSpace;
 const floor=new THREE.Mesh(groundGeo,terrainMaterial);floor.rotation.x=-Math.PI/2;floor.position.y=-.12;floor.receiveShadow=true;parent.add(floor);
 if(region==='coast'){const sea=plane(parent,-3500,-.25,-250,2900,9000,new THREE.MeshStandardMaterial({color:0x527f8c,metalness:.35,roughness:.31}));}
 // Distant alpine ridges / mesas. Keep all airport approaches unobstructed.
 const ridgeColors=region==='desert'?['#bd8a62','#b58b67','#a57d61']:region==='alpine'?['#687e83','#889998','#aab4b1']:['#687d73','#839189','#829285'];
 for(let i=0;i<55;i++){let angle=rng()*Math.PI*2,dist=region==='alpine'?2100+rng()*2200:2400+rng()*2100;let x=Math.cos(angle)*dist,z=Math.sin(angle)*dist;if(distanceToAirfield(x,z)<1150)continue;let h=(region==='alpine'?300:region==='desert'?160:80)+rng()*(region==='alpine'?600:region==='desert'?270:220);mountain(parent,x,z,150+rng()*300,h,M(ridgeColors[i%3]))}
 // Farm fields, small lakes and roads placed outside airport routes.
 const asphalt=M('#545952'),soil=M(region==='desert'?'#aa8467':'#6a765d');
 for(let j=0;j<45;j++){let x=(rng()-.5)*7300,z=(rng()-.5)*6900;if(distanceToAirfield(x,z)<870)continue;plane(parent,x,.018,z,90+rng()*220,110+rng()*260,M(region==='desert'?(rng()>.5?'#c49d7b':'#ac8360'):(rng()>.5?'#687d58':'#8f9063')))}
 // Forest and brush with instanced geometry (very few draw calls).
 const n=lowPower?560:1650,leavesMat=M(palette.tree,.94),trunkMat=M(region==='desert'?'#7a6b52':'#554b3e');
 const leaves=new THREE.InstancedMesh(new THREE.ConeGeometry(1,3,5),leavesMat,n);
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.15,.24,1,5),trunkMat,n);
 const dummy=new THREE.Object3D(),shade=new THREE.Color();
 let count=0;
 for(let i=0;i<n*3 && count<n;i++){let x=(rng()-.5)*7900,z=(rng()-.5)*7800;if(distanceToAirfield(x,z)<890||x<-2300&&region==='coast')continue;let h=region==='desert'?.65+rng()*1.4:3+rng()*5;
 dummy.position.set(x,h*.6,z);dummy.scale.set(h*.39,h*.72,h*.39);dummy.rotation.y=rng()*Math.PI;dummy.updateMatrix();leaves.setMatrixAt(count,dummy.matrix);
 shade.set(palette.tree);shade.multiplyScalar(.72+rng()*.5);leaves.setColorAt(count,shade);
 dummy.position.set(x,h*.19,z);dummy.scale.set(h*.21,h*.38,h*.21);dummy.rotation.set(0,0,0);dummy.updateMatrix();trunks.setMatrixAt(count,dummy.matrix);count++;
 }
 leaves.count=count;trunks.count=count;leaves.instanceMatrix.needsUpdate=true;trunks.instanceMatrix.needsUpdate=true;parent.add(leaves,trunks);
 // Low-poly city skylines visible in the distance, plus hangar districts.
 const cityMat=M(region==='desert'?'#b6a295':'#859295',.64),city=new THREE.InstancedMesh(buildingGeo,cityMat,lowPower?130:340);let ct=0;
 for(let i=0;i<(lowPower?130:340);i++){let x=400+(rng()-.5)*1050,z=-1450+(rng()-.5)*1150;if(distanceToAirfield(x,z)<750)continue;const height=12+rng()*73;dummy.position.set(x,height*.5,z);dummy.scale.set(15+rng()*30,height,15+rng()*26);dummy.rotation.set(0,rng()*Math.PI*.5,0);dummy.updateMatrix();city.setMatrixAt(ct++,dummy.matrix)}city.count=ct;city.instanceMatrix.needsUpdate=true;parent.add(city);
 // Terminal airports, runway lights, static parking aircraft.
 const allParked=[];for(let i=0;i<AIRPORTS.length;i++){const ap=airport(parent,AIRPORTS[i],i,palette,rng);allParked.push(...ap.parked)}
 // Cinematic cloud volumes of merged low-cost icosahedra.
 const clouds=new THREE.Group();const cmat=new THREE.MeshLambertMaterial({color:palette.snow?0xdfe8ec:0xeff1ee,transparent:true,opacity:region==='desert'?.48:.72,depthWrite:false});
 for(let i=0;i<(lowPower?11:25);i++){const g=new THREE.Group();g.position.set((rng()-.5)*6000,170+rng()*340,(rng()-.5)*6100);const size=60+rng()*150;for(let j=0;j<3;j++){let o=new THREE.Mesh(new THREE.SphereGeometry(1,8,6),cmat);o.scale.set(size*(.45+rng()*.5),size*(.12+rng()*.15),size*(.35+rng()*.33));o.position.set((j-1)*size*.5,rng()*size*.08,0);g.add(o)}clouds.add(g)}parent.add(clouds);
 // Occasional falling snow near player in December.
 let snow=null;if(palette.snow){const sn=lowPower?400:1100,positions=new Float32Array(sn*3);for(let i=0;i<sn;i++){positions[i*3]=(rng()-.5)*310;positions[i*3+1]=rng()*190;positions[i*3+2]=(rng()-.5)*310}const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(positions,3));snow=new THREE.Points(geometry,new THREE.PointsMaterial({color:0xf4f8ff,size:1.5,transparent:true,opacity:.9,depthWrite:false}));parent.add(snow)}
 const sunMesh=new THREE.Mesh(new THREE.SphereGeometry(150,18,12),new THREE.MeshBasicMaterial({color:0xfff0d6,fog:false}));sunMesh.position.set(-2700,1450,-3700);parent.add(sunMesh);
 const update=(dt,time,focus)=>{clouds.position.x+=dt*2.2;if(clouds.position.x>140)clouds.position.x=-140;
 if(snow&&focus){snow.position.set(focus.x,Math.min(focus.y,350)-70,focus.z);const p=snow.geometry.attributes.position;for(let i=0;i<p.count;i++){let y=p.getY(i)-dt*(12+(i%8));if(y<0)y+=190;p.setY(i,y)}p.needsUpdate=true}
 sun.target.position.set(focus?.x||0,0,focus?.z||0);sun.position.set((focus?.x||0)-870,1300,(focus?.z||0)-1400);sun.target.updateMatrixWorld();if(!sun.target.parent)scene.add(sun.target);
 };
 const destroy=()=>{scene.remove(parent,hemi,sun,sun.target);parent.traverse(x=>{if(x.geometry&&x.geometry!==groundGeo)x.geometry.dispose();if(x.material&&x.material.map?.isTexture&&x.material.map!==tex)x.material.map.dispose()});tex.dispose();};
 return {parent,allParked,palette,region,update,destroy};
}
