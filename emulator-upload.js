"use strict";
(async()=>{
 const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.58.0');
 const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
 const form=document.getElementById('emu-owner');
 if(!form)return;
 const button=document.getElementById('emu-upload');
 const status=document.getElementById('emu-status');
 const {data:{user}}=await db.auth.getUser();
 if(!user)return;
 const {data:owner}=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();
 if(!owner)return;
 form.hidden=false;
 button.addEventListener('click',async()=>{
  const title=document.getElementById('emu-title').value.trim();
  const rom=document.getElementById('emu-owner-file').files[0];
  const consoleId=document.getElementById('emu-console').value;
  const allowed={nes:['nes'],snes:['sfc','smc'],gb:['gb'],gba:['gba'],gbc:['gbc'],n64:['n64','z64','v64'],segaMD:['md','gen','bin']};
  const extension=rom?.name.split('.').pop().toLowerCase();
  if(!title||title.length>100||!rom||!allowed[consoleId]?.includes(extension)){status.textContent='Enter a title and a compatible game file.';return}
  if(rom.size>50*1024*1024){status.textContent='Maximum file size is 50 MB.';return}
  button.disabled=true;status.textContent='Uploading game…';
  const path=crypto.randomUUID()+'.'+extension;
  try{
   const uploaded=await db.storage.from('emulator-games').upload(path,rom,{contentType:'application/octet-stream'});
   if(uploaded.error)throw uploaded.error;
   const saved=await db.from('emulator_games').insert({title,console:consoleId,storage_path:path,published:true});
   if(saved.error){await db.storage.from('emulator-games').remove([path]);throw saved.error}
   status.textContent='Game saved to the library. Refresh to see its case.';
   document.getElementById('emu-title').value='';
   document.getElementById('emu-owner-file').value='';
  }catch(e){status.textContent='Upload failed: '+e.message}finally{button.disabled=false}
 });
})();