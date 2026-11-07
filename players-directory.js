import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const list=document.getElementById('players-list'),status=document.getElementById('players-status'),search=document.getElementById('player-search');
let names=[];
function render(){
 const q=search.value.trim().toLocaleLowerCase();
 const found=names.filter(n=>n.toLocaleLowerCase().includes(q));
 list.replaceChildren();
 for(const n of found){
  const card=document.createElement('div');card.className='player-directory-card';
  const icon=document.createElement('span');icon.textContent='★';icon.setAttribute('aria-hidden','true');
  const title=document.createElement('strong');title.textContent=n;
  card.append(icon,title);list.append(card);
 }
 status.textContent=found.length+' of '+names.length+' players'+(q?' matching your search':'');
}
search.addEventListener('input',render);
async function load(){
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user){status.textContent='Sign in to browse the player directory.';list.replaceChildren();return;}
 const {data,error}=await db.rpc('list_ctoon_players');
 if(error){status.textContent='Unable to load players right now.';return;}
 names=(data||[]).map(r=>r.player_name).filter(Boolean);
 render();
}
db.auth.onAuthStateChange(()=>{setTimeout(load,0)});
load();
