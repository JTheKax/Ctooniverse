import * as THREE from 'https://esm.sh/three@0.170.0';
const host=document.getElementById('avatar-3d');const form=document.getElementById('avatar-form');const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(0,2.75,7.6);camera.lookAt(0,2.05,0);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;host.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xb8edff,0x32144e,1.55));const key=new THREE.DirectionalLight(0xfff1db,3.3);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=8;key.shadow.camera.bottom=-5;key.shadow.bias=-0.0003;scene.add(key);const rim=new THREE.PointLight(0x9b60ff,65,14);rim.position.set(3,4,-3);scene.add(rim);
const avatar=new THREE.Group();scene.add(avatar);const floor=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.85,.18,64),new THREE.MeshStandardMaterial({color:0x332279,metalness:.55,roughness:.3}));floor.position.y=-.1;floor.receiveShadow=true;scene.add(floor);
function mat(color,metalness=0){return new THREE.MeshStandardMaterial({color,metalness,roughness:metalness > 0 ? 0.32 : 0.78})}
function part(group,geometry,material,x,y,z,sx=1,sy=1,sz=1){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh}
const ball=new THREE.SphereGeometry(1,28,20),cylinder=new THREE.CylinderGeometry(1,1,1,20);

function sculptTorso(group,material,y=1.83,width=.68,height=1.75,depth=.43){
 const profile=[
  [0,-.52],[.37,-.51],[.49,-.40],[.46,-.16],[.51,.09],
  [.66,.32],[.72,.43],[.58,.50],[.31,.53],[0,.54]
 ];
 const points=profile.map(([r,h])=>new THREE.Vector2(r,h));
 const mesh=part(group,new THREE.LatheGeometry(points,32),material,0,y,0,width/.72,height,depth/.72);
 return mesh;
}
function sculptLimb(group,start,end,radius,material){
 const a=new THREE.Vector3(...start),b=new THREE.Vector3(...end),length=a.distanceTo(b);
 const geometry=new THREE.CylinderGeometry(radius*.73,radius*1.06,length,18,5);
 const position=a.clone().add(b).multiplyScalar(.5);
 const mesh=part(group,geometry,material,...position.toArray());
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.sub(a).normalize());
 return mesh;
}
function sculptHandsAndFeet(model,skin,shoe){
 for(const side of [-1,1]){
  const hand=part(avatar,new THREE.SphereGeometry(1,20,14),skin,side*.84,1.32,.08,.16,.22,.12);
  const thumb=part(avatar,new THREE.SphereGeometry(1,12,10),skin,side*.70,1.36,.17,.075,.12,.08);
  const boot=part(avatar,new THREE.SphereGeometry(1,24,16),shoe,side*.33,.20,.24,.28,.17,.47);
  boot.rotation.y=side*.06;
 }
}

function limb(group,a,b,r,material){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);const mesh=part(group,new THREE.CylinderGeometry(r*.85,r,start.distanceTo(end),14),material,...start.clone().add(end).multiplyScalar(.5).toArray());mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return mesh}


