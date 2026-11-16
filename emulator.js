(async()=>{'use strict';
const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.58.0');
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
let selectedGame=null;
const $=id=>document.getElementById(id);
const start=$('emu-start'),status=$('emu-status'),file=$('emu-file'),consoleSelect=$('emu-console'),biosFile=$('emu-bios');
let currentUrl=null,currentBiosUrl=null,started=false,loadTimer=null;
function setStatus(message,error=false){status.textContent=message;status.dataset.error=String(error);}
function clearUrl(url){if(url&&url.startsWith('blob:'))URL.revokeObjectURL(url);}
function idleScreen(){
 const host=$('game'),idle=document.createElement('div');
 idle.className='emu-idle';
 const icon=document.createElement('span');icon.textContent='🕹️';
 const heading=document.createElement('strong');heading.textContent='READY PLAYER ONE';
 const help=document.createElement('small');help.textContent='Select a game to power on the console';
 idle.append(icon,heading,help);host.replaceChildren(idle);
}

const cores={nes:'nes',snes:'snes',gb:'gb',gba:'gba',gbc:'gbc',n64:'n64',segaMD:'segaMD',nds:'nds',psx:'psx'};
const ext={nes:['nes','zip'],snes:['sfc','smc','zip'],gb:['gb','zip'],gba:['gba','zip'],gbc:['gbc','zip'],n64:['n64','z64','v64','zip'],segaMD:['md','gen','bin','zip'],nds:['nds','zip'],psx:['chd','pbp','iso','zip']};
function stopGame(){
 if(loadTimer){clearTimeout(loadTimer);loadTimer=null}
 idleScreen();
 clearUrl(currentUrl);clearUrl(currentBiosUrl);
 currentUrl=null;currentBiosUrl=null;started=false;start.textContent='▶ Start Game';start.disabled=false;
 file.disabled=false;consoleSelect.disabled=false;if(biosFile)biosFile.disabled=false;
 document.querySelectorAll('.emu-case[data-game-id]').forEach(el=>el.disabled=false);
 $('emu-screen').classList.remove('nds-active');const help=$('emu-nds-help');if(help)help.hidden=true;
 setStatus('Game stopped. Select another game or press Start Game.');
}
function launchGame(){
 if(started){stopGame();return}
 const rom=selectedGame?null:file.files?.[0],core=consoleSelect.value;
 if(!rom&&!selectedGame){status.textContent='Choose a game case or local file first.';return}
 const suffix=(rom?.name||selectedGame?.storage_path||'').split('?')[0].split('.').pop().toLowerCase();
 if(selectedGame&&selectedGame.console!==core){setStatus('The selected case uses a different console. Select the matching console.',true);return}
 if(!ext[core]?.includes(suffix)){setStatus('This file type does not match the selected console.',true);return}
 if(rom&&rom.size>(core==='psx'?1024:128)*1024*1024){setStatus('Game file is too large for this console. Try a smaller file or a desktop browser.',true);return}
 const bios=biosFile?.files?.[0];
 if(bios&&bios.size>16*1024*1024){setStatus('BIOS file cannot exceed 16 MB.',true);return}
 if(bios&&!['bin','rom','zip','bios'].includes(bios.name.split('.').pop().toLowerCase())){
   setStatus('Choose a .bin, .rom, .zip or .bios file for the optional BIOS.',true);return
 }
 started=true;start.textContent='■ Stop Game';file.disabled=true;consoleSelect.disabled=true;
 if(biosFile)biosFile.disabled=true;
 currentUrl=selectedGame?db.storage.from('emulator-games').getPublicUrl(selectedGame.storage_path).data.publicUrl:URL.createObjectURL(rom);
 currentBiosUrl=bios?URL.createObjectURL(bios):null;
 const frame=document.createElement('iframe');frame.title='CTooniverse game player';frame.allow='fullscreen; autoplay; gamepad';frame.setAttribute('allowfullscreen','');frame.style.cssText='width:100%;height:100%;min-height:0;border:0;display:block';
 // Isolate each EmulatorJS instance so switching never reuses its global state.
 const config={EJS_player:'#game',EJS_core:cores[core],EJS_gameUrl:currentUrl,EJS_biosUrl:currentBiosUrl||undefined,EJS_pathtodata:'https://cdn.emulatorjs.org/stable/data/',EJS_startOnLoaded:true,EJS_VirtualGamepadSettings:core==='nds'?{enabled:true,opacity:0.75}:undefined,EJS_color:'#8057e7',EJS_Buttons:{playPause:true,restart:true,mute:true,settings:true,fullscreen:true,saveState:true,loadState:true},EJS_startButtonName:'Play'};
 const serialized=JSON.stringify(config).replace(/</g,'\\u003c');
 frame.srcdoc='<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body style="margin:0;background:#030712;overflow:hidden"><div id="game" style="height:100dvh;width:100%;touch-action:auto"></div><script>Object.assign(window,'+serialized+');<\/script><script src="https://cdn.emulatorjs.org/stable/data/loader.js"><\/script></body></html>';
 $('game').replaceChildren(frame);
 $('emu-screen').classList.toggle('nds-active',core==='nds');const help=$('emu-nds-help');if(help)help.hidden=core!=='nds';
 setStatus(core==='nds'?'Loading Nintendo DS… Touch the bottom screen to use the stylus. Tap inside the player to enable audio.':'Loading '+(selectedGame?.title||rom?.name||'game')+'… Use Stop Game to switch games.');
 loadTimer=setTimeout(()=>{
  if(started)setStatus('Still loading. Larger Nintendo DS, Nintendo 64 and PlayStation games can take time or require more memory. If the player stays blank, try a different file/core or a desktop browser.');
 },24000);
}
start.addEventListener('click',launchGame);
$('emu-fullscreen').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await $('emu-screen').requestFullscreen();else await document.exitFullscreen()}catch{status.textContent='Fullscreen is unavailable in this browser.'}});
window.addEventListener('pagehide',()=>{clearUrl(currentUrl);clearUrl(currentBiosUrl);});

