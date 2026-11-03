import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const display=document.getElementById('czone-display'),picker=document.getElementById('czone-owned'),status=document.getElementById('czone-status');
let userId=null,items=[],slots=[],loading=false,seq=0,editing=null,saveTimer=null,hasLoaded=false,loadPromise=null;
const note=s=>{status.textContent=s};
function card(item,slot,quantity){
 const box=document.createElement('article');box.className=slot?'czone-placed-ctoon':'ctoon-shop-card czone-card';
 const art=document.createElement('div');art.className=slot?'czone-placed-art':'ctoon-shop-art';
 const img=document.createElement('img');img.loading='lazy';img.src=item.image_path||'ctooniverse-logo.png';img.alt=item.name;img.onerror=()=>{img.onerror=null;img.src='ctooniverse-logo.png'};art.append(img);
 const detail=document.createElement('div');detail.className=slot?'czone-placed-details':'ctoon-shop-details';
 const title=document.createElement('div');title.className='ctoon-shop-name';title.textContent=item.name;
 const meta=document.createElement('p');meta.className='collection-series';meta.textContent=item.series||'CTooniverse';
 const btn=document.createElement('button');btn.type='button';btn.className='czone-action';btn.textContent=slot?'× Remove':'Display';btn.disabled=loading;
 if(slot){box.dataset.ctoonId=item.id;box.title=item.name+' — placed on your CZone background';box.setAttribute('aria-label',item.name+' displayed on background');const placement=slots.find(x=>x.ctoon_id===item.id);if(placement){box.style.left=Number(placement.position_x===50&&placement.position_y===80?12+((placement.slot-1)%7)*12:placement.position_x??50)+'%';box.style.top=Number(placement.position_x===50&&placement.position_y===80?78-Math.floor((placement.slot-1)/7)*17:placement.position_y??80)+'%';art.style.transform='rotate('+Number(placement.rotation||0)+'deg) scale('+Number(placement.scale||1)+')';art.style.transformOrigin='center bottom';}installDrag(box,item.id);box.addEventListener('click',event=>{if(box.dataset.justDragged==='1'){box.dataset.justDragged='0';return}if(event.target.closest('button'))return;openEditor(item.id);});box.tabIndex=0;box.addEventListener('keydown',event=>{if(event.key==='Enter'){openEditor(item.id)}})}
 btn.addEventListener('click',()=>change(item.id,slot));detail.append(title,meta,btn);if(slot){const edit=document.createElement('button');edit.type='button';edit.className='czone-action';edit.textContent='Edit Size / Rotate';edit.addEventListener('click',()=>openEditor(item.id));detail.append(edit)}box.append(art,detail);return box;
}

