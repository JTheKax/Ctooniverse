import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const board=document.getElementById('scene-board'),select=document.getElementById('scene-ctoon'),status=document.getElementById('scene-status');
let user=null,items=[],scene=[],drag=null;
const say=text=>status.textContent=text;
function draw(){
 board.replaceChildren();
 for(let i=0;i<scene.length;i++){
  const placed=scene[i],item=items.find(x=>x.id===placed.id);if(!item)continue;
  const node=document.createElement('button');node.type='button';node.title='Drag to move; click to remove '+item.name;
  node.setAttribute('aria-label',item.name+' in scene');node.style.cssText='position:absolute;width:100px;height:120px;transform:translate(-50%,-50%);border:1px solid #a58aff;border-radius:12px;background:#18123d;cursor:grab;padding:5px;color:white;touch-action:none;';
  node.style.left=placed.x+'%';node.style.top=placed.y+'%';
  const image=document.createElement('img');image.src=item.image_path||'ctooniverse-logo.png';image.alt='';image.draggable=false;image.style.cssText='width:100%;height:85px;object-fit:contain';
  const label=document.createElement('span');label.textContent=item.name;label.style.cssText='display:block;font-size:11px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis';
  node.append(image,label);
  let moved=false,start=null;
  node.addEventListener('pointerdown',e=>{if(e.button!==0)return;moved=false;start={x:e.clientX,y:e.clientY};node.setPointerCapture(e.pointerId);});
  node.addEventListener('pointermove',e=>{if(!start)return;if(Math.hypot(e.clientX-start.x,e.clientY-start.y)>5)moved=true;if(!moved)return;const rect=board.getBoundingClientRect();placed.x=Math.max(9,Math.min(91,(e.clientX-rect.left)/rect.width*100));placed.y=Math.max(15,Math.min(85,(e.clientY-rect.top)/rect.height*100));node.style.left=placed.x+'%';node.style.top=placed.y+'%';});
  node.addEventListener('pointerup',()=>{start=null;if(moved)say('Scene changed. Save to keep your arrangement.')});
  node.addEventListener('click',()=>{if(moved){moved=false;return}scene.splice(i,1);draw();say('CToon removed. Save to keep the change.')});
  board.append(node);
 }
}
async function load(){
 const auth=await db.auth.getUser();user=auth.data?.user||null;
 if(!user){say('Sign in to build and save your scene.');return}
 try{
  const owned=await db.from('player_ctoons').select('ctoon_id').eq('user_id',user.id).gt('quantity',0);
  if(owned.error)throw owned.error;
  const ids=(owned.data||[]).map(x=>x.ctoon_id);
  if(!ids.length){say('Collect a CToon before building a scene.');return}
  const catalog=await db.from('ctoon_catalog').select('id,name,image_path').in('id',ids).order('name');
  if(catalog.error)throw catalog.error;items=catalog.data||[];
  select.replaceChildren();for(const item of items)select.add(new Option(item.name,item.id));
  const saved=await db.from('player_ctoon_scenes').select('scene_data').eq('user_id',user.id).maybeSingle();
  if(saved.error)throw saved.error;
  scene=(Array.isArray(saved.data?.scene_data)?saved.data.scene_data:[]).filter(x=>items.some(i=>i.id===x.id)&&Number.isFinite(x.x)&&Number.isFinite(x.y)).slice(0,30);
  draw();say('Scene ready. '+items.length+' owned CToons available.');
 }catch(e){say('Unable to load scene: '+e.message)}
}
document.getElementById('scene-add').onclick=()=>{if(!user||!items.some(x=>x.id===select.value))return;if(scene.length>=30){say('Maximum 30 CToons per scene.');return}scene.push({id:select.value,x:50,y:50});draw();say('CToon added. Drag it to position and save.')};
document.getElementById('scene-clear').onclick=()=>{if(!confirm('Clear the scene? Save afterward to keep it empty.'))return;scene=[];draw();say('Scene cleared. Save to keep this change.')};
document.getElementById('scene-save').onclick=async()=>{if(!user)return;const button=document.getElementById('scene-save');button.disabled=true;const result=await db.from('player_ctoon_scenes').upsert({user_id:user.id,scene_data:scene,updated_at:new Date().toISOString()},{onConflict:'user_id'});say(result.error?'Save failed: '+result.error.message:'Scene saved to your account.');button.disabled=false};
db.auth.onAuthStateChange(()=>setTimeout(load,0));load();
