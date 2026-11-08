// CToon Showdown Reboot — isolated roster and new 2D practice engine.
// The roster begins with 200 empty positions and automatically expands
// to the next page when a fighter is published beyond slot 200.
'use strict';
import {createBattleAudio} from './showdown-battle-audio.js?v=20261108-battle-music-v1';
const API_URL='https://hsxdyxdazsdmpucyhqly.supabase.co';
const PUBLIC_KEY='sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS';
const START_SLOTS=200, PAGE_SIZE=25;
const $=id=>document.getElementById(id);
const rosterGrid=$('roster-grid'), banner=$('catalog-banner');
const search=$('roster-search'),series=$('roster-series'),kind=$('roster-state'),order=$('roster-sort');
const rosterShortcuts=[...document.querySelectorAll('[data-roster-filter]')];
const selection={page:0,slot:1,slots:START_SLOTS,fighters:new Map()};
const account={db:null,user:null,owned:new Set(),balance:null,loading:true,busy:false};
const SPRITE_POSES=['idle','walk','run','punch','kick','guard','jump','crouch','special','hurt','ko'];
const previewAnimation={image:null,source:null,token:0,columns:3,rows:1,loaded:false,pose:'idle',poseStart:0,footAnchors:null};
const startBtn=$('start-match'),practiceBtn=$('training-match'),restartBtn=$('restart-match'),pauseBtn=$('pause-match');
const arena=$('arena'),ctx=arena.getContext('2d');
const battleAudio=createBattleAudio($('battle-music-theme'),$('battle-music-volume'),$('battle-music-status'));
const fightAnnouncement=$('fight-announcement');
function announceFight(label,phase=''){
 fightAnnouncement.textContent=label;
 fightAnnouncement.dataset.phase=phase;
}
// Until additional licensed/cartoon fighters are published, training is a Johnny Bravo mirror match.
// Johnny Bravo is the first fighter. Other full 3x11 atlases use the same pose mapping.
const demoHero={slot:1,fighter_id:'johnny-bravo',name:'Johnny Bravo',series:'Johnny Bravo',accent:'#f7d345',
 portrait:'/images/showdown/johnny-bravo-user-model.svg',
 preview_sheet:'/images/showdown/johnny-bravo-limbs-v3.svg',preview_columns:6,preview_rows:11};
