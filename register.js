import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id);
async function refresh(){
 const {data:{user}}=await db.auth.getUser();
 $('registration-panel').hidden=!!user;
 $('registered-panel').hidden=!user;
 if(user)$('registered-message').textContent='Signed in as '+(user.email||'player')+'.';
}
$('register-form').addEventListener('submit',async e=>{
 e.preventDefault();
 const name=$('register-name').value.trim(),email=$('register-email').value.trim(),pass=$('register-password').value,confirm=$('register-confirm').value,feedback=$('register-feedback'),btn=$('register-submit');
 if(!/^[a-zA-Z0-9 _-]{3,30}$/.test(name)){feedback.textContent='Display name must be 3–30 characters, using letters, numbers, spaces, _ or -.';return;}
 if(pass.length<8){feedback.textContent='Password must be at least 8 characters.';return;}
 if(pass!==confirm){feedback.textContent='Passwords do not match.';return;}
 btn.disabled=true;feedback.textContent='Creating your account…';
 try{
 const {data,error}=await db.auth.signUp({email,password:pass,options:{data:{display_name:name},emailRedirectTo:'https://ctooniverse.onrender.com/account.html'}});
 if(error){feedback.textContent=error.message;return;}
 $('register-form').reset();
 feedback.textContent=data.session?'Account created! You are signed in.':'Check your inbox for a confirmation email. Click its link to activate your account.';
 if(data.session)await refresh();
 }catch(err){feedback.textContent='Could not connect to registration. Please try again.';}
 finally{btn.disabled=false;}
});
$('register-signout').addEventListener('click',async()=>{await db.auth.signOut();await refresh();});
db.auth.onAuthStateChange(()=>setTimeout(refresh,0));
refresh();
