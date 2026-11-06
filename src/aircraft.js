import * as THREE from 'three';
const mat=(c,metal=.16,rough=.51)=>new THREE.MeshStandardMaterial({color:c,metalness:metal,roughness:rough});
const dark=mat('#1b2730',.26,.37),tire=mat('#161c21',.12,.91),steel=mat('#89939c',.68,.31),glass=new THREE.MeshPhysicalMaterial({color:'#172e3a',metalness:.29,roughness:.12,transparent:true,opacity:.88,clearcoat:1,clearcoatRoughness:.07,side:THREE.DoubleSide});
function part(parent,geo,m,xyz,rot,scale,shadow=true){let o=new THREE.Mesh(geo,m);if(xyz)o.position.set(...xyz);if(rot)o.rotation.set(...rot);if(scale)o.scale.set(...scale);o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o}
function wing(parent,side,halfSpan,chord0,chord1,origin,finish,dihedral=.05){const s=side;const x=s*halfSpan,y=dihedral*halfSpan;const top=[0,.11,chord0/2,x,y+.07,chord1*.33,x,y+.07,-chord1*.66,0,.11,-chord0/2],bot=[0,-.11,chord0/2,x,y-.07,chord1*.33,x,y-.07,-chord1*.66,0,-.11,-chord0/2];const order=[0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0];const coords=[...top,...bot],positions=[];for(const i of order)positions.push(coords[i*3],coords[i*3+1],coords[i*3+2]);let g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.computeVertexNormals();let w=part(parent,g,finish,origin,null,null);return w}
function propeller(parent,x,y,z,radius=1.03){const g=new THREE.Group();g.position.set(x,y,z);const hub=mat('#b9bfc4',.72,.23);part(g,new THREE.SphereGeometry(.17,10,8),hub,[0,0,.07]);for(let i=0;i<3;i++){const blade=new THREE.Group();blade.rotation.z=i*Math.PI*2/3;part(blade,new THREE.BoxGeometry(.15,radius*1.18,.045),dark,[0,radius*.56,-.02],[0,0,.14]);part(blade,new THREE.SphereGeometry(.095,8,6),steel,[0,radius*1.1,-.01]);g.add(blade)}parent.add(g);return g}
export function buildAircraft(spec,{parked=false}={}){
 const plane=new THREE.Group();plane.name=spec.name;
 const len=spec.body/spec.scale, span=spec.span/spec.scale; const half=span/2;
 const fus=mat(spec.color,.32,.27),stripe=mat(spec.accent,.27,.35),white=mat('#f4f4ec',.25,.32),black=mat('#080f16',.42,.22);
 const jet=spec.kind==='jet'||spec.kind==='fighter'; const rad=spec.kind==='jet'?1.3:spec.kind==='fighter'?0.74:.76;
 const cyl=part(plane,new THREE.CylinderGeometry(rad*.90,rad,len*.78,20,1),fus,[0,.18,0],[Math.PI/2,0,0]);
 part(plane,new THREE.ConeGeometry(rad*.93,len*.2,20,1),fus,[0,.18,len*.49],[Math.PI/2,0,0]);
 part(plane,new THREE.ConeGeometry(rad*.95,len*.13,20,1),fus,[0,.18,-len*.445],[-Math.PI/2,0,0]);
 const window=part(plane,new THREE.SphereGeometry(1,20,12),glass,[0,.58,len*.24],null,[rad*.84,.47,Math.min(1.45,len*.16)]);
 if(!jet){for(let s of [-1,1])for(let i=0;i<4;i++)part(plane,new THREE.BoxGeometry(.022,.25,.41),glass,[s*rad*.93,.33,len*(.09-i*.093)]);}
 // Belly paint and distinctive livery stripes
 part(plane,new THREE.BoxGeometry(rad*.07,.115,len*.65),stripe,[-rad*.98,.11,0],null);
 part(plane,new THREE.BoxGeometry(rad*.07,.115,len*.65),stripe,[rad*.98,.11,0],null);
 const wingsY=spec.wings==='high'?.86:-.14;
 const rootChord=Math.min(4.4,len*.38), tipChord=rootChord*.45;
 wing(plane,1,half,rootChord,tipChord,[0,wingsY,0],fus,jet?.045:.09);
 wing(plane,-1,half,rootChord,tipChord,[0,wingsY,0],fus,jet?.045:.09);
 for(const s of [-1,1]){
   part(plane,new THREE.BoxGeometry(.065,.63,.34),stripe,[s*(half-.19),wingsY+.29,0],[0,.1*s,-.17*s]);
   const wingLight=part(plane,new THREE.SphereGeometry(.12,9,8),new THREE.MeshBasicMaterial({color:s>0?0x4cffac:0xff4e47}),[s*half,wingsY+.13,.12]);wingLight.castShadow=false;
 }
 const tailY=.37,tailZ=-len*.37;
 wing(plane,1,half*.27,rootChord*.51,tipChord*.42,[0,tailY,tailZ],white,.12);
 wing(plane,-1,half*.27,rootChord*.51,tipChord*.42,[0,tailY,tailZ],white,.12);
 const fin=part(plane,new THREE.BoxGeometry(.15,1.9,len*.21),stripe,[0,1.12,-len*.39],[.21,0,0]);
 part(plane,new THREE.BoxGeometry(.17,.5,len*.17),fus,[0,1.96,-len*.45],[.27,0,0]);
 const props=[];
 if(spec.kind==='prop'){
   part(plane,new THREE.CylinderGeometry(rad*.44,rad*.56,.5,16),steel,[0,.2,len*.5],[Math.PI/2,0,0]);
   props.push(propeller(plane,0,.2,len*.54,rad*.95));
 }else if(spec.kind==='twin'||spec.kind==='turboprop'){
   for(const s of [-1,1]){const xx=s*half*.38;part(plane,new THREE.CylinderGeometry(.37,.42,1.54,12),stripe,[xx,wingsY-.24,.03],[Math.PI/2,0,0]);props.push(propeller(plane,xx,wingsY-.24,.91,.96));}
 }else{
   const count=spec.kind==='fighter'?1:2;
   for(let i=0;i<count;i++){const x=count===1?0:(i===0?-1:1)*half*.41;const y=count===1?-.55:wingsY-.55;
    part(plane,new THREE.CylinderGeometry(.48,.56,2.45,16),steel,[x,y,-.78],[Math.PI/2,0,0]);
    part(plane,new THREE.CylinderGeometry(.42,.42,.11,16),black,[x,y,.48],[Math.PI/2,0,0]);
    part(plane,new THREE.CylinderGeometry(.4,.4,.12,16),new THREE.MeshBasicMaterial({color:0x273b49}),[x,y,-2.07],[Math.PI/2,0,0]);
   }
 }
 const gearGroup=new THREE.Group();plane.add(gearGroup);
 function wheel(x,y,z,r=.36){part(gearGroup,new THREE.CylinderGeometry(r,r,.24,12),tire,[x,y,z],[0,0,Math.PI/2]);part(gearGroup,new THREE.CylinderGeometry(r*.49,r*.49,.255,12),steel,[x,y,z],[0,0,Math.PI/2]);part(gearGroup,new THREE.CylinderGeometry(.07,.07,.92,8),steel,[x,y+.45,z]);}
 wheel(0,-1.55,len*.29,.29);wheel(-1.28,-1.6,-.7,.42);wheel(1.28,-1.6,-.7,.42);
 if(jet){for(let s of [-1,1]){part(plane,new THREE.BoxGeometry(.24,.1,len*.12),stripe,[s*half*.74,wingsY+.03,-1.2]);}}
 plane.scale.setScalar(spec.scale);plane.userData={spec,gearGroup,props,parked};
 if(parked){plane.traverse(o=>{if(o.isMesh)o.castShadow=false})}
 return plane;
}
export function updateAircraftModel(group,state,dt,elapsed){
 if(!group)return;group.position.set(state.x,state.y,state.z);group.rotation.order='YXZ';group.rotation.y=state.heading;group.rotation.x=-state.pitch;group.rotation.z=-state.roll;
 group.userData.gearGroup.visible=state.gear||!state.airborne;
 const spin=(state.throttle*.87+.13)*dt*28;
 for(let p of group.userData.props)p.rotation.z+=spin;
}
export function buildPilot(){const root=new THREE.Group();const jacket=mat('#202e37',.12,.69),pants=mat('#172530',.1,.8),face=mat('#e9b48d',.06,.76),helmet=mat('#eae8de',.3,.36),visor=mat('#182830',.35,.17);
 const b=part(root,new THREE.CapsuleGeometry(.38,.76,3,7),jacket,[0,1.22,0]);
 part(root,new THREE.SphereGeometry(.3,12,9),face,[0,2.1,0]);part(root,new THREE.SphereGeometry(.32,12,8),helmet,[0,2.28,-.03],null,[1,.68,1]);part(root,new THREE.BoxGeometry(.42,.13,.15),visor,[0,2.18,.23]);
 for(let s of [-1,1]){part(root,new THREE.CapsuleGeometry(.14,.56,2,5),jacket,[s*.52,1.15,0],[0,0,s*.17]);part(root,new THREE.CapsuleGeometry(.17,.7,2,5),pants,[s*.22,.52,0]);part(root,new THREE.BoxGeometry(.34,.14,.51),dark,[s*.22,.12,.15])}
 root.traverse(o=>{if(o.isMesh)o.castShadow=true});return root;
}
