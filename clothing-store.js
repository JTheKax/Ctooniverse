import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const fallback=[['tee','Basic T-shirt','Tops',100,'👕'],['jeans','Classic Jeans','Pants',150,'👖'],['sneakers','Arcade Sneakers','Shoes',200,'👟'],['hoodie','Neon Hoodie','Tops',300,'🧥'],['jacket','Street Jacket','Tops',500,'🧥'],['outfit','Arcade Outfit','Outfits',1000,'🕺'],['legendary','Legendary Outfit','Outfits',5000,'✨']].map(([id,name,category,price_coins,emoji])=>({id,name,category,price_coins,emoji}));
import * as THREE from 'https://esm.sh/three@0.170.0';
const fitting=document.querySelector('#clothing-fitting-room');
let renderer,scene,camera,avatarGroup,shirt,pants,shoes;
function initFitting(){
 if(!fitting)return;
 try{
 scene=new THREE.Scene();scene.background=new THREE.Color('#17143b');
 camera=new THREE.PerspectiveCamera(35,1,0.1,100);camera.position.set(0,1.55,5.6);camera.lookAt(0,1.1,0);
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,2));fitting.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xc7c9ff,0x302050,2.2));const key=new THREE.DirectionalLight(0xffffff,2.5);key.position.set(3,6,5);scene.add(key);
 avatarGroup=new THREE.Group();scene.add(avatarGroup);
 const skin=new THREE.MeshStandardMaterial({color:0xc68d6d,roughness:.8});
 const material=(color)=>new THREE.MeshStandardMaterial({color,roughness:.65});
 function part(geometry,mat,x,y,z,parent=avatarGroup){const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(x,y,z);parent.add(mesh);return mesh}
 const sphere=(radius,mat,x,y,z)=>part(new THREE.SphereGeometry(radius,20,16),mat,x,y,z);
 sphere(.31,skin,0,2.55,0);part(new THREE.CylinderGeometry(.13,.15,.19,16),skin,0,2.22,0);
 shirt=part(new THREE.CylinderGeometry(.34,.27,.85,20),material(0x9e68fa),0,1.76,0);
 for(const x of [-.43,.43]){const arm=part(new THREE.CylinderGeometry(.12,.11,.78,14),skin,x,1.68,0);arm.rotation.z=x>0?.18:-.18}
 pants=new THREE.Group();avatarGroup.add(pants);
 for(const x of [-.16,.16])part(new THREE.CylinderGeometry(.15,.13,.85,16),material(0x333b8a),x,.89,0,pants);
 shoes=new THREE.Group();avatarGroup.add(shoes);
 for(const x of [-.16,.16])part(new THREE.BoxGeometry(.3,.18,.49),material(0xe5e8ff),x,.38,.12,shoes);
 const eyes=material(0x21182e);for(const x of [-.11,.11])sphere(.035,eyes,x,2.59,.286);
 let dragging=false,lastX=0;renderer.domElement.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointerup',()=>dragging=false);renderer.domElement.addEventListener('pointermove',e=>{if(dragging){avatarGroup.rotation.y+=(e.clientX-lastX)*.012;lastX=e.clientX}});
 function resize(){const w=fitting.clientWidth;renderer.setSize(w,Math.min(400,Math.max(270,w*.85)),false);camera.aspect=w/renderer.domElement.clientHeight;camera.updateProjectionMatrix()}new ResizeObserver(resize).observe(fitting);resize();
 let running=true;function animate(){if(!running)return;requestAnimationFrame(animate);renderer.render(scene,camera)}animate();
 }catch(e){fitting.textContent='3D preview unavailable on this device.'}
}
function tryOn(item){if(!shirt)return;const colors={tee:0x41d9ff,hoodie:0x8c46eb,jacket:0xd046a6,outfit:0xf3bb43,legendary:0xf5d84b,jeans:0x2863bc,sneakers:0xff52d0};const color=colors[item.id]||0x9e68fa;const targets=item.category==='Pants'?[...pants.children]:item.category==='Shoes'?[...shoes.children]:[shirt];for(const mesh of targets)mesh.material.color.setHex(color);avatarGroup.rotation.y=0}
initFitting();
const grid=document.querySelector('#clothing-grid'),balanceEl=document.querySelector('#clothing-balance'),preview=document.querySelector('#clothing-preview');
let items=fallback,owned=new Set(),user=null,balance=null,filter='All',ready=false;
function render(){grid.replaceChildren();for(const item of items.filter(x=>filter==='All'||x.category===filter)){const card=document.createElement('article');card.className='clothing-card';const art=document.createElement('div');art.className='clothing-art';art.textContent=item.emoji||'👕';const h=document.createElement('h3');h.textContent=item.name;const price=document.createElement('p');price.textContent=Number(item.price_coins).toLocaleString()+' coins';const button=document.createElement('button');const has=owned.has(item.id);button.textContent=has?'Try on (Owned)':ready?'Try on / Buy':'Preview';button.disabled=false;const status=document.createElement('p');status.className='clothing-status';status.setAttribute('role','status');button.addEventListener('click',async()=>{preview.textContent='Trying on: '+item.name+' — '+item.category+'. Drag the 3D character to rotate.';tryOn(item);if(has||!ready||!user)return;if(!confirm('Buy '+item.name+' for '+Number(item.price_coins).toLocaleString()+' coins?'))return;button.disabled=true;try{const {data,error}=await db.rpc('purchase_avatar_clothing',{p_item_id:item.id});if(error)throw error;owned.add(item.id);balance=Number(data.balance);balanceEl.textContent='Your coins: '+balance.toLocaleString();status.textContent='Purchased! Added to wardrobe.';window.dispatchEvent(new Event('ctoon-profile-updated'));render()}catch(e){status.textContent='Purchase unavailable: '+e.message;button.disabled=false}});card.append(art,h,price,button,status);grid.append(card)}}
for(const btn of document.querySelectorAll('[data-clothing-filter]'))btn.addEventListener('click',()=>{filter=btn.dataset.clothingFilter;document.querySelectorAll('[data-clothing-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));render()});
async function load(){try{const {data:{user:u}}=await db.auth.getUser();user=u;const catalog=await db.from('avatar_clothing_catalog').select('id,name,category,price_coins,emoji').eq('is_for_sale',true).order('name');if(catalog.error)throw catalog.error;items=catalog.data||[];ready=true;if(user){const [wallet,wardrobe]=await Promise.all([db.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle(),db.from('player_avatar_clothing').select('item_id').eq('user_id',user.id)]);if(!wallet.error)balance=Number(wallet.data?.balance||0);if(!wardrobe.error)owned=new Set((wardrobe.data||[]).map(x=>x.item_id))}balanceEl.textContent=user?'Your coins: '+(balance===null?'unavailable':balance.toLocaleString()):'Sign in to purchase clothing.'}catch(e){ready=false;balanceEl.textContent='Clothing previews available. Purchases will open after store database setup.'}render()}
db.auth.onAuthStateChange(()=>setTimeout(load,0));load();