function categoryDetails(model,v,equipped,skin,hair,accent,shirt,iris,black,white){
 const headY=model==='southpark'?3.22:model==='simpsons'?3.34:model==='chibi'?3.18:3.3;
 const front=model==='southpark'?.62:model==='simpsons'?.62:model==='chibi'?.72:.5;
 const sphere=(material,x,y,z,sx,sy,sz)=>part(avatar,ball,material,x,y,z,sx,sy,sz);
 const gold=new THREE.MeshStandardMaterial({color:0xffd56e,metalness:.75,roughness:.24});
 const hairStyle=v.style||'swoop';
 if(model!=='robot'&&hairStyle!=='bald'){
  const cap=sphere(hair,0,headY+.64,-.11,model==='southpark'?.89:model==='chibi'?.88:.62,.27,.51);
  for(let i=-2;i<=2;i++){
   const strand=sphere(i===1?accent:hair,i*.19,headY+.57,front*.49,.13,.23,.17);
   strand.rotation.z=i*.14;
  }
  if(hairStyle==='spikes'||hairStyle==='mohawk'){
   for(let i=-2;i<=2;i++){const spike=part(avatar,new THREE.ConeGeometry(.16,.48,8),i%2?accent:hair,i*.2,headY+.99,-.05);spike.rotation.z=i*.14}
  }
  if(hairStyle==='bob'||hairStyle==='locs'||hairStyle==='curls'){
   for(const side of [-1,1])for(let i=0;i<3;i++)sphere(i===1?accent:hair,side*(model==='southpark'?.78:.55),headY+.35-i*.23,-.02,.15,.18,.23);
  }
  if(hairStyle==='ponytail')sphere(hair,0,headY+.25,-.57,.24,.53,.23);
  if(hairStyle==='undercut')sphere(accent,0,headY+.86,.05,.43,.10,.27);
 }
 if(model!=='robot'){
  if(v.accessory==='glasses')for(const side of [-1,1])part(avatar,new THREE.TorusGeometry(.23,.025,8,24),gold,side*.29,headY+.10,front+.055);
  if(v.accessory==='crown')part(avatar,new THREE.CylinderGeometry(.39,.46,.28,8),gold,0,headY+1.03,0);
  if(v.accessory==='headphones')for(const side of [-1,1])sphere(black,side*.68,headY+.15,0,.16,.29,.25);
  if(v.piercing==='nose')sphere(gold,.12,headY-.22,front+.09,.045,.045,.04);
  if(v.piercing==='brow')sphere(gold,.31,headY+.33,front+.05,.05,.035,.035);
  if(v.piercing==='earrings'||v.piercing==='hoops')for(const side of [-1,1]){
   if(v.piercing==='hoops')part(avatar,new THREE.TorusGeometry(.095,.025,8,18),gold,side*.77,headY-.26,.08);
   else sphere(gold,side*.77,headY-.25,.14,.065,.065,.05);
  }
  if(v.detail==='freckles')for(const side of [-1,1])for(let i=0;i<3;i++)sphere(black,side*(.24+i*.07),headY-.22+(i%2)*.045,front+.015,.018,.018,.009);
  if(v.detail==='blush')for(const side of [-1,1])sphere(mat('#ed849a'),side*.44,headY-.25,front-.05,.15,.07,.018);
  if(v.detail==='scar'){const scar=part(avatar,new THREE.BoxGeometry(.025,.23,.015),mat('#ad5261'),.37,headY-.15,front+.04);scar.rotation.z=.4}
  if(v.tattoo&&v.tattoo!=='none'){
   const ink=mat(v.tattoo==='heart'?'#c42b62':'#1a1638');
   sphere(ink,.79,1.68,.16,.042,.14,.09);
  }
 }
 if(v.outfit==='hoodie'||equipped==='hoodie'){
  sphere(shirt,0,2.44,-.25,.47,.32,.31);
  sphere(white,0,1.49,.43,.32,.12,.045);
 }
 if(v.outfit==='armor'||equipped==='legendary'){
  sphere(gold,0,1.95,.46,.30,.25,.07);
  for(const side of [-1,1])sphere(gold,side*.65,2.25,0,.23,.13,.31);
 }
 if(v.outfit==='jacket'||equipped==='jacket')for(const side of [-1,1])sphere(black,side*.38,1.89,.35,.17,.53,.09);
}

