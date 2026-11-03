import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const button=document.getElementById('traverse-town-buy');
const status=document.getElementById('traverse-town-shop-status');
const ctoonId='8e0a7dcc-f7b6-4e0d-96f7-759325946a1f';
let pending=false;
async function refresh(){
 if(pending)return;
 const {data:{user}}=await db.auth.getUser();
 if(!user){status.textContent='Sign in to purchase for 100 Cartoon Coins';button.textContent='Buy';return}
 const {data:wallet,error}=await db.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle();
 if(error){status.textContent='Coin balance unavailable. Try again later.';return}
 status.textContent='Your balance: '+Number(wallet?.balance??0).toLocaleString()+' Cartoon Coins';
 button.textContent='Buy';
}
button.addEventListener('click',async()=>{
 if(pending)return;
 pending=true;button.disabled=true;button.textContent='Buying…';status.textContent='Checking your account and coins…';
 try{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user){status.textContent='Please sign in first to purchase.';button.textContent='Sign in';return}
  const {data,error}=await db.rpc('purchase_ctoon',{p_ctoon_id:ctoonId});
  if(error)throw error;
  status.textContent='Purchased Traverse Town! 100 coins deducted. New balance: '+Number(data.balance).toLocaleString()+'. Added to your collection.';
  button.textContent='Buy Again';
  window.dispatchEvent(new Event('ctoon-profile-updated'));
 }catch(error){status.textContent=error?.message||'Purchase failed. No coins were deducted.';button.textContent='Retry Buy'}
 finally{pending=false;button.disabled=false}
});
db.auth.onAuthStateChange(()=>setTimeout(refresh,0));
refresh();
