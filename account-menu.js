import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const menus=[...document.querySelectorAll('.account-dropdown')];
async function refresh(){
 try{const {data:{user}}=await db.auth.getUser();for(const menu of menus){menu.querySelectorAll('[data-account-guest]').forEach(el=>el.hidden=!!user);menu.querySelectorAll('[data-account-signed]').forEach(el=>el.hidden=!user);}}
 catch(_){for(const menu of menus){menu.querySelectorAll('[data-account-guest],[data-account-signed]').forEach(el=>el.hidden=true);}}
}
for(const menu of menus){
 const trigger=menu.querySelector('.account-dropdown-trigger');
 trigger.addEventListener('click',()=>{const open=trigger.getAttribute('aria-expanded')==='true';for(const m of menus)m.querySelector('.account-dropdown-trigger').setAttribute('aria-expanded','false');trigger.setAttribute('aria-expanded',String(!open));});
 menu.addEventListener('keydown',e=>{if(e.key==='Escape'){trigger.setAttribute('aria-expanded','false');trigger.focus();}});
 menu.querySelector('[data-account-logout]').addEventListener('click',async()=>{
  const btn=menu.querySelector('[data-account-logout]');btn.disabled=true;
  try{const {error}=await db.auth.signOut();if(error)throw error;window.location.href='login.html';}
  catch(_){btn.textContent='Sign out failed — retry';btn.disabled=false;}
 });
}
document.addEventListener('click',e=>{for(const menu of menus)if(!menu.contains(e.target))menu.querySelector('.account-dropdown-trigger').setAttribute('aria-expanded','false');});
let currentUserId;
db.auth.onAuthStateChange((event,session)=>{
 if(event!=='SIGNED_IN'&&event!=='SIGNED_OUT')return;
 const next=session?.user?.id||null;
 if(currentUserId===next)return;
 currentUserId=next;
 setTimeout(refresh,0);
});
refresh();
