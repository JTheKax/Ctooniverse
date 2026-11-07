// Try two independent CDNs so a blocked module host does not blank the preview.
const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js')
 .catch(()=>import('https://esm.sh/three@0.170.0'));
const host=document.getElementById('avatar-3d');const form=document.getElementById('avatar-form');const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(0,2.75,7.6);camera.lookAt(0,2.05,0);
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});}
catch(error){
 host.textContent='3D preview could not start. Please enable hardware acceleration or try another browser.';
 host.style.cssText+=';display:grid;place-items:center;text-align:center;padding:12px;color:#fff';
 throw error;
}renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;host.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xb8edff,0x32144e,1.55));const key=new THREE.DirectionalLight(0xfff1db,3.3);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=8;key.shadow.camera.bottom=-5;key.shadow.bias=-0.0003;scene.add(key);const rim=new THREE.PointLight(0x9b60ff,65,14);rim.position.set(3,4,-3);scene.add(rim);
const avatar=new THREE.Group();scene.add(avatar);const floor=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.85,.18,64),new THREE.MeshStandardMaterial({color:0x332279,metalness:.55,roughness:.3}));floor.position.y=-.1;floor.receiveShadow=true;scene.add(floor);
function mat(color,metalness=0){return new THREE.MeshStandardMaterial({color,metalness,roughness:metalness > 0 ? 0.32 : 0.78})}
function part(group,geometry,material,x,y,z,sx=1,sy=1,sz=1){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh}
const ball=new THREE.SphereGeometry(1,28,20),cylinder=new THREE.CylinderGeometry(1,1,1,20);

// A continuous ring-loft surface for fitted character anatomy.
// Unlike overlapping primitives, it has one welded, smoothly shaded skin.
function loftBody(group,material,profiles,segments=40){
 const vertices=[],indices=[],uv=[];
 for(let j=0;j<profiles.length;j++){
  const [y,rx,rz,shiftZ]=profiles[j];
  for(let i=0;i<=segments;i++){
   const a=i/segments*Math.PI*2;
   vertices.push(Math.cos(a)*rx,y,Math.sin(a)*rz+(shiftZ||0));
   uv.push(i/segments,j/(profiles.length-1));
  }
 }
 for(let j=0;j<profiles.length-1;j++)for(let i=0;i<segments;i++){
  const a=j*(segments+1)+i,b=a+segments+1;
  indices.push(a,b,a+1,b,b+1,a+1);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 return part(group,geometry,material,0,0,0);
}
// Two-bone smooth skinning for the anime arms and legs.
// The mesh is weighted per vertex, so bending deforms its surface rather
// than rotating an entire rigid cylinder at the shoulder or hip.
function skinnedLoft(group,material,profiles,bendY,segments=32){
 const mesh=loftBody(group,material,profiles,segments);
 const geometry=mesh.geometry,positions=geometry.getAttribute('position');
 const skinIndices=[],skinWeights=[];
 const span=.22;
 for(let i=0;i<positions.count;i++){
  const y=positions.getY(i);
  const lower=1-THREE.MathUtils.smoothstep(y,bendY-span,bendY+span);
  skinIndices.push(0,1,0,0);
  skinWeights.push(1-lower,lower,0,0);
 }
 geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(skinIndices,4));
 geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(skinWeights,4));
 group.remove(mesh);
 const root=new THREE.Bone(),lowerBone=new THREE.Bone();
 root.name='UpperLimb';lowerBone.name='LowerLimb';
 lowerBone.position.y=bendY;root.add(lowerBone);
 group.add(root);
 const skinned=new THREE.SkinnedMesh(geometry,material);
 skinned.castShadow=true;skinned.receiveShadow=true;
 group.add(skinned);
 skinned.bind(new THREE.Skeleton([root,lowerBone]));
 return {mesh:skinned,lowerBone};
}
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
function build(){const geometries=new Set(),materials=new Set();avatar.traverse(obj=>{if(obj.isMesh){if(obj.geometry!==ball&&obj.geometry!==cylinder)geometries.add(obj.geometry);for(const m of (Array.isArray(obj.material)?obj.material:[obj.material]))materials.add(m)}});avatar.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());const v=Object.fromEntries(new FormData(form).entries());const equipped=window.ctoonEquippedClothing||null;const model=['anime','classic','chibi','hero','robot','southpark','simpsons'].includes(v.model)?v.model:'anime';if(buildCategory(model,v,equipped))return;avatar.scale.setScalar(model==='chibi'?.88:model==='hero'?1.04:model==='southpark'?.83:1);const skin=mat(model==='simpsons'&&v.skin==='#f2b989'?'#f5d33c':v.skin||'#f2b989'),hair=mat(v.hair||'#30204d'),accent=mat(v.hairAccent||'#ed79ff'),cloth=mat(({tee:'#36cfff',hoodie:'#8b50e9',jacket:'#d047a8',outfit:'#f3bb43',legendary:'#ffd65c'}[equipped])||v.shirt||'#6545d7'),dark=mat('#181a36'),gold=mat('#ffdc68',.6),eye=mat(v.eyes||'#36d5ed');
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




// Anatomical five-digit hand: a tapered palm, four separated fingers and an opposable thumb.
// All pieces are parented to the shoulder pivot, so avatar poses keep the hands attached.
function buildDetailedHand(parent,material,side,wristY,centerX,width,depth,scale=1){
 const palmY=wristY-.145*scale;
 // loftBody's fourth profile coordinate is Z, not X: position the palm
 // with a group so the palm, knuckles and fingers share the same origin.
 const hand=new THREE.Group();
 hand.position.x=centerX;
 parent.add(hand);
 loftBody(hand,material,[
  [palmY-.105*scale,width*.80,depth*.75,0],
  [palmY-.075*scale,width,depth,0],
  [palmY+.035*scale,width*.94,depth*.96,0],
  [palmY+.12*scale,width*.68,depth*.77,0]
 ],24);
 const lengths=[.088,.118,.108,.079].map(n=>n*scale);
 for(let i=0;i<4;i++){
  const x=(i-1.5)*width*.49;
  const radius=Math.max(.012,width*.205);
  const digit=part(hand,new THREE.CapsuleGeometry(radius,lengths[i],5,10),
   material,x,palmY-.105*scale-lengths[i]*.48,depth*.20);
  digit.rotation.z=(i-1.5)*.075;
  part(hand,new THREE.SphereGeometry(radius*1.12,10,8),material,
   x,palmY-.097*scale,depth*.24,radius*1.12,radius*.78,radius);
 }
 const thumb=part(hand,new THREE.CapsuleGeometry(Math.max(.015,width*.26),.082*scale,5,10),
  material,-side*width*.92,palmY+.005*scale,depth*.95);
 thumb.rotation.z=side*.66;
 thumb.rotation.x=-.35;
 return hand;
}

