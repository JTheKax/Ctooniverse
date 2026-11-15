import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import {DEFAULT_AVATAR,AVATAR_OPTIONS,normalizeAvatar,avatarSvg,avatarDataUrl} from './avatar-renderer.js?v=paper-avatar-v1';

const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id);
const form=$('avatar-maker-form'),preview=$('avatar-preview'),status=$('avatar-maker-status');
const saveBtn=$('avatar-save');
let userId=null,working=false,dirty=false,request=0,look=normalizeAvatar(DEFAULT_AVATAR);

function message(text,error=false){status.textContent=text;status.dataset.error=String(error)}
function display(){
 look=normalizeAvatar(look);
 preview.src=avatarDataUrl(look);
 if(userId&&dirty)message('Preview updated. Save your avatar to show this look to other players.');
}
function setForm(value){
 look=normalizeAvatar(value);
 for(const input of form.querySelectorAll('[name]')){
  if(Object.hasOwn(look,input.name))input.value=look[input.name];
 }
 display();
}
function readForm(){
 const next={...look};
 for(const input of form.querySelectorAll('[name]'))next[input.name]=input.value;
 look=normalizeAvatar(next);dirty=true;display();
}
async function load(){
 const serial=++request;
 try{
  const {data:{user},error}=await db.auth.getUser();
  if(serial!==request)return;
  if(error||!user){
   userId=null;saveBtn.disabled=true;
   setForm(DEFAULT_AVATAR);
   dirty=false;message('Sign in to your CTooniverse account to save your avatar. You can still customize and download a preview.');
   return;
  }
  userId=user.id;saveBtn.disabled=false;
  const {data,error:loadError}=await db.from('player_avatars').select('avatar').eq('user_id',user.id).maybeSingle();
  if(serial!==request)return;
  if(loadError)throw loadError;
  setForm(data?.avatar||DEFAULT_AVATAR);
  dirty=false;
  message(data?'Your saved avatar has loaded. Customize it or try a new look.':'Welcome! Customize your first avatar, then save it.');
 }catch(error){
  if(serial!==request)return;
  saveBtn.disabled=!userId;
  message('Unable to load the saved avatar: '+(error.message||error),true);
 }
}
const random=values=>values[Math.floor(Math.random()*values.length)];
const palette={
 skin:['#f2be97','#edb080','#db9770','#b97955','#844a35','#f8dbbe'],
 hair:['#302442','#151927','#854f25','#f4c653','#c1493e','#c5c4e6','#3a82d0'],
 shirt:['#624be3','#ee4b70','#278ad4','#29ae72','#efb547','#292939'],
 pants:['#293862','#1d1e34','#5d3b64','#305648','#7c463a'],
 hatColor:['#df3957','#efaa35','#386de8','#6b52c9','#35a88e'],
 hatAccent:['#ffc950','#fffbfd','#87e2f1','#f49bd3'],
 background:['#34286d','#0e3666','#852d61','#245c6d','#714a35']
};
form.addEventListener('input',readForm);
form.addEventListener('change',readForm);
$('avatar-randomize').addEventListener('click',()=>{
 const next={...look};
 for(const [key,options] of Object.entries(AVATAR_OPTIONS))next[key]=random(options);
 for(const [key,options] of Object.entries(palette))next[key]=random(options);
 setForm(next);dirty=true;message('Random look ready! Save it to your profile.');
});
$('avatar-reset').addEventListener('click',()=>{
 setForm(DEFAULT_AVATAR);dirty=true;message('Reset to the default cutout character. Save to apply this look.');
});
saveBtn.addEventListener('click',async()=>{
 if(working||!userId)return;
 working=true;saveBtn.disabled=true;message('Saving your avatar…');
 try{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user||user.id!==userId)throw new Error('Your session expired. Sign in again.');
  const row={user_id:user.id,avatar:normalizeAvatar(look),updated_at:new Date().toISOString()};
  if(JSON.stringify(row.avatar).length>=2900)throw new Error('Avatar data is too large.');
  const {error}=await db.from('player_avatars').upsert(row,{onConflict:'user_id'});
  if(error)throw error;
  dirty=false;message('Avatar saved! It will now show on your player profile and in the player directory.');
  window.dispatchEvent(new CustomEvent('ctoon-profile-updated'));
 }catch(error){message('Avatar could not be saved: '+(error?.message||error),true)}
 finally{working=false;saveBtn.disabled=!userId}
});
$('avatar-download').addEventListener('click',async()=>{
 const button=$('avatar-download');button.disabled=true;
 try{
  const image=new Image();const svg=avatarSvg(look);
  const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
  const imageUrl=URL.createObjectURL(blob);
  try{
   await new Promise((resolve,reject)=>{
    image.onload=resolve;image.onerror=()=>reject(new Error('Could not prepare the avatar picture.'));
    image.src=imageUrl;
   });
   const canvas=document.createElement('canvas');canvas.width=960;canvas.height=1200;
   const context=canvas.getContext('2d');if(!context)throw new Error('Canvas unavailable.');
   context.drawImage(image,0,0,canvas.width,canvas.height);
   const png=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('PNG export failed.')),'image/png'));
   const url=URL.createObjectURL(png);
   const link=document.createElement('a');link.href=url;link.download='ctooniverse-avatar.png';
   document.body.append(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1500);
   message('PNG saved to your device. Use Save My Avatar to publish it on your CTooniverse profile.');
  }finally{URL.revokeObjectURL(imageUrl)}
 }catch(error){message('Could not download avatar: '+(error?.message||error),true)}
 finally{button.disabled=false}
});
db.auth.onAuthStateChange(event=>{
 if(event==='SIGNED_IN'||event==='SIGNED_OUT')setTimeout(load,0);
});
setForm(DEFAULT_AVATAR);
load();
