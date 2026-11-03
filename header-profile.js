import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const name=document.getElementById('header-player-name'),coins=document.getElementById('header-player-coins'),profile=document.getElementById('header-player');
let seq=0;let previousBalance=null;
profile.classList.add('profile-loading');
let verifiedOwnerUserId=null;
const ownerMark=document.createElement('span');ownerMark.className='profile-owner-mark';ownerMark.textContent='♛';ownerMark.title='Verified Ctooniverse Owner';ownerMark.setAttribute('aria-label','Verified Ctooniverse Owner');ownerMark.hidden=true;name.insertAdjacentElement('afterend',ownerMark);
function hideOwner(){ownerMark.hidden=true;profile.classList.remove('is-owner');verifiedOwnerUserId=null;}
function revealProfile(){profile.classList.remove('profile-loading');profile.classList.add('profile-ready');}
async function updateHeader(){
 const id=++seq;
 try{
  const {data:{user},error}=await db.auth.getUser();if(id!==seq)return;
  if(error||!user){activeUserId=null;name.textContent='Guest';coins.textContent='Sign in';profile.classList.add('is-guest');hideOwner();previousBalance=null;revealProfile();return;}
  activeUserId=user.id;
  const raw=user.user_metadata?.display_name;
  name.textContent=typeof raw==='string'&&raw.trim()?raw.trim().slice(0,30):user.email?.split('@')[0]||'Player';
  profile.classList.remove('is-guest');
  if(verifiedOwnerUserId!==user.id)hideOwner();
  coins.textContent='Loading coins…';
  const {data:owner,error:ownerError}=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();
  if(id!==seq)return;
  if(!ownerError){if(owner){verifiedOwnerUserId=user.id;ownerMark.hidden=false;profile.classList.add('is-owner');}else hideOwner();}
  revealProfile();
  const {data,error:walletError}=await db.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle();
  if(id!==seq)return;
  if(!walletError&&data){const next=Number(data.balance);if(previousBalance!==null&&next!==previousBalance){profile.classList.remove('coin-updated');void profile.offsetWidth;profile.classList.add('coin-updated');}previousBalance=next;}else if(walletError){previousBalance=null;}
  coins.textContent=walletError?'Coins unavailable':(data?.balance??0).toLocaleString()+' Coins';
 }catch(_){if(id===seq){name.textContent='Guest';coins.textContent='Unavailable';hideOwner();revealProfile();}}
}
let activeUserId=null;
db.auth.onAuthStateChange((event,session)=>{
 if(event==='SIGNED_IN'&&session?.user?.id!==activeUserId){activeUserId=session.user.id;setTimeout(updateHeader,50)}
 else if(event==='SIGNED_OUT'&&activeUserId!==null){activeUserId=null;setTimeout(updateHeader,50)}
});
window.addEventListener('pageshow',event=>{if(!event.persisted) return; /* Keep restored page state intact. */});
window.addEventListener('ctoon-profile-updated',updateHeader);
updateHeader();
