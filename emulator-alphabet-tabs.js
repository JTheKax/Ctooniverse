/* Combined console and alphabetical filters for the game library. */
(()=>{
 const host=document.getElementById('emu-library'),tabs=document.getElementById('emu-letter-tabs'),consoleTabs=document.getElementById('emu-console-tabs');if(!host||!tabs||!consoleTabs)return;
 const letters=['All',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];let active='All',consoleActive='all';
 const consoles=[['all','All Consoles'],['gb','Game Boy'],['gba','Game Boy Advance'],['gbc','Game Boy Color'],['n64','Nintendo 64'],['nds','Nintendo DS'],['nes','NES'],['psx','PlayStation 1'],['segaMD','Sega Genesis'],['snes','SNES']];
 const cards=()=>[...host.querySelectorAll('.emu-case[data-game-id]')];
 const initial=card=>{const title=card.querySelector('.emu-case-name')?.textContent?.trim()||'';return /^[A-Z]/i.test(title)?title[0].toUpperCase():'#'};
 const consoleOf=card=>consoles.slice(1).find(([id])=>card.classList.contains('emu-system-'+id))?.[0];
 function update(){
  const items=cards(),byConsole=items.filter(c=>consoleActive==='all'||consoleOf(c)===consoleActive),available=new Set(byConsole.map(initial));
  for(const btn of consoleTabs.querySelectorAll('button')){const id=btn.dataset.console;btn.setAttribute('aria-pressed',String(id===consoleActive));btn.disabled=id!=='all'&&!items.some(c=>consoleOf(c)===id)}
  for(const btn of tabs.querySelectorAll('button')){const letter=btn.dataset.letter;btn.disabled=letter!=='All'&&!available.has(letter);btn.setAttribute('aria-pressed',String(letter===active))}
  for(const card of items)card.hidden=!(consoleActive==='all'||consoleOf(card)===consoleActive)||!(active==='All'||initial(card)===active);
  for(const section of host.querySelectorAll('.emu-console-section'))section.hidden=![...section.querySelectorAll('.emu-case[data-game-id]')].some(card=>!card.hidden);
  const count=items.filter(c=>!c.hidden).length,el=document.getElementById('emu-letter-status');if(el)el.textContent=items.length?count+' of '+items.length+' games shown'+(consoleActive==='all'?'':' · '+consoles.find(c=>c[0]===consoleActive)[1]):'No games in the library yet.';
 }
 for(const [id,label] of consoles){const btn=document.createElement('button');btn.type='button';btn.className='emu-letter-tab';btn.textContent=label;btn.dataset.console=id;btn.addEventListener('click',()=>{consoleActive=id;active='All';update()});consoleTabs.append(btn)}
 for(const letter of letters){const btn=document.createElement('button');btn.type='button';btn.className='emu-letter-tab';btn.textContent=letter;btn.dataset.letter=letter;btn.addEventListener('click',()=>{active=letter;update()});tabs.append(btn)}
 new MutationObserver(update).observe(host,{childList:true,subtree:true});update();
})();