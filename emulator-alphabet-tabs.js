/* Alphabetical tabs for the emulator library. No changes to game loading or owner controls. */
(()=>{
 const host=document.getElementById('emu-library');const tabs=document.getElementById('emu-letter-tabs');if(!host||!tabs)return;
 const letters=['All',...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'];let active='All';
 function cards(){return [...host.querySelectorAll('.emu-case[data-game-id]')];}
 function initial(card){const title=card.querySelector('.emu-case-name')?.textContent?.trim()||card.querySelector('.emu-case-cover-title')?.textContent?.trim()||'';return /^[A-Z]/i.test(title)?title.charAt(0).toUpperCase():'#';}
 function update(){const items=cards();const available=new Set(items.map(initial));for(const btn of tabs.querySelectorAll('button')){const letter=btn.dataset.letter;btn.disabled=letter!=='All'&&!available.has(letter);btn.setAttribute('aria-pressed',String(letter===active));}for(const card of items)card.hidden=active!=='All'&&initial(card)!==active;const status=document.getElementById('emu-letter-status');if(status)status.textContent=items.length?((active==='All'?items.length:items.filter(c=>!c.hidden).length)+' games shown'+(active==='All'?'':' for '+active)):'No games in the library yet.';}
 for(const letter of letters){const btn=document.createElement('button');btn.type='button';btn.textContent=letter;btn.dataset.letter=letter;btn.className='emu-letter-tab';btn.setAttribute('aria-pressed',String(letter===active));btn.addEventListener('click',()=>{active=letter;update()});tabs.append(btn)}
 const observer=new MutationObserver(()=>update());observer.observe(host,{childList:true,subtree:true});update();
})();
