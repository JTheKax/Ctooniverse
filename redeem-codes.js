import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id);
$('redeem-form')?.addEventListener('submit',async e=>{
 e.preventDefault();const button=$('redeem-submit'),msg=$('redeem-feedback');
 button.disabled=true;msg.textContent='Redeeming…';
 try{const {data,error}=await db.rpc('redeem_cartoon_reward',{p_code:$('redeem-input').value.trim()});
 if(error)throw error;msg.textContent=data;$('redeem-form').reset();window.dispatchEvent(new Event('ctoon-profile-updated'));}
 catch(err){msg.textContent=err.message||'Could not redeem code.';}finally{button.disabled=false;}
});
$('code-create-form')?.addEventListener('submit',async e=>{
 e.preventDefault();const button=$('code-create-submit'),msg=$('code-create-feedback');
 button.disabled=true;msg.textContent='Creating code…';
 try{const expiry=$('code-expiry').value;const isCtoon=$('code-type').value==='ctoon';const params={p_code:$('code-name').value.trim(),p_max_uses:Number($('code-limit').value),p_expires:expiry?new Date(expiry).toISOString():null};if(isCtoon){params.p_ctoon=$('code-ctoon').value;}else{params.p_coins=Number($('code-coins').value);}const {data,error}=await db.rpc(isCtoon?'owner_create_ctoon_code':'owner_create_redeem_code',params);
 if(error)throw error;msg.textContent='Created code '+data+'. Share it with players.';}
 catch(err){msg.textContent='Could not create code: '+(err.message||'Try again.');}finally{button.disabled=false;}
});
const type=$('code-type'),coinFields=$('code-coin-fields'),ctoonFields=$('code-ctoon-fields');
function toggleReward(){if(!type)return;const isCtoon=type.value==='ctoon';coinFields.hidden=isCtoon;ctoonFields.hidden=!isCtoon;$('code-coins').required=!isCtoon;$('code-ctoon').required=isCtoon;}
type?.addEventListener('change',toggleReward);toggleReward();
async function loadCtoons(){const select=$('code-ctoon');if(!select)return;const {data,error}=await db.from('ctoon_catalog').select('id,name').order('name').limit(500);select.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent=error?'Unable to load Ctoons':data?.length?'Choose a Ctoon':'No Ctoons added yet';select.append(placeholder);for(const item of data||[]){const option=document.createElement('option');option.value=item.id;option.textContent=item.name;select.append(option);}}
loadCtoons();