// Distinct construction paths for each stylized character family.
function buildCategory(model,v,equipped){
 const skin=mat(model==='simpsons'?(v.skin==='#f2b989'?'#f5d43b':v.skin):v.skin||'#f2b989');
 const shirt=mat(({tee:'#36cfff',hoodie:'#8b50e9',jacket:'#d047a8',outfit:'#f3bb43',legendary:'#ffd65c'}[equipped])||v.shirt||'#6545d7');
 const hair=mat(v.hair||'#30204d'),white=mat('#ffffff'),black=mat('#211b35'),iris=mat(v.eyes||'#36d5ed');
 const pants=mat(equipped==='jeans'?'#3566a7':'#2c325f'),shoes=mat(equipped==='sneakers'?'#ff53a8':'#1e203a');
 const b=(m,x,y,z,sx,sy,sz)=>part(avatar,ball,m,x,y,z,sx,sy,sz);
 const cube=(m,x,y,z,sx,sy,sz)=>part(avatar,new THREE.BoxGeometry(sx,sy,sz),m,x,y,z);
 if(model==='robot'){
  avatar.scale.setScalar(1);
  cube(mat('#7e89b8'),0,1.85,0,1.35,1.35,.72);
  cube(mat('#a9b9da'),0,3.30,0,1.18,.92,.72);
  cube(black,0,3.38,.38,.94,.32,.09);
  for(const side of [-1,1]){
   cube(iris,side*.25,3.38,.44,.24,.12,.04);
   cube(mat('#6476a0'),side*.85,2.12,0,.38,.40,.48);
   cube(mat('#aebcda'),side*.91,1.55,0,.28,.82,.30);
   b(mat('#d9e6fa'),side*.91,1.05,0,.18,.19,.18);
   cube(mat('#7789ae'),side*.36,.76,0,.46,.95,.52);
   cube(shoes,side*.36,.19,.18,.52,.25,.78);
  }
  b(iris,0,1.91,.39,.18,.18,.06);
  part(avatar,new THREE.CylinderGeometry(.08,.08,.33,12),mat('#bacaf1'),0,3.96,0);
  b(iris,0,4.17,0,.15,.15,.15);
  return true;
 }
 if(model==='southpark'){
  avatar.scale.setScalar(.94);
  // Short, stout paper-cutout-inspired silhouette with oversized circular head.
  sculptTorso(avatar,shirt,1.48,.82,1.25,.54);
  b(skin,0,3.22,0,.95,.85,.62);
  b(shirt,0,3.93,-.04,.96,.26,.64);
  b(mat(v.hairAccent||'#ed79ff'),0,4.14,0,.16,.15,.16);
  for(const side of [-1,1]){
   b(white,side*.29,3.34,.56,.30,.38,.10);
   b(black,side*.29,3.31,.66,.075,.105,.025);
   b(shirt,side*.77,1.52,0,.26,.51,.35);
   b(skin,side*.83,1.12,.07,.19,.20,.18);
   cube(pants,side*.31,.66,0,.55,.43,.55);
   b(shoes,side*.32,.34,.16,.34,.18,.42);
  }
  b(black,0,2.83,.57,.23,.045,.035);
  b(mat('#e2c9ff'),0,1.18,.46,.38,.09,.07);
  categoryDetails(model,v,equipped,skin,hair,mat(v.hairAccent||'#ed79ff'),shirt,iris,black,white);
  return true;
 }
 if(model==='simpsons'){
  avatar.scale.setScalar(1);
  // Yellow cartoon family: long muzzle, round bulging eyes, tall head and simple hair spikes.
  sculptTorso(avatar,shirt,1.77,.73,1.58,.46);
  b(skin,0,3.34,0,.65,.86,.50);
  b(skin,0,3.03,.48,.36,.21,.22);
  for(const side of [-1,1]){
   b(white,side*.25,3.48,.47,.28,.32,.17);
   b(black,side*.25,3.46,.64,.075,.095,.028);
   b(skin,side*.66,3.23,0,.15,.24,.16);
   limb(avatar,[side*.65,2.20,0],[side*.79,1.46,0],.18,shirt);
   b(skin,side*.80,1.34,0,.16,.19,.15);
   limb(avatar,[side*.30,1.19,0],[side*.32,.43,0],.24,pants);
   b(shoes,side*.32,.22,.15,.29,.17,.43);
  }
  b(black,0,2.91,.58,.20,.035,.026);
  for(let i=-2;i<=2;i++)part(avatar,new THREE.ConeGeometry(.18,.40,7),hair,i*.22,4.19,.02);
  categoryDetails(model,v,equipped,skin,hair,mat(v.hairAccent||'#ed79ff'),shirt,iris,black,white);
  return true;
 }
 if(model==='chibi'){
  avatar.scale.setScalar(.95);
  // Super-deformed anime: massive head, tiny torso and short limbs.
  sculptTorso(avatar,shirt,1.39,.57,.99,.41);
  b(skin,0,3.18,0,.94,1.0,.70);
  b(hair,0,3.92,-.13,.93,.40,.62);
  for(const side of [-1,1]){
   b(white,side*.34,3.28,.62,.28,.35,.10);
   b(iris,side*.34,3.25,.72,.16,.23,.04);
   b(white,side*.30,3.36,.76,.06,.08,.02);
   b(shirt,side*.59,1.43,0,.21,.35,.23);
   b(skin,side*.65,1.13,.02,.16,.16,.15);
   b(pants,side*.20,.78,0,.22,.30,.25);
   b(shoes,side*.20,.39,.15,.25,.16,.34);
  }
  b(mat('#e980a0'),0,2.90,.68,.22,.06,.03);
  if(v.style==='spikes')for(let i=-2;i<=2;i++)part(avatar,new THREE.ConeGeometry(.23,.46,8),hair,i*.33,4.22,.0);
  categoryDetails(model,v,equipped,skin,hair,mat(v.hairAccent||'#ed79ff'),shirt,iris,black,white);
  return true;
 }
 if(model==='classic'){
  avatar.scale.setScalar(1);
  // Vintage rubber-hose animation: round head, huge eyes, narrow torso, long curved limbs.
  sculptTorso(avatar,shirt,1.78,.56,1.32,.39);
  b(skin,0,3.29,0,.72,.76,.52);
  b(hair,0,3.86,-.13,.68,.26,.43);
  for(const side of [-1,1]){
   b(white,side*.27,3.43,.48,.24,.35,.10);
   b(black,side*.27,3.39,.58,.10,.17,.03);
   limb(avatar,[side*.50,2.20,0],[side*.78,1.46,.05],.105,shirt);
   limb(avatar,[side*.78,1.46,.05],[side*.84,1.10,.12],.095,black);
   b(white,side*.84,1.04,.13,.24,.23,.19);
   limb(avatar,[side*.22,1.20,0],[side*.30,.42,0],.14,pants);
   b(shoes,side*.30,.20,.20,.26,.16,.49);
  }
  b(black,0,2.97,.48,.26,.065,.035);
  categoryDetails(model,v,equipped,skin,hair,mat(v.hairAccent||'#ed79ff'),shirt,iris,black,white);
  return true;
 }
 return false;
}
function build(){avatar.traverse(obj=>{if(obj.isMesh){obj.geometry.dispose();if(Array.isArray(obj.material))obj.material.forEach(m=>m.dispose());else obj.material.dispose()}});avatar.clear();const v=Object.fromEntries(new FormData(form).entries());const equipped=window.ctoonEquippedClothing||null;const model=['anime','classic','chibi','hero','robot','southpark','simpsons'].includes(v.model)?v.model:'anime';if(buildCategory(model,v,equipped))return;avatar.scale.setScalar(model==='chibi'?.88:model==='hero'?1.04:model==='southpark'?.83:1);const skin=mat(model==='simpsons'&&v.skin==='#f2b989'?'#f5d33c':v.skin||'#f2b989'),hair=mat(v.hair||'#30204d'),accent=mat(v.hairAccent||'#ed79ff'),cloth=mat(({tee:'#36cfff',hoodie:'#8b50e9',jacket:'#d047a8',outfit:'#f3bb43',legendary:'#ffd65c'}[equipped])||v.shirt||'#6545d7'),dark=mat('#181a36'),gold=mat('#ffdc68',.6),eye=mat(v.eyes||'#36d5ed');
sculptTorso(avatar,cloth,1.82,model==='hero'?.88:.70,1.72,.43);part(avatar,ball,skin,0,2.74,0,.17,.24,.16);part(avatar,ball,model==='robot'?mat('#b3b8d3'):skin,0,3.38,0,model==='chibi'?.77:model==='southpark'?.83:model==='simpsons'?.67:model==='hero'?.51:model==='classic'?.55:.64,model==='chibi'?.81:model==='southpark'?.66:model==='simpsons'?.72:model==='hero'?.61:.74,model==='robot'?.44:.49);
for(const side of [-1,1]){part(avatar,ball,skin,side*.54,3.35,0,.12,.19,.13);part(avatar,ball,THREE.MeshStandardMaterial?mat('#ffffff'):eye,side*.245,3.47,.44,model==='classic'?.14:model==='hero'?.12:.195,model==='classic'?.17:model==='hero'?.14:.245,.072);part(avatar,ball,eye,side*.245,3.45,.51,model==='classic'?.075:model==='hero'?.065:.115,model==='classic'?.105:model==='hero'?.085:.17,.028);part(avatar,ball,dark,side*.245,3.46,.537,.057,.102,.012);
sculptLimb(avatar,[side*.65,2.28,0],[side*.82,1.45,0],.19,v.outfit==='armor'?gold:cloth);part(avatar,ball,skin,side*.84,1.35,0,.17,.19,.16);
sculptLimb(avatar,[side*.32,1.28,0],[side*.33,.4,0],.24,equipped==='jeans'?mat('#3566a7'):equipped==='outfit'?mat('#272e5c'):equipped==='legendary'?mat('#492a88'):dark);part(avatar,ball,equipped==='sneakers'?mat('#ff53a8'):equipped==='legendary'?gold:dark,side*.33,.19,.16,.26,.16,.43);
if(v.piercing==='earrings'||v.piercing==='hoops')part(avatar,new THREE.TorusGeometry(.09,.023,8,20),gold,side*.59,3.22,.08);
}
part(avatar,ball,skin,0,3.25,.49,.075,.055,.06);part(avatar,ball,mat('#a64a72'),0,3.05,.468,.17,.035,.024);
if(v.style!=='bald'&&model!=='robot'&&model!=='southpark'){part(avatar,ball,hair,0,3.94,-.055,.65,.33,.5);for(let i=-2;i<=2;i++){const fringe=part(avatar,new THREE.ConeGeometry(.17,.48,7),i===1?accent:hair,i*.21,3.81,.36);fringe.rotation.z=Math.PI+(i*.12)}if(v.style==='spikes'||v.style==='mohawk')for(let i=-2;i<=2;i++)part(avatar,new THREE.ConeGeometry(.17,.45,9),i%2?accent:hair,i*.19,4.16+(i%2)*.08,-.05);if(v.style==='ponytail')part(avatar,ball,hair,0,3.45,-.59,.26,.48,.24);if(v.style==='locs'||v.style==='curls')for(let i=-3;i<=3;i++)part(avatar,ball,hair,i*.15,3.76,-.08,.13,.27,.16);if(v.style==='bob')for(const side of [-1,1])part(avatar,ball,hair,side*.53,3.44,0,.16,.49,.34);if(v.style==='undercut')part(avatar,ball,accent,.1,4.02,.13,.38,.08,.2);}
for(const side of [-1,1]){part(avatar,ball,mat('#ffffff'),side*.245,3.52,.55,.045,.055,.015);const brow=part(avatar,ball,hair,side*.245,3.76,.46,.21,.035,.035);brow.rotation.z=side*-.12;part(avatar,ball,mat('#e8788d'),side*.43,3.2,.41,.13,.055,.015)}if(v.outfit==='jacket'||equipped==='jacket'){for(const side of [-1,1])part(avatar,ball,dark,side*.39,2.06,.32,.24,.59,.09)}if(v.outfit==='armor')part(avatar,ball,gold,0,2.03,.35,.38,.3,.11);
if(v.accessory==='glasses')for(const side of [-1,1])part(avatar,new THREE.TorusGeometry(.19,.024,8,32),gold,side*.22,3.44,.49);
if(v.accessory==='crown')part(avatar,new THREE.CylinderGeometry(.42,.48,.25,7),gold,0,4.18,0);
if(v.accessory==='headphones')for(const side of [-1,1])part(avatar,ball,dark,side*.6,3.42,0,.14,.27,.25);
if(v.piercing==='nose')part(avatar,ball,gold,.13,3.24,.58,.045,.045,.04);
if(model==='southpark'){const cap=part(avatar,ball,cloth,0,3.95,-.05,.81,.19,.58);part(avatar,ball,accent,0,4.13,0,.13,.13,.13);for(const side of [-1,1])part(avatar,ball,skin,side*.66,3.34,.1,.11,.13,.11)}if(model==='simpsons'){for(const side of [-1,1])part(avatar,ball,mat('#ffffff'),side*.24,3.47,.49,.2,.22,.09);part(avatar,ball,skin,0,3.19,.55,.16,.11,.14);part(avatar,ball,mat('#f8f8fa'),0,3.04,.49,.18,.07,.025)}if(model==='robot'){part(avatar,new THREE.BoxGeometry(1.05,.95,.7),mat('#8995c6'),0,1.93,0);part(avatar,new THREE.BoxGeometry(.92,.9,.65),mat('#d3dbf4'),0,3.42,0);for(const side of [-1,1])part(avatar,new THREE.BoxGeometry(.28,.14,.07),eye,side*.25,3.47,.36);part(avatar,ball,gold,0,2.05,.38,.19,.19,.07)}if(model==='chibi'){part(avatar,ball,skin,0,3.37,.04,.78,.78,.54)}if(model==='hero'){for(const side of [-1,1])part(avatar,ball,cloth,side*.7,2.34,0,.3,.2,.4)}if(v.outfit==='hoodie'||equipped==='hoodie'){part(avatar,ball,mat('#f7d66e'),0,2.11,.355,.19,.07,.04);for(const side of [-1,1])part(avatar,ball,mat('#f6e9ff'),side*.14,1.84,.37,.018,.22,.02)}
// Additional sculpted details make the models read as distinct characters rather than simple primitives.
const jacketStyle=v.outfit==='jacket'||equipped==='jacket';
const hoodieStyle=v.outfit==='hoodie'||equipped==='hoodie';
const armorStyle=v.outfit==='armor'||model==='hero';
const trim=mat(model==='robot'?'#67e6ff':'#d5c4ff');
const seam=mat('#211c42');
if(model!=='robot'){
 // Jaw, cheeks and a dimensional chin.
 part(avatar,ball,skin,0,3.04,.19,.42,.27,.32);
 for(const side of [-1,1]){
  part(avatar,ball,skin,side*.39,3.22,.27,.22,.19,.23);
  // Curved eyelashes and a catchlight give the face a more expressive anime appearance.
  const lash=part(avatar,new THREE.TorusGeometry(.15,.017,6,20,Math.PI),hair,side*.245,3.62,.56);
  lash.rotation.z=Math.PI;
  part(avatar,ball,mat('#ffffff'),side*.22,3.52,.55,.044,.052,.014);
 }
 if(v.face==='grin'){
  part(avatar,ball,mat('#ffffff'),0,3.05,.49,.19,.052,.025);
 }else if(v.face==='serious'){
  part(avatar,ball,seam,0,3.055,.5,.16,.017,.018);
 }
 // Sculpted shoulder seams, collar and cuffs.
 for(const side of [-1,1]){
  part(avatar,ball,trim,side*.64,2.25,.06,.16,.045,.21);
  part(avatar,ball,trim,side*.82,1.55,.02,.19,.045,.19);
  part(avatar,ball,seam,side*.34,.43,.24,.035,.32,.03);
 }
 part(avatar,new THREE.TorusGeometry(.27,.037,8,28),trim,0,2.49,.05).rotation.x=Math.PI/2;
 if(hoodieStyle){
  part(avatar,ball,cloth,0,2.56,-.28,.47,.34,.28);
  part(avatar,ball,cloth,0,1.57,.34,.32,.19,.065);
 }
 if(jacketStyle){
  for(const side of [-1,1]){
   const lapel=part(avatar,new THREE.ConeGeometry(.18,.55,4),trim,side*.22,2.20,.41);
   lapel.rotation.z=side*.18;
  }
  part(avatar,ball,trim,0,1.84,.38,.022,.55,.025);
 }
 if(armorStyle){
  part(avatar,ball,trim,0,2.10,.37,.39,.30,.11);
  for(const side of [-1,1])part(avatar,ball,gold,side*.68,2.34,0,.34,.18,.40);
 }
 if(equipped==='legendary'){
  for(const side of [-1,1])part(avatar,ball,gold,side*.42,2.20,.32,.075,.08,.045);
  part(avatar,ball,gold,0,1.99,.47,.17,.17,.04);
 }
 if(v.style==='mohawk'||v.style==='spikes'){
  for(let i=-2;i<=2;i++){
   const spike=part(avatar,new THREE.ConeGeometry(.17,.52,8),i%2?accent:hair,i*.22,4.22,.06);
   spike.rotation.z=i*.13;
  }
 }
 if(v.style==='ponytail')part(avatar,ball,accent,0,3.84,-.57,.18,.14,.18);
 if(v.style==='locs')for(let i=-3;i<=3;i++)part(avatar,ball,i%2?accent:hair,i*.17,3.42,-.34,.095,.43,.11);
}
if(model==='robot'){
 for(const side of [-1,1]){
  part(avatar,new THREE.BoxGeometry(.28,.12,.12),trim,side*.7,2.28,.15);
  part(avatar,new THREE.BoxGeometry(.18,.36,.08),trim,side*.83,1.82,.15);
 }
 part(avatar,ball,eye,0,2.10,.49,.16,.16,.04);
}
if(model==='simpsons'){
 for(let i=-2;i<=2;i++)part(avatar,new THREE.ConeGeometry(.16,.36,7),hair,i*.23,4.06,.05);
}
if(model==='southpark'){
 part(avatar,ball,trim,0,1.53,.37,.36,.11,.07);
 for(const side of [-1,1])part(avatar,ball,trim,side*.82,1.39,.05,.20,.17,.19);
}
if(v.tattoo!=='none')part(avatar,ball,mat(v.tattoo==='heart'?'#b32157':'#171332'),.8,1.65,.15,.035,.15,.11);
}


