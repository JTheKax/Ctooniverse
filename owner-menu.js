"use strict";
const ownerMenus=[...document.querySelectorAll('.owner-menu')];
for(const menu of ownerMenus){
 const trigger=menu.querySelector('.owner-menu-trigger');
 trigger.addEventListener('click',()=>{
  const open=trigger.getAttribute('aria-expanded')==='true';
  for(const other of ownerMenus)other.querySelector('.owner-menu-trigger').setAttribute('aria-expanded','false');
  trigger.setAttribute('aria-expanded',String(!open));
 });
 menu.addEventListener('keydown',event=>{if(event.key==='Escape'){trigger.setAttribute('aria-expanded','false');trigger.focus();}});
}
document.addEventListener('click',event=>{for(const menu of ownerMenus)if(!menu.contains(event.target))menu.querySelector('.owner-menu-trigger').setAttribute('aria-expanded','false');});
