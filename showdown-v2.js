// CToon Showdown V2 — roster, account integration and animated selection screen.
import {createShowdownV2} from './showdown-v2-engine.js?v=2';
import {ACTIONS,PLAYABLE_IDS,hasAnimation,drawFighter,preloadSprites,spriteStatus} from './showdown-v2-sprites.js?v=2';
const SUPABASE_URL='https://hsxdyxdazsdmpucyhqly.supabase.co';
const SUPABASE_KEY='sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS';
const $=id=>document.getElementById(id);
const rosterRoot=$('roster-grid');
const search=$('roster-search'),series=$('roster-series'),sort=$('roster-sort'),stateFilter=$('roster-state');
const preview=$('fighter-preview-canvas'),previewContext=preview.getContext('2d');
const status=$('showdown-status'),banner=$('catalog-banner');
const slots=Array.from({length:120},(_,i)=>({number:i+1,fighter:null}));
const owned=new Set();
let client=null,user=null,selectedSlot=1,page=0,previewPose='idle',previewBase=0;
let catalogLoading=false,catalogReady=false,unlockLedgerVerified=false;
const game=createShowdownV2({
  canvas:$('arena'),
  ui:{start:$('start-match'),pause:$('pause-match'),status,announcement:$('fight-announcement'),
    p1Name:$('player-name'),p2Name:$('cpu-name'),p1Health:$('player-health'),p2Health:$('cpu-health'),
    p1Meter:$('player-meter'),p2Meter:$('cpu-meter'),time:$('fight-timer'),score:$('round-score')},
  controls:document.querySelectorAll('[data-key]')
});
$('start-match').addEventListener('click',()=>game.startMatch());
$('pause-match').addEventListener('click',()=>game.togglePause());
$('retry-catalog').addEventListener('click',()=>loadCatalog());
const current=()=>slots.find(s=>s.number===selectedSlot);
const canPlay=f=>!!f&&hasAnimation(f.id)&&isUnlocked(f);
const isUnlocked=f=>!!f&&(f.unlock_type==='free'||unlockLedgerVerified&&owned.has(f.id));
const stateOf=f=>!f?'empty':!isUnlocked(f)?'locked':hasAnimation(f.id)?'ready':'artwork';
const slotLabel=n=>'SLOT '+String(n).padStart(3,'0');
const nameCompare=(a,b)=>String(a||'').localeCompare(String(b||''),undefined,{numeric:true,sensitivity:'base'});