function sculptFeatures(){
 const v=Object.fromEntries(new FormData(form).entries()),model=v.model||'anime';
 if(model==='robot')return;
 const skin=mat(model==='simpsons'&&v.skin==='#f2b989'?'#f5d43b':v.skin||'#f2b989');
 const hair=mat(v.hair||'#30204d'),accent=mat(v.hairAccent||'#ed79ff'),shoe=mat('#1c2140'),lip=mat('#a9506a');
 const isShort=model==='southpark',isChibi=model==='chibi',isClassic=model==='classic';
 const y=isShort?3.22:isChibi?3.18:3.34;
 const width=isShort?.91:isChibi?.91:model==='simpsons'?.65:.62;
 const b=(m,x,yy,z,sx,sy,sz)=>part(avatar,ball,m,x,yy,z,sx,sy,sz);
 // Facial volume: nose bridge, cheekbones, chin and ears are actual 3D meshes.
 b(skin,0,y-.28,.27,width*.63,.27,.36);
 for(const side of [-1,1]){
  b(skin,side*width*.64,y-.19,.24,.20,.21,.24);
  b(skin,side*(width+.035),y-.10,-.01,.13,.21,.13);
 }
 b(skin,0,y-.08,.52,.12,.19,.12);
 b(skin,0,y-.18,.61,.15,.09,.14);
 b(lip,0,y-.38,.51,.20,.035,.035);
 // Shaped eyelids make eyes sit in the face rather than floating in front.
 const lid=mat(model==='simpsons'?'#b69a32':'#493048');
 for(const side of [-1,1]){
  const upper=part(avatar,new THREE.TorusGeometry(isShort?.28:.18,.018,7,24,Math.PI),lid,side*(isShort?.29:.245),y+.18,isShort?.68:.54);
  upper.rotation.z=Math.PI;
 }
 // Layered hair locks have tapered curved geometry, not just spherical caps.
 if(v.style!=='bald'){
  const lockCount=v.style==='locs'?9:v.style==='curls'?11:7;
  for(let i=0;i<lockCount;i++){
   const t=(i/(lockCount-1)-.5)*Math.PI*.85;
   const x=Math.sin(t)*width*.92;
   const z=Math.cos(t)*.39;
   const length=v.style==='bob'?.55:v.style==='locs'?.64:v.style==='curls'?.37:.27;
   const lock=part(avatar,new THREE.ConeGeometry(v.style==='locs'?.09:.13,length,9),i%4===0?accent:hair,x,y+.59-length*.23,z);
   lock.rotation.z=-t*.22;
   if(v.style==='curls')b(hair,x,y+.52-length,z,.15,.15,.15);
  }
 }
 // Defined palms and thumb shapes, with boots having a distinct toe box.
 const hands=model==='southpark'?.84:model==='chibi'?.65:.84;
 for(const side of [-1,1]){
  b(skin,side*hands,1.31,.07,.14,.19,.13);
  b(skin,side*(hands-.12),1.32,.17,.07,.11,.08);
  b(shoe,side*.33,.18,.33,.25,.13,.33);
 }
}

