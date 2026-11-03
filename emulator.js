(async()=>{'use strict';
const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.58.0');
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
let selectedGame=null;
const $=id=>document.getElementById(id);
const start=$('emu-start'),status=$('emu-status'),file=$('emu-file'),consoleSelect=$('emu-console');
let currentUrl=null,started=false;
const cores={nes:'nes',snes:'snes',gb:'gb',gba:'gba',gbc:'gbc',n64:'n64',segaMD:'segaMD'};
const ext={nes:['nes','zip'],snes:['sfc','smc','zip'],gb:['gb','zip'],gba:['gba','zip'],gbc:['gbc','zip'],n64:['n64','z64','v64','zip'],segaMD:['md','gen','bin','zip']};
start.addEventListener('click',()=>{
 if(started){status.textContent='A game is already running. Refresh this page to load a different game.';return}
 const rom=selectedGame?null:file.files?.[0],core=consoleSelect.value;
 if(!rom&&!selectedGame){status.textContent='Choose a game case or local file first.';return}
 const suffix=(rom?.name||selectedGame?.storage_path||'').split('.').pop().toLowerCase();
 if(!ext[core]?.includes(suffix)){status.textContent='This file type does not match the selected console.';return}
 if(rom&&rom.size>128*1024*1024){status.textContent='Game file is too large (128 MB maximum).';return}
 started=true;start.disabled=true;file.disabled=true;consoleSelect.disabled=true;
 currentUrl=selectedGame?db.storage.from('emulator-games').getPublicUrl(selectedGame.storage_path).data.publicUrl:URL.createObjectURL(rom);
 window.EJS_player='#game';window.EJS_core=cores[core];window.EJS_gameUrl=currentUrl;
 window.EJS_pathtodata='https://cdn.emulatorjs.org/stable/data/';
 window.EJS_startOnLoaded=true;
 window.EJS_color='#8057e7';
 status.textContent='Loading emulator engine… This may take a moment.';
 const script=document.createElement('script');script.src='https://cdn.emulatorjs.org/stable/data/loader.js';
 script.onload=()=>{status.textContent='Emulator loaded. If the game does not start, check compatibility or try a different file.'};
 script.onerror=()=>{status.textContent='Unable to load emulator engine. Check your connection and try refreshing.';started=false;start.disabled=false;file.disabled=false;consoleSelect.disabled=false;if(!selectedGame)URL.revokeObjectURL(currentUrl);currentUrl=null};
 document.body.append(script);
});
$('emu-fullscreen').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await $('emu-screen').requestFullscreen();else await document.exitFullscreen()}catch{status.textContent='Fullscreen is unavailable in this browser.'}});
window.addEventListener('pagehide',()=>{if(currentUrl&&!selectedGame)URL.revokeObjectURL(currentUrl)});

file.addEventListener('change',()=>{selectedGame=null;document.querySelectorAll('.emu-case').forEach(el=>el.classList.remove('selected'))});
async function loadCases(){
 const host=$('emu-library');if(!host)return;
 host.textContent='Loading game cases…';
 const {data,error}=await db.from('emulator_games').select('id,title,console,storage_path').eq('published',true).order('title',{ascending:true});
 if(error){host.textContent='Could not load game library: '+error.message;return}
 host.replaceChildren();
 if(!data?.length){host.textContent='No games have been published yet. Game cases will appear here once games are uploaded.';return}
 const grid=document.createElement('div');grid.className='emu-case-grid';
 for(const game of data){
  const caseEl=document.createElement('button');caseEl.type='button';caseEl.className='emu-case';caseEl.disabled=started;
  const cover=document.createElement('span');cover.className='emu-case-cover';
  const spine=document.createElement('span');spine.className='emu-case-spine';spine.textContent=game.console.toUpperCase();
  const art=document.createElement('span');art.className='emu-case-art';art.textContent='🎮';
  const coverTitle=document.createElement('span');coverTitle.className='emu-case-cover-title';coverTitle.textContent=game.title;
  const title=document.createElement('span');title.className='emu-case-name';title.textContent=game.title;
  cover.append(spine,art,coverTitle);caseEl.append(cover,title);
  caseEl.addEventListener('click',()=>{
   if(started)return;selectedGame=game;file.value='';consoleSelect.value=game.console;
   grid.querySelectorAll('.emu-case').forEach(el=>el.classList.remove('selected'));caseEl.classList.add('selected');
   status.textContent=game.title+' selected. Press Start Game to play.';
   $('emu-screen').scrollIntoView({behavior:'smooth',block:'center'});
  });grid.append(caseEl)
 }host.append(grid)
}
await loadCases();
})();