function renderFilters(){
 const old=series.value;
 const unique=[...new Set(slots.map(s=>s.fighter?.series).filter(Boolean))].sort(nameCompare);
 series.replaceChildren(new Option('All series','all'),...unique.map(s=>new Option(s,s)));
 series.value=unique.includes(old)?old:'all';
}
function filteredSlots(){
 const query=search.value.trim().toLowerCase();
 const list=slots.filter(s=>{
   const f=s.fighter;
   const state=stateOf(f);
   return (series.value==='all'||f?.series===series.value)
     &&(stateFilter.value==='all'||stateFilter.value===state)
     &&(!query||[slotLabel(s.number),String(s.number),f?.name||'',f?.series||''].some(v=>v.toLowerCase().includes(query)));
 });
 if(sort.value==='alphabetical'||sort.value==='series'){
   list.sort((a,b)=>{
     if(!a.fighter)return b.fighter?1:a.number-b.number;
     if(!b.fighter)return -1;
     return (sort.value==='series'?nameCompare(a.fighter.series,b.fighter.series):0)
       ||nameCompare(a.fighter.name,b.fighter.name)||a.number-b.number;
   });
 }
 return list;
}
function paintRosterImages(){
 for(const canvas of rosterRoot.querySelectorAll('canvas[data-fighter]')){
   const ctx=canvas.getContext('2d');if(!ctx)continue;
   ctx.clearRect(0,0,100,116);
   drawFighter(ctx,canvas.dataset.fighter,'idle',1,{x:50,ground:113,height:104});
 }
}
function renderRoster(){
 renderFilters();
 const all=filteredSlots(),pages=Math.max(1,Math.ceil(all.length/30));
 page=Math.min(Math.max(0,page),pages-1);
 rosterRoot.replaceChildren();
 for(const slot of all.slice(page*30,(page+1)*30)){
   const f=slot.fighter,state=stateOf(f);
   const button=document.createElement('button');button.type='button';
   button.className='roster-slot';button.dataset.state=state;
   button.dataset.slot=String(slot.number);
   button.setAttribute('aria-pressed',String(slot.number===selectedSlot));
   button.setAttribute('aria-label',f?f.name+' — '+state:slotLabel(slot.number)+' — empty');
   const picture=document.createElement('span');picture.className='slot-art';
   if(f&&hasAnimation(f.id)){
     const canvas=document.createElement('canvas');canvas.width=100;canvas.height=116;
     canvas.dataset.fighter=f.id;picture.append(canvas);
   }else if(f?.portrait){
     const img=document.createElement('img');img.src=f.portrait;img.alt='';
     img.onerror=()=>{img.remove();picture.textContent=f.name.charAt(0)};
     picture.append(img);
   }else picture.textContent=f?f.name.charAt(0):'+';
   const caption=document.createElement('span');caption.className='slot-caption';
   caption.textContent=f?f.name:slotLabel(slot.number);
   const indicator=document.createElement('span');indicator.className='slot-indicator';
   indicator.textContent=state==='locked'?'LOCKED':state==='ready'?'READY':state==='artwork'?'ART PENDING':'';
   button.append(picture,caption,indicator);
   button.addEventListener('click',()=>selectSlot(slot.number));
   rosterRoot.append(button);
 }
 if(all.length===0){const p=document.createElement('p');p.className='roster-empty';p.textContent='No fighters match these filters.';rosterRoot.append(p);}
 $('roster-page').textContent='PAGE '+(page+1)+' / '+pages;
 $('roster-prev').disabled=page===0;$('roster-next').disabled=page===pages-1;
 paintRosterImages();
}
function selectSlot(n){
 if(game.mode==='fight'||game.mode==='between'){
   status.textContent='Finish the round before changing fighters.';return;
 }
 const slot=slots.find(s=>s.number===n);if(!slot)return;
 selectedSlot=n;previewBase=0;
 const f=slot.fighter,state=stateOf(f);
 $('preview-name').textContent=f?.name||slotLabel(slot.number);
 $('preview-series').textContent=f?.series||'AVAILABLE FOR A FUTURE FIGHTER';
 $('preview-state').textContent=state==='ready'?'READY TO PLAY':state==='artwork'?'AWAITING ANIMATIONS':state==='locked'?'LOCKED':'EMPTY SLOT';
 $('preview-state').dataset.state=state;
 $('preview-unlock').hidden=state!=='locked'||f?.unlock_type!=='coins';
 $('preview-unlock').disabled=!client||!user||!unlockLedgerVerified;
 $('preview-unlock').textContent='UNLOCK FOR '+Number(f?.coin_cost||0).toLocaleString()+' COINS';
 $('preview-help').textContent=!f?'Select a published fighter to begin.':
   state==='ready'?'All 11 animation actions available. Press Start Match to fight.':
   state==='artwork'?'Character is listed, but a sprite atlas is not connected yet.':
   f.unlock_type==='achievement'?'Achievement unlock: '+(f.achievement_key||'not configured'):
   f.unlock_type==='coins'?'Sign in and unlock this fighter with your coin wallet.':'Locked.';
 $('preview-pose').disabled=!f||!hasAnimation(f.id);
 $('preview-pose').value=previewPose;
 $('preview-artwork').textContent=f&&hasAnimation(f.id)?'LOADING SPRITE...':'NO ANIMATION ATLAS';
 if(f&&canPlay(f))game.setSelected(f.id);
 rosterRoot.querySelectorAll('[data-slot]').forEach(button=>
   button.setAttribute('aria-pressed',String(Number(button.dataset.slot)===selectedSlot)));
}
function updatePreview(t){
 const f=current()?.fighter;
 const ctx=previewContext;
 ctx.clearRect(0,0,240,286);
 const g=ctx.createLinearGradient(0,0,0,286);g.addColorStop(0,'#35225d');g.addColorStop(1,'#090e2a');
 ctx.fillStyle=g;ctx.fillRect(0,0,240,286);
 ctx.strokeStyle='#825ab088';
 for(let x=20;x<240;x+=30){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,286);ctx.stroke();}
 ctx.strokeStyle='#d268d8';ctx.beginPath();ctx.moveTo(12,260);ctx.lineTo(228,260);ctx.stroke();
 if(f&&hasAnimation(f.id)){
   if(!previewBase)previewBase=t;
   const fps=previewPose==='idle'?4:previewPose==='run'?12:previewPose==='walk'?9:7;
   const index=Math.floor((t-previewBase)/1000*fps);
   const frame=['block','jump','crouch','hurt','ko'].includes(previewPose)?Math.min(2,index):index%3;
   drawFighter(ctx,f.id,previewPose,frame,{x:120,ground:256,height:f.id==='jack-skellington'?239:216});
   const statusData=spriteStatus(f.id);
   $('preview-artwork').textContent=statusData.ready?
     (statusData.source?.includes('illustrated')?'ILLUSTRATED ANIMATIONS':'LEGACY ATLAS FALLBACK'):
     statusData.failed?'PROCEDURAL FALLBACK':'LOADING SPRITE...';
 }else{
   ctx.fillStyle='#c6b6e5';ctx.font='bold 78px system-ui';ctx.textAlign='center';
   ctx.fillText(f?'?':'+',120,164);
 }
 requestAnimationFrame(updatePreview);
}
$('preview-pose').replaceChildren(...ACTIONS.map(a=>new Option(a.toUpperCase(),a)));
$('preview-pose').onchange=event=>{previewPose=event.target.value;previewBase=0;};
$('roster-prev').onclick=()=>{page--;renderRoster();};
$('roster-next').onclick=()=>{page++;renderRoster();};
for(const input of [search,series,sort,stateFilter]){
 input.addEventListener(input===search?'input':'change',()=>{page=0;renderRoster();});
}
$('preview-unlock').onclick=async()=>{
 const f=current()?.fighter;if(!client||!user||!unlockLedgerVerified||!f||f.unlock_type!=='coins'||isUnlocked(f))return;
 const cost=Number(f.coin_cost);
 if(!Number.isSafeInteger(cost)||cost<1){status.textContent='Invalid unlock cost. Ask the owner to fix the catalog.';return;}
 if(!confirm('Spend '+cost.toLocaleString()+' coins to unlock '+f.name+' permanently?'))return;
 $('preview-unlock').disabled=true;
 try{
   const {error}=await client.rpc('purchase_fighter',{p_fighter_id:f.id});
   if(error)throw error;
   const {data,error:ledgerError}=await client.from('player_fighter_unlocks').select('fighter_id').eq('user_id',user.id);
   if(ledgerError)throw ledgerError;
   owned.clear();for(const row of data||[])owned.add(row.fighter_id);
   status.textContent=owned.has(f.id)?f.name+' unlocked!':'Purchase submitted. Unlock confirmation pending.';
   renderRoster();selectSlot(selectedSlot);
 }catch(err){status.textContent='Could not verify the unlock: '+err.message;$('preview-unlock').disabled=false;}
};
async function loadCatalog(){
 if(catalogLoading)return;
 catalogLoading=true;banner.textContent='Loading published fighters...';
 $('retry-catalog').hidden=true;
 try{
   if(!client){
     const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.58.0');
     client=createClient(SUPABASE_URL,SUPABASE_KEY);
   }
   const {data:{session},error:sessionError}=await client.auth.getSession();
   if(sessionError)throw sessionError;user=session?.user||null;
   const {data,error}=await client.from('fighter_catalog')
     .select('id,name,series,portrait,unlock_type,coin_cost,achievement_key')
     .eq('enabled',true).order('name').limit(5000);
   if(error)throw error;
   const roster=Array.isArray(data)?data:[];
   const selectedID=current()?.fighter?.id;
   for(const slot of slots)slot.fighter=null;
   while(slots.length<roster.length)slots.push({number:slots.length+1,fighter:null});
   roster.forEach((f,i)=>{slots[i].fighter=f;});
   owned.clear();unlockLedgerVerified=!user;
   if(user){
     const {data:rows,error:unlockError}=await client.from('player_fighter_unlocks')
       .select('fighter_id').eq('user_id',user.id);
     if(unlockError){
       console.warn('Cannot verify fighter unlocks',unlockError);
       banner.textContent='Fighters loaded; paid unlock verification unavailable.';
       unlockLedgerVerified=false;
     }else{
       unlockLedgerVerified=true;for(const row of rows||[])owned.add(row.fighter_id);
     }
   }
   catalogReady=true;
   const published=roster.filter(f=>hasAnimation(f.id));
   $('roster-count').textContent=roster.length+' / '+slots.length;
   if(unlockLedgerVerified)banner.textContent=roster.length+' FIGHTERS PUBLISHED · '+published.length+' ANIMATED';
   const former=selectedID&&slots.find(s=>s.fighter?.id===selectedID);
   const firstPlayable=slots.find(s=>canPlay(s.fighter));
   selectedSlot=former?.number||firstPlayable?.number||1;
   renderRoster();selectSlot(selectedSlot);
   if(firstPlayable)status.textContent='Choose Hercules or Jack and press Start Match.';
   else if(roster.length)status.textContent='No unlocked fighters have connected animation atlases yet.';
   else status.textContent='No fighters have been published. Add fighters from the Owner menu.';
 }catch(error){
   console.error('Showdown catalog load failed',error);
   banner.textContent='The fighter catalog could not be loaded.';
   status.textContent='Unable to load fighters. Select Retry to try again.';
   $('retry-catalog').hidden=false;
 }finally{catalogLoading=false;}
}
requestAnimationFrame(updatePreview);
renderRoster();selectSlot(1);loadCatalog();
window.addEventListener('pagehide',()=>game.destroy(),{once:true});
