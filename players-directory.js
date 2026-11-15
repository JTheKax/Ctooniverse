import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';

import {avatarDataUrl} from './avatar-renderer.js?v=cutout-avatar-v5';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const list=document.getElementById('players-list');
const status=document.getElementById('players-status');
const search=document.getElementById('player-search');
const PAGE_SIZE=500;
let names=[];
let loading=false;

function render(){
 const q=search.value.trim().toLocaleLowerCase();
 const found=names.filter(n=>n.player_name.toLocaleLowerCase().includes(q));
 list.replaceChildren();
 for(const n of found){
  const card=document.createElement('div');
  card.className='player-directory-card';
  const portrait=document.createElement('img');
  portrait.className='player-directory-avatar';
  portrait.width=50;portrait.height=63;portrait.loading='lazy';
  portrait.alt=n.player_name+' avatar';
  portrait.src=avatarDataUrl(n.avatar);
  portrait.style.cssText='width:50px;height:63px;flex-shrink:0;object-fit:contain;border:2px solid #a5cdfb;border-radius:9px;background:#29205e';
  const title=document.createElement('strong');
  title.textContent=n.player_name; // Always use textContent for user-supplied names.
  if(n.is_owner){
   card.classList.add('is-owner');
   const ownerCrown=document.createElement('span');
   ownerCrown.className='player-owner-icon';
   ownerCrown.textContent='♛';
   ownerCrown.setAttribute('aria-label','Verified owner');
   title.classList.add('player-owner-name');
   const badge=document.createElement('span');
   badge.textContent='OWNER';
   badge.className='player-owner-badge';
   card.append(ownerCrown,portrait,title,badge);
  }else{
   card.append(portrait,title);
  }
  list.append(card);
 }
 if(q){
  status.textContent=found.length+' of '+names.length+' registered players match your search.';
 }else{
  status.textContent=names.length+' registered player'+(names.length===1?'':'s')+'. Automatically updated.';
 }
}

search.addEventListener('input',render);

// The server returns only public display names and owner badges, never email or auth data.
async function load(){
 if(loading||document.hidden)return;
 loading=true;
 try{
  const entries=[];
  // Request every page instead of truncating the directory at Supabase's row limit.
  for(let offset=0;;offset+=PAGE_SIZE){
   const {data,error}=await db.rpc('list_ctoon_players_with_avatars').range(offset,offset+PAGE_SIZE-1);
   if(error)throw error;
   if(!Array.isArray(data))throw new Error('Invalid player directory response');
   entries.push(...data);
   if(data.length<PAGE_SIZE)break;
  }
  names=entries
   .filter(entry=>typeof entry?.player_name==='string'&&entry.player_name.trim())
   .map(entry=>({player_name:entry.player_name.trim(),is_owner:entry.is_owner===true,avatar:entry.avatar||null}))
   .sort((a,b)=>Number(b.is_owner)-Number(a.is_owner)||a.player_name.localeCompare(b.player_name));
  render();
 }catch(error){
  status.textContent=names.length
   ? 'Unable to refresh player list. Showing the last available usernames.'
   : 'Unable to load registered usernames right now. Please try again later.';
 }finally{
  loading=false;
 }
}

db.auth.onAuthStateChange(()=>setTimeout(load,0));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
window.addEventListener('focus',load);
setInterval(load,60000);
load();
