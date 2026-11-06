(async()=>{'use strict';
const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.58.0');
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
let selectedGame=null;
const $=id=>document.getElementById(id);
const start=$('emu-start'),status=$('emu-status'),file=$('emu-file'),consoleSelect=$('emu-console');
let currentUrl=null,started=false;
const cores={nes:'nes',snes:'snes',gb:'gb',gba:'gba',gbc:'gbc',n64:'n64',segaMD:'segaMD',nds:'nds',psx:'psx'};
const ext={nes:['nes','zip'],snes:['sfc','smc','zip'],gb:['gb','zip'],gba:['gba','zip'],gbc:['gbc','zip'],n64:['n64','z64','v64','zip'],segaMD:['md','gen','bin','zip'],nds:['nds','zip'],psx:['chd','pbp','iso','zip']};
function stopGame(){
 const screen=$('game');screen.replaceChildren();
 if(currentUrl&&currentUrl.startsWith('blob:'))URL.revokeObjectURL(currentUrl);
 currentUrl=null;started=false;start.textContent='Start Game';start.disabled=false;file.disabled=false;consoleSelect.disabled=false;
 document.querySelectorAll('.emu-case[data-game-id]').forEach(el=>el.disabled=false);
 $('emu-screen').classList.remove('nds-active');const help=$('emu-nds-help');if(help)help.hidden=true;
 status.textContent='Game stopped. Select another game or press Start Game.';
}
function launchGame(){
 if(started){stopGame();return}
 const rom=selectedGame?null:file.files?.[0],core=consoleSelect.value;
 if(!rom&&!selectedGame){status.textContent='Choose a game case or local file first.';return}
 const suffix=(rom?.name||selectedGame?.storage_path||'').split('.').pop().toLowerCase();
 if(!ext[core]?.includes(suffix)){status.textContent='This file type does not match the selected console.';return}
 if(rom&&rom.size>(core==='psx'?1024:128)*1024*1024){status.textContent='Game file is too large for this console.';return}
 started=true;start.textContent='Stop Game';file.disabled=false;consoleSelect.disabled=false;
 currentUrl=selectedGame?db.storage.from('emulator-games').getPublicUrl(selectedGame.storage_path).data.publicUrl:URL.createObjectURL(rom);
 const frame=document.createElement('iframe');frame.title='CTooniverse game player';frame.allow='fullscreen; autoplay; gamepad';frame.style.cssText='width:100%;height:100%;min-height:380px;border:0;display:block';
 // Isolate each EmulatorJS instance so switching never reuses its global state.
 const config={EJS_player:'#game',EJS_core:cores[core],EJS_gameUrl:currentUrl,EJS_pathtodata:'https://cdn.emulatorjs.org/stable/data/',EJS_startOnLoaded:true,EJS_VirtualGamepadSettings:core==='nds'?{enabled:true}:undefined,EJS_color:'#8057e7',EJS_Buttons:{playPause:true,restart:true,mute:true,settings:true,fullscreen:true,saveState:true,loadState:true},EJS_startButtonName:'Play'};
 const serialized=JSON.stringify(config).replace(/</g,'\\u003c');
 frame.srcdoc='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#030712"><div id="game" style="height:100vh;width:100%"></div><script>Object.assign(window,'+serialized+');<\\/script><script src="https://cdn.emulatorjs.org/stable/data/loader.js"><\\/script></body></html>';
 $('game').replaceChildren(frame);
 $('emu-screen').classList.toggle('nds-active',core==='nds');const help=$('emu-nds-help');if(help)help.hidden=core!=='nds';
 status.textContent='Loading game… Use Stop Game to switch to another game.';
}
start.addEventListener('click',launchGame);
$('emu-fullscreen').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await $('emu-screen').requestFullscreen();else await document.exitFullscreen()}catch{status.textContent='Fullscreen is unavailable in this browser.'}});
window.addEventListener('pagehide',()=>{if(currentUrl?.startsWith('blob:'))URL.revokeObjectURL(currentUrl)});

