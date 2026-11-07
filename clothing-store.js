import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const fallback=[['tee','Basic T-shirt','Tops',100,'👕'],['jeans','Classic Jeans','Pants',150,'👖'],['sneakers','Arcade Sneakers','Shoes',200,'👟'],['hoodie','Neon Hoodie','Tops',300,'🧥'],['jacket','Street Jacket','Tops',500,'🧥'],['outfit','Arcade Outfit','Outfits',1000,'🕺'],['legendary','Legendary Outfit','Outfits',5000,'✨']].map(([id,name,category,price_coins,emoji])=>({id,name,category,price_coins,emoji}));
import * as THREE from 'https://esm.sh/three@0.170.0';
const fitting=document.querySelector('#clothing-fitting-room');
let renderer,scene,camera,avatarGroup,garments={},modelReady=false;
const clothColors={tee:0x36cfff,hoodie:0x8b50e9,jacket:0xd047a8,jeans:0x3566a7,sneakers:0xff53a8,outfit:0xf3bb43,legendary:0xffd65c};
function initFitting(){
 if(!fitting)return;
 try{
 scene=new THREE.Scene();scene.background=new THREE.Color(0x15112d);
 camera=new THREE.PerspectiveCamera(34,1,.1,50);camera.position.set(0,1.58,5.7);camera.lookAt(0,1.45,0);
 renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;
 fitting.append(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xd8e4ff,0x37234c,2.5));
 const key=new THREE.DirectionalLight(0xffffff,3);key.position.set(3,5,5);scene.add(key);
 const rim=new THREE.DirectionalLight(0x9966ff,2);rim.position.set(-3,3,-4);scene.add(rim);
 avatarGroup=new THREE.Group();scene.add(avatarGroup);
 const mat=(color,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness:.7,metalness});
 const skin=mat(0xb98262),hair=mat(0x252033),eye=mat(0x181626),white=mat(0xf9f3ed);
 function mesh(geo,m,x,y,z,parent=avatarGroup){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);parent.add(o);return o}
 const ball=(x,y,z,sx,sy,sz,m,parent)=>{const o=mesh(new THREE.SphereGeometry(1,24,16),m,x,y,z,parent);o.scale.set(sx,sy,sz);return o};
 function limb(a,b,r1,r2,m,parent=avatarGroup){const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const o=mesh(new THREE.CylinderGeometry(r1,r2,d.length(),16),m,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,parent);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o}
 // Anatomical silhouette: tapered torso, separate joints, hands, feet and facial details.
 const neck=mesh(new THREE.CylinderGeometry(.105,.12,.19,18),skin,0,2.29,0);
 ball(0,2.61,0,.275,.34,.26,skin);
 ball(0,2.82,-.04,.29,.17,.26,hair);
 for(const x of [-1,1]){
  ball(x*.27,2.78,-.06,.14,.16,.20,hair);
  ball(x*.103,2.62,.245,.065,.045,.023,white);
  ball(x*.103,2.62,.265,.031,.037,.014,eye);
  mesh(new THREE.BoxGeometry(.12,.025,.025),hair,x*.105,2.73,.254);
  ball(x*.278,2.55,.005,.055,.09,.038,skin);
  ball(x*.355,2.05,0,.15,.15,.15,skin);
  limb([x*.355,2.06,0],[x*.42,1.65,0],.125,.10,skin);
  limb([x*.42,1.65,0],[x*.45,1.29,.065],.095,.075,skin);
  ball(x*.45,1.23,.075,.092,.13,.08,skin);
  limb([x*.15,1.16,0],[x*.16,.59,0],.16,.12,skin);
  limb([x*.16,.59,0],[x*.16,.29,.035],.12,.09,skin);
 }
 ball(0,2.52,.256,.048,.055,.04,skin);
 mesh(new THREE.BoxGeometry(.13,.018,.025),mat(0x8e4b52),0,2.42,.254);
 ball(0,1.29,0,.28,.19,.20,skin);
 const ground=mesh(new THREE.CylinderGeometry(1.1,1.1,.07,48),mat(0x342569,.2),0,.055,0);
 const ring=mesh(new THREE.TorusGeometry(.95,.025,8,48),mat(0x9e77ff,.5),0,.105,0);ring.rotation.x=Math.PI/2;
 function group(){const g=new THREE.Group();avatarGroup.add(g);return g}
 garments.tops=group();garments.pants=group();garments.shoes=group();garments.details=group();
 const topMat=mat(0x9e68fa),pantsMat=mat(0x293e78),shoeMat=mat(0xe6e9ff);
 garments.topMat=topMat;garments.pantsMat=pantsMat;garments.shoeMat=shoeMat;
 const torso=mesh(new THREE.CylinderGeometry(.33,.26,.82,24),topMat,0,1.88,0,garments.tops);
 ball(0,2.18,0,.35,.16,.21,topMat,garments.tops);
 for(const x of [-1,1]){
  limb([x*.34,2.16,0],[x*.39,1.94,0],.16,.135,topMat,garments.tops);
  limb([x*.15,1.20,0],[x*.16,.65,0],.167,.13,pantsMat,garments.pants);
  ball(x*.16,.28,.12,.18,.13,.31,shoeMat,garments.shoes);
  mesh(new THREE.BoxGeometry(.29,.035,.47),mat(0xffffff),x*.16,.17,.16,garments.shoes);
 }
 ball(0,1.42,0,.29,.18,.22,pantsMat,garments.pants);
 garments.hood=ball(0,2.27,-.18,.33,.23,.22,topMat,garments.details);
 garments.hood.visible=false;
 garments.trim=mesh(new THREE.BoxGeometry(.045,.64,.012),mat(0xf5d6ff),0,1.85,.27,garments.details);
 garments.trim.visible=false;
 garments.badge=ball(0,2.04,.286,.07,.07,.02,mat(0xffe380,.6),garments.details);
 garments.badge.visible=false;
 let lastX=0,dragging=false;
 const canvas=renderer.domElement;
 canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointerup',()=>dragging=false);
 canvas.addEventListener('pointercancel',()=>dragging=false);
 canvas.addEventListener('pointermove',e=>{if(dragging){avatarGroup.rotation.y+=(e.clientX-lastX)*.012;lastX=e.clientX}});
 function resize(){const w=fitting.clientWidth||320;const h=Math.min(440,Math.max(300,w*.95));renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()}
 const observer=new ResizeObserver(resize);observer.observe(fitting);resize();
 modelReady=true;
 let visible=true;document.addEventListener('visibilitychange',()=>visible=!document.hidden);window.addEventListener('pagehide',()=>{visible=false;renderer.dispose()},{once:true});
 function animate(){if(!renderer||!visible&&document.hidden){requestAnimationFrame(animate);return}requestAnimationFrame(animate);if(visible)renderer.render(scene,camera)}animate();
 }catch(e){fitting.textContent='3D preview unavailable on this device.';console.warn('Avatar fitting room:',e)}
}
function tryOn(item){
 if(!modelReady)return;
 const color=clothColors[item.id]||0x9e68fa;
 if(item.category==='Pants')garments.pantsMat.color.setHex(color);
 else if(item.category==='Shoes')garments.shoeMat.color.setHex(color);
 else {garments.topMat.color.setHex(color);if(item.category==='Outfits'){garments.pantsMat.color.setHex(item.id==='legendary'?0x492a88:0x272e5c);garments.shoeMat.color.setHex(item.id==='legendary'?0xffd65c:0xffffff)}}
 garments.hood.visible=item.id==='hoodie';garments.trim.visible=item.id==='jacket'||item.category==='Outfits';
 garments.badge.visible=item.id==='legendary';avatarGroup.rotation.y=0;
}
initFitting();
const grid=document.querySelector('#clothing-grid'),balanceEl=document.querySelector('#clothing-balance'),preview=document.querySelector('#clothing-preview');
let items=fallback,owned=new Set(),user=null,balance=null,filter='All',ready=false;
function render(){grid.replaceChildren();for(const item of items.filter(x=>filter==='All'||x.category===filter)){const card=document.createElement('article');card.className='clothing-card';const art=document.createElement('div');art.className='clothing-art';art.textContent=item.emoji||'👕';const h=document.createElement('h3');h.textContent=item.name;const price=document.createElement('p');price.textContent=Number(item.price_coins).toLocaleString()+' coins';const button=document.createElement('button');const has=owned.has(item.id);button.textContent=has?'Try on (Owned)':ready?'Try on':'Preview';button.disabled=false;const status=document.createElement('p');status.className='clothing-status';status.setAttribute('role','status');button.addEventListener('click',async()=>{preview.textContent='Trying on: '+item.name+' — '+item.category+'. Drag the 3D character to rotate.';tryOn(item);if(has||!ready||!user){if(!user)status.textContent='Sign in to buy this item.';return}if(!confirm('Buy '+item.name+' for '+Number(item.price_coins).toLocaleString()+' coins?'))return;button.disabled=true;try{const {data,error}=await db.rpc('purchase_avatar_clothing',{p_item_id:item.id});if(error)throw error;owned.add(item.id);balance=Number(data.balance);balanceEl.textContent='Your coins: '+balance.toLocaleString();status.textContent='Purchased! Added to wardrobe.';window.dispatchEvent(new Event('ctoon-profile-updated'));render()}catch(e){status.textContent='Purchase unavailable: '+e.message;button.disabled=false}});card.append(art,h,price,button,status);grid.append(card)}}
for(const btn of document.querySelectorAll('[data-clothing-filter]'))btn.addEventListener('click',()=>{filter=btn.dataset.clothingFilter;document.querySelectorAll('[data-clothing-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));render()});
async function load(){try{const {data:{user:u}}=await db.auth.getUser();user=u;const catalog=await db.from('avatar_clothing_catalog').select('id,name,category,price_coins,emoji').eq('is_for_sale',true).order('name');if(catalog.error)throw catalog.error;items=catalog.data||[];ready=true;if(user){const [wallet,wardrobe]=await Promise.all([db.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle(),db.from('player_avatar_clothing').select('item_id').eq('user_id',user.id)]);if(!wallet.error)balance=Number(wallet.data?.balance||0);if(!wardrobe.error)owned=new Set((wardrobe.data||[]).map(x=>x.item_id))}balanceEl.textContent=user?'Your coins: '+(balance===null?'unavailable':balance.toLocaleString()):'Sign in to purchase clothing.'}catch(e){ready=false;balanceEl.textContent='Clothing previews available. Purchases will open after store database setup.'}render()}
db.auth.onAuthStateChange(()=>setTimeout(load,0));load();