function addCategoryDetails(){
 const v=Object.fromEntries(new FormData(form).entries()),model=v.model;
 if(!['southpark','simpsons','chibi','classic','robot'].includes(model))return;
 const hair=mat(v.hair||'#30204d'),accent=mat(v.hairAccent||'#ed79ff'),gold=mat('#ffdc68'),dark=mat('#231a35');
 const b=(m,x,y,z,sx,sy,sz)=>part(avatar,ball,m,x,y,z,sx,sy,sz);
 const y=model==='southpark'?3.22:model==='robot'?3.30:3.34;
 if(model!=='robot'){
  if(v.style==='bald'){/* preserve bare head */}else{
   if(model==='southpark')b(hair,0,y+.65,-.12,.77,.20,.49);
   if(v.style==='spikes'||v.style==='mohawk')for(let i=-2;i<=2;i++)part(avatar,new THREE.ConeGeometry(.17,.38,9),i%2?accent:hair,i*.21,y+.89,0);
   if(v.style==='bob'||v.style==='locs'||v.style==='curls')for(const side of [-1,1])b(hair,side*.62,y+.06,-.14,.18,.46,.29);
   if(v.style==='ponytail')b(hair,0,y+.15,-.61,.22,.47,.23);
   if(v.style==='swoop'||v.style==='undercut')b(hair,-.15,y+.65,.26,.43,.16,.22);
  }
  if(v.detail==='freckles')for(const side of [-1,1])for(let i=0;i<3;i++)b(dark,side*(.26+i*.05),y-.16,.57,.017,.018,.012);
  if(v.detail==='blush')for(const side of [-1,1])b(mat('#df8090'),side*.43,y-.18,.48,.12,.055,.02);
  if(v.detail==='scar')part(avatar,new THREE.BoxGeometry(.025,.24,.025),dark,.35,y-.10,.54).rotation.z=.45;
  if(v.piercing==='earrings'||v.piercing==='hoops')for(const side of [-1,1])part(avatar,new THREE.TorusGeometry(v.piercing==='hoops'?.10:.05,.02,8,20),gold,side*.72,y-.24,.08);
  if(v.piercing==='nose')b(gold,.11,y-.22,.62,.04,.04,.03);
  if(v.piercing==='brow')b(gold,.26,y+.27,.54,.04,.03,.03);
  if(v.accessory==='glasses')for(const side of [-1,1])part(avatar,new THREE.TorusGeometry(.19,.025,8,28),gold,side*.26,y+.12,.59);
  if(v.accessory==='crown')part(avatar,new THREE.CylinderGeometry(.36,.44,.26,7),gold,0,y+.98,0);
  if(v.accessory==='headphones')for(const side of [-1,1])b(dark,side*.73,y+.08,0,.15,.28,.24);
  if(v.tattoo!=='none')b(mat(v.tattoo==='heart'?'#bb2862':'#231a35'),.78,1.65,.17,.06,.12,.035);
 }
}

