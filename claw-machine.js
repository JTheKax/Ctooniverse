import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const TOYS=[
 {key:'space_bear',name:'Space Bear',emoji:'🐻'},
 {key:'star_bunny',name:'Star Bunny',emoji:'🐰'},
 {key:'neon_fox',name:'Neon Fox',emoji:'🦊'},
 {key:'arcade_axolotl',name:'Arcade Axolotl',emoji:'🦎'},
 {key:'cosmic_cat',name:'Cosmic Cat',emoji:'🐱'},
 {key:'robo_dino',name:'Robo Dino',emoji:'🦕'},
 {key:'coin_capsule',name:'200-Coin Capsule',emoji:'🪙'}
];
const SPOTS=[11,24,37,50,63,76,89],COST=100;
const $=id=>document.getElementById(id);
const stage=$('claw-glass'),carriage=$('claw-carriage'),carry=$('claw-carried');
const dropButton=$('claw-drop'),left=$('claw-left'),right=$('claw-right');
const status=$('claw-status'),shelf=$('claw-shelf'),history=$('claw-history'),chute=$('claw-chute');
let selected=4,busy=false,verified=false,signedIn=false,userId=null,balance=null,requestSeq=0,pending=null;
const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const sleep=ms=>new Promise(done=>setTimeout(done,reduced?15:ms));
const fmt=n=>new Intl.NumberFormat('en-US').format(n);
function message(text,tone='info'){status.textContent=text;status.dataset.tone=tone;}
function createToyNodes(){
 const tray=$('claw-toys'),key=$('claw-prize-key');
 TOYS.forEach((toy,index)=>{
  const b=document.createElement('button');b.type='button';b.className='claw-toy';
  b.style.setProperty('--spot',SPOTS[index]+'%');
  b.setAttribute('aria-label','Aim at '+toy.name);
  const icon=document.createElement('span');icon.className='claw-toy-body';icon.textContent=toy.emoji;
  const label=document.createElement('span');label.className='claw-toy-label';label.textContent=toy.name;
  b.append(icon,label);b.addEventListener('click',()=>aim(index));tray.append(b);
  const item=document.createElement('div'),emoji=document.createElement('span'),text=document.createElement('span');
  emoji.className='emoji';emoji.textContent=toy.emoji;text.textContent=toy.name;item.append(emoji,text);key.append(item);
 });
 aim(selected);
}
function updateControls(){
 const moving=busy||!!pending;
 left.disabled=moving||selected===0;right.disabled=moving||selected===TOYS.length-1;
 const canPlay=verified&&(!signedIn||(balance!==null&&balance>=COST)||!!pending);
 dropButton.disabled=busy||!canPlay;
 dropButton.textContent=busy?'🕹️ CLAW IN MOTION…':pending?'↻ RETRY SAME DROP':
  !verified?'CHECKING MACHINE…':!signedIn?'🎯 FREE PRACTICE DROP':
  balance===null?'WALLET UNAVAILABLE':balance<COST?'NEED 100 COINS':'🎯 DROP CLAW · 100 COINS';
 $('claw-target-name').textContent=TOYS[selected].name;
}
function aim(index){
 if(busy||pending)return;
 selected=Math.max(0,Math.min(TOYS.length-1,index));
 carriage.style.left=SPOTS[selected]+'%';
 stage.style.setProperty('--aim-spot',SPOTS[selected]+'%');
 document.querySelectorAll('.claw-toy').forEach((node,i)=>{
  node.classList.toggle('selected',i===selected);
  node.setAttribute('aria-pressed',String(i===selected));
 });
 updateControls();
}
function updateBalance(number){
 balance=number;
 $('claw-balance').textContent=number===null?'Balance unavailable':fmt(number)+' Cartoon Coins';
 const header=$('header-player-coins');
 if(header&&number!==null)header.textContent=fmt(number)+' Coins';
 document.dispatchEvent(new Event('ctoon-profile-updated'));
}
function renderShelf(rows){
 shelf.replaceChildren();
 const prizes=TOYS.slice(0,-1),byKey=new Map((rows||[]).map(row=>[row.prize_key,Number(row.quantity)||0]));
 const owned=prizes.filter(prize=>byKey.get(prize.key)>0);
 if(!owned.length){shelf.textContent='No plushies caught yet. Your first win will appear here!';return;}
 for(const toy of owned){
  const item=document.createElement('div');item.className='shelf-prize';
  const emoji=document.createElement('span');emoji.className='emoji';emoji.textContent=toy.emoji;
  const name=document.createElement('strong');name.textContent=toy.name;
  const qty=document.createElement('small');qty.textContent='Owned ×'+fmt(byKey.get(toy.key));
  item.append(emoji,name,qty);shelf.append(item);
 }
}
function renderHistory(rows){
 history.replaceChildren();
 if(!rows?.length){const li=document.createElement('li');li.textContent='No drops yet.';history.append(li);return;}
 for(const play of rows){
  const li=document.createElement('li'),toy=TOYS[play.target_slot];
  li.textContent=(play.won?'🏆 ':'❌ ')+(play.won?'Caught ':'Missed ')+(toy?.name||'a prize')+
    (play.coin_award?' · +'+fmt(play.coin_award)+' coins':'');
  history.append(li);
 }
}
async function refresh(){
 if(busy)return;
 const seq=++requestSeq;
 try{
  const auth=await db.auth.getUser();
  if(seq!==requestSeq||busy)return;
  if(auth.error)throw auth.error;
  const user=auth.data?.user;
  userId=user?.id||null;signedIn=!!user;balance=null;
  $('claw-signin-link').hidden=signedIn;
  if(!user){
   verified=true;$('claw-balance').textContent='Practice Mode';
   $('claw-signin-note').textContent='Guests can practice free. Sign in to spend Cartoon Coins and save prizes.';
   shelf.textContent='Sign in to build your plush shelf.';renderHistory([]);
   message('Practice mode: play for free. Practice wins are not saved.');
   pending=null;updateControls();return;
  }
  $('claw-signin-note').textContent='100 Cartoon Coins per paid drop. Wins and plushies are saved to your account.';
  const [wallet,prizes,plays]=await Promise.all([
   db.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle(),
   db.from('claw_machine_collection').select('prize_key,quantity').eq('user_id',user.id),
   db.from('claw_machine_plays').select('target_slot,won,coin_award,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(8)
  ]);
  if(seq!==requestSeq||busy)return;
  if(wallet.error||!wallet.data)throw wallet.error||new Error('Coin wallet not available');
  verified=true;balance=Number(wallet.data.balance);
  if(!Number.isFinite(balance))throw new Error('Invalid balance');
  updateBalance(balance);
  if(prizes.error){shelf.textContent='Prize shelf temporarily unavailable.';}else renderShelf(prizes.data);
  if(plays.error){history.replaceChildren();const li=document.createElement('li');li.textContent='History temporarily unavailable.';history.append(li);}else renderHistory(plays.data);
  if(!pending)message('Aim at a toy and press DROP CLAW. The grip succeeds 55% of the time.');
 }catch(error){
  if(seq!==requestSeq)return;
  verified=false;balance=null;
  $('claw-balance').textContent='Unavailable';
  message('Could not check your arcade wallet: '+(error?.message||'connection error'),'error');
 }finally{if(seq===requestSeq)updateControls();}
}
async function animateDrop(won,index){
 const toy=document.querySelectorAll('.claw-toy')[index];
 carriage.style.left=SPOTS[index]+'%';
 stage.style.setProperty('--aim-spot',SPOTS[index]+'%');
 stage.classList.remove('claw-victory');stage.classList.add('claw-dropping');
 carriage.classList.remove('gripping');carry.textContent='';chute.classList.remove('celebrate');
 carriage.style.setProperty('--cable',Math.max(110,stage.clientHeight-162)+'px');
 await sleep(930);
 carriage.classList.add('gripping');await sleep(280);
 if(won){toy?.classList.add('caught');carry.textContent=TOYS[index].emoji;stage.classList.add('claw-victory');}
 carriage.style.setProperty('--cable','52px');await sleep(910);
 if(won){
  carriage.style.left='8%';await sleep(630);
  carry.textContent='';chute.classList.add('celebrate');await sleep(350);
  toy?.classList.remove('caught');
 }else{await sleep(280);}
 carriage.classList.remove('gripping');carriage.style.left=SPOTS[selected]+'%';
 await sleep(460);chute.classList.remove('celebrate');carry.textContent='';
 stage.classList.remove('claw-dropping','claw-victory');
}
async function play(){
 if(busy||!verified)return;
 if(signedIn&&(!pending&&(balance===null||balance<COST)))return;
 busy=true;updateControls();
 const target=pending?.target??selected;
 try{
  let outcome;
  if(signedIn){
   if(!window.crypto?.randomUUID)throw new Error('Secure browser required to play');
   if(!pending)pending={id:window.crypto.randomUUID(),target,userId};
   if(pending.userId!==userId)throw new Error('Sign in to the same account to retry this drop');
   message('Confirming the 100-coin play with the arcade…');
   const {data,error}=await db.rpc('play_claw_machine',{p_request_id:pending.id,p_target:target});
   if(error)throw error;
   if(!data||typeof data.won!=='boolean'||Number(data.target_slot)!==target||
     !Number.isSafeInteger(Number(data.balance)))throw new Error('Prize confirmation incomplete; retry the same drop');
   outcome=data;
   pending=null;
   balance=Number(data.balance);
   $('claw-balance').textContent=fmt(balance)+' Cartoon Coins';
   const header=$('header-player-coins');if(header)header.textContent=fmt(balance)+' Coins';
   document.dispatchEvent(new Event('ctoon-profile-updated'));
  }else{
   outcome={won:Math.random()<.55,target_slot:target,coin_award:0};
   message('Practice drop! No coins are charged and prizes are not saved.');
  }
  message('The claw is lowering…');
  await animateDrop(outcome.won,target);
  if(outcome.won){
   message('🎉 You caught '+TOYS[target].name+'! '+
    (signedIn?(outcome.coin_award?'+'+fmt(outcome.coin_award)+' Cartoon Coins credited!':'Added to your plush shelf!'):'Practice win — sign in to collect prizes.'),'success');
  }else message('The claw slipped! Try another drop.','info');
 }catch(error){
  carriage.style.setProperty('--cable','52px');carry.textContent='';
  stage.classList.remove('claw-dropping','claw-victory');
  message('Drop could not be confirmed: '+(error?.message||'connection problem')+
    '. If coins may have been charged, press RETRY SAME DROP to recover the same result safely.','error');
 }finally{
  busy=false;updateControls();
  if(signedIn&&!pending){
   // Refresh collection and history without overwriting the just-displayed result.
   const last=status.textContent,tone=status.dataset.tone;
   await refresh();message(last,tone);
  }
 }
}
left.addEventListener('click',()=>aim(selected-1));
right.addEventListener('click',()=>aim(selected+1));
dropButton.addEventListener('click',play);
document.addEventListener('keydown',event=>{
 if(event.altKey||event.ctrlKey||event.metaKey||event.repeat||event.target.closest('a,button,input,select,textarea'))return;
 if(event.key==='ArrowLeft'){event.preventDefault();aim(selected-1);}
 else if(event.key==='ArrowRight'){event.preventDefault();aim(selected+1);}
 else if(event.code==='Space'){event.preventDefault();if(!dropButton.disabled)play();}
});
db.auth.onAuthStateChange(()=>setTimeout(refresh,60));
window.addEventListener('pageshow',event=>{if(event.persisted)refresh();});
createToyNodes();refresh();