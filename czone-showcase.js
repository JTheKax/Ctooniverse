import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const display=document.getElementById('czone-display'),picker=document.getElementById('czone-owned'),status=document.getElementById('czone-status');
let userId=null,items=[],slots=[],loading=false,seq=0;
const note=s=>{status.textContent=s};
function card(item,slot,quantity){
 const box=document.createElement('article');box.className=slot?'czone-placed-ctoon':'ctoon-shop-card czone-card';
 const art=document.createElement('div');art.className=slot?'czone-placed-art':'ctoon-shop-art';
 const img=document.createElement('img');img.loading='lazy';img.src=item.image_path||'ctooniverse-logo.png';img.alt=item.name;img.onerror=()=>{img.onerror=null;img.src='ctooniverse-logo.png'};art.append(img);
 const detail=document.createElement('div');detail.className=slot?'czone-placed-details':'ctoon-shop-details';
 const title=document.createElement('div');title.className='ctoon-shop-name';title.textContent=item.name;
 const meta=document.createElement('p');meta.className='collection-series';meta.textContent=item.series||'CTooniverse';
 const btn=document.createElement('button');btn.type='button';btn.className='czone-action';btn.textContent=slot?'× Remove':'Display';btn.disabled=loading;
 if(slot){box.title=item.name+' — placed on your CZone background';box.setAttribute('aria-label',item.name+' displayed on background');}
 btn.addEventListener('click',()=>change(item.id,slot));detail.append(title,meta,btn);box.append(art,detail);return box;
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
}
async function change(id,slot){
 if(loading||!userId)return;
 loading=true;render();note('Saving your CZone…');
 try{
  let result;
  if(slot){result=await db.from('czone_displays').delete().eq('user_id',userId).eq('slot',slot)}
  else{const taken=new Set(slots.map(x=>x.slot));let free=1;while(taken.has(free))free++;
   result=await db.from('czone_displays').insert({user_id:userId,ctoon_id:id,slot:free});
  }
  if(result.error)throw result.error;
  const {data,error}=await db.from('czone_displays').select('ctoon_id,slot').eq('user_id',userId);
  if(error)throw error;slots=data||[];
 }catch(e){loading=false;render();note('Could not save: '+e.message);return}
 loading=false;render()
}
async function load(){
 const n=++seq;note('Loading your CToons…');display.replaceChildren();picker.replaceChildren();
 try{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(n!==seq)return;
  if(authError||!user){userId=null;note('Sign in to customize your CZone.');const a=document.createElement('a');a.href='login.html';a.className='button primary';a.textContent='Sign In';display.append(a);return}
  userId=user.id;
  const [{data:owned,error:ownError},{data:placed,error:placeError}]=await Promise.all([
   db.from('player_ctoons').select('ctoon_id,quantity').eq('user_id',userId).gt('quantity',0),
   db.from('czone_displays').select('ctoon_id,slot').eq('user_id',userId)
  ]);
  if(ownError||placeError)throw ownError||placeError;
  const ids=(owned||[]).map(x=>x.ctoon_id);slots=(placed||[]).filter(x=>ids.includes(x.ctoon_id));
  if(ids.length){const {data,error}=await db.from('ctoon_catalog').select('id,name,rarity,series,image_path').in('id',ids);if(error)throw error;items=data||[]}
  else items=[];
  if(n===seq)render();
 }catch(e){if(n===seq)note('Unable to load CZone: '+e.message)}
}
db.auth.onAuthStateChange(()=>setTimeout(load,0));
window.addEventListener('pageshow',load);load();
