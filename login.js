import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id), feedback=$('login-feedback');
let recovery=false;
function render(user){
  const requestingReset=location.hash==='#reset';
  $('signed-panel').hidden=!user||recovery||requestingReset;
  $('login-panel').hidden=!!user||recovery||requestingReset;
  $('reset-panel').hidden=recovery||!requestingReset;
  $('new-password-panel').hidden=!recovery;
  if(user)$('signed-message').textContent='Signed in as '+(user.email||'player')+'.';
}
async function refresh(){
  try{
    const {data}=await db.auth.getUser();
    render(data?.user||null);
  }catch{
    render(null);
    if(!feedback.textContent)feedback.textContent='Could not check your sign-in status. Try again.';
  }
}
window.addEventListener('hashchange',refresh);

// Supabase returns invalid/expired recovery links as URL fragments.
const callbackParams=new URLSearchParams(location.hash.startsWith('#')?location.hash.slice(1):'');
if(callbackParams.has('error')||callbackParams.has('error_code')){
  feedback.textContent='This reset link has expired or is invalid. Please request a new password reset email.';
  history.replaceState(null,'',location.pathname+location.search+'#reset');
}
$('login-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const b=$('login-submit');b.disabled=true;feedback.textContent='Signing in…';
  try{
    const {error}=await db.auth.signInWithPassword({email:$('login-email').value.trim(),password:$('login-password').value});
    feedback.textContent=error?(error.message||'Unable to sign in.'):'Signed in successfully.';
    if(!error)await refresh();
  }catch{feedback.textContent='Connection error. Try again.';}
  finally{b.disabled=false;}
});
$('reset-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const b=$('reset-submit');b.disabled=true;feedback.textContent='Requesting a reset email…';
  try{
    // Always return to the current Cloudflare-hosted site, never the retired Render host.
    const redirectTo=new URL('/login.html',window.location.origin).href;
    const {error}=await db.auth.resetPasswordForEmail($('reset-email').value.trim(),{redirectTo});
    feedback.textContent=error?(error.message||'Could not send reset email.'):'If this email has an account, a password reset link will be sent. Check your inbox and spam folder.';
  }catch{feedback.textContent='Could not request reset. Please try again.';}
  finally{b.disabled=false;}
});
$('new-password-form').addEventListener('submit',async e=>{
  e.preventDefault();
  const pass=$('new-password').value;
  if(pass!==$('confirm-password').value){feedback.textContent='Passwords do not match.';return;}
  const b=$('new-password-form').querySelector('button[type="submit"]');
  b.disabled=true;feedback.textContent='Updating password…';
  try{
    const {error}=await db.auth.updateUser({password:pass});
    if(error){feedback.textContent=error.message||'Could not update password.';return;}
    recovery=false;
    history.replaceState(null,'',location.pathname);
    feedback.textContent='Password updated successfully. You can now sign in with your new password.';
    await refresh();
  }catch{feedback.textContent='Could not update password. Please request another reset link if the current one expired.';}
  finally{b.disabled=false;}
});
$('signout').addEventListener('click',async()=>{
  try{await db.auth.signOut();feedback.textContent='Signed out.';await refresh();}
  catch{feedback.textContent='Could not sign out. Please try again.';}
});
db.auth.onAuthStateChange(event=>{
  if(event==='PASSWORD_RECOVERY'){
    recovery=true;
    feedback.textContent='Reset link verified. Choose your new password below.';
  }
  if(event==='SIGNED_OUT')recovery=false;
  setTimeout(refresh,0);
});
refresh();
