import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const name=document.getElementById('header-player-name'),coins=document.getElementById('header-player-coins'),profile=document.getElementById('header-player');
let seq=0;
async function updateHeader(){
 const id=++seq;
 try{
  const {data:{user},error}=await db.auth.getUser();if(id!==seq)return;
  if(error||!user){name.textContent='Guest';coins.textContent='Sign in';profile.classList.add('is-guest');return;}
  const raw=user.user_metadata?.display_name;
  name.textContent=typeof raw==='string'&&raw.trim()?raw.trim().slice(0,30):user.email?.split('@')[0]||'Player';
  profile.classList.remove('is-guest');coins.textContent='Loading coins…';
  const {data,error:walletError}=await db.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle();
  if(id!==seq)return;
  coins.textContent=walletError?'Coins unavailable':(data?.balance??0).toLocaleString()+' Coins';
 }catch(_){if(id===seq){name.textContent='Guest';coins.textContent='Unavailable';}}
}
db.auth.onAuthStateChange(()=>setTimeout(updateHeader,50));
window.addEventListener('pageshow',updateHeader);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)updateHeader();});
updateHeader();
