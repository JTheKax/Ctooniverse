import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id), feedback=$('login-feedback');
let recovery=false;
function render(user){$('signed-panel').hidden=!user;$('login-panel').hidden=!!user||recovery||location.hash==='#reset';$('reset-panel').hidden=!!user||recovery||location.hash!=='#reset';$('new-password-panel').hidden=!recovery;if(user)$('signed-message').textContent='Signed in as '+(user.email||'player')+'.';}
async function refresh(){const {data:{user}}=await db.auth.getUser();render(user);}
window.addEventListener('hashchange',refresh);
$('login-form').addEventListener('submit',async e=>{e.preventDefault();const b=$('login-submit');b.disabled=true;feedback.textContent='Signing in…';try{const {error}=await db.auth.signInWithPassword({email:$('login-email').value.trim(),password:$('login-password').value});feedback.textContent=error?(error.message||'Unable to sign in.'):'Signed in successfully.';if(!error)await refresh();}catch{feedback.textContent='Connection error. Try again.';}finally{b.disabled=false;}});
$('reset-form').addEventListener('submit',async e=>{e.preventDefault();const b=$('reset-submit');b.disabled=true;try{const {error}=await db.auth.resetPasswordForEmail($('reset-email').value.trim(),{redirectTo:'https://ctooniverse.onrender.com/login.html'});feedback.textContent=error?error.message:'If this email has an account, a password reset link will be sent. Check your inbox.';}catch{feedback.textContent='Could not request reset.';}finally{b.disabled=false;}});
$('new-password-form').addEventListener('submit',async e=>{e.preventDefault();const pass=$('new-password').value;if(pass!==$('confirm-password').value){feedback.textContent='Passwords do not match.';return;}const {error}=await db.auth.updateUser({password:pass});if(error){feedback.textContent=error.message;return;}recovery=false;history.replaceState(null,'',location.pathname);feedback.textContent='Password updated successfully.';await refresh();});
$('signout').addEventListener('click',async()=>{await db.auth.signOut();feedback.textContent='Signed out.';await refresh();});
db.auth.onAuthStateChange((event)=>{if(event==='PASSWORD_RECOVERY')recovery=true;setTimeout(refresh,0);});
refresh();
