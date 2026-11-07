// Empty roster by owner request. No default, saved-avatar, or CPU fighters are instantiated.
const canvas=document.getElementById('fight');
const ctx=canvas.getContext('2d');
// Reserved slots only: no characters, avatars, or opponents are loaded.
const roster=Array.from({length:120},(_,i)=>({slot:i+1,character:null}));
let db=null,viewer=null,disposePreview=null,previewSlot=null,combatReady=false,combatController=null,previewGeneration=0;
const grid=document.getElementById('fighter-roster');
const search=document.getElementById('roster-search'),group=document.getElementById('roster-group');
const sort=document.getElementById('roster-sort'),seriesFilter=document.getElementById('roster-series');
const unlockFilter=document.getElementById('roster-unlock-filter');
// Unlock schema for future fighters: character.unlock={type:'free'|'coins'|'achievement',cost?:number,description?:string}.
// Ownership must be verified by a server-side account ledger; client-side state never awards or spends coins.
const ownedFighterIds=new Set();
const unlockRule=item=>item.character?.unlock||{type:'free'};
const isUnlocked=item=>!!item.character&&(unlockRule(item).type==='free'||ownedFighterIds.has(String(item.character.id)));
const unlockState=item=>!item.character?'empty':isUnlocked(item)?'unlocked':'locked';
const pageSize=30;let page=0,selectedSlot=1;
// Future fighters may populate each slot with {name,series,portrait}. Empty slots stay unassigned.
function refreshSeries(){const previous=seriesFilter.value;const names=[...new Set(roster.map(item=>item.character?.series).filter(Boolean))].sort((a,b)=>a.localeCompare(b));seriesFilter.replaceChildren(new Option('All series','all'));for(const name of names)seriesFilter.add(new Option(name,name));seriesFilter.value=names.includes(previous)?previous:'all';}