const editor=document.createElement('section');
editor.className='czone-transform-editor';editor.hidden=true;
editor.innerHTML='<h3 id="czone-edit-title">Customize CToon</h3><label>Size <input id="czone-scale" type="range" min="0.4" max="3" step="0.1" value="1"><output id="czone-scale-value">100%</output></label><label>Rotation <input id="czone-rotation" type="range" min="-180" max="180" step="5" value="0"><output id="czone-rotation-value">0°</output></label><div class="czone-editor-actions"><button type="button" id="czone-reset" class="czone-action">Reset</button><button type="button" id="czone-close" class="czone-action">Done</button></div><p id="czone-edit-status" role="status"></p>';
document.querySelector('.czone-preview')?.append(editor);
const scaleInput=editor.querySelector('#czone-scale'),rotationInput=editor.querySelector('#czone-rotation');
function closeEditor(){editing=null;editor.hidden=true;clearTimeout(saveTimer)}
function showEditor(slot){editor.hidden=false;const item=items.find(x=>x.id===slot.ctoon_id);editor.querySelector('#czone-edit-title').textContent='Customize '+(item?.name||'CToon');scaleInput.value=slot.scale??1;rotationInput.value=slot.rotation??0;updateLabels()}
function updateLabels(){editor.querySelector('#czone-scale-value').textContent=Math.round(Number(scaleInput.value)*100)+'%';editor.querySelector('#czone-rotation-value').textContent=rotationInput.value+'°'}
function openEditor(id){editing=id;const slot=slots.find(x=>x.ctoon_id===id);if(slot)showEditor(slot)}
async function saveTransform(id,scale,rotation){
 const slot=slots.find(x=>x.ctoon_id===id);if(!slot||!userId)return;
 const {error}=await db.from('czone_displays').update({scale,rotation}).eq('user_id',userId).eq('ctoon_id',id);
 if(error){editor.querySelector('#czone-edit-status').textContent='Could not save: '+error.message;return}
 editor.querySelector('#czone-edit-status').textContent='Saved';
}
function transformChanged(){
 if(!editing)return;const id=editing,slot=slots.find(x=>x.ctoon_id===id);if(!slot)return;
 slot.scale=Number(scaleInput.value);slot.rotation=Number(rotationInput.value);
 updateLabels();
 const box=[...display.querySelectorAll('.czone-placed-ctoon')].find(x=>x.getAttribute('data-ctoon-id')===id);
 const art=box?.querySelector('.czone-placed-art');if(art)art.style.transform='rotate('+slot.rotation+'deg) scale('+slot.scale+')';
 editor.querySelector('#czone-edit-status').textContent='Saving…';
 clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveTransform(id,slot.scale,slot.rotation),450);
}
scaleInput.addEventListener('input',transformChanged);rotationInput.addEventListener('input',transformChanged);
editor.querySelector('#czone-reset').addEventListener('click',()=>{scaleInput.value='1';rotationInput.value='0';transformChanged()});
editor.querySelector('#czone-close').addEventListener('click',()=>{if(editing){clearTimeout(saveTimer);const id=editing,slot=slots.find(x=>x.ctoon_id===id);if(slot)void saveTransform(id,slot.scale,slot.rotation)}closeEditor()});


