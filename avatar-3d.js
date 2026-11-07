import * as THREE from 'https://esm.sh/three@0.170.0';
const host=document.getElementById('avatar-3d');const form=document.getElementById('avatar-form');const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(35,1,.1,100);camera.position.set(0,2.5,8.8);camera.lookAt(0,1.45,0);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=true;host.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xb8edff,0x32144e,2.1));const key=new THREE.DirectionalLight(0xfff1db,3.3);key.position.set(-3,7,5);scene.add(key);const rim=new THREE.PointLight(0x9b60ff,65,14);rim.position.set(3,4,-3);scene.add(rim);
const avatar=new THREE.Group();scene.add(avatar);const floor=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.85,.18,64),new THREE.MeshStandardMaterial({color:0x332279,metalness:.55,roughness:.3}));floor.position.y=-.1;scene.add(floor);
function mat(color,metalness=0){return new THREE.MeshStandardMaterial({color,roughness:.55,metalness})}
function part(group,geometry,material,x,y,z,sx=1,sy=1,sz=1){const mesh=new THREE.Mesh(geometry,material);mesh.position.set(x,y,z);mesh.scale.set(sx,sy,sz);group.add(mesh);return mesh}
const ball=new THREE.SphereGeometry(1,24,16),cylinder=new THREE.CylinderGeometry(1,1,1,20);
function limb(group,a,b,r,material){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);const mesh=part(group,new THREE.CylinderGeometry(r*.85,r,start.distanceTo(end),14),material,...start.clone().add(end).multiplyScalar(.5).toArray());mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),end.sub(start).normalize());return mesh}
function build(){avatar.clear();const v=Object.fromEntries(new FormData(form).entries());const skin=mat(v.skin||'#f2b989'),hair=mat(v.hair||'#30204d'),accent=mat(v.hairAccent||'#ed79ff'),cloth=mat(v.shirt||'#6545d7'),dark=mat('#181a36'),gold=mat('#ffdc68',.6),eye=mat(v.eyes||'#36d5ed');
part(avatar,ball,cloth,0,1.82,0,.69,.88,.36);part(avatar,ball,skin,0,2.74,0,.17,.24,.16);part(avatar,ball,skin,0,3.38,0,.56,.68,.48);
for(const side of [-1,1]){part(avatar,ball,skin,side*.54,3.35,0,.12,.19,.13);part(avatar,ball,THREE.MeshStandardMaterial?mat('#ffffff'):eye,side*.22,3.44,.438,.16,.13,.065);part(avatar,ball,eye,side*.22,3.44,.497,.075,.085,.025);part(avatar,ball,dark,side*.22,3.44,.519,.035,.047,.012);
limb(avatar,[side*.65,2.28,0],[side*.82,1.45,0],.19,v.outfit==='armor'?gold:cloth);part(avatar,ball,skin,side*.84,1.35,0,.17,.19,.16);
limb(avatar,[side*.32,1.28,0],[side*.33,.4,0],.24,dark);part(avatar,ball,dark,side*.33,.19,.16,.26,.16,.43);
if(v.piercing==='earrings'||v.piercing==='hoops')part(avatar,new THREE.TorusGeometry(.09,.023,8,20),gold,side*.59,3.22,.08);
}
part(avatar,ball,skin,0,3.24,.48,.13,.09,.12);part(avatar,ball,mat('#8b3e55'),0,3.04,.45,.17,.032,.026);
if(v.style!=='bald'){part(avatar,ball,hair,0,3.91,-.04,.58,.3,.49);if(v.style==='spikes'||v.style==='mohawk')for(let i=-2;i<=2;i++)part(avatar,new THREE.ConeGeometry(.17,.45,9),i%2?accent:hair,i*.19,4.16+(i%2)*.08,-.05);if(v.style==='ponytail')part(avatar,ball,hair,0,3.45,-.59,.26,.48,.24);if(v.style==='locs'||v.style==='curls')for(let i=-3;i<=3;i++)part(avatar,ball,hair,i*.15,3.76,-.08,.13,.27,.16);if(v.style==='bob')for(const side of [-1,1])part(avatar,ball,hair,side*.53,3.44,0,.16,.49,.34);if(v.style==='undercut')part(avatar,ball,accent,.1,4.02,.13,.38,.08,.2);}
if(v.outfit==='jacket'){for(const side of [-1,1])part(avatar,ball,dark,side*.39,2.06,.32,.24,.59,.09)}if(v.outfit==='armor')part(avatar,ball,gold,0,2.03,.35,.38,.3,.11);
if(v.accessory==='glasses')for(const side of [-1,1])part(avatar,new THREE.TorusGeometry(.19,.024,8,32),gold,side*.22,3.44,.49);
if(v.accessory==='crown')part(avatar,new THREE.CylinderGeometry(.42,.48,.25,7),gold,0,4.18,0);
if(v.accessory==='headphones')for(const side of [-1,1])part(avatar,ball,dark,side*.6,3.42,0,.14,.27,.25);
if(v.piercing==='nose')part(avatar,ball,gold,.13,3.24,.58,.045,.045,.04);
if(v.tattoo!=='none')part(avatar,ball,mat(v.tattoo==='heart'?'#b32157':'#171332'),.8,1.65,.15,.035,.15,.11);
}
let rotation=.15,drag=false,last=0;renderer.domElement.addEventListener('pointerdown',e=>{drag=true;last=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointerup',()=>drag=false);renderer.domElement.addEventListener('pointermove',e=>{if(drag){rotation+=(e.clientX-last)*.012;last=e.clientX}});renderer.domElement.style.touchAction='pan-y';
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(host);resize();form.addEventListener('input',build);form.addEventListener('change',build);window.addEventListener('avatar-loaded',build);build();let running=true;function animate(){if(!running)return;avatar.rotation.y=rotation;renderer.render(scene,camera);requestAnimationFrame(animate)}animate();window.addEventListener('pagehide',()=>{running=false;renderer.dispose()});