const demoCPU={...demoHero};
const johnnyArt={mode:'approved',testSheet:'/images/showdown/johnny-bravo-mugen-atlas.png'};
const johnnyArtMenu=$('johnny-art-mode');
const johnnyArtControl=$('johnny-art-control'),johnnyArtNotice=$('johnny-art-notice');
const combatSpriteCache=new Map();
// Sprite atlas rows: idle, walk, run, punch, kick, guard, jump, crouch, special, hurt, KO.
// Johnny retains the owner's exact 64x64 source model: six animation frames per action.
function spriteSources(profile){
 if(!profile)return [];
 const isJohnny=profile.fighter_id==='johnny-bravo';
 const chosen=isJohnny?(johnnyArt.mode==='classic'?johnnyArt.testSheet:demoHero.preview_sheet):profile.preview_sheet;
 const url=safeImage(chosen);if(!url)return [];
 const sources=[url],u=new URL(url);
 function addStaticLocations(uri){
  if(uri.origin!==location.origin)return;
  if(uri.pathname.startsWith('/images/'))sources.push(uri.origin+'/public'+uri.pathname+uri.search);
  else if(uri.pathname.startsWith('/public/images/'))sources.push(uri.origin+uri.pathname.replace('/public/','/')+uri.search);
 }
 addStaticLocations(u);
 if(isJohnny){
  // Preserve the prior Johnny atlas as a fallback if the supplied model is unavailable.
  if(johnnyArt.mode==='classic'){
   const approved=safeImage(demoHero.preview_sheet);
   if(approved){sources.push(approved);addStaticLocations(new URL(approved));}
  }
  for(const backup of ['/images/showdown/johnny-bravo-mugen-atlas.png','/public/images/showdown/johnny-bravo-mugen-atlas.png','/images/showdown/johnny-bravo-complete-v2.svg','/public/images/showdown/johnny-bravo-complete-v2.svg']){
   const candidate=safeImage(backup);if(candidate)sources.push(candidate);
  }
 }
 return [...new Set(sources)];
}
// Support both Johnny's padded 6x11 rig and the legacy 3x11 backups.
function spriteLayout(profile,source){
 const johnny=profile?.fighter_id==='johnny-bravo';
 const polished=johnny&&/johnny-bravo-(?:polished-atlas|limbs-v3)\.svg/i.test(source);
 return {columns:polished?6:johnny?3:Math.max(1,Number(profile?.preview_columns)||3),
  rows:johnny?11:Math.max(1,Number(profile?.preview_rows)||11),polished};
}
// Measure the lowest visible sprite pixel in each frame; transparent padding
// otherwise makes Johnny's shoes hover above the arena ground.
function spriteFootAnchors(image,columns,rows){
 const fw=image.naturalWidth/columns,fh=image.naturalHeight/rows;
 if(!Number.isInteger(fw)||!Number.isInteger(fh)||!fw||!fh)return null;
 try{
  const probe=document.createElement('canvas');
  probe.width=image.naturalWidth;probe.height=image.naturalHeight;
  const pen=probe.getContext('2d',{willReadFrequently:true});
  if(!pen)return null;
  pen.drawImage(image,0,0);
  const pixels=pen.getImageData(0,0,probe.width,probe.height).data;
  const stride=probe.width;
  return Array.from({length:rows},(_,row)=>Array.from({length:columns},(_,column)=>{
   for(let py=fh-1;py>=0;py--){
    let alphaIndex=((row*fh+py)*stride+column*fw)*4+3;
    for(let px=0;px<fw;px++,alphaIndex+=4){
     if(pixels[alphaIndex]>24)return py+1;
    }
   }
   return 82; // 64px source sprite begins at y=18 inside a 112px cell.
  }));
 }catch(error){
  console.warn('Johnny ground measurement unavailable; using original anchor',error);
  return null;
 }
}
function cachedSprite(source,layout){
 let entry=combatSpriteCache.get(source);
 if(!entry){
  entry={image:new Image(),loaded:false,failed:false,columns:layout.columns,rows:layout.rows,polished:layout.polished,footAnchors:null};
  entry.image.onload=()=>{
   entry.loaded=entry.image.naturalWidth>0&&entry.image.naturalHeight>0&&
    entry.image.naturalWidth%entry.columns===0&&entry.image.naturalHeight%entry.rows===0;
   entry.failed=!entry.loaded;
   if(entry.loaded&&entry.polished)entry.footAnchors=spriteFootAnchors(entry.image,entry.columns,entry.rows);
  };
  entry.image.onerror=()=>{entry.failed=true;console.warn('Could not load sprite atlas:',source)};
  entry.image.decoding='async';combatSpriteCache.set(source,entry);entry.image.src=source;
 }
 return entry;
}
function spriteAtlas(profile){
 if(!profile||Number(profile.preview_rows)<11||Number(profile.preview_columns)<3)return null;
 for(const source of spriteSources(profile)){
  const item=cachedSprite(source,spriteLayout(profile,source));
  if(item.loaded)return item;
  if(!item.failed)return null;
 }
 return null;
}
function spritePose(f,t,columns){
 let row=0,frame=Math.floor(t*5)%columns;
 if(f.hp<=0){row=10;frame=Math.min(columns-1,Math.floor(Math.max(0,t-(f.koAt??t))*8));}
 else if(f.stun>.02){row=9;frame=Math.min(columns-1,Math.floor(Math.max(0,t-(f.hurtAt??t))*20));}
 else if(f.attack>0){
  row=f.attackType==='kick'?4:f.attackType==='special'?8:3;
  const duration=ATTACK_MOVES[f.attackType]?.duration||.3;
  frame=Math.min(columns-1,Math.floor(Math.max(0,1-f.attack/duration)*columns));
 }
 else if(f.block){row=5;frame=Math.floor(t*6)%columns;}
 else if(f.y>2){row=6;frame=Math.min(columns-1,Math.floor(Math.max(0,t-(f.jumpAt??t))*8));}
 else if(f.crouch){row=7;frame=Math.floor(t*7)%columns;}
 else if(Math.abs(f.moveSpeed||0)>160){row=2;frame=Math.floor(t*13)%columns;}
 else if(Math.abs(f.moveSpeed||0)>8){row=1;frame=Math.floor(t*9)%columns;}
 return {row,frame};
}
const validColor=color=>/^#[0-9a-f]{6}$/i.test(color||'')?color:'#8d8cff';
const pad=n=>String(n).padStart(3,'0');
const text=(parent,name,value,className)=>{
  const el=document.createElement(name);if(className)el.className=className;
  el.textContent=value;parent.appendChild(el);return el;
};
const safeImage=url=>{
  if(typeof url!=='string'||url.length>1024)return null;
  try{const parsed=new URL(url,location.href);return ['https:','http:'].includes(parsed.protocol)?parsed.href:null}
  catch{return null}
};
const isLocked=f=>!!f?.unlockable&&!account.owned.has(f.fighter_id);
const fmtCoins=n=>Number(n).toLocaleString('en-US');
function currentFighter(){return selection.fighters.get(selection.slot)||null}
function updateAccountBar(){
 const label=$('fighter-account-status'),balance=$('fighter-balance'),signin=$('fighter-signin');
 if(account.loading){label.textContent='Checking player account…';balance.hidden=true;signin.hidden=true;return;}
 if(!account.user){
  label.textContent='Guest mode · Free fighters and training are available';
  balance.hidden=true;signin.hidden=false;return;
 }
 label.textContent=account.user.email?'Signed in · Fighter unlocks saved to your account':'Signed in · Fighter unlocks saved';
 balance.hidden=account.balance===null;
 if(account.balance!==null)balance.textContent=fmtCoins(account.balance)+' Cartoon Coins';
 signin.hidden=true;
}
async function refreshAccount(){
 if(!account.db)return;
 try{
  const {data:{user},error:authError}=await account.db.auth.getUser();
  if(authError)throw authError;
  account.user=user||null;
  account.owned=new Set();account.balance=null;
  if(user){
   const [unlockResult,walletResult]=await Promise.all([
    account.db.from('showdown_reboot_unlocks').select('fighter_id'),
    account.db.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle()
   ]);
   if(unlockResult.error)throw unlockResult.error;
   if(walletResult.error)throw walletResult.error;
   account.owned=new Set((unlockResult.data||[]).map(item=>item.fighter_id));
   account.balance=walletResult.data?.balance??null;
  }
 }catch(error){
  console.warn('Fighter account refresh failed:',error);
  account.user=null;account.owned=new Set();account.balance=null;
  $('showdown-status').textContent='Account unlocks could not be loaded. Sign in again or reload to retry.';
 }finally{
  account.loading=false;
  updateAccountBar();renderRoster();selectSlot(selection.slot);
 }
}
async function initializePlayer(){
 try{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.58.0');
  account.db=createClient(API_URL,PUBLIC_KEY);
  await refreshAccount();
  account.db.auth.onAuthStateChange((event)=>{
   if(['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED'].includes(event))setTimeout(refreshAccount,0);
  });
 }catch(error){
  console.warn('Fighter login unavailable:',error);
  account.loading=false;updateAccountBar();renderRoster();selectSlot(selection.slot);
 }
}
async function purchaseSelected(){
 const fighter=currentFighter();
 if(!fighter||!isLocked(fighter)||fighter.unlock_method!=='coins'||account.busy)return;
 if(!account.user||!account.db){$('showdown-status').textContent='Sign in to purchase this fighter.';return;}
 const cost=Number(fighter.unlock_cost);
 if(!Number.isInteger(cost)||cost<=0){$('showdown-status').textContent='This fighter has no valid coin price.';return;}
 if(!confirm('Unlock '+fighter.name+' for '+fmtCoins(cost)+' Cartoon Coins?'))return;
 account.busy=true;selectSlot(selection.slot);$('showdown-status').textContent='Processing fighter unlock…';
 try{
  const {data,error}=await account.db.rpc('showdown_reboot_purchase',{p_fighter_id:fighter.fighter_id});
  if(error)throw error;
  if(!data?.unlocked)throw new Error('Purchase was not confirmed');
  account.owned.add(fighter.fighter_id);
  account.balance=data.balance;
  await refreshAccount();
  $('showdown-status').textContent=fighter.name+' unlocked permanently for this account!';
 }catch(error){
  $('showdown-status').textContent='Unlock failed: '+error.message;
 }finally{
  account.busy=false;updateAccountBar();renderRoster();selectSlot(selection.slot);
 }
}
$('unlock-fighter').addEventListener('click',purchaseSelected);
function setupPreviewAnimation(fighter){
 previewAnimation.token++;
 const token=previewAnimation.token;
 previewAnimation.image=null;previewAnimation.source=null;previewAnimation.loaded=false;previewAnimation.footAnchors=null;
 const canvas=$('preview-idle-canvas'),avatar=$('preview-avatar');
 canvas.hidden=true;avatar.hidden=false;
 const sources=spriteSources(fighter);if(!sources.length)return;
 const columns=Math.max(1,Math.min(12,Number(fighter.preview_columns)||3));
 const rows=Math.max(1,Math.min(32,Number(fighter.preview_rows)||1));
 let index=0;
 function tryNext(){
  if(token!==previewAnimation.token||index>=sources.length)return;
  const img=new Image();img.decoding='async';
  img.onload=()=>{
   if(token!==previewAnimation.token)return;
   if(!img.naturalWidth||!img.naturalHeight){tryNext();return;}
   const layout=spriteLayout(fighter,source);
   if(img.naturalWidth%layout.columns||img.naturalHeight%layout.rows){tryNext();return;}
   previewAnimation.image=img;previewAnimation.source=source;previewAnimation.loaded=true;
   previewAnimation.columns=layout.columns;previewAnimation.rows=layout.rows;
   previewAnimation.footAnchors=layout.polished?spriteFootAnchors(img,layout.columns,layout.rows):null;
   previewAnimation.poseStart=performance.now();
   avatar.hidden=true;canvas.hidden=false;
  };
  img.onerror=()=>{if(token===previewAnimation.token)tryNext()};
  const source=sources[index++];img.src=source;
 }
 tryNext();
}
function renderPreviewFrame(timestamp){
 if(!previewAnimation.loaded||!previewAnimation.image)return;
 const canvas=$('preview-idle-canvas');
 if(canvas.hidden)return;
 const p=canvas.getContext('2d'),img=previewAnimation.image;
 if(!p)return;
 const cols=previewAnimation.columns,rows=previewAnimation.rows;
 const fw=img.naturalWidth/cols,fh=img.naturalHeight/rows;
 if(!fw||!fh)return;
 const row=Math.max(0,SPRITE_POSES.indexOf(previewAnimation.pose));
 const age=Math.max(0,timestamp-previewAnimation.poseStart);
 const isLoop=['idle','walk','run','guard','crouch'].includes(previewAnimation.pose);
 const interval=previewAnimation.pose==='run'?85:previewAnimation.pose==='walk'?115:190;
 const frame=isLoop?Math.floor(age/interval)%cols:Math.min(cols-1,Math.floor((age%1400)/(1400/cols)));
 const polished=/johnny-bravo-(?:polished-atlas|limbs-v3)\.svg/i.test(previewAnimation.source||'');
 p.clearRect(0,0,canvas.width,canvas.height);
 p.save();p.imageSmoothingEnabled=!polished;p.imageSmoothingQuality='high';
 if(polished){
  // The approved sprite occupies 64px inside a padded 112px cell.
  // Anchor his feet so every frame shares the same baseline.
  const scale=Math.min((canvas.width-18)/84,(canvas.height-12)/66);
  const feet=previewAnimation.footAnchors?.[row]?.[frame]??82;
  const dx=Math.round(canvas.width/2-52*scale),dy=Math.round(canvas.height-8-feet*scale);
  p.drawImage(img,frame*fw,row*fh,fw,fh,dx,dy,fw*scale,fh*scale);
 }else{
  const scale=Math.min((canvas.width-25)/fw,(canvas.height-18)/fh);
  const dw=fw*scale,dh=fh*scale;
  p.shadowColor='#7fcfff';p.shadowBlur=15;
  p.drawImage(img,frame*fw,row*fh,fw,fh,(canvas.width-dw)/2,(canvas.height-dh)/2,dw,dh);
 }
 p.restore();
}
if(johnnyArtMenu){
 johnnyArtMenu.value=johnnyArt.mode;
 johnnyArtMenu.addEventListener('change',()=>{
  johnnyArt.mode=johnnyArtMenu.value==='classic'?'classic':'approved';
  const fighter=currentFighter();
  if(fighter?.fighter_id==='johnny-bravo')setupPreviewAnimation(fighter);
  else if(!fighter)setupPreviewAnimation(demoHero);
  if(johnnyArtNotice)johnnyArtNotice.hidden=johnnyArt.mode!=='classic'||fighter?.fighter_id!=='johnny-bravo';
  $('showdown-status').textContent=johnnyArt.mode==='classic'
    ?'Viewing the previous Johnny model. Switch back to Uploaded Pixel Model to use the newly supplied sprite.'
    :'Using your uploaded Johnny Bravo pixel model for previews and battles.';
 });
}
const previewPoseMenu=$('preview-pose');
if(previewPoseMenu){
 previewPoseMenu.replaceChildren(...SPRITE_POSES.map(pose=>new Option(pose.toUpperCase(),pose)));
 previewPoseMenu.value=previewAnimation.pose;
 previewPoseMenu.addEventListener('change',()=>{
  previewAnimation.pose=SPRITE_POSES.includes(previewPoseMenu.value)?previewPoseMenu.value:'idle';
  previewAnimation.poseStart=performance.now();
 });
}
function pageSlots(){
 const q=search.value.trim().toLowerCase().replace(/\s+/g,' ');
 const state=kind.value, group=series.value;
 const slotQuery=q.match(/^(?:slot\s*#?\s*)(\d+)$/);
 const matches=[];
 for(let n=1;n<=selection.slots;n++){
   const f=selection.fighters.get(n);
   if((state==='ready'&&!f)||(state==='empty'&&f)||
      (state==='playable'&&(!f||isLocked(f)))||
      (state==='unlockable'&&(!f||!f.unlockable))||
      (state==='owned'&&(!f||!account.owned.has(f.fighter_id))))continue;
   if(group!=='all'&&(!f||f.series!==group))continue;
   if(q&&!((f?.name||'').toLowerCase().includes(q)||(f?.series||'').toLowerCase().includes(q)||
     (f?.fighter_id||'').toLowerCase().includes(q)|| (slotQuery?Number(slotQuery[1])===n:(!Number.isNaN(Number(q))&&Number(q)===n))))continue;
   matches.push(n);
 }
 if(order?.value==='name'||order?.value==='series'){
  const byName=(a,b)=>(a.name||'').localeCompare(b.name||'');
  const bySeries=(a,b)=>(a.series||'').localeCompare(b.series||'')||byName(a,b);
  matches.sort((a,b)=>{
   const x=selection.fighters.get(a),y=selection.fighters.get(b);
   if(!x||!y)return x?-1:y?1:a-b;
   return (order.value==='series'?bySeries(x,y):byName(x,y))||a-b;
  });
 }
 return matches;
}
function updateSeries(){
 const value=series.value;
 series.replaceChildren();
 let option=document.createElement('option');option.value='all';option.textContent='All series';series.append(option);
 const distinct=[...new Set([...selection.fighters.values()].map(f=>f.series))].sort((a,b)=>a.localeCompare(b));
 for(const item of distinct){option=document.createElement('option');option.value=item;option.textContent=item;series.append(option)}
 series.value=distinct.includes(value)?value:'all';
}
function renderRoster(){
 const matches=pageSlots(),pages=Math.max(1,Math.ceil(matches.length/PAGE_SIZE));
 selection.page=Math.min(selection.page,pages-1);
 rosterGrid.replaceChildren();
 const frame=document.createDocumentFragment();
 for(const n of matches.slice(selection.page*PAGE_SIZE,(selection.page+1)*PAGE_SIZE)){
  const fighter=selection.fighters.get(n);
  const button=document.createElement('button');button.type='button';
  const locked=isLocked(fighter);
  button.className='fighter-slot'+(fighter?' occupied':'')+(locked?' locked':'')+(fighter?.unlockable&&!locked?' claimed':'');
  button.dataset.slot=String(n);
  button.style.setProperty('--fighter-accent',validColor(fighter?.accent));
  button.setAttribute('aria-pressed',String(selection.slot===n));
  button.setAttribute('aria-label',fighter?'Slot '+n+': '+fighter.name+(locked?', locked':fighter.unlockable?', unlocked':', playable'):'Slot '+n+': future fighter');
  text(button,'span',pad(n),'slot-no');
  const art=document.createElement('span');art.className='slot-art';button.append(art);
  const mark=text(art,'span',fighter?fighter.name.slice(0,1).toUpperCase():'?','slot-symbol');
  if(locked){const badge=text(button,'span','🔒','slot-lock');badge.setAttribute('aria-hidden','true');badge.title='Unlockable fighter';}
  else if(fighter?.unlockable){const badge=text(button,'span','✓','slot-claimed');badge.setAttribute('aria-hidden','true');badge.title='Unlocked for your account';}
  const img=safeImage(fighter?.portrait);
  if(img){
   const portrait=document.createElement('img');portrait.src=img;portrait.alt='';
   portrait.loading=n===selection.slot?'eager':'lazy';
   portrait.onerror=()=>portrait.replaceWith(mark);
   mark.replaceWith(portrait);
  }
  const footer=document.createElement('span');footer.className='slot-footer';button.append(footer);
  text(footer,'span',fighter?fighter.name:'COMING SOON','slot-label');
  text(footer,'span',fighter?(locked?'LOCKED':fighter.unlockable?'UNLOCKED':'READY'):'FUTURE','slot-status');
  text(button,'span','1P','slot-player-indicator').setAttribute('aria-hidden','true');
  button.addEventListener('click',()=>selectSlot(n));
  frame.append(button);
 }
 rosterGrid.append(frame);
 if(!matches.length)text(rosterGrid,'p','No roster slots match those filters.','notice');
 $('roster-page').textContent='PAGE '+(selection.page+1)+' / '+pages;
 const first=matches.length?selection.page*PAGE_SIZE+1:0;
 const last=Math.min(matches.length,(selection.page+1)*PAGE_SIZE);
 $('roster-results').textContent=matches.length?'FIGHTERS '+first+'–'+last+' OF '+matches.length:'NO MATCHING FIGHTERS';
 $('roster-page-bar').style.width=(((selection.page+1)/pages)*100)+'%';
 for(const chip of rosterShortcuts)chip.setAttribute('aria-pressed',String(chip.dataset.rosterFilter===kind.value));
 $('roster-prev').disabled=selection.page===0;
 $('roster-next').disabled=selection.page>=pages-1;
 $('roster-tally').textContent=selection.fighters.size+' / '+selection.slots+' published';
 $('roster-capacity').textContent=String(selection.slots);
 const locked=[...selection.fighters.values()].filter(f=>isLocked(f)).length;
 $('roster-locked').textContent=String(locked);
 $('roster-ready').textContent=String(selection.fighters.size-locked);
 $('roster-open').textContent=String(selection.slots-selection.fighters.size);
}
function selectSlot(slot){
 selection.slot=slot;
 const fighter=currentFighter();
 const locked=isLocked(fighter);
 const testingJohnny=fighter?.fighter_id==='johnny-bravo';
 if(johnnyArtControl)johnnyArtControl.hidden=!testingJohnny;
 if(johnnyArtNotice)johnnyArtNotice.hidden=!testingJohnny||johnnyArt.mode!=='classic';
 const avatar=$('preview-avatar');avatar.replaceChildren();
 avatar.style.setProperty('--fighter-accent',validColor(fighter?.accent));
 const uri=safeImage(fighter?.portrait);
 if(fighter&&uri){
   const img=document.createElement('img');img.src=uri;img.alt='';
   img.onerror=()=>{avatar.replaceChildren();avatar.textContent=fighter.name.charAt(0).toUpperCase()};
   avatar.append(img);
 }else avatar.textContent=fighter?fighter.name.charAt(0).toUpperCase():'?';
 avatar.classList.toggle('is-empty',!fighter);
 $('preview-lock').hidden=!locked;
 $('preview-tag').textContent=locked?'🔒 UNLOCKABLE':fighter?.unlockable?'✓ UNLOCKED':fighter?'READY TO FIGHT':'OPEN SLOT';
 $('preview-tag').classList.toggle('is-locked',locked);
 $('preview-tag').classList.toggle('is-ready',!!fighter&&!locked);
 document.querySelector('.preview-card').classList.toggle('is-locked',locked);
 $('preview-title').textContent=fighter?fighter.name:'SLOT '+pad(slot);
 $('preview-slot').textContent='FIGHTER NO. '+pad(slot);
 $('preview-status-text').textContent=locked?'LOCKED FIGHTER':fighter?.unlockable?'FIGHTER UNLOCKED':fighter?'READY FOR BATTLE':'FUTURE FIGHTER';
 $('preview-series').textContent=fighter?fighter.series:'This place is reserved for a future fighter.';
 $('preview-detail').textContent=locked?
   'Unlock this character for your account before entering the arena.':
   fighter?'Choose any of the 11 combat poses above, then test the moves in the arena.':
   'Start a Practice Mode match while new fighters are being created.';
 const note=$('preview-unlock-note');
 note.hidden=!locked;
 note.textContent=locked?(fighter.unlock_method==='coins'&&fighter.unlock_cost?
  'Unlock price: '+fmtCoins(fighter.unlock_cost)+' Cartoon Coins'+(fighter.unlock_hint?' · '+fighter.unlock_hint:''):
  fighter.unlock_hint||'This fighter is awarded by the CTooniverse owner.'):'';
 const buy=$('unlock-fighter');
 buy.hidden=!(locked&&fighter?.unlock_method==='coins');
 if(!buy.hidden){
  buy.textContent='Unlock for '+fmtCoins(fighter.unlock_cost||0)+' Coins';
  buy.disabled=account.loading||account.busy||!account.user||account.balance===null||account.balance<Number(fighter.unlock_cost);
  if(!account.user)note.textContent+=' Sign in to purchase.';
  else if(account.balance!==null&&account.balance<Number(fighter.unlock_cost))note.textContent+=' Not enough coins.';
 }
 setupPreviewAnimation(fighter);
 if(previewPoseMenu)previewPoseMenu.disabled=!fighter||!spriteSources(fighter).length;
 startBtn.disabled=!fighter||locked;
 startBtn.textContent=locked?'🔒 FIGHTER LOCKED':fighter?'Fight as '+fighter.name:'Choose a fighter first';
 // Preserve keyboard focus when switching portraits instead of recreating the wall.
 for(const tile of rosterGrid.querySelectorAll('.fighter-slot'))
  tile.setAttribute('aria-pressed',String(Number(tile.dataset.slot)===slot));
}
function setPage(delta){selection.page+=delta;renderRoster();rosterGrid.scrollIntoView({behavior:'smooth',block:'nearest'})}
$('roster-prev').addEventListener('click',()=>setPage(-1));
$('roster-next').addEventListener('click',()=>setPage(1));
for(const input of [search,series,kind,order])input.addEventListener('input',()=>{
 selection.page=0;renderRoster();
});
for(const chip of rosterShortcuts)chip.addEventListener('click',()=>{
 kind.value=chip.dataset.rosterFilter;
 selection.page=0;renderRoster();
});
rosterGrid.addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))return;
 const current=event.target.closest('.fighter-slot');
 if(!current)return;
 const tiles=[...rosterGrid.querySelectorAll('.fighter-slot')];
 const index=tiles.indexOf(current);
 const columns=window.matchMedia('(max-width: 370px)').matches?3:window.matchMedia('(max-width: 650px)').matches?4:5;
 const offset=event.key==='ArrowLeft'?-1:event.key==='ArrowRight'?1:event.key==='ArrowUp'?-columns:columns;
 const next=event.key==='Home'?0:event.key==='End'?tiles.length-1:Math.max(0,Math.min(tiles.length-1,index+offset));
 if(next!==index){event.preventDefault();tiles[next].focus();}
});
async function loadRoster(){
 banner.textContent='Loading published fighters…';
 try{
  const response=await fetch(API_URL+'/rest/v1/showdown_reboot_fighters?select=slot,fighter_id,name,series,portrait,accent,enabled,unlockable,unlock_hint,unlock_method,unlock_cost,preview_sheet,preview_columns,preview_rows&enabled=eq.true&order=slot.asc',{
   headers:{'apikey':PUBLIC_KEY,'Accept':'application/json'},cache:'no-store'
  });
  if(!response.ok)throw new Error('Catalog HTTP '+response.status);
  const fighters=await response.json();
  if(!Array.isArray(fighters))throw new Error('Unexpected catalog format');
  selection.fighters=new Map(fighters.filter(f=>Number.isSafeInteger(f.slot)&&f.slot>0).map(f=>{
    const ready=f.fighter_id==='johnny-bravo'
      ?{...f,portrait:demoHero.portrait,preview_sheet:demoHero.preview_sheet,preview_columns:6,preview_rows:11}:f;
    return [ready.slot,ready];
   }));
   // Keep fighter #001 available without mutating Supabase or replacing owner-published slots.
   if(![...selection.fighters.values()].some(f=>f.fighter_id==='johnny-bravo')&&!selection.fighters.has(1)){
    selection.fighters.set(1,{...demoHero,enabled:true,unlockable:false,unlock_method:'free'});
   }
  const maxSlot=selection.fighters.size?Math.max(...selection.fighters.keys()):0;
  selection.slots=Math.max(START_SLOTS,Math.ceil(maxSlot/PAGE_SIZE)*PAGE_SIZE);
  updateSeries();renderRoster();selectSlot(selection.slot);
  banner.textContent=selection.fighters.size?
    'Fresh roster ready! Choose a published fighter. Additional roster pages are added automatically as new slots are filled.':
    'Fresh start: all 200 slots are open. No old fighters have been imported. Try Practice Mode while you build your roster.';
 }catch(err){
  console.warn('CToon Showdown roster unavailable:',err);
  if(!selection.fighters.has(1))selection.fighters.set(1,{...demoHero,enabled:true,unlockable:false,unlock_method:'free'});
   updateSeries();
   banner.textContent='Online catalog unavailable. Johnny Bravo is playable locally; purchases and locked characters need the catalog connection.';
  renderRoster();selectSlot(selection.slot);
 }
}
const keyAliases={arrowleft:'left',a:'left',arrowright:'right',d:'right',arrowup:'up',w:'up',arrowdown:'down',s:'down',j:'punch',k:'kick',l:'guard',u:'special'};
const down=new Set();
const oneShots=new Set();
const buttons=[...document.querySelectorAll('[data-control]')];
const keyDown=event=>{
 if(event.target?.closest?.('input,textarea,select,[contenteditable="true"],.roster-grid'))return;
 const key=keyAliases[event.key.toLowerCase()];
 if(!key)return;
 if(['arrowleft','arrowright','arrowup','arrowdown'].includes(event.key.toLowerCase()))event.preventDefault();
 if(!down.has(key))oneShots.add(key);
 down.add(key);
};
const keyUp=event=>{const key=keyAliases[event.key.toLowerCase()];if(key)down.delete(key)};
window.addEventListener('keydown',keyDown);
window.addEventListener('keyup',keyUp);
window.addEventListener('blur',()=>{down.clear();oneShots.clear();for(const button of buttons)button.classList.remove('pressed')});
for(const button of buttons){
 const action=button.dataset.control;
 button.addEventListener('pointerdown',event=>{event.preventDefault();button.setPointerCapture(event.pointerId);if(!down.has(action))oneShots.add(action);down.add(action);button.classList.add('pressed')});
 const release=()=>{down.delete(action);button.classList.remove('pressed')};
 button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);
}
const GROUND=445,LEFT=68,RIGHT=892;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const game={mode:'idle',paused:false,hero:null,cpu:null,heroProfile:demoHero,cpuProfile:demoCPU,timer:60,round:1,wins:[0,0],between:0,countdown:3,fightBanner:0,roundMessage:'',hitEffects:[],last:0,animClock:0};
function body(profile,x,face){
 return {profile,x,face,y:0,vy:0,hp:100,meter:0,cooldown:0,attack:0,attackType:'',attackHit:false,block:false,crouch:false,stun:0,flash:0,moveSpeed:0,hurtAt:null,koAt:null,jumpAt:null};
}
function updateHud(){
 const p=game.hero,c=game.cpu;
 $('player-name').textContent=game.heroProfile.name;
 $('cpu-name').textContent=game.cpuProfile.name;
 $('player-health').style.width=(p?p.hp:100)+'%';
 $('cpu-health').style.width=(c?c.hp:100)+'%';
 $('fight-timer').textContent=String(Math.ceil(game.timer));
 $('round-score').textContent='ROUND '+game.round+' · '+game.wins[0]+' — '+game.wins[1];
 $('match-result').textContent='FIRST TO TWO WINS';
}
function resetRound(){
 game.hero=body(game.heroProfile,250,1);game.cpu=body(game.cpuProfile,710,-1);
 game.hitEffects.length=0;
 game.timer=60;game.mode='countdown';game.between=0;game.countdown=3;game.fightBanner=0;
 game.roundMessage='';
 down.clear();oneShots.clear();
 battleAudio.stopTheme();
 announceFight('3','countdown');
 battleAudio.cue(3);
 $('showdown-status').textContent='Round '+game.round+' · Starting in 3…';
 updateHud();
}
function beginFight(){
 game.mode='fighting';game.countdown=0;game.fightBanner=.85;
 down.clear();oneShots.clear();
 announceFight('FIGHT!','fight');
 battleAudio.cue('fight');
 battleAudio.startTheme();
 $('showdown-status').textContent='FIGHT! Use keyboard controls or the on-screen buttons.';
}
function startMatch(profile){
 if(!ctx){$('showdown-status').textContent='Your browser does not support the battle canvas.';return}
 game.heroProfile=profile;game.cpuProfile=demoCPU;
 game.round=1;game.wins=[0,0];game.paused=false;
 battleAudio.prepare();
 resetRound();restartBtn.disabled=false;pauseBtn.disabled=false;pauseBtn.textContent='Pause';
 document.querySelector('.arena-frame').scrollIntoView({behavior:'smooth',block:'center'});
}
practiceBtn.addEventListener('click',()=>startMatch(demoHero));
startBtn.addEventListener('click',()=>{const fighter=currentFighter();if(fighter&&!isLocked(fighter))startMatch(fighter)});
restartBtn.addEventListener('click',()=>startMatch(game.heroProfile));
pauseBtn.addEventListener('click',()=>{
 if(!['countdown','fighting','between'].includes(game.mode))return;
 game.paused=!game.paused;pauseBtn.textContent=game.paused?'Resume':'Pause';
 if(game.paused){
  battleAudio.pause();
  announceFight('PAUSED','paused');
 }else{
  battleAudio.resume();
  if(game.mode==='countdown')announceFight(String(Math.ceil(game.countdown)),'countdown');
  else if(game.mode==='fighting')announceFight(game.fightBanner>0?'FIGHT!':'',game.fightBanner>0?'fight':'');
  else announceFight(game.roundMessage,'result');
 }
});
// The hit becomes active on the middle attack sprite, not on button-down.
const ATTACK_MOVES=Object.freeze({
 punch:{duration:.30,damage:8,reach:103,push:11,impactStart:.34,impactEnd:.70},
 kick:{duration:.48,damage:13,reach:131,push:16,impactStart:.35,impactEnd:.73},
 special:{duration:.72,damage:23,reach:166,push:27,impactStart:.36,impactEnd:.74}
});
function attack(attacker,type){
 if(attacker.cooldown>0||attacker.stun>0||attacker.hp<=0||attacker.attack>0)return;
 const move=ATTACK_MOVES[type];
 if(!move||(type==='special'&&attacker.meter<40))return;
 if(type==='special')attacker.meter-=40;
 attacker.attack=move.duration;attacker.cooldown=move.duration+.1;
 attacker.attackType=type;attacker.attackHit=false;
 attacker.block=false;attacker.crouch=false;
}
function resolveAttack(attacker,defender){
 if(attacker.attack<=0||attacker.attackHit||attacker.stun>0||attacker.hp<=0)return;
 const move=ATTACK_MOVES[attacker.attackType];if(!move)return;
 const progress=1-attacker.attack/move.duration;
 if(progress<move.impactStart||progress>move.impactEnd)return;
 // Check for contact throughout the active frames; a whiff does not consume the hitbox.
 const forward=(defender.x-attacker.x)*attacker.face;
 if(forward<0||forward>move.reach||Math.abs(attacker.y-defender.y)>80)return;
 attacker.attackHit=true; // One confirmed hit per punch/kick/special.
 const blocked=defender.block&&defender.y===0&&defender.stun===0;
 const damage=blocked?Math.ceil(move.damage*.2):move.damage;
 defender.hp=clamp(defender.hp-damage,0,100);
 defender.stun=blocked?.08:.25;
 defender.flash=.16;defender.hurtAt=game.animClock;
 // Match each successful strike to its visible attacking hand or foot.
 const foot=attacker.attackType==='kick',special=attacker.attackType==='special';
 game.hitEffects.push({
  x:clamp(attacker.x+attacker.face*Math.min(move.reach*.65,86),LEFT,RIGHT),
  y:GROUND-attacker.y-(foot?80:special?137:142),
  life:.26,maximum:.26,size:foot?27:special?43:21,
  color:blocked?'#9de8ff':foot?'#ffe289':special?'#ffb2fa':'#d5f8ff'
 });
 defender.x=clamp(defender.x+attacker.face*(blocked?8:move.push),LEFT,RIGHT);
 attacker.meter=clamp(attacker.meter+(blocked?6:13),0,100);
 if(defender.hp<=0){defender.koAt=game.animClock;finishRound();}
}
function finishRound(){
 if(game.mode!=='fighting')return;
 game.mode='between';game.between=2.2;
 battleAudio.stopTheme();
 const winner=game.hero.hp>game.cpu.hp?0:game.cpu.hp>game.hero.hp?1:-1;
 if(winner>=0)game.wins[winner]++;
 const message=winner===0?'PLAYER WINS ROUND!':winner===1?'CPU WINS ROUND!':'DRAW ROUND';
 game.roundMessage=message;
 announceFight(message,'result');
 $('showdown-status').textContent=message;
 if(Math.max(...game.wins)>=2){
  game.mode='finished';game.between=0;
  const result=game.wins[0]>=2?'YOU WIN THE MATCH!':'CPU WINS THE MATCH';
  game.roundMessage=result;
  announceFight(result,'result');
  $('showdown-status').textContent=result+' Choose Restart Match for another round.';
  pauseBtn.disabled=true;
 }
 updateHud();
}
// Finish the winning fighter's current pose while the losing KO frames play.
function settleRoundPoses(dt){
 for(const f of [game.hero,game.cpu]){
  if(!f)continue;
  f.cooldown=Math.max(0,f.cooldown-dt);
  f.attack=Math.max(0,f.attack-dt);
  f.stun=Math.max(0,f.stun-dt);
  f.flash=Math.max(0,f.flash-dt);
  f.block=false;f.moveSpeed=0;
 }
}
function step(dt){
 game.hitEffects=game.hitEffects.filter(effect=>((effect.life-=dt)>0));
 if(game.mode==='countdown'){
  const previous=Math.ceil(game.countdown);
  game.countdown=Math.max(0,game.countdown-dt);
  const current=Math.ceil(game.countdown);
  if(current===0)beginFight();
  else if(current!==previous){
   announceFight(String(current),'countdown');
   battleAudio.cue(current);
   $('showdown-status').textContent='Round '+game.round+' · Starting in '+current+'…';
  }
  oneShots.clear();
  return;
 }
 if(game.mode==='between'){
  settleRoundPoses(dt);
  game.between-=dt;
  if(game.between<=0){oneShots.clear();game.round++;resetRound()}
  return;
 }
 if(game.mode==='finished'){settleRoundPoses(dt);oneShots.clear();return;}
 if(game.mode!=='fighting'||game.paused)return;
 if(game.fightBanner>0){
  game.fightBanner=Math.max(0,game.fightBanner-dt);
  if(game.fightBanner===0)announceFight('');
 }
 game.timer=Math.max(0,game.timer-dt);
 const p=game.hero,c=game.cpu;
 const previousPX=p.x,previousCX=c.x;
 for(const f of [p,c]){
  f.cooldown=Math.max(0,f.cooldown-dt);f.attack=Math.max(0,f.attack-dt);f.stun=Math.max(0,f.stun-dt);f.flash=Math.max(0,f.flash-dt);
  f.vy-=1200*dt;f.y=Math.max(0,f.y+f.vy*dt);if(f.y===0&&f.vy<0)f.vy=0;
 }
 p.face=p.x<c.x?1:-1;c.face=-p.face;
 const direction=(down.has('right')?1:0)-(down.has('left')?1:0);
 p.block=down.has('guard')&&p.y===0&&p.cooldown===0&&p.stun===0;
 p.crouch=down.has('down')&&p.y===0&&!p.block&&p.stun===0;
 if(p.stun===0&&p.cooldown===0&&!p.block&&!p.crouch)p.x=clamp(p.x+direction*235*dt,LEFT,RIGHT);
 if(oneShots.has('up')&&p.y===0&&p.stun===0){p.vy=510;p.jumpAt=game.animClock;}
 for(const type of ['punch','kick','special'])if(oneShots.has(type))attack(p,type);
 const dist=Math.abs(c.x-p.x);
 c.block=c.stun===0&&c.cooldown===0&&c.y===0&&p.attack>.06&&dist<155&&Math.random()<dt*4;
 if(c.stun===0&&c.cooldown===0){
  if(dist>103)c.x=clamp(c.x+Math.sign(p.x-c.x)*145*dt,LEFT,RIGHT);
  else if(dist<64)c.x=clamp(c.x-Math.sign(p.x-c.x)*72*dt,LEFT,RIGHT);
  if(dist<132&&Math.random()<dt*.88)attack(c,Math.random()>.7?'kick':'punch');
 }
 if(Math.abs(p.x-c.x)<62){const mid=(p.x+c.x)/2;p.x=clamp(mid-p.face*31,LEFT,RIGHT);c.x=clamp(mid+p.face*31,LEFT,RIGHT)}
 p.face=p.x<=c.x?1:-1;c.face=-p.face;
 p.moveSpeed=dt>0?(p.x-previousPX)/dt:0;
 c.moveSpeed=dt>0?(c.x-previousCX)/dt:0;
 resolveAttack(p,c);
 if(game.mode==='fighting')resolveAttack(c,p);
 if(game.timer===0&&game.mode==='fighting')finishRound();
 updateHud();
 oneShots.clear();
}
function drawBody(f,t){
 const x=f.x,y=GROUND-f.y,accent=validColor(f.profile.accent);
 const atlasEntry=spriteAtlas(f.profile);
 if(atlasEntry){
  const atlas=atlasEntry.image;
  const columns=atlasEntry.columns,rows=atlasEntry.rows;
  const polished=atlasEntry.polished;
  const frameWidth=atlas.naturalWidth/columns,frameHeight=atlas.naturalHeight/rows;
  const pose=spritePose(f,t,columns);
  // Keep the character's feet on the ground, even when he jumps or gets knocked down.
  ctx.save();
  ctx.globalAlpha=.32;ctx.fillStyle='#030713';
  ctx.beginPath();ctx.ellipse(x,GROUND+2,57,9,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(Math.round(x),Math.round(y));
  const isJohnny=f.profile.fighter_id==='johnny-bravo';
  // Keep the original source orientation. The game sets f.face toward the opponent.
  ctx.scale(f.face,1);
  ctx.imageSmoothingEnabled=!isJohnny&&/\.svg(?:$|[?#])/i.test(atlas.currentSrc||atlas.src);
  if(ctx.imageSmoothingEnabled)ctx.imageSmoothingQuality='high';
  // Standing Johnny no longer bobs off the floor between idle frames.
  const bounce=isJohnny?0:(f.y===0&&pose.row===0?Math.sin(t*6)*1.5:0);
  if(polished){
   // Use the visible sole on each frame, not the padded cell boundary.
   const size=390,anchorX=52,anchorY=atlasEntry.footAnchors?.[pose.row]?.[pose.frame]??82;
   ctx.drawImage(atlas,pose.frame*frameWidth,pose.row*frameHeight,frameWidth,frameHeight,
    -Math.round(anchorX/frameWidth*size),-Math.round(anchorY/frameHeight*size)+bounce,size,size);
  }else{
   // Retain the original scale for all old 3-column sprite sheets.
   const spriteHeight=248,spriteWidth=Math.min(236,Math.round(spriteHeight*frameWidth/frameHeight));
   ctx.drawImage(atlas,pose.frame*frameWidth,pose.row*frameHeight,frameWidth,frameHeight,
    -spriteWidth/2,-253+bounce,spriteWidth,spriteHeight);
  }
  const move=ATTACK_MOVES[f.attackType];
  const impactProgress=move?1-f.attack/move.duration:0;
  // Effects share the same facing transform as the fighter, so hits stay in front.
  if(f.attack>0&&move&&impactProgress>=move.impactStart&&impactProgress<=move.impactEnd){
   const effect=f.attackType==='special'?'#ffe17c':'#f4f9ff';
   ctx.save();
   ctx.strokeStyle=effect;ctx.lineWidth=f.attackType==='special'?11:5;
   ctx.globalAlpha=.73;ctx.shadowColor=effect;ctx.shadowBlur=17;
   ctx.beginPath();ctx.arc(71,-126,f.attackType==='kick'?53:38,-1.25,1.35);ctx.stroke();
   ctx.restore();
  }
  if(f.block){ctx.save();ctx.strokeStyle='#9ce9ff';ctx.lineWidth=4;ctx.globalAlpha=.67;
   ctx.beginPath();ctx.arc(51,-137,60,-1.4,1.4);ctx.stroke();ctx.restore();}
  if(f.flash){ctx.fillStyle='#fff';ctx.globalAlpha=.15;ctx.fillRect(-110,-247,220,240)}
  ctx.restore();
  return;
 }

 // Never present generic geometry as Johnny's character art when his atlas is loading.
 if(f.profile.fighter_id==='johnny-bravo'){
  ctx.save();ctx.textAlign='center';ctx.font='bold 15px system-ui';
  ctx.fillStyle='#fbe69e';ctx.fillText('Loading Johnny Bravo sprites…',x,GROUND-125);ctx.restore();
  return;
 }
 ctx.save();ctx.translate(x,y);ctx.scale(f.face,1);
 ctx.globalAlpha=.38;ctx.fillStyle='#000';
 ctx.beginPath();ctx.ellipse(0,f.y?f.y:0,52,11,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 const bounce=f.y===0&&f.attack===0?Math.sin(t*3+f.x*.01)*2:0;
 ctx.translate(0,bounce);
 if(f.flash)ctx.shadowColor='#fff',ctx.shadowBlur=23;
 ctx.lineJoin='round';ctx.lineCap='round';
 const skin='#ffdfc7';
 function line(a,b,c,d,width,color){ctx.strokeStyle='#081126';ctx.lineWidth=width+8;ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke()}
 line(-17,-72,-27,-6,19,'#2d356b');line(18,-72,30,-6,19,'#2d356b');
 ctx.fillStyle=accent;ctx.strokeStyle='#0a1230';ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(-35,-157);ctx.lineTo(35,-157);ctx.lineTo(27,-67);ctx.lineTo(-26,-67);ctx.closePath();ctx.fill();ctx.stroke();
 const attacking=f.attack>0,extension=attacking?(f.attackType==='special'?96:63):30;
 line(-26,-148,-43,-96,17,accent);
 line(27,-148,extension,-105+(attacking?-18:0),17,accent);
 ctx.beginPath();ctx.ellipse(0,-185,29,33,0,0,Math.PI*2);ctx.fillStyle=skin;ctx.fill();ctx.strokeStyle='#0a1230';ctx.lineWidth=5;ctx.stroke();
 ctx.fillStyle='#131633';ctx.fillRect(6,-189,5,5);ctx.fillRect(19,-189,5,5);
 ctx.beginPath();ctx.moveTo(-31,-198);ctx.lineTo(-24,-228);ctx.lineTo(9,-216);ctx.lineTo(34,-208);ctx.lineTo(25,-220);ctx.closePath();ctx.fillStyle=accent;ctx.fill();ctx.stroke();
 if(f.block){ctx.strokeStyle='#b8edff';ctx.lineWidth=7;ctx.beginPath();ctx.arc(35,-125,34,-1.5,1.5);ctx.stroke()}
 if(attacking){ctx.strokeStyle=f.attackType==='special'?'#ffe189':'#ffffff';ctx.lineWidth=f.attackType==='special'?13:7;ctx.globalAlpha=.75;ctx.beginPath();ctx.arc(extension-4,-125,45,-1.1,1.2);ctx.stroke()}
 ctx.restore();
}
function drawArena(now){
 if(!ctx)return;
 const w=arena.width,h=arena.height,t=game.animClock;
 const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#101b53');g.addColorStop(.62,'#34356c');g.addColorStop(1,'#0d1634');ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
 ctx.fillStyle='#d2daff';for(let i=0;i<35;i++){const x=(i*97+53)%w,y=(i*61+37)%278;ctx.globalAlpha=.4+.25*Math.sin(t+i);ctx.fillRect(x,y,2,2)}ctx.globalAlpha=1;
 ctx.fillStyle='#2b2361';ctx.beginPath();ctx.moveTo(0,300);ctx.lineTo(110,210);ctx.lineTo(180,298);ctx.lineTo(300,175);ctx.lineTo(430,300);ctx.lineTo(620,200);ctx.lineTo(750,300);ctx.lineTo(860,195);ctx.lineTo(960,305);ctx.lineTo(960,450);ctx.lineTo(0,450);ctx.fill();
 ctx.fillStyle='#151a3a';ctx.fillRect(0,GROUND,w,h-GROUND);ctx.strokeStyle='#6775c4';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(0,GROUND);ctx.lineTo(w,GROUND);ctx.stroke();
 ctx.strokeStyle='#2e3f71';ctx.lineWidth=2;for(let i=0;i<14;i++){ctx.beginPath();ctx.moveTo(i*78,GROUND);ctx.lineTo(480+(i-7)*155,h);ctx.stroke()}
 if(!game.hero){drawBody(body(demoHero,255,1),t);drawBody(body(demoCPU,700,-1),t);return}
 const sorted=[game.hero,game.cpu].sort((a,b)=>a.x-b.x);for(const f of sorted)drawBody(f,t);
 // Short-lived comic impact stars show precisely when a hand or foot connects.
 for(const e of game.hitEffects){
  const progress=1-e.life/e.maximum,fade=e.life/e.maximum;
  ctx.save();ctx.translate(e.x,e.y);ctx.strokeStyle=e.color;ctx.fillStyle=e.color;
  ctx.lineWidth=Math.max(1,4*fade);ctx.globalAlpha=fade;
  ctx.shadowColor=e.color;ctx.shadowBlur=17;
  ctx.beginPath();ctx.arc(0,0,e.size*(.35+progress),0,Math.PI*2);ctx.stroke();
  for(let ray=0;ray<8;ray++){
   const angle=ray*Math.PI/4,near=e.size*(.48+progress*.3),far=e.size*(.72+progress);
   ctx.beginPath();
   ctx.moveTo(Math.cos(angle)*near,Math.sin(angle)*near);
   ctx.lineTo(Math.cos(angle)*far,Math.sin(angle)*far);
   ctx.stroke();
  }
  ctx.restore();
 }
 ctx.textAlign='center';ctx.font='900 14px system-ui';ctx.fillStyle='#f3edff';
 ctx.fillText(game.heroProfile.name,game.hero.x,GROUND-game.hero.y-252);
 ctx.fillText(game.cpuProfile.name,game.cpu.x,GROUND-game.cpu.y-252);
}
function tick(stamp){
 const dt=game.last?clamp((stamp-game.last)/1000,0,.05):0;game.last=stamp;
 if(!game.paused){game.animClock+=dt;step(dt);}
 battleAudio.tick();
 drawArena(stamp);
 renderPreviewFrame(stamp);
 requestAnimationFrame(tick);
}
async function showOwnerLink(){
 try{
  const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.58.0');
  const db=createClient(API_URL,PUBLIC_KEY);
  const {data:{user},error}=await db.auth.getUser();
  if(error||!user)return;
  const result=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();
  if(!result.error&&result.data)$('owner-fighter-link').hidden=false;
 }catch(_){}
}
renderRoster();selectSlot(1);loadRoster();initializePlayer();showOwnerLink();
requestAnimationFrame(tick);
