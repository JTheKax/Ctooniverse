import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const el=id=>document.getElementById(id);
const fmt=n=>Number(n).toLocaleString();
async function refreshCoins(){
 const balance=el('coin-balance');if(!balance)return;
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user){balance.textContent='Sign in to see your coins';return;}
 const {data,error}=await db.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle();
 balance.textContent=error?'Balance unavailable':fmt(data?.balance??0)+' Cartoon Coins';
 const list=el('coin-history');
 if(list){const {data:rows,error:historyError}=await db.from('coin_ledger').select('delta,reason,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(10);list.replaceChildren();if(historyError){list.textContent='History unavailable.';}else if(!rows?.length){list.textContent='No transactions yet.';}else for(const row of rows){const li=document.createElement('li');li.textContent=(row.delta>0?'+':'')+fmt(row.delta)+' · '+row.reason+' · '+new Date(row.created_at).toLocaleDateString();list.append(li);}}}
async function refreshOwnerCoins(){
 const panel=el('owner-coin-tools');if(!panel)return;panel.hidden=true;
 const {data:{user}}=await db.auth.getUser();if(!user)return;
 const {data,error}=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();
 panel.hidden=!!error||!data;
}
let selectedCoinPlayer=null;
const preview=el('coin-player-preview');
const targetInput=el('coin-target');
function resetCoinSelection(){selectedCoinPlayer=null;if(preview)preview.textContent='Look up a player before changing coins.';}
targetInput?.addEventListener('input',resetCoinSelection);
async function findCoinPlayer(){
 const email=targetInput?.value.trim()||'';
 if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)){if(preview)preview.textContent='Enter the player’s full account email.';return null;}
 if(preview)preview.textContent='Searching for player…';
 try{
  const {data,error}=await db.rpc('owner_find_coin_player',{player_email:email});
  if(error){if(preview)preview.textContent='Lookup failed: '+error.message;return null;}
  if(!data?.length){if(preview)preview.textContent='No account found for that email.';return null;}
  const player=data[0];selectedCoinPlayer={id:player.user_id,email:player.email};
  if(preview)preview.textContent='Found: '+player.display_name+' ('+player.email+') — Current balance: '+fmt(player.coin_balance)+' coins.';
  return selectedCoinPlayer;
 }catch(_){if(preview)preview.textContent='Player lookup unavailable. Please retry.';return null;}
}
el('coin-find-player')?.addEventListener('click',findCoinPlayer);
el('coin-adjust-form')?.addEventListener('submit',async e=>{
 e.preventDefault();
 const msg=el('coin-adjust-feedback'),button=el('coin-adjust-submit');
 const amount=Number(el('coin-amount').value),reason=el('coin-reason').value.trim();
 if(!Number.isSafeInteger(amount)||amount===0||Math.abs(amount)>1000000||reason.length<3||reason.length>200){msg.textContent='Enter a nonzero whole coin amount (up to 1,000,000) and a reason of 3–200 characters.';return;}
 button.disabled=true;msg.textContent='Verifying player…';
 try{
  const player=selectedCoinPlayer?.email.toLowerCase()===targetInput.value.trim().toLowerCase()?selectedCoinPlayer:await findCoinPlayer();
  if(!player){msg.textContent='Find a valid player first. No coins changed.';return;}
  const action=amount>0?'ADD '+fmt(amount):'REMOVE '+fmt(-amount);
  if(!window.confirm(action+' Cartoon Coins for '+player.email+'?')){msg.textContent='Cancelled. No coins changed.';return;}
  msg.textContent='Updating balance…';
  const {data,error}=await db.rpc('adjust_cartoon_coins',{target_user:player.id,amount,note:reason});
  if(error){msg.textContent='Update failed: '+error.message;return;}
  msg.textContent='Success. New balance: '+fmt(data)+' Cartoon Coins.';
  el('coin-amount').value='';el('coin-reason').value='';
  await findCoinPlayer();await refreshCoins();window.dispatchEvent(new Event('ctoon-profile-updated'));
 }catch(_){msg.textContent='Unable to update coins right now.';}
 finally{button.disabled=false;}
});
db.auth.onAuthStateChange(()=>setTimeout(()=>{refreshCoins();refreshOwnerCoins();},50));
refreshCoins();refreshOwnerCoins();
