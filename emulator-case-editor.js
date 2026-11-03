"use strict";
(async()=>{
 const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.58.0');
 const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
 const {data:{user}}=await db.auth.getUser();if(!user)return;
 const {data:owner}=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();if(!owner)return;
 const host=document.getElementById('emu-library');if(!host)return;
 const dialog=document.createElement('dialog');dialog.className='emu-edit-dialog';
 dialog.innerHTML='<form method="dialog" class="emu-edit-form"><h2>Edit Game Case</h2><label>Game name<input name="title" maxlength="100" required></label><label>Cover artwork (PNG, JPG or WebP, max 5 MB)<input name="cover" type="file" accept="image/png,image/jpeg,image/webp"></label><p class="emu-edit-status" role="status"></p><div class="emulator-controls"><button type="button" class="button primary" data-save>Save Changes</button><button type="submit" class="button">Cancel</button></div></form>';
 document.body.append(dialog);
 const title=dialog.querySelector('[name=title]'),cover=dialog.querySelector('[name=cover]'),message=dialog.querySelector('.emu-edit-status'),save=dialog.querySelector('[data-save]');
 let game=null;
 host.addEventListener('click',async e=>{
  const card=e.target.closest('.emu-case[data-game-id]');if(!card)return;
  e.preventDefault();e.stopImmediatePropagation();
  const {data,error}=await db.from('emulator_games').select('id,title,cover_path').eq('id',card.dataset.gameId).single();
  if(error){alert('Unable to open game editor: '+error.message);return}
  game=data;title.value=data.title;cover.value='';message.textContent='';dialog.showModal();
 },true);
 save.addEventListener('click',async()=>{
  if(!game)return;
  const next=title.value.trim(),file=cover.files[0];
  if(!next||next.length>100){message.textContent='Enter a game name under 101 characters.';return}
  if(file&&(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024)){message.textContent='Choose a PNG, JPG or WebP image under 5 MB.';return}
  save.disabled=true;message.textContent='Saving game case…';
  let uploadedPath=null;
  try{
   if(file){
    const ext={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'}[file.type];
    uploadedPath=game.id+'/'+crypto.randomUUID()+'.'+ext;
    const result=await db.storage.from('emulator-covers').upload(uploadedPath,file,{contentType:file.type});
    if(result.error)throw result.error;
   }
   const patch={title:next};if(uploadedPath)patch.cover_path=uploadedPath;
   const result=await db.from('emulator_games').update(patch).eq('id',game.id).select('id').single();
   if(result.error)throw result.error;
   if(uploadedPath&&game.cover_path)await db.storage.from('emulator-covers').remove([game.cover_path]);
   dialog.close();await window.ctoonReloadGameCases?.();
  }catch(err){
   if(uploadedPath)await db.storage.from('emulator-covers').remove([uploadedPath]);
   message.textContent='Save failed: '+err.message;
  }finally{save.disabled=false}
 });
})();
