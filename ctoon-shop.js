import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const ctoonId='8e0a7dcc-f7b6-4e0d-96f7-759325946a1f';
function setup(){
 const button=document.getElementById('traverse-town-buy'),status=document.getElementById('traverse-town-shop-status'),owned=document.querySelector('.ctoon-shop-owned');
 if(!button||!status)return;
 let pending=false,refreshId=0;
 const message=(text)=>{status.textContent=text;};
 const setOwned=(quantity)=>{if(!owned)return;owned.textContent=quantity>0?'Owned ×'+quantity:'Unowned';owned.classList.toggle('is-owned',quantity>0);owned.setAttribute('aria-label',quantity>0?'Owned: '+quantity+' copies':'Unowned');};
 const setUnknown=()=>{if(owned){owned.textContent='Sign in';owned.classList.remove('is-owned');}};
 async function refresh(){
  if(pending)return;
  const id=++refreshId;
  try{
   const {data:{user},error:authError}=await db.auth.getUser();
   if(id!==refreshId||pending)return;
   if(authError||!user){button.textContent='Sign in to Buy';message('Sign in to buy Traverse Town for 100 Cartoon Coins.');setUnknown();return}
   button.textContent='Buy';
   const [wallet,collection]=await Promise.all([
    db.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle(),
    db.from('player_ctoons').select('quantity').eq('user_id',user.id).eq('ctoon_id',ctoonId).maybeSingle()
   ]);
   if(id!==refreshId||pending)return;
   if(collection.error){setUnknown();message('Unable to check CToon ownership: '+collection.error.message);return}
   if(wallet.error){message('Unable to check your coins: '+wallet.error.message);return}
   const balance=Number(wallet.data?.balance??0),quantity=Number(collection.data?.quantity??0);
   setOwned(quantity);
   message('Balance: '+balance.toLocaleString()+' coins. Price: 100 coins.'+(balance<100?' You need more coins to purchase.':''));
  }catch(e){message('Could not load shop account: '+(e?.message||'connection error'))}
 }
 button.addEventListener('click',async()=>{
  if(pending)return;
  pending=true;refreshId++;button.disabled=true;button.textContent='Buying…';message('Processing purchase…');
  try{
   const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||!user){button.textContent='Sign in to Buy';message('Please sign in before purchasing.');return}
   const {data,error}=await db.rpc('purchase_ctoon',{p_ctoon_id:ctoonId});
   if(error)throw error;
   button.textContent='Buy Again';
   const {data:latest,error:ownedError}=await db.from('player_ctoons').select('quantity').eq('user_id',user.id).eq('ctoon_id',ctoonId).maybeSingle();
   if(!ownedError)setOwned(Number(latest?.quantity??0));
   message('Purchase successful! 100 coins deducted. Remaining balance: '+Number(data.balance).toLocaleString()+'.');
   window.dispatchEvent(new Event('ctoon-profile-updated'));
  }catch(e){
   button.textContent='Try Again';
   message('Purchase unsuccessful: '+(e?.message||'Unknown error')+'. Your balance is protected by the checkout transaction.');
  }finally{pending=false;button.disabled=false;setTimeout(refresh,800)}
 });
 db.auth.onAuthStateChange(()=>setTimeout(refresh,0));
 window.addEventListener('pageshow',refresh);
 refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