let avatarRig={arms:[],legs:[],eyes:[],head:null,skinnedLimbs:[]};
function buildCleanAvatar(){
 avatarRig={arms:[],legs:[],eyes:[],head:null,skinnedLimbs:[]};
 const geometries=new Set(),materials=new Set();
 avatar.traverse(o=>{if(o.isMesh){if(o.geometry!==ball&&o.geometry!==cylinder)geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))}});
 avatar.clear();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());
 const v=Object.fromEntries(new FormData(form).entries()),model=['anime','hero','classic','chibi','robot','southpark','simpsons'].includes(v.model)?v.model:'anime';
 const outfit=window.ctoonEquippedClothingStyle||(['tee','hoodie','jacket','outfit','legendary','jeans','sneakers'].includes(window.ctoonEquippedClothing)?window.ctoonEquippedClothing:null)||v.outfit||'tee';
 const skin=mat(model==='simpsons'&&(!v.skin||v.skin==='#f2b989')?'#f5d43b':v.skin||'#f2b989');
 const shirt=mat(({tee:'#36cfff',hoodie:'#8b50e9',jacket:'#d047a8',outfit:'#f3bb43',legendary:'#ffd65c'}[outfit])||v.shirt||'#6545d7');
 const pants=mat(outfit==='jeans'?'#3566a7':'#29365d'),shoe=mat(outfit==='sneakers'?'#ff53a8':'#20233f');
 const hair=mat(v.hair||'#30204d'),accent=mat(v.hairAccent||'#ed79ff'),white=mat('#ffffff'),dark=mat('#242039'),iris=mat(v.eyes||'#36d5ed');
 const metal=mat('#a6b5d5',.55),gold=mat('#f6cf63',.5);
 const ballAt=(m,x,y,z,sx,sy,sz)=>part(avatar,ball,m,x,y,z,sx,sy,sz);
 const boxAt=(m,x,y,z,w,h,d)=>part(avatar,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 const style={
  anime:{head:[.57,.70,.47],body:[.68,1.42,.43],arm:.19,leg:.23,eye:.145},
  hero:{head:[.52,.62,.46],body:[.87,1.62,.49],arm:.26,leg:.28,eye:.13},
  classic:{head:[.74,.75,.53],body:[.53,1.32,.38],arm:.13,leg:.16,eye:.24},
  chibi:{head:[.96,.98,.68],body:[.53,.92,.39],arm:.17,leg:.20,eye:.30},
  southpark:{head:[.94,.82,.61],body:[.79,1.02,.53],arm:.24,leg:.24,eye:.30},
  simpsons:{head:[.66,.85,.52],body:[.70,1.46,.44],arm:.19,leg:.23,eye:.25},
  robot:{head:[.64,.57,.43],body:[.78,1.36,.48],arm:.25,leg:.27,eye:.18}
 }[model];
 avatar.scale.setScalar(model==='chibi'?.93:1);
 const robot=model==='robot',headY=model==='chibi'?3.23:3.36;
 if(robot){
  boxAt(metal,0,1.91,0,1.42,1.29,.83);
  boxAt(metal,0,headY,0,1.23,1.03,.77);
  boxAt(dark,0,headY+.05,.408,1.03,.41,.06);
  for(const side of [-1,1])boxAt(iris,side*.25,headY+.06,.45,.24,.15,.04);
  boxAt(dark,0,1.94,.445,.88,.60,.055);
  boxAt(iris,0,1.97,.482,.43,.18,.04);
  boxAt(metal,0,2.65,0,.29,.22,.30);
 }else{
  if(model==='anime'){
   // Sculpted upper body: shoulders, pectorals, ribcage and tapered waist.
   loftBody(avatar,shirt,[
    [1.31,.34,.26],[1.39,.39,.29],[1.58,.37,.30],
    [1.77,.40,.31],[1.98,.48,.35],[2.19,.54,.36],
    [2.36,.55,.34],[2.49,.43,.29],[2.57,.25,.22],[2.60,.14,.15]
   ]);
  }else{
   // Family-specific closed-looking torso silhouette: rounded shoulders,
   // shaped waist and depth, rather than a uniformly stretched lathe.
   const w=style.body[0],d=style.body[2];
   const shoulderScale=model==='hero'?1.10:model==='southpark'?1.04:model==='chibi'?.92:1;
   const waistScale=model==='hero'?.68:model==='simpsons'?.88:model==='southpark'?.97:.79;
   loftBody(avatar,shirt,[
    [1.29,w*waistScale*.56,d*.66],
    [1.39,w*waistScale*.75,d*.79],
    [1.60,w*waistScale*.91,d*.91],
    [1.83,w*.88,d],
    [2.08,w*shoulderScale,d*1.02],
    [2.29,w*shoulderScale*.98,d*.96],
    [2.45,w*.70,d*.75],
    [2.56,w*.28,d*.40]
   ],36);
  }
  ballAt(skin,0,2.69,0,.17,.24,.17);
  if(model==='anime'){
   // Custom tapered facial mesh: cheekbones, jaw and chin are sculpted into
   // one continuous surface rather than stacked spherical primitives.
   const faceGeometry=new THREE.SphereGeometry(1,48,36);
   const pos=faceGeometry.attributes.position;
   for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i);
    const lower=THREE.MathUtils.smoothstep(-y,.03,.88);
    const cheek=1+.055*Math.exp(-Math.pow((y+.12)/.25,2));
    const jaw=1-lower*.23;
    const chin=1-.075*Math.exp(-Math.pow((y+.82)/.16,2));
    pos.setXYZ(i,x*jaw*cheek*chin,y,z*(1-lower*.075));
   }
   pos.needsUpdate=true;faceGeometry.computeVertexNormals();
   part(avatar,faceGeometry,skin,0,headY,0,...style.head);
  }else{
   ballAt(skin,0,headY,0,...style.head);
  }
  if(model==='simpsons'){
   ballAt(skin,0,headY-.35,.43,.36,.23,.29);
   ballAt(skin,0,headY-.46,.53,.29,.11,.19);
  }else if(model==='classic'){
   ballAt(skin,0,headY-.30,.35,.42,.26,.25);
  }
  for(const side of [-1,1]){
   const x=side*(model==='southpark'?.29:model==='chibi'?.34:.24);
   const eyeZ=style.head[2]*.84;
   const eyeball=ballAt(white,x,headY+.10,eyeZ,style.eye,style.eye*1.28,.085);
   // Blink the whole eye (sclera, iris and pupil) about the same center.
   const eyeParts=[eyeball,
    ballAt(iris,x,headY+.08,eyeZ+.079,style.eye*.49,style.eye*.71,.023),
    ballAt(dark,x,headY+.08,eyeZ+.101,style.eye*.25,style.eye*.43,.012)];
   for(const mesh of eyeParts){
    mesh.userData.openEyeHeight=mesh.scale.y;
    mesh.userData.eyeCenterY=headY+.10;
    mesh.userData.eyeOffsetY=mesh.position.y-(headY+.10);
    avatarRig.eyes.push(mesh);
   }
   ballAt(skin,side*(style.head[0]+.035),headY-.10,0,.13,.19,.13);
  }
  ballAt(skin,0,headY-.15,style.head[2]*.99,.09,.10,.09);
  ballAt(dark,0,headY-.37,style.head[2]*.91,.17,.025,.025);
 }
 // Anime benchmark: sculpted eyelids, shaped brows, subtle lips and ear rims.
 if(model==='anime'){
  const browMaterial=hair;
  const lip=mat('#b66c78');
  for(const side of [-1,1]){
   const brow=part(avatar,new THREE.CapsuleGeometry(.026,.15,5,10),browMaterial,side*.235,headY+.30,.444);
   brow.rotation.z=side*.18;
   const lid=part(avatar,new THREE.TorusGeometry(.14,.014,7,32,Math.PI),skin,side*.24,headY+.10,.479);
   lid.rotation.z=Math.PI;
   const earRim=ballAt(skin,side*.615,headY-.12,.005,.105,.17,.105);
   ballAt(lip,side*.625,headY-.12,.095,.035,.075,.014);
  }
  ballAt(skin,0,headY-.11,.493,.075,.14,.105);
  ballAt(lip,0,headY-.405,.422,.145,.024,.025);
  // A fitted collar and seam panels read as fabric instead of floating boxes.
  const collar=mat('#c2ddf5');
  for(const side of [-1,1]){
   const panel=part(avatar,new THREE.BoxGeometry(.25,.095,.12),collar,side*.17,2.55,.30);
   panel.rotation.z=side*.35;
  }
 }
 // Layered waist and clothing panels provide a continuous body silhouette.
 if(!robot){
  const waist=part(avatar,new THREE.CylinderGeometry(model==='hero'?.46:model==='anime'?.39:.43,model==='hero'?.51:.46,.34,28),pants,0,1.27,0);
  waist.scale.z=model==='hero'?.90:.80;
  const belt=part(avatar,new THREE.CylinderGeometry(model==='hero'?.51:.46,model==='hero'?.51:.46,.085,28),dark,0,1.43,0);
  belt.scale.z=.82;
  boxAt(gold,0,1.43,.41,.15,.105,.055);
  if(model==='anime'||model==='hero'){
   const seam=mat(model==='hero'?'#7185aa':'#d4b5ef');
   // A tapered chest overlay, fitted side panels and raised garment seams.
   if(model==='hero'){
    const chest=part(avatar,new THREE.CylinderGeometry(.67,.42,.85,16),shirt,0,2.04,.035);
    chest.scale.z=.72;
   }
   for(const side of [-1,1]){
    const panel=part(avatar,new THREE.BoxGeometry(.095,.69,.055),seam,side*(model==='hero'?.51:.40),2.03,.29);
    panel.rotation.z=side*(model==='hero'?.18:.11);
    const lapel=part(avatar,new THREE.BoxGeometry(.15,.39,.075),dark,side*.17,2.46,.34);
    lapel.rotation.z=side*.42;
   }
   if(model==='hero'){
    boxAt(dark,0,1.84,.46,.55,.16,.07);
    boxAt(gold,0,2.23,.47,.16,.13,.07);
   }else{
    boxAt(seam,0,1.86,.34,.055,.54,.06);
   }
  }
 }
 const shoulder=style.body[0]*.95;
 // Subtle anatomical collarbone volumes blend the upper arms into the torso.
 if(!robot && model!=='southpark'){
  for(const side of [-1,1]){
   const clavicle=part(avatar,ball,shirt,side*shoulder*.69,2.34,.045,
    style.arm*1.35,.105,style.arm*1.35);
   clavicle.rotation.z=-side*.17;
  }
 }
 for(const side of [-1,1]){
  if(robot){
   boxAt(metal,side*(shoulder+.16),2.18,0,.42,.42,.46);
   boxAt(metal,side*(shoulder+.18),1.59,0,.31,.82,.34);
   ballAt(iris,side*(shoulder+.18),1.20,.19,.10,.11,.04);
   boxAt(metal,side*.34,.79,0,.48,.95,.51);
   boxAt(shoe,side*.34,.20,.20,.52,.26,.72);
  }else{
   // Shoulder and hip pivot groups form an articulated procedural rig.
   const armPivot=new THREE.Group();armPivot.position.set(side*shoulder,2.28,0);avatar.add(armPivot);
   if(model==='anime'){
    // Smooth ring-loft arm with fitted sleeve, narrowing wrist and anatomical palm.
    const armSkin=skinnedLoft(armPivot,shirt,[
     [-.82,style.arm*.80,style.arm*.78,side*.15],
     [-.69,style.arm*.90,style.arm*.90,side*.13],
     [-.50,style.arm*.86,style.arm*.88,side*.10],
     [-.34,style.arm*1.08,style.arm*1.05,side*.06],
     [-.15,style.arm*1.32,style.arm*1.28,side*.02],
     [-.02,style.arm*1.12,style.arm*1.15,0]
    ],-.53,32);
    avatarRig.skinnedLimbs.push({bone:armSkin.lowerBone,side,type:'arm'});
    // Exposed wrist bridges the sleeve to the hand without a floating gap.
    const wrist=loftBody(armPivot,skin,[
     [-.915,.077,.068,0],
     [-.88,.081,.072,0],
     [-.835,.079,.073,0],
     [-.805,.076,.071,0]
    ],24);
    // The wrist and hand share the arm's actual lateral centerline.
    // Previously the wrist profile's fourth coordinate shifted it in Z.
    wrist.position.x=side*.16;
    const animeHand=buildDetailedHand(armPivot,skin,side,-.86,side*.16,.112,.078,1.12);
    // Parent both wrist and hand to the forearm bone, preserving their
    // existing positions in shoulder-pivot space.
    armSkin.lowerBone.add(wrist,animeHand);
    wrist.position.y-=armSkin.lowerBone.position.y;
    animeHand.position.y-=armSkin.lowerBone.position.y;
   }else{
    // A tapered sleeve with a rounded shoulder and a fitted cuff.
    const armReach=model==='chibi'?.66:model==='southpark'?.69:.78;
    part(armPivot,ball,shirt,0,-.08,0,style.arm*1.20,style.arm*1.25,style.arm*1.16);
    loftBody(armPivot,shirt,[
     [-armReach,style.arm*.70,style.arm*.73,side*.13],
     [-armReach+.10,style.arm*.77,style.arm*.79,side*.12],
     [-armReach*.65,style.arm*.89,style.arm*.88,side*.09],
     [-.24,style.arm*1.06,style.arm*1.04,side*.025],
     [-.10,style.arm*1.13,style.arm*1.12,0],
     [-.015,style.arm*.85,style.arm*.90,0]
    ],24);
    // Fitted wrist cuff hides the seam between sleeve and hand.
    part(armPivot,ball,shirt,side*.13,-armReach+.025,.015,
     style.arm*.79,.072,style.arm*.80);
    const glove=model==='classic'||model==='chibi';
    const mitten=model==='southpark';
    const handMaterial=glove?white:mitten?shirt:skin;
    const handWidth=style.arm*(model==='hero'?.72:model==='simpsons'?.70:.82);
    const palmY=-armReach-.145;
    if(mitten){
     part(armPivot,ball,handMaterial,side*.13,palmY-.04,.055,handWidth,.16,style.arm*.70);
     part(armPivot,ball,handMaterial,side*.13-side*handWidth*.70,palmY+.02,.13,handWidth*.40,.09,handWidth*.40);
    }else{
     buildDetailedHand(armPivot,handMaterial,side,-armReach,side*.13,handWidth,style.arm*.67,model==='chibi'?.80:1);
    }
   }
   avatarRig.arms.push({joint:armPivot,side});
   const legPivot=new THREE.Group();legPivot.position.set(side*.32,1.27,0);avatar.add(legPivot);
   if(model==='anime'){
    // Continuous thigh-to-ankle leg with sculpted knee and calf volumes.
    const legSkin=skinnedLoft(legPivot,pants,[
     [-.99,.16,.16,side*.02],[-.84,.18,.18,side*.02],
     [-.70,.20,.19,side*.015],[-.57,.185,.18,side*.01],
     [-.44,.22,.21,side*.01],[-.26,.265,.25,0],
     [-.08,.29,.265,0],[.06,.25,.23,0]
    ],-.54,32);
    avatarRig.skinnedLimbs.push({bone:legSkin.lowerBone,side,type:'leg'});
    // Shoe shell, toe box and outsole remain separate for recoloring.
    const foot=new THREE.Group();
    legSkin.lowerBone.add(foot);
    foot.position.y=-legSkin.lowerBone.position.y;
    part(foot,ball,shoe,side*.02,-1.075,.22,.27,.16,.40);
    part(foot,ball,white,side*.02,-1.185,.26,.275,.045,.41);
    for(let i=0;i<3;i++)
     part(foot,new THREE.CapsuleGeometry(.011,.15,3,8),white,
      side*.02,-1.005-i*.048,.45-i*.018);
   }else{
    // One continuous trouser silhouette with knee and ankle taper.
    const thigh=style.leg*(model==='hero'?1.18:1.12);
    loftBody(legPivot,pants,[
     [-.97,style.leg*.76,style.leg*.75,0],
     [-.82,style.leg*.83,style.leg*.83,0],
     [-.57,style.leg*.96,style.leg*.91,0],
     [-.35,thigh,style.leg,0],
     [-.08,thigh*1.13,style.leg*1.06,0],
     [.08,style.leg*.98,style.leg*.95,0]
    ],28);
    part(legPivot,ball,shoe,0,-1.07,.19,style.leg*1.22,.15,.35);
    part(legPivot,ball,white,0,-1.18,.23,style.leg*1.23,.035,.37);
   }
   avatarRig.legs.push({joint:legPivot,side});
  }
 }
 if(robot){
  boxAt(gold,0,4.07,0,.11,.33,.12);
  ballAt(iris,0,4.27,0,.14,.14,.14);
 }else{
  // Family-specific facial sculpting, placed relative to each head's actual depth.
  const faceZ=style.head[2];
  // Keep the face as one sculpted head; avoid intersecting cheek, jaw and nose spheres.
  // Small, shallow details follow each family's proportions.
  if(model==='simpsons'){
   ballAt(skin,0,headY-.31,faceZ*.92,.22,.12,.10);
  }else if(model==='classic'){
   ballAt(skin,0,headY-.19,faceZ*.91,.12,.10,.08);
  }else if(model==='anime'||model==='hero'){
   for(const side of [-1,1]){
    const brow=part(avatar,new THREE.CapsuleGeometry(.021,.13,4,8),hair,side*.25,headY+.32,faceZ*.96);
    brow.rotation.z=side*.16;
   }
  }
  // Curved, tapered locks grown from a fitted scalp instead of stacked cones.
  if(v.style!=='bald'){
   const hairstyle=v.style||'swoop';
   const scalp=ballAt(hair,0,headY+style.head[1]*.72,-.065,style.head[0]*1.005,.245,style.head[2]*.98);
   const strand=(material,points,radius)=>{
    const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return part(avatar,new THREE.TubeGeometry(curve,12,radius,7,false),material,0,0,0);
   };
   const n=hairstyle==='locs'?11:hairstyle==='curls'?12:hairstyle==='mohawk'?5:9;
   for(let i=0;i<n;i++){
    const t=(i/(n-1)-.5)*1.9;
    const x=Math.sin(t)*style.head[0]*.83;
    const z=Math.cos(t)*style.head[2]*.89;
    const rootY=headY+style.head[1]*.80;
    const tint=i%5===0?accent:hair;
    if(hairstyle==='curls'){
     for(let k=0;k<2;k++)ballAt(tint,x+(k-.5)*.12,rootY-.17-k*.13,z+.035,.12,.12,.12);
    }else if(hairstyle==='locs'||hairstyle==='bob'){
     const length=hairstyle==='locs'?.53:.43;
     strand(tint,[[x,rootY,z-.10],[x*1.06,rootY-.12,z+.015],[x*1.09,rootY-length,z+.035]],hairstyle==='locs'?.07:.095);
    }else if(hairstyle==='mohawk'){
     const spike=part(avatar,new THREE.ConeGeometry(.125,.38,12),tint,x*.25,rootY+.25,-.06);
     spike.rotation.z=-t*.16;
    }else{
     const sweep=hairstyle==='swoop'?.18:hairstyle==='undercut'?.10:.04;
     strand(tint,[[x,rootY,z-.16],[x-sweep,rootY-.08,z+.04],[x-sweep*1.5,rootY-.25,z+.09]],.085);
    }
   }
   if(hairstyle==='spikes')for(let i=-2;i<=2;i++){
    const spike=part(avatar,new THREE.ConeGeometry(.13,.38,12),i===1?accent:hair,i*.19,headY+style.head[1]+.12,-.07);
    spike.rotation.z=i*.19;
   }
   if(hairstyle==='ponytail')strand(hair,[[0,headY+.48,-style.head[2]*.65],[0,headY+.22,-style.head[2]-.23],[0,headY-.22,-style.head[2]-.23]],.16);
   if(hairstyle==='undercut')scalp.scale.y=.15;
   // Anime hair has a layered crown and face-framing side locks.
   // Keep these anchored to the head so they follow the idle head motion.
   if(model==='anime'){
    for(const side of [-1,1]){
     const sideX=side*style.head[0]*.84;
     if(hairstyle==='bob'||hairstyle==='locs'||hairstyle==='ponytail'){
      strand(hair,[[sideX*.80,headY+.48,-.10],[sideX,headY+.16,.07],[sideX*.98,headY-.26,.11]],.09);
     }else if(hairstyle!=='mohawk'&&hairstyle!=='undercut'){
      strand(hair,[[sideX*.62,headY+.55,-.07],[sideX*.90,headY+.30,.24],[sideX*.82,headY+.02,.29]],.085);
     }
    }
    if(hairstyle==='swoop'){
     for(let i=0;i<4;i++){
      const x=-.28+i*.17;
      strand(i===2?accent:hair,[[x,headY+.66,.10],[x+.10,headY+.47,.30],[x+.17,headY+.31,.34]],.067);
     }
    }
   }
  }
  if(v.accessory==='glasses')for(const side of [-1,1])part(avatar,new THREE.TorusGeometry(style.eye*1.22,.026,8,28),gold,side*(model==='chibi'?.34:.25),headY+.10,style.head[2]*.84+.11);
  if(v.accessory==='crown')part(avatar,new THREE.CylinderGeometry(.35,.43,.27,8),gold,0,headY+style.head[1]+.27,0);
  if(v.accessory==='headphones')for(const side of [-1,1])ballAt(dark,side*(style.head[0]+.06),headY+.1,0,.15,.26,.24);
  if(v.piercing==='nose')ballAt(gold,.12,headY-.16,style.head[2]+.10,.045,.045,.035);
  if(v.piercing==='brow')ballAt(gold,.25,headY+.32,style.head[2]*.85,.04,.04,.03);
  if(v.piercing==='earrings'||v.piercing==='hoops')for(const side of [-1,1])part(avatar,new THREE.TorusGeometry(v.piercing==='hoops'?.10:.05,.02,8,20),gold,side*(style.head[0]+.06),headY-.28,0);
  if(v.detail==='freckles')for(const side of [-1,1])for(let i=0;i<3;i++)ballAt(dark,side*(.19+i*.07),headY-.19,style.head[2]*.95,.018,.018,.012);
  if(v.detail==='blush')for(const side of [-1,1])ballAt(mat('#df8090'),side*.39,headY-.22,style.head[2]*.78,.13,.06,.022);
  if(v.detail==='scar')boxAt(dark,.34,headY-.13,style.head[2]*.92,.025,.24,.025);
  if(v.tattoo&&v.tattoo!=='none')ballAt(mat(v.tattoo==='heart'?'#b32157':'#171332'),shoulder+.10,1.75,.12,.05,.13,.06);
  if(outfit==='hoodie'){
   // Hood sits behind the neck instead of floating above the shoulders.
   ballAt(shirt,0,2.48,-.26,.33,.22,.20);
   for(const side of [-1,1]){
    const drawstring=part(avatar,new THREE.CapsuleGeometry(.012,.22,4,8),white,side*.13,2.28,.355);
    drawstring.rotation.z=side*.07;
   }
  }
  if(outfit==='jacket'){
   for(const side of [-1,1]){
    const lapel=boxAt(gold,side*.16,2.28,.35,.085,.36,.045);
    lapel.rotation.z=side*.26;
   }
  }
  if(outfit==='legendary'||v.outfit==='armor'||model==='hero')ballAt(gold,0,2.11,.43,.20,.15,.045);
 }
 // Garment-specific shells follow each family's existing body proportions.
 // Keep details shallow to avoid hiding the face or intersecting animated limbs.
 if(!robot){
  const chestWidth=style.body[0],chestDepth=style.body[2];
  const front=chestDepth*.72+.09;
  const compact=model==='chibi'||model==='southpark';
  if(outfit==='hoodie'){
   const pocketWidth=chestWidth*(compact?.64:.76);
   const pocket=boxAt(shirt,0,1.77,front,pocketWidth,.24,.055);
   pocket.scale.x=1;
   for(const side of [-1,1]){
    const seam=boxAt(dark,side*pocketWidth*.33,1.77,front+.031,.025,.13,.012);
    seam.rotation.z=side*.28;
   }
   const rib=part(avatar,new THREE.CylinderGeometry(chestWidth*.66,chestWidth*.69,.105,24),dark,0,1.44,0);
   rib.scale.z=.68;
  }else if(outfit==='jacket'){
   for(const side of [-1,1]){
    const edge=boxAt(dark,side*chestWidth*.19,2.04,front,.055,.70,.05);
    edge.rotation.z=side*.10;
    const pocket=boxAt(gold,side*chestWidth*.44,1.78,front+.01,.14,.035,.025);
    pocket.rotation.z=side*.08;
   }
  }else if(outfit==='jeans'){
   for(const side of [-1,1]){
    const pocket=boxAt(dark,side*.27,1.20,.32,.17,.13,.025);
    pocket.rotation.z=side*.14;
   }
  }else if(outfit==='sneakers'){
   for(const side of [-1,1]){
    for(let i=0;i<2;i++)boxAt(white,side*.32,.24+i*.045,.48-i*.02,.17,.014,.025);
   }
  }else if(outfit==='legendary'||outfit==='outfit'){
   const chest=ballAt(outfit==='legendary'?metal:gold,0,2.04,front,.34,.22,.045);
   for(const side of [-1,1]){
    const trim=boxAt(gold,side*chestWidth*.49,2.08,front-.03,.065,.31,.045);
    trim.rotation.z=side*.16;
   }
  }
 }else if(outfit==='hoodie'||outfit==='jacket'||outfit==='legendary'){
  // Mechanical avatars wear fitted panels instead of human fabric shells.
  const panel=boxAt(outfit==='legendary'?gold:shirt,0,1.91,.53,.91,.54,.07);
  for(const side of [-1,1])boxAt(dark,side*.38,1.91,.58,.035,.47,.018);
 }
 // Restrained fabric details: avoid decorative strips floating over the torso.
 if(model==='anime'){
  const stitch=mat('#c3a9ee');
  for(const side of [-1,1]){
   const cuff=part(avatar,new THREE.TorusGeometry(.125,.023,8,24),stitch,side*.82,1.47,.055);
   cuff.rotation.x=Math.PI/2;
  }
 }
 // Distinctive sculpted accessories and silhouettes for every model family.
 // These meshes are built into the active preview, not legacy unused builders.
 if(model==='anime'){
  const trim=mat('#f0c5ff');
  for(const side of [-1,1])ballAt(shirt,side*.58,2.30,0,.19,.16,.22);
 }else if(model==='hero'){
  // Contoured shoulder armor, layered chest plates and fitted shin guards.
  for(const side of [-1,1]){
   const pauldron=ballAt(metal,side*.85,2.40,.015,.30,.18,.37);
   pauldron.rotation.z=side*.20;
   const shoulderTrim=ballAt(gold,side*.85,2.47,.25,.22,.055,.08);
   shoulderTrim.rotation.z=side*.20;
   const guard=ballAt(metal,side*.33,.70,.24,.21,.31,.095);
   guard.rotation.z=side*.04;
   ballAt(gold,side*.34,.83,.33,.09,.07,.035);
  }
  ballAt(metal,0,2.08,.41,.48,.29,.12);
  ballAt(gold,0,2.10,.53,.13,.13,.04);
 }else if(model==='chibi'){
  // Compact sleeves, oversized cuffs and rounded tunic hem.
  for(const side of [-1,1]){
   ballAt(shirt,side*.52,2.16,.07,.22,.22,.24);
   ballAt(white,side*.64,1.60,.12,.13,.075,.13);
   ballAt(gold,side*.32,1.53,.34,.09,.085,.04);
  }
  ballAt(shirt,0,1.72,.29,.41,.16,.12);
 }else if(model==='classic'){
  // Simple expressive cartoon silhouette: gloves and rounded shoe toes.
  for(const side of [-1,1]){
   ballAt(white,side*.79,1.31,.12,.18,.18,.17);
   ballAt(white,side*.34,.19,.47,.26,.10,.21);
  }
  ballAt(gold,0,1.53,.40,.11,.11,.06);
 }else if(model==='southpark'){
  // Graphic winter jacket with inset zipper, pocket seams and soft mittens.
  ballAt(shirt,0,2.01,.15,.67,.40,.40);
  boxAt(dark,0,1.97,.555,.035,.58,.025);
  for(const side of [-1,1]){
   ballAt(shirt,side*.78,1.41,.09,.24,.24,.24);
   const pocket=boxAt(dark,side*.33,1.71,.52,.22,.025,.02);
   pocket.rotation.z=side*.07;
  }
  if(v.style!=='bald'){
   ballAt(hair,0,4.03,0,.68,.14,.51);
   ballAt(accent,0,4.21,0,.12,.12,.12);
  }
 }else if(model==='simpsons'){
  // Smooth muzzle, fitted collar points and simple shirt sleeve seams.
  ballAt(skin,0,headY-.42,.43,.29,.12,.17);
  for(const side of [-1,1]){
   const collar=boxAt(white,side*.19,2.48,.33,.24,.09,.12);
   collar.rotation.z=side*.32;
   ballAt(white,side*.70,2.06,.12,.16,.045,.16);
  }
 }else if(model==='robot'){
  // Layered mechanical armor with articulated knee caps and glowing status bars.
  boxAt(dark,0,1.94,.51,.73,.54,.055);
  for(let i=-1;i<=1;i++)boxAt(iris,i*.19,1.96,.55,.09,.27,.035);
  for(const side of [-1,1]){
   boxAt(gold,side*.87,2.16,.27,.30,.10,.075);
   ballAt(dark,side*.34,.79,.30,.19,.16,.095);
   boxAt(metal,side*.34,.50,.31,.33,.26,.085);
   boxAt(dark,side*.34,.22,.59,.42,.11,.055);
  }
 }
 // Attach all completed face and hair meshes to a head pivot for idle movement.
 const headPivot=new THREE.Group();headPivot.position.set(0,headY-.14,0);avatar.add(headPivot);
 for(const mesh of [...avatar.children]){
  if(!mesh.isMesh||mesh.position.y<headY-.65)continue;
  avatar.remove(mesh);mesh.position.y-=headPivot.position.y;headPivot.add(mesh);
 }
 avatarRig.head=headPivot;
 // Keep every style in the camera frame, including oversized chibi hair and robot antennae.
 avatar.updateMatrixWorld(true);
 const bounds=new THREE.Box3().setFromObject(avatar);
 if(!bounds.isEmpty()){
  const center=bounds.getCenter(new THREE.Vector3());
  const size=bounds.getSize(new THREE.Vector3());
  camera.userData.avatarCenterY=THREE.MathUtils.clamp(center.y,1.65,2.35);
  camera.userData.avatarHeight=Math.max(3.7,size.y);
 }
}

