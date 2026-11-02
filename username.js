import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const form=document.getElementById('username-form');
const input=document.getElementById('username-input');
const feedback=document.getElementById('username-feedback');
const save=document.getElementById('username-save');
async function refresh(){
 const {data:{user}}=await db.auth.getUser();
 form.hidden=!user;
 if(user&&document.activeElement!==input)input.value=user.user_metadata?.display_name||user.email?.split('@')[0]||'';
}
form.addEventListener('submit',async e=>{
 e.preventDefault();
 const value=input.value.trim();
 if(!/^[A-Za-z0-9 _-]{3,30}$/.test(value)){feedback.textContent='Use 3–30 letters, numbers, spaces, underscores or hyphens.';return;}
 save.disabled=true;feedback.textContent='Saving…';
 try{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user){feedback.textContent='Please sign in again.';return;}
  const {error}=await db.auth.updateUser({data:{display_name:value}});
  if(error){feedback.textContent=error.message;return;}
  feedback.textContent='Username updated!';
  document.getElementById('header-player-name').textContent=value;
  window.dispatchEvent(new Event('ctoon-profile-updated'));
 }catch(_){feedback.textContent='Could not save. Try again.';}
 finally{save.disabled=false;}
});
db.auth.onAuthStateChange(()=>setTimeout(refresh,0));
refresh();
