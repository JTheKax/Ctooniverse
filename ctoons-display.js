import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const badge=document.getElementById('ctoons-traverse-owned');
let seq=0;
async function refresh(){
 const n=++seq;if(!badge)return;
 try{
  const {data:{user}}=await db.auth.getUser();
  if(n!==seq)return;
  if(!user){badge.textContent='Sign in';badge.classList.remove('is-owned');return}
  const {data,error}=await db.from('player_ctoons').select('quantity').eq('user_id',user.id).eq('ctoon_id','8e0a7dcc-f7b6-4e0d-96f7-759325946a1f').maybeSingle();
  if(n!==seq)return;
  if(error){badge.textContent='Unavailable';badge.classList.remove('is-owned');return}
  const qty=Number(data?.quantity||0);badge.textContent=qty?'Owned ×'+qty:'Unowned';badge.classList.toggle('is-owned',qty>0);
 }catch{badge.textContent='Unavailable';badge.classList.remove('is-owned')}
}
db.auth.onAuthStateChange(()=>setTimeout(refresh,0));
window.addEventListener('pageshow',refresh);refresh();
