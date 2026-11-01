import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const supabase = createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $ = id => document.getElementById(id);
const status=$('owner-status'),feedback=$('owner-feedback');
const sections=['owner-login','owner-authorized','owner-not-authorized'];
function show(id,message){sections.forEach(key=>$(key).hidden=key!==id);status.textContent=message;feedback.textContent='';}
async function refresh(){
  try{
    const {data:{user},error}=await supabase.auth.getUser();
    if(error||!user){show('owner-login','Sign in to check your Owner access.');return;}
    const {data, error:lookupError}=await supabase.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();
    if(lookupError){show('owner-not-authorized','Could not verify Owner permissions. No access granted.');return;}
    if(data){show('owner-authorized','Signed in as '+(user.email||'verified account')+'.');}
    else{show('owner-not-authorized','Signed in as '+(user.email||'verified account')+'. Owner permissions are not assigned.');}
  }catch(e){show('owner-login','Authentication is unavailable. Please try again later.');}
}
$('owner-signin-form').addEventListener('submit',async event=>{
  event.preventDefault();feedback.textContent='Sending sign-in link…';
  const email=$('owner-email').value.trim();
  try{
    const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:'https://ctooniverse.onrender.com/owner.html'}});
    feedback.textContent=error?'Could not send link: '+error.message:'Check your inbox for your sign-in link. If you do not see it, check spam.';
  }catch(e){feedback.textContent='Could not connect to authentication. Try again later.';}
});
async function signOut(){await supabase.auth.signOut();await refresh();}
$('owner-signout').addEventListener('click',signOut);
$('owner-signout-unverified').addEventListener('click',signOut);
supabase.auth.onAuthStateChange(()=>{setTimeout(refresh,0);});
refresh();