const slotLabel=n=>'SLOT '+String(n).padStart(3,'0');
function selectSlot(n){
 selectedSlot=n;const item=roster.find(entry=>entry.slot===n),character=item.character,rule=unlockRule(item),state=unlockState(item);
 if(state==='unlocked'&&['disney-hercules','jack-skellington'].includes(character?.id))combatController?.selectFighter(character.id);
 const preview=document.getElementById('fighter-3d-preview');
 if(previewSlot!==n){const generation=++previewGeneration;disposePreview?.();disposePreview=null;preview.replaceChildren();previewSlot=n;preview.hidden=true;
 if(['disney-hercules','jack-skellington'].includes(character?.id)&&state==='unlocked'){
  preview.hidden=false;import(character.id==='jack-skellington'?'./jack-skellington-3d.js':'./hercules-3d.js').then(mod=>{if(selectedSlot===n&&generation===previewGeneration)disposePreview=character.id==='jack-skellington'?mod.mountJack(preview):mod.mountHercules(preview)}).catch(error=>{console.warn('3D preview unavailable',error);if(generation===previewGeneration)preview.hidden=true});
 }}
 document.getElementById('selected-fighter').textContent=character?.name||slotLabel(n);
 document.getElementById('preview-symbol').textContent=['disney-hercules','jack-skellington'].includes(character?.id)&&state==='unlocked'?'':state==='locked'?'🔒':character?.name?.slice(0,1).toUpperCase()||String(n).padStart(3,'0');
 document.getElementById('preview-description').textContent=character?(character.series||'Uncategorized')+' · '+(state==='unlocked'?'Ready to select':'Not yet unlocked'):'Empty fighter position '+n+' of '+roster.length+'. Ready for a future character.';
 document.getElementById('preview-unlock-status').textContent=state==='empty'?'EMPTY SLOT':state==='unlocked'?'✓ UNLOCKED':'🔒 LOCKED';
 const action=document.getElementById('unlock-fighter'),help=document.getElementById('unlock-help');
 action.hidden=state!=='locked';action.disabled=!(viewer&&db&&rule.type==='coins');
 if(state==='locked'&&rule.type==='coins'){action.textContent='Unlock · '+Number(rule.cost||0).toLocaleString()+' coins';help.textContent=viewer?'Unlock permanently using your CTooniverse wallet.':'Sign in to purchase this fighter.'}
 else if(state==='locked'){action.textContent='Achievement unlock';help.textContent=rule.description||'Complete the required challenge to unlock this fighter.'}
 else help.textContent=state==='empty'?'Unlock requirements will appear when fighters are added.':'This fighter is available.';
 grid.querySelectorAll('button[data-slot]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.slot)===n)));
}
function renderRoster(){
 const term=search.value.trim().toLowerCase();
 const section=group.value;
 refreshSeries();
 const filtered=roster.filter(item=>(section==='all'||Math.floor((item.slot-1)/30)===Number(section))&&(seriesFilter.value==='all'||item.character?.series===seriesFilter.value)&&(unlockFilter.value==='all'||unlockState(item)===unlockFilter.value)&&(!term||[slotLabel(item.slot),String(item.slot),item.character?.name||'',item.character?.series||''].some(value=>value.toLowerCase().includes(term))));
 const compare=(a,b)=>a.localeCompare(b,undefined,{sensitivity:'base',numeric:true});
 if(sort.value==='alphabetical')filtered.sort((a,b)=>a.character&&b.character?compare(a.character.name||'',b.character.name||''):a.character?-1:b.character?1:a.slot-b.slot);
 else if(sort.value==='series')filtered.sort((a,b)=>a.character&&b.character?compare(a.character.series||'Uncategorized',b.character.series||'Uncategorized')||compare(a.character.name||'',b.character.name||''):a.character?-1:b.character?1:a.slot-b.slot);
 const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(page,pages-1);
 grid.replaceChildren();
 for(const item of filtered.slice(page*pageSize,(page+1)*pageSize)){
  const button=document.createElement('button');button.type='button';button.className='roster-slot';button.dataset.unlock=unlockState(item);button.style.setProperty('--slot-hue',String((item.slot*37)%360));button.dataset.slot=item.slot;button.setAttribute('aria-label',item.character?item.character.name+' — '+unlockState(item):slotLabel(item.slot)+' — empty');button.setAttribute('aria-pressed',String(item.slot===selectedSlot));
  const symbol=document.createElement('span');symbol.className='slot-symbol';symbol.textContent=unlockState(item)==='locked'?'🔒':item.character?.portrait?'':item.character?item.character.name.slice(0,1).toUpperCase():'+';if(item.character?.portrait&&unlockState(item)==='unlocked'){const image=document.createElement('img');image.src=item.character.portrait;image.alt='';image.className='slot-portrait';symbol.append(image)}
  const number=document.createElement('span');number.className='slot-number';number.textContent=String(item.slot).padStart(3,'0');
  const gloss=document.createElement('span');gloss.className='slot-gloss';gloss.setAttribute('aria-hidden','true');button.append(gloss,symbol,number);button.onclick=()=>selectSlot(item.slot);button.onkeydown=e=>{if(!['ArrowRight','ArrowLeft','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const step=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:e.key==='ArrowDown'?10:-10;const next=item.slot+step;if(next<1||next>roster.length)return;const nextPage=Math.floor((next-1)/pageSize);sort.value='slots';seriesFilter.value='all';if(group.value!=='all')group.value='all';search.value='';page=nextPage;renderRoster();selectSlot(next);grid.querySelector('[data-slot="'+next+'"]').focus();};grid.append(button);
 }
 if(!filtered.length){const empty=document.createElement('p');empty.textContent='No matching slots.';grid.append(empty)}
 document.getElementById('roster-page').textContent='Page '+(page+1)+' / '+pages;
 document.getElementById('roster-prev').disabled=page===0;document.getElementById('roster-next').disabled=page>=pages-1;
}
search.addEventListener('input',()=>{page=0;renderRoster()});
group.addEventListener('change',()=>{page=0;renderRoster()});
sort.addEventListener('change',()=>{page=0;renderRoster()});
seriesFilter.addEventListener('change',()=>{page=0;renderRoster()});
unlockFilter.addEventListener('change',()=>{page=0;renderRoster()});
document.getElementById('roster-prev').onclick=()=>{page--;renderRoster()};
document.getElementById('roster-next').onclick=()=>{page++;renderRoster()};
renderRoster();selectSlot(1);
const unlockButton=document.getElementById('unlock-fighter');
unlockButton.onclick=async()=>{
 const item=roster.find(entry=>entry.slot===selectedSlot);
 if(!db||!viewer||!item?.character||unlockRule(item).type!=='coins'||isUnlocked(item))return;
 const cost=Number(unlockRule(item).cost);
 if(!confirm('Spend '+cost.toLocaleString()+' coins to permanently unlock '+item.character.name+'?'))return;
 unlockButton.disabled=true;
 try{
  const {error}=await db.rpc('purchase_fighter',{p_fighter_id:String(item.character.id)});
  if(error)throw error;
  ownedFighterIds.add(String(item.character.id));renderRoster();selectSlot(item.slot);
  document.getElementById('fight-status').textContent=item.character.name+' unlocked permanently!';
 }catch(error){document.getElementById('fight-status').textContent='Unlock failed: '+error.message;selectSlot(item.slot)}
};
async function loadFighterCatalog(){
 try{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.58.0');
  db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
  const {data:{user},error:userError}=await db.auth.getUser();if(userError)throw userError;viewer=user;
  const {data:catalog,error}=await db.from('fighter_catalog').select('id,name,series,portrait,unlock_type,coin_cost,achievement_key').eq('enabled',true).order('name').limit(5000);
  if(error)throw error;
  if(viewer){
   const {data:owned,error:ownedError}=await db.from('player_fighter_unlocks').select('fighter_id').eq('user_id',viewer.id);
   if(ownedError)throw ownedError;
   for(const row of owned||[])ownedFighterIds.add(String(row.fighter_id));
  }
  const count=Math.max(120,catalog.length);while(roster.length<count)roster.push({slot:roster.length+1,character:null});
  (catalog||[]).forEach((row,i)=>{roster[i].character={id:row.id,name:row.name,series:row.series,portrait:row.portrait,unlock:{type:row.unlock_type,cost:row.coin_cost,description:row.achievement_key?'Achievement: '+row.achievement_key:''}}});
  document.getElementById('roster-count').textContent=catalog.length+' / '+roster.length;
 if((catalog||[]).some(f=>['disney-hercules','jack-skellington'].includes(f.id)&&f.unlock_type==='free')){
  try{const {createShowdown}=await import('./showdown-combat.js');combatController=createShowdown({canvas,start:startButton,pause:pauseButton,status:document.getElementById('fight-status'),message:document.getElementById('fight-message'),health:[document.getElementById('p1-health'),document.getElementById('p2-health')],meter:document.getElementById('p1-meter'),timer:document.getElementById('timer'),rounds:document.getElementById('rounds'),touch:document.querySelectorAll('[data-key]')});combatReady=true;const chosen=roster.find(f=>f.slot===selectedSlot);if(chosen&&isUnlocked(chosen))combatController?.selectFighter(chosen.character.id)}catch(err){console.error('Combat module failed',err)}
 }
  previewSlot=null;renderRoster();selectSlot(selectedSlot);
 }catch(error){console.warn('Fighter catalog unavailable',error);document.getElementById('fight-status').textContent='Fighter catalog could not be loaded. Try refreshing.'}
}
document.getElementById('fight-message').textContent='NO FIGHTERS YET';
document.getElementById('fight-status').textContent='All characters have been removed. The arena is ready for future fighters.';
const startButton=document.getElementById('start'),pauseButton=document.getElementById('pause');
startButton.disabled=true;pauseButton.disabled=true;
startButton.title='Add fighters before starting a match';
for(const button of document.querySelectorAll('[data-key]'))button.disabled=true;
const ground=445;
function draw(){const sky=ctx.createLinearGradient(0,0,0,540);sky.addColorStop(0,'#11144e');sky.addColorStop(.75,'#593a96');sky.addColorStop(1,'#172654');ctx.fillStyle=sky;ctx.fillRect(0,0,960,540);ctx.fillStyle='#8d5aff';for(let i=0;i<12;i++){const h=100+(i*41)%150;ctx.fillRect(i*88,ground-h,70,h);ctx.fillStyle='#70dfff';for(let y=ground-h+15;y<ground-12;y+=25)ctx.fillRect(i*88+15,y,10,8);ctx.fillStyle='#8d5aff'}ctx.fillStyle='#24204d';ctx.fillRect(0,ground,960,95);ctx.strokeStyle='#ff5bd5';ctx.lineWidth=3;for(let i=0;i<11;i++){ctx.beginPath();ctx.moveTo(480,ground);ctx.lineTo(i*130-180,540);ctx.stroke()}for(let y=ground+25;y<540;y+=30){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(960,y);ctx.stroke()}}

draw();
loadFighterCatalog();
