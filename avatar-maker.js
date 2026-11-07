import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';import {defaults,avatarDataUrl} from './avatar-art.js';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');const form=document.getElementById('avatar-form'),img=document.getElementById('avatar-preview'),message=document.getElementById('avatar-message'),save=document.getElementById('avatar-save');let user=null;
let equippedClothing=null;const get=()=>({...Object.fromEntries(new FormData(form).entries()),equippedClothing});function show(){img.src=avatarDataUrl(get())}function apply(v){equippedClothing=v?.equippedClothing||null;for(const [key,value] of Object.entries({...defaults,...v})){const field=form.elements.namedItem(key);if(field&&[...field.options||[]].some(o=>o.value===value)||field?.type==='color')field.value=value}show();window.dispatchEvent(new Event("avatar-loaded"))}
form.addEventListener('input',show);form.addEventListener('change',show);form.addEventListener('submit',e=>e.preventDefault());document.getElementById('avatar-random').onclick=()=>{const pick=a=>a[Math.floor(Math.random()*a.length)];apply({model:pick(['anime','classic','chibi','hero','robot','southpark','simpsons']),style:pick(['swoop','spikes','curls','bob','bald','ponytail','mohawk','locs','undercut']),face:pick(['smile','grin','serious']),accessory:pick(['none','glasses','crown','headphones']),outfit:pick(['hoodie','jacket','armor','tee']),aura:pick(['stars','lightning','flames','none']),detail:pick(['none','freckles','blush','scar']),piercing:pick(['none','earrings','hoops','nose','brow']),tattoo:pick(['none','star','lightning','heart','tribal']),hairAccent:pick(['#ed79ff','#71eaff','#ffd75a','#e8e5ff']),skin:pick(['#f2b989','#8c573e','#d89563','#f5d4b6','#a86d55']),hair:pick(['#30204d','#e8c06b','#10111d','#a44937','#f5e5d3']),shirt:pick(['#6545d7','#0f8aaf','#e45775','#26a66e','#f2a835']),background:pick(['#2b176a','#154b87','#5c216f','#155e61'])})};
save.onclick=async()=>{if(!user){message.textContent='Please sign in first.';return}save.disabled=true;message.textContent='Saving…';const {error}=await db.from('player_avatars').upsert({user_id:user.id,avatar:get(),updated_at:new Date().toISOString()},{onConflict:'user_id'});message.textContent=error?'Could not save: '+error.message:'Avatar saved to your account!';save.disabled=false;if(!error)window.dispatchEvent(new Event('ctoon-profile-updated'))};
apply(defaults);const {data:{user:current},error}=await db.auth.getUser();if(error||!current){message.textContent='Sign in to save your avatar.';save.disabled=true}else{user=current;const {data,error:loadError}=await db.from('player_avatars').select('avatar').eq('user_id',user.id).maybeSingle();if(data?.avatar)apply(data.avatar);message.textContent=loadError?'Unable to load saved avatar.':data?'Your saved avatar is loaded.':'Create your first avatar!'}

const wardrobeHost=document.getElementById('avatar-wardrobe-items');
async function loadWardrobe(){
 if(!wardrobeHost)return;
 const {data:{user:owner}}=await db.auth.getUser();
 if(!owner){wardrobeHost.textContent='Sign in to see purchased clothing.';return}
 const [owned,catalog]=await Promise.all([db.from('player_avatar_clothing').select('item_id').eq('user_id',owner.id),db.from('avatar_clothing_catalog').select('id,name,category')]);
 if(owned.error||catalog.error){wardrobeHost.textContent='Unable to load wardrobe.';return}
 const byId=new Map((catalog.data||[]).map(x=>[x.id,x]));
 const available=(owned.data||[]).map(x=>byId.get(x.item_id)).filter(Boolean);
 if(!available.length){wardrobeHost.textContent='No purchased clothing yet.';return}
 wardrobeHost.replaceChildren();
 for(const item of available){
  const button=document.createElement('button');button.type='button';button.textContent=item.name;
  button.style.cssText='padding:10px;border-radius:10px;background:#5834a4;color:white;border:2px solid #d4b7ff;cursor:pointer';
  button.onclick=()=>{equippedClothing=item.id;message.textContent='Equipped '+item.name+'. Press Save Avatar to keep this outfit.';window.dispatchEvent(new Event('avatar-clothing-changed'))};
  wardrobeHost.append(button);
 }
}
loadWardrobe();
