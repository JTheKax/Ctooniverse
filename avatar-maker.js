import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import {DEFAULT_AVATAR,AVATAR_OPTIONS,normalizeAvatar,avatarSvg,avatarDataUrl} from './avatar-renderer.js?v=cutout-avatar-v6';

const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id);
const form=$('avatar-maker-form'),preview=$('avatar-preview'),status=$('avatar-maker-status');
const saveBtn=$('avatar-save'),mobileSaveBtn=$('avatar-mobile-save');
const saveBtns=[saveBtn,mobileSaveBtn].filter(Boolean);
function syncSaveButtons(){for(const button of saveBtns)button.disabled=working||!userId;}
let userId=null,working=false,dirty=false,request=0,editRevision=0,look=normalizeAvatar(DEFAULT_AVATAR);

function message(text,error=false){status.textContent=text;status.dataset.error=String(error)}
function display(){
 look=normalizeAvatar(look);
 const src=avatarDataUrl(look);
 preview.src=src;
 if($('avatar-compact-preview'))$('avatar-compact-preview').src=src;
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
 const normalized=normalizeAvatar(next);
 // Color inputs and selectors may fire both input and change for one edit.
 if(Object.keys(normalized).every(key=>normalized[key]===look[key]))return;
 look=normalized;dirty=true;editRevision++;display();
}
async function load(){
 const serial=++request,revisionAtStart=editRevision;
 try{
  const {data:{user},error}=await db.auth.getUser();
  if(serial!==request)return;
  if(error||!user){
   userId=null;syncSaveButtons();
   setForm(DEFAULT_AVATAR);
   dirty=false;message('Sign in to your CTooniverse account to save your avatar. You can still customize and download a preview.');
   return;
  }
  // Keep one player's unsaved avatar from leaking into another account.
  if(userId&&userId!==user.id){dirty=false;setForm(DEFAULT_AVATAR);}
  userId=user.id;syncSaveButtons();
  const {data,error:loadError}=await db.from('player_avatars').select('avatar').eq('user_id',user.id).maybeSingle();
  if(serial!==request)return;
  if(loadError)throw loadError;
  // SIGNED_IN can fire again when the tab refocuses; never overwrite edits.
  if(!dirty&&editRevision===revisionAtStart){
   setForm(data?.avatar||DEFAULT_AVATAR);
   dirty=false;
   message(data?'Your saved avatar has loaded. Customize it or try a new look.':'Welcome! Customize your first avatar, then save it.');
  }else{
   message('Account ready. Your unsaved changes were preserved; save when you are happy with the look.');
  }
 }catch(error){
  if(serial!==request)return;
  syncSaveButtons();
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
 background:['#f8f8fb','#dceafc','#f9e8da','#daeede','#e7ddf6'],
 mittens:['#f2c837','#d6354a','#55c7dd','#45292f','#eeeeee'],
 shoes:['#24202e','#442b29','#0d356a','#eee8db']
};
const presets={
 classic:{hat:'pom',hairStyle:'swoop',outfit:'coat',shirt:'#d72f38',hatColor:'#354e87',hatAccent:'#d72f38',mittens:'#f2c837'},
 winter:{hat:'earflaps',hairStyle:'short',outfit:'coat',face:'smile',pose:'relaxed',hands:'mittens',shirt:'#278f7e',hatColor:'#ef812e',hatAccent:'#f4c948',mittens:'#f4c948',pants:'#4a4f7d',backdrop:'snow'},
 casual:{hat:'none',hairStyle:'sidepart',outfit:'tee',face:'smirk',pose:'hips',hands:'bare',shirt:'#5a8fe4',hatAccent:'#f5f1e7',pants:'#303a67',backdrop:'spotlight'},
 hero:{hat:'cap',hairStyle:'spiky',outfit:'jacket',face:'grin',pose:'wave',hands:'mittens',shirt:'#a84fe0',hatColor:'#394bb2',hatAccent:'#f0cb45',mittens:'#f0cb45',pants:'#2c2c58',backdrop:'stars'}
};
for(const button of form.querySelectorAll('[data-avatar-preset]')){
 button.addEventListener('click',()=>{
  const choice=presets[button.dataset.avatarPreset];
  if(!choice)return;
  setForm({...DEFAULT_AVATAR,...choice});
  dirty=true;editRevision++;
  message('Quick look applied. Customize anything or save this avatar.');
 });
}
form.addEventListener('input',readForm);
form.addEventListener('change',readForm);
$('avatar-randomize').addEventListener('click',()=>{
 const next={...look};
 for(const [key,options] of Object.entries(AVATAR_OPTIONS))next[key]=random(options);
 for(const [key,options] of Object.entries(palette))next[key]=random(options);
 setForm(next);dirty=true;editRevision++;message('Random look ready! Save it to your profile.');
});
$('avatar-reset').addEventListener('click',()=>{
 setForm(DEFAULT_AVATAR);dirty=true;editRevision++;message('Reset to the default cutout character. Save to apply this look.');
});
async function saveAvatar(){
 if(working||!userId)return;
 working=true;syncSaveButtons();message('Saving your avatar…');
 const revisionOnSave=editRevision;
 const submittedLook=normalizeAvatar(look);
 try{
  const {data:{user},error:authError}=await db.auth.getUser();
  if(authError||!user||user.id!==userId)throw new Error('Your session expired. Sign in again.');
  const row={user_id:user.id,avatar:submittedLook,updated_at:new Date().toISOString()};
  if(JSON.stringify(row.avatar).length>=2900)throw new Error('Avatar data is too large.');
  const {error}=await db.from('player_avatars').upsert(row,{onConflict:'user_id'});
  if(error)throw error;
  if(editRevision===revisionOnSave){dirty=false;message('Avatar saved! It will now show on your player profile and in the player directory.');}
  else {dirty=true;message('Avatar saved, but you have newer unsaved edits. Save again to publish them.');}
  window.dispatchEvent(new CustomEvent('ctoon-profile-updated'));
  try{localStorage.setItem('ctoon-avatar-updated',String(Date.now()))}catch(_){/* Storage is optional. */}
 }catch(error){message('Avatar could not be saved: '+(error?.message||error),true)}
 finally{working=false;syncSaveButtons()}
}
for(const button of saveBtns)button.addEventListener('click',saveAvatar);
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