let rotation=.15,drag=false,last=0;let animationEnabled=true;const animationClock=new THREE.Clock();renderer.domElement.addEventListener('pointerdown',e=>{drag=true;last=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointerup',()=>drag=false);renderer.domElement.addEventListener('pointercancel',()=>drag=false);renderer.domElement.addEventListener('pointermove',e=>{if(drag){rotation+=(e.clientX-last)*.012;last=e.clientX}});renderer.domElement.style.touchAction='pan-y';
function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=w<330?9.2:7.6;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(host);resize();const rebuild=()=>{build();addCategoryDetails();sculptFeatures()};form.addEventListener('input',rebuild);form.addEventListener('change',rebuild);window.addEventListener('avatar-loaded',rebuild);window.addEventListener('avatar-clothing-changed',()=>{window.ctoonEquippedClothing=window.ctoonEquippedClothing||null;rebuild()});rebuild();let running=true;function animate(){if(!running)return;if(document.hidden){requestAnimationFrame(animate);return}avatar.rotation.y=rotation;const t=animationClock.getElapsedTime();avatar.position.y=animationEnabled?Math.sin(t*1.8)*.025:0;avatar.rotation.z=animationEnabled?Math.sin(t*1.2)*.008:0;renderer.render(scene,camera);requestAnimationFrame(animate)}animate();window.addEventListener('pagehide',()=>{running=false;renderer.dispose()});document.addEventListener('visibilitychange',()=>{animationEnabled=!document.hidden});