function sculptCategoryIdentity(){
 const v=Object.fromEntries(new FormData(form).entries());
 const model=v.model||'anime',skin=mat(model==='simpsons'&&(!v.skin||v.skin==='#f2b989')?'#f5d43b':v.skin||'#f2b989');
 const fabric=mat(({tee:'#36cfff',hoodie:'#8b50e9',jacket:'#d047a8',outfit:'#f3bb43',legendary:'#ffd65c'}[window.ctoonEquippedClothing])||v.shirt||'#6545d7');
 const metal=mat('#aab8d7',.65),glow=new THREE.MeshStandardMaterial({color:v.eyes||'#36d5ed',emissive:v.eyes||'#36d5ed',emissiveIntensity:.7,roughness:.3});
 const ink=mat('#25213d'),hair=mat(v.hair||'#30204d');
 const ell=(m,x,y,z,a,b,c)=>part(avatar,new THREE.SphereGeometry(1,32,24),m,x,y,z,a,b,c);
 const cylinder=(m,x,y,z,r1,r2,h)=>part(avatar,new THREE.CylinderGeometry(r1,r2,h,24),m,x,y,z);
 const badge=(m,x,y,z,w,h,d)=>part(avatar,new THREE.BoxGeometry(w,h,d),m,x,y,z);
 if(model==='robot'){
  // Distinct articulated mechanical silhouette, armor panels, recessed joints and visor.
  for(const side of [-1,1]){
   const shoulder=ell(metal,side*.88,2.30,0,.32,.30,.35);
   ell(ink,side*.91,1.68,0,.19,.20,.20);
   badge(metal,side*.91,1.57,.23,.23,.43,.11);
   ell(glow,side*.35,.81,.28,.09,.16,.04);
   badge(ink,side*.36,.24,.50,.38,.10,.08);
  }
  badge(ink,0,1.91,.405,.77,.59,.075);
  badge(glow,0,1.96,.45,.48,.15,.045);
  for(let i=-1;i<=1;i++)badge(metal,i*.18,1.57,.48,.08,.15,.055);
  badge(ink,0,3.43,.425,.89,.39,.07);
  for(const side of [-1,1])ell(glow,side*.23,3.43,.47,.16,.105,.035);
  cylinder(metal,0,3.99,0,.06,.09,.34);
  return;
 }
 if(model==='southpark'){
  // Compact stylized figure with mitten hands, prominent jacket collar and short boots.
  ell(fabric,0,1.91,.43,.48,.13,.12);
  for(const side of [-1,1]){
   ell(fabric,side*.75,1.47,.04,.26,.39,.29);
   ell(skin,side*.85,1.08,.13,.23,.20,.22);
   ell(ink,side*.31,.32,.23,.35,.15,.45);
  }
  ell(skin,0,3.06,.45,.65,.40,.25);
  return;
 }
 if(model==='simpsons'){
  // Tall cartoon head, projecting muzzle and curved lower jaw.
  ell(skin,0,3.06,.45,.38,.26,.32);
  ell(skin,0,2.93,.52,.34,.13,.24);
  for(const side of [-1,1])ell(skin,side*.64,3.23,.04,.16,.24,.18);
  return;
 }
 if(model==='chibi'){
  // Rounded oversized head, small shoulders and compact boots.
  ell(fabric,0,2.11,0,.59,.42,.38);
  for(const side of [-1,1]){
   ell(fabric,side*.54,2.02,.02,.23,.30,.25);
   ell(ink,side*.29,.27,.23,.30,.18,.40);
  }
  return;
 }
 if(model==='classic'){
  // Elastic cartoon silhouette: tapered gloves, oval shoes and emphasized cheek volume.
  for(const side of [-1,1]){
   ell(skin,side*.81,1.27,.08,.20,.24,.19);
   ell(ink,side*.32,.22,.28,.34,.16,.49);
   ell(skin,side*.41,3.16,.22,.26,.23,.23);
  }
  return;
 }
 if(model==='hero'){
  // Athletic shoulder armor, chest plate and angular gauntlets.
  ell(fabric,0,2.17,.29,.68,.49,.31);
  for(const side of [-1,1]){
   ell(metal,side*.76,2.37,0,.35,.21,.43);
   badge(metal,side*.83,1.62,.25,.28,.39,.13);
   ell(ink,side*.33,.23,.30,.31,.22,.46);
  }
  ell(glow,0,2.13,.56,.18,.18,.045);
  return;
 }
 // Anime: shaped collar, separated chest panel and slimmer layered shoulders.
 ell(fabric,0,2.15,.23,.51,.34,.27);
 for(const side of [-1,1]){
  ell(fabric,side*.65,2.30,0,.25,.25,.32);
  const collar=badge(ink,side*.17,2.46,.36,.23,.08,.14);
  collar.rotation.z=side*.42;
 }
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

// Reliable low-complexity fallback when detailed geometry fails on a device.
function buildSafeAvatar(){
 avatar.clear();
 avatarRig={arms:[],legs:[],eyes:[],head:null,skinnedLimbs:[]};
 const v=Object.fromEntries(new FormData(form).entries());
 const skin=mat(v.skin||'#f2b989'),shirt=mat(v.shirt||'#6545d7');
 const pants=mat('#29365d'),hair=mat(v.hair||'#30204d'),white=mat('#ffffff'),dark=mat('#20223b');
 const b=(m,x,y,z,a,c,d)=>part(avatar,ball,m,x,y,z,a,c,d);
 b(shirt,0,1.95,0,.55,.72,.37);
 b(skin,0,3.30,0,.58,.65,.46);
 b(skin,0,2.67,0,.14,.20,.13);
 if(v.style!=='bald')b(hair,0,3.79,-.04,.59,.24,.45);
 for(const side of [-1,1]){
  b(white,side*.23,3.40,.405,.15,.18,.06);
  b(mat(v.eyes||'#36d5ed'),side*.23,3.39,.46,.07,.10,.025);
  b(shirt,side*.68,2.02,0,.18,.52,.21);
  b(skin,side*.70,1.46,.02,.14,.17,.13);
  b(pants,side*.29,.82,0,.23,.55,.25);
  b(dark,side*.29,.19,.17,.26,.15,.37);
 }
 b(skin,0,3.18,.46,.07,.08,.07);
 b(dark,0,3.01,.42,.13,.022,.02);
 avatar.scale.setScalar(1);
 camera.userData.avatarCenterY=2.05;
}

let rotation=.15,drag=false,last=0;let animationEnabled=true;const animationClock=new THREE.Clock();renderer.domElement.addEventListener('pointerdown',e=>{drag=true;last=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointerup',()=>drag=false);renderer.domElement.addEventListener('pointercancel',()=>drag=false);renderer.domElement.addEventListener('pointermove',e=>{if(drag){rotation+=(e.clientX-last)*.012;last=e.clientX}});renderer.domElement.style.touchAction='pan-y';
function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.position.z=w<330?9.2:7.6;camera.lookAt(0,camera.userData.avatarCenterY||2.05,0);camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(host);resize();const rebuild=()=>{try{
 buildCleanAvatar();
 if(avatar.children.length===0)throw new Error('No avatar meshes were created');
 camera.lookAt(0,camera.userData.avatarCenterY||2.05,0);
 host.dataset.previewStatus='ready';
 const warning=host.querySelector('[data-avatar-error]');if(warning)warning.remove();
}catch(error){
 console.error('CTooniverse detailed 3D preview:',error);
 try{
  buildSafeAvatar();
  host.dataset.previewStatus='fallback';
  const prior=host.querySelector('[data-avatar-error]');if(prior)prior.remove();
  let note=host.querySelector('[data-avatar-fallback]');
  if(!note){note=document.createElement('div');note.dataset.avatarFallback='';note.style.cssText='position:absolute;bottom:6px;left:8px;right:8px;text-align:center;color:#fff;background:#241a4bbb;border-radius:8px;padding:5px;font:12px sans-serif;pointer-events:none';host.style.position='relative';host.appendChild(note)}
  note.textContent='Basic 3D mode active. Detailed model error: '+(error?.message||'unknown');
  return;
 }catch(fallbackError){console.error('CTooniverse fallback 3D preview:',fallbackError)}
 host.dataset.previewStatus='error';
 let warning=host.querySelector('[data-avatar-error]');
 if(!warning){warning=document.createElement('div');warning.dataset.avatarError='';warning.style.cssText='position:absolute;inset:8px;display:grid;place-items:center;padding:16px;background:#20163ddc;color:white;text-align:center;border-radius:12px;z-index:2';host.style.position='relative';host.appendChild(warning)}
 warning.textContent='3D preview failed: '+(error?.message||'unknown error')+'. Try reloading this page.';
}};form.addEventListener('input',rebuild);form.addEventListener('change',rebuild);window.addEventListener('avatar-loaded',rebuild);window.addEventListener('avatar-clothing-changed',()=>{window.ctoonEquippedClothing=window.ctoonEquippedClothing||null;rebuild()});rebuild();let running=true;function animate(){if(!running)return;if(document.hidden){requestAnimationFrame(animate);return}avatar.rotation.y=rotation;const t=animationClock.getElapsedTime();avatar.position.y=animationEnabled?Math.sin(t*1.8)*.025:0;avatar.rotation.z=animationEnabled?Math.sin(t*1.2)*.008:0;for(const {joint,side} of avatarRig.arms){joint.rotation.z=animationEnabled?side*(.045+Math.sin(t*1.4+side)*.055):0;joint.rotation.x=animationEnabled?Math.sin(t*1.3+side)*.045:0}for(const {joint,side} of avatarRig.legs){joint.rotation.x=animationEnabled?Math.sin(t*1.4+side*Math.PI)*.035:0}
for(const {bone,side,type} of avatarRig.skinnedLimbs){
 // Do not bend a skinned forearm independently of its hand: doing so
 // visibly detaches the wrist. Shoulder sway still animates the whole arm.
 bone.rotation.z=animationEnabled?(type==='arm'?side*.035*Math.sin(t*1.5):side*.015*Math.sin(t*1.3)):0;
 bone.rotation.x=animationEnabled?(type==='arm'?.075*Math.max(0,Math.sin(t*1.3+side)):.045*Math.max(0,Math.sin(t*1.4+side*Math.PI))):0;
}
if(avatarRig.head){
 avatarRig.head.rotation.y=animationEnabled?Math.sin(t*.72)*.055:0;
 avatarRig.head.rotation.z=animationEnabled?Math.sin(t*.83)*.027:0;
 avatarRig.head.rotation.x=animationEnabled?Math.sin(t*.62)*.024:0;
}
// Two short natural blinks per cycle, with a long resting interval.
const blinkPhase=t%5.7;
const blink=animationEnabled&&blinkPhase<.19?Math.max(.10,Math.abs(blinkPhase-.095)/.095):1;
for(const eye of avatarRig.eyes){eye.scale.y=eye.userData.openEyeHeight*blink;eye.position.y=eye.userData.eyeCenterY+eye.userData.eyeOffsetY*blink;}
try{renderer.render(scene,camera)}catch(error){
 console.error('Avatar render error:',error);
 host.dataset.previewStatus='error';
 if(!host.querySelector('[data-avatar-error]')){
  const warning=document.createElement('div');warning.dataset.avatarError='';
  warning.textContent='3D rendering stopped: '+(error?.message||'unknown error');
  warning.style.cssText='position:absolute;inset:8px;display:grid;place-items:center;padding:12px;background:#20163de8;color:#fff;text-align:center;z-index:3';
  host.style.position='relative';host.appendChild(warning);
 }
 running=false;return;
}requestAnimationFrame(animate)}animate();window.addEventListener('pagehide',()=>{running=false;renderer.dispose()});document.addEventListener('visibilitychange',()=>{animationEnabled=!document.hidden});