file.addEventListener('change',()=>{if(started)stopGame();selectedGame=null;document.querySelectorAll('.emu-case').forEach(el=>el.classList.remove('selected'))});
async function loadCases(){
 const host=$('emu-library');if(!host)return;
 host.textContent='Loading game cases…';
 const {data,error}=await db.from('emulator_games').select('id,title,console,storage_path,cover_path').eq('published',true).order('title',{ascending:true});
 if(error){host.textContent='Could not load game library: '+error.message;return}
 host.replaceChildren();
 if(!data?.length){
  const consoles=[['Game Boy','gb'],['Game Boy Advance','gba'],['Game Boy Color','gbc'],['Nintendo 64','n64'],['Nintendo DS','nds'],['PlayStation 1','psx'],['Nintendo Entertainment System','nes'],['Sega Genesis / Mega Drive','segaMD'],['Super Nintendo','snes']];
  const grid=document.createElement('div');grid.className='emu-case-grid';
  for(const [name,code] of consoles){
    const item=document.createElement('div');item.className='emu-case emu-case-placeholder emu-system-'+code;
    const cover=document.createElement('span');cover.className='emu-case-cover';
    const spine=document.createElement('span');spine.className='emu-case-spine';spine.textContent=code==='gba'?'':code.toUpperCase();
    const art=document.createElement('span');art.className='emu-case-art';art.textContent='🎮';
    const title=document.createElement('span');title.className='emu-case-cover-title';title.textContent=name;
    const caption=document.createElement('span');caption.className='emu-case-name';caption.textContent='COMING SOON';
    cover.append(spine,art,title);item.append(cover,caption);grid.append(item);
  }
  host.append(grid);return
 }
 const grid=document.createElement('div');grid.className='emu-case-grid';
 for(const game of data){
  const caseEl=document.createElement('button');caseEl.type='button';caseEl.dataset.gameId=game.id;caseEl.className='emu-case emu-system-'+game.console;caseEl.disabled=false;
  const cover=document.createElement('span');cover.className='emu-case-cover';
  const spine=document.createElement('span');spine.className='emu-case-spine';spine.textContent=game.console==='gba'?'':game.console.toUpperCase();
  const art=document.createElement('span');art.className='emu-case-art';art.textContent='🎮';
  const image=document.createElement('img');image.className='emu-case-image';image.alt=game.title+' cover art';image.loading='lazy';
  const slug=game.title.toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const imageUrl=game.cover_path?db.storage.from('emulator-covers').getPublicUrl(game.cover_path).data.publicUrl:'images/emulator-covers/'+slug+'.png';
  image.addEventListener('load',()=>{cover.classList.add('has-cover-art');art.hidden=true;const w=image.naturalWidth,h=image.naturalHeight;if(w>0&&h>0){const maxWidth=window.matchMedia('(max-width:700px)').matches?112:140;const width=Math.min(w,maxWidth);caseEl.style.setProperty('--art-case-width',width+'px');caseEl.style.setProperty('--art-case-ratio',w+' / '+h);}});
  image.addEventListener('error',()=>{image.hidden=true;cover.classList.remove('has-cover-art');art.hidden=false});
  image.src=imageUrl;
  cover.append(image);
  const coverTitle=document.createElement('span');coverTitle.className='emu-case-cover-title';coverTitle.textContent=game.title;
  const title=document.createElement('span');title.className='emu-case-name';title.textContent=game.title;
  cover.append(spine,art,coverTitle);caseEl.append(cover,title);
  caseEl.addEventListener('click',()=>{
   if(started)stopGame();selectedGame=game;file.value='';consoleSelect.value=game.console;
   grid.querySelectorAll('.emu-case').forEach(el=>el.classList.remove('selected'));caseEl.classList.add('selected');
   status.textContent=game.title+' selected. Press Start Game to play.';
   $('emu-screen').scrollIntoView({behavior:'smooth',block:'start'});
  });grid.append(caseEl)
 }host.append(grid)
}
window.ctoonPlayGameCase=async gameId=>{
 if(started)stopGame();
 const {data:game,error}=await db.from('emulator_games').select('id,title,console,storage_path').eq('id',gameId).eq('published',true).single();
 if(error||!game){status.textContent='Unable to load this published game.';return false}
 selectedGame=game;file.value='';consoleSelect.value=game.console;
 document.querySelectorAll('.emu-case').forEach(el=>el.classList.toggle('selected',el.dataset.gameId===String(game.id)));
 $('emu-screen').scrollIntoView({behavior:'smooth',block:'start'});
 start.click();
 return true;
};
window.ctoonReloadGameCases=loadCases;
await loadCases();
})();