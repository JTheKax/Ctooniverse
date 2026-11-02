import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id);
$('redeem-form')?.addEventListener('submit',async e=>{
 e.preventDefault();const button=$('redeem-submit'),msg=$('redeem-feedback');
 button.disabled=true;msg.textContent='Redeeming…';
 try{const {data,error}=await db.rpc('redeem_cartoon_code',{p_code:$('redeem-input').value.trim()});
 if(error)throw error;msg.textContent='Code redeemed! Your new balance is '+Number(data).toLocaleString()+' Cartoon Coins.';$('redeem-form').reset();window.dispatchEvent(new Event('ctoon-profile-updated'));}
 catch(err){msg.textContent=err.message||'Could not redeem code.';}finally{button.disabled=false;}
});
$('code-create-form')?.addEventListener('submit',async e=>{
 e.preventDefault();const button=$('code-create-submit'),msg=$('code-create-feedback');
 button.disabled=true;msg.textContent='Creating code…';
 try{const expiry=$('code-expiry').value;const {data,error}=await db.rpc('owner_create_redeem_code',{p_code:$('code-name').value.trim(),p_coins:Number($('code-coins').value),p_max_uses:Number($('code-limit').value),p_expires:expiry?new Date(expiry).toISOString():null});
 if(error)throw error;msg.textContent='Created code '+data+'. Share it with players to redeem '+$('code-coins').value+' coins.';}
 catch(err){msg.textContent='Could not create code: '+(err.message||'Try again.');}finally{button.disabled=false;}
});