file.addEventListener('change',()=>{
 if(started)stopGame();
 selectedGame=null;
 document.querySelectorAll('.emu-case').forEach(el=>el.classList.remove('selected'));
 if(file.files?.[0])setStatus(file.files[0].name+' selected. Press Start Game when ready.');
});
consoleSelect.addEventListener('change',()=>{
 if(started)stopGame();
 selectedGame=null;
 document.querySelectorAll('.emu-case').forEach(el=>el.classList.remove('selected'));
 setStatus('Console changed. Select a compatible local game file or a case from this system.');
});
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
 const consoleNames={gb:'Game Boy',gba:'Game Boy Advance',gbc:'Game Boy Color',n64:'Nintendo 64',nds:'Nintendo DS',nes:'Nintendo Entertainment System',psx:'PlayStation 1',segaMD:'Sega Genesis / Mega Drive',snes:'Super Nintendo'};
 const sections=new Map();
 for(const [code,name] of Object.entries(consoleNames)){
  if(!data.some(game=>game.console===code))continue;
  const section=document.createElement('section');section.className='emu-console-section';section.dataset.console=code;
  const heading=document.createElement('h3');heading.textContent=name;heading.style.cssText='margin:1.5rem 0 .75rem;color:#a9eaff';
  const grid=document.createElement('div');grid.className='emu-case-grid';section.append(heading,grid);host.append(section);sections.set(code,grid);
 }
 for(const game of data){
  const grid=sections.get(game.console);if(!grid)continue;
  const wrapper=document.createElement('div');wrapper.className='emu-case-wrap emu-system-'+game.console;
  const caseEl=document.createElement('button');caseEl.type='button';caseEl.dataset.gameId=game.id;caseEl.className='emu-case emu-system-'+game.console;caseEl.disabled=false;
  const cover=document.createElement('span');cover.className='emu-case-cover';
  const spine=document.createElement('span');spine.className='emu-case-spine';spine.textContent=game.console==='gba'?'':game.console.toUpperCase();
  const art=document.createElement('span');art.className='emu-case-art';art.textContent='🎮';
  const image=document.createElement('img');image.className='emu-case-image';image.alt=game.title+' cover art';image.loading='lazy';
  const slug=game.title.toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const imageUrl=game.cover_path?db.storage.from('emulator-covers').getPublicUrl(game.cover_path).data.publicUrl:'images/emulator-covers/'+slug+'.png';
  image.addEventListener('load',()=>{cover.classList.add('has-cover-art');art.hidden=true;image.hidden=false;});
  image.addEventListener('error',()=>{image.hidden=true;cover.classList.remove('has-cover-art');art.hidden=false});
  image.src=imageUrl;
  cover.append(image);
  const coverTitle=document.createElement('span');coverTitle.className='emu-case-cover-title';coverTitle.textContent=game.title;
  const title=document.createElement('span');title.className='emu-case-name';title.textContent=game.title;
  cover.append(spine,art,coverTitle);caseEl.append(cover,title);
  caseEl.addEventListener('click',()=>{
   if(started)stopGame();selectedGame=game;file.value='';consoleSelect.value=game.console;
   host.querySelectorAll('.emu-case').forEach(el=>el.classList.remove('selected'));caseEl.classList.add('selected');
   status.textContent=game.title+' selected. Press Start Game to play.';
   $('emu-screen').scrollIntoView({behavior:'smooth',block:'start'});
  });
  const play=document.createElement('button');
  play.className='emu-case-play';play.type='button';
  play.textContent='▶ Play';play.setAttribute('aria-label','Play '+game.title);
  play.addEventListener('click',()=>{
    window.ctoonPlayGameCase(game.id).catch(error=>setStatus('Unable to launch game: '+error.message,true));
  });
  wrapper.append(caseEl,play);grid.append(wrapper)
 }
}
window.ctoonPlayGameCase=async gameId=>{
 if(started)stopGame();
 const {data:game,error}=await db.from('emulator_games').select('id,title,console,storage_path').eq('id',gameId).eq('published',true).single();
 if(error||!game){setStatus('Unable to load this published game.',true);return false}
 selectedGame=game;file.value='';consoleSelect.value=game.console;
 document.querySelectorAll('.emu-case').forEach(el=>el.classList.toggle('selected',el.dataset.gameId===String(game.id)));
 $('emu-screen').scrollIntoView({behavior:'smooth',block:'start'});
 start.click();
 return true;
};
window.ctoonReloadGameCases=loadCases;
await loadCases();
})();