const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
function installDrag(box,id){
 let drag=null;
 box.addEventListener('pointerdown',e=>{
  if(e.button!==0||e.target.closest('button,input'))return;
  const slot=slots.find(x=>x.ctoon_id===id);if(!slot)return;
  const bounds=display.getBoundingClientRect();
  drag={pointer:e.pointerId,startX:e.clientX,startY:e.clientY,x:Number.parseFloat(box.style.left),y:Number.parseFloat(box.style.top),bounds,moved:false};
  box.setPointerCapture(e.pointerId);
 });
 box.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;
  const dx=e.clientX-drag.startX,dy=e.clientY-drag.startY;
  if(!drag.moved&&Math.hypot(dx,dy)<5)return;
  drag.moved=true;
  const halfX=box.offsetWidth/2/drag.bounds.width*100,halfY=box.offsetHeight/2/drag.bounds.height*100;
  const x=clamp(drag.x+dx/drag.bounds.width*100,halfX,100-halfX);
  const y=clamp(drag.y+dy/drag.bounds.height*100,halfY,100-halfY);
  box.style.left=x+'%';box.style.top=y+'%';
 });
 async function finish(e){
  if(!drag||e.pointerId!==drag.pointer)return;
  const state=drag;drag=null;
  if(!state.moved)return;
  box.dataset.justDragged='1';setTimeout(()=>{box.dataset.justDragged='0'},100);
  const slot=slots.find(x=>x.ctoon_id===id);if(!slot)return;
  const x=Number.parseFloat(box.style.left),y=Number.parseFloat(box.style.top);
  const previousX=slot.position_x,previousY=slot.position_y;
  slot.position_x=x;slot.position_y=y;
  note('Saving CToon position…');
  const {error}=await db.from('czone_displays').update({position_x:x,position_y:y}).eq('user_id',userId).eq('ctoon_id',id);
  if(error){slot.position_x=previousX;slot.position_y=previousY;box.style.left=Number(previousX??50)+'%';box.style.top=Number(previousY??80)+'%';note('Unable to save position: '+error.message)}
  else note('CToon position saved');
 }
 box.addEventListener('pointerup',finish);
 box.addEventListener('pointercancel',e=>{if(drag&&e.pointerId===drag.pointer){drag=null;const slot=slots.find(x=>x.ctoon_id===id);box.style.left=Number(slot?.position_x??50)+'%';box.style.top=Number(slot?.position_y??80)+'%'}});
}
function render(){
 display.replaceChildren();picker.replaceChildren();
 const map=new Map(items.map(x=>[x.id,x]));
 const selected=new Set(slots.map(x=>x.ctoon_id));
 for(const slot of slots.slice().sort((a,b)=>a.slot-b.slot)){const item=map.get(slot.ctoon_id);if(item)display.append(card(item,slot.slot))}
 for(const item of items){if(!selected.has(item.id))picker.append(card(item,null))}
 if(!display.children.length){const p=document.createElement('p');p.className='czone-empty';p.textContent='No CToons displayed yet. Choose one from your collection below.';display.append(p)}
 if(!picker.children.length){const p=document.createElement('p');p.className='czone-empty';p.textContent=items.length?'All your owned CToons are on display.':'You have no CToons yet. Visit the Shop to start collecting.';picker.append(p)}
 note(slots.length+' CToon'+(slots.length===1?'':'s')+' on display');
 if(editing){const active=slots.find(x=>x.ctoon_id===editing);if(active)showEditor(active);else closeEditor()}
}
async function change(id,slot){
 if(loading||!userId)return;
 loading=true;render();note('Saving your CZone…');
 try{
  let result;
  if(slot){result=await db.from('czone_displays').delete().eq('user_id',userId).eq('slot',slot)}
  else{const taken=new Set(slots.map(x=>x.slot));let free=1;while(taken.has(free))free++;
   result=await db.from('czone_displays').insert({user_id:userId,ctoon_id:id,slot:free,position_x:12+((free-1)%7)*12,position_y:Math.max(10,78-Math.floor((free-1)/7)*17)});
  }
  if(result.error)throw result.error;
  const {data,error}=await db.from('czone_displays').select('ctoon_id,slot,scale,rotation,position_x,position_y').eq('user_id',userId);
  if(error)throw error;slots=data||[];
 }catch(e){loading=false;render();note('Could not save: '+e.message);return}
 loading=false;render()
}
async function load(force=false){
 if(loadPromise)return loadPromise;
 if(hasLoaded&&!force)return;
 const n=++seq;
 if(!hasLoaded)note('Loading your CToons…');
 loadPromise=(async()=>{
 try{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(n!==seq)return;
  if(authError||!user){userId=null;items=[];slots=[];display.replaceChildren();picker.replaceChildren();hasLoaded=true;note('Sign in to customize your CZone.');const a=document.createElement('a');a.href='login.html';a.className='button primary';a.textContent='Sign In';display.append(a);return}
  userId=user.id;
  const [{data:owned,error:ownError},{data:placed,error:placeError}]=await Promise.all([
   db.from('player_ctoons').select('ctoon_id,quantity').eq('user_id',userId).gt('quantity',0),
   db.from('czone_displays').select('ctoon_id,slot').eq('user_id',userId)
  ]);
  if(ownError||placeError)throw ownError||placeError;
  const ids=(owned||[]).map(x=>x.ctoon_id);slots=(placed||[]).filter(x=>ids.includes(x.ctoon_id));
  if(ids.length){const {data,error}=await db.from('ctoon_catalog').select('id,name,rarity,series,image_path').in('id',ids);if(error)throw error;items=data||[]}
  else items=[];
  if(n===seq){hasLoaded=true;render()}
 }catch(e){if(n===seq)note('Unable to load CZone: '+e.message)}
 })();
 try{await loadPromise}finally{loadPromise=null}
}
// Token refresh and tab visibility changes must not rebuild the scene.
// Only reload when the actual signed-in account changes.
db.auth.onAuthStateChange((event,session)=>{
 if(event==='SIGNED_IN'&&session?.user?.id!==userId){setTimeout(()=>load(true),0)}
 else if(event==='SIGNED_OUT'&&userId!==null){setTimeout(()=>{hasLoaded=false;load(true)},0)}
});
window.addEventListener('pageshow',event=>{if(!hasLoaded&&!loadPromise)load()});
load();
