(()=>{'use strict';
const $=id=>document.getElementById(id);
const start=$('emu-start'),status=$('emu-status'),file=$('emu-file'),consoleSelect=$('emu-console');
let currentUrl=null,started=false;
const cores={nes:'nes',snes:'snes',gb:'gb',gba:'gba',gbc:'gbc',n64:'n64',segaMD:'segaMD'};
const ext={nes:['nes','zip'],snes:['sfc','smc','zip'],gb:['gb','zip'],gba:['gba','zip'],gbc:['gbc','zip'],n64:['n64','z64','v64','zip'],segaMD:['md','gen','bin','zip']};
start.addEventListener('click',()=>{
 if(started){status.textContent='A game is already running. Refresh this page to load a different game.';return}
 const rom=file.files?.[0],core=consoleSelect.value;
 if(!rom){status.textContent='Choose a game file first.';return}
 const suffix=rom.name.split('.').pop().toLowerCase();
 if(!ext[core]?.includes(suffix)){status.textContent='This file type does not match the selected console.';return}
 if(rom.size>128*1024*1024){status.textContent='Game file is too large (128 MB maximum).';return}
 started=true;start.disabled=true;file.disabled=true;consoleSelect.disabled=true;
 currentUrl=URL.createObjectURL(rom);
 window.EJS_player='#game';window.EJS_core=cores[core];window.EJS_gameUrl=currentUrl;
 window.EJS_pathtodata='https://cdn.emulatorjs.org/stable/data/';
 window.EJS_startOnLoaded=true;
 window.EJS_color='#8057e7';
 status.textContent='Loading emulator engine… This may take a moment.';
 const script=document.createElement('script');script.src='https://cdn.emulatorjs.org/stable/data/loader.js';
 script.onload=()=>{status.textContent='Emulator loaded. If the game does not start, check compatibility or try a different file.'};
 script.onerror=()=>{status.textContent='Unable to load emulator engine. Check your connection and try refreshing.';started=false;start.disabled=false;file.disabled=false;consoleSelect.disabled=false;URL.revokeObjectURL(currentUrl);currentUrl=null};
 document.body.append(script);
});
$('emu-fullscreen').addEventListener('click',async()=>{try{if(!document.fullscreenElement)await $('emu-screen').requestFullscreen();else await document.exitFullscreen()}catch{status.textContent='Fullscreen is unavailable in this browser.'}});
window.addEventListener('pagehide',()=>{if(currentUrl)URL.revokeObjectURL(currentUrl)});
})();