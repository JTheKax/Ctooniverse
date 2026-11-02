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
el('coin-adjust-form')?.addEventListener('submit',async e=>{
 e.preventDefault();const msg=el('coin-adjust-feedback'),button=el('coin-adjust-submit');
 const id=el('coin-target').value.trim(),amount=Number(el('coin-amount').value),reason=el('coin-reason').value.trim();
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(id)||!Number.isSafeInteger(amount)||amount===0||Math.abs(amount)>1000000||reason.length<3){msg.textContent='Enter a valid account UUID, nonzero whole coin amount (up to 1,000,000), and a reason.';return;}
 button.disabled=true;msg.textContent='Updating balance…';
 try{const {data,error}=await db.rpc('adjust_cartoon_coins',{target_user:id,amount,note:reason});msg.textContent=error?'Update failed: '+error.message:'Success. New balance: '+fmt(data)+' Cartoon Coins';if(!error){el('coin-adjust-form').reset();await refreshCoins();}}catch(_){msg.textContent='Unable to update coins right now.';}finally{button.disabled=false;}
});
db.auth.onAuthStateChange(()=>setTimeout(()=>{refreshCoins();refreshOwnerCoins();},50));
refreshCoins();refreshOwnerCoins();
