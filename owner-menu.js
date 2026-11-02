"use strict";
const ownerMenus=[...document.querySelectorAll('.owner-menu')];
function closeOwnerMenus(){for(const menu of ownerMenus){const button=menu.querySelector('.owner-menu-trigger');button.setAttribute('aria-expanded','false');menu.classList.remove('is-open');}}
for(const menu of ownerMenus){
 const trigger=menu.querySelector('.owner-menu-trigger');
 trigger.addEventListener('click',event=>{
  event.preventDefault();
  const opening=trigger.getAttribute('aria-expanded')!=='true';
  closeOwnerMenus();
  if(opening){trigger.setAttribute('aria-expanded','true');menu.classList.add('is-open');}
 });
 menu.addEventListener('keydown',event=>{
  if(event.key==='Escape'){closeOwnerMenus();trigger.focus();}
 });
 for(const link of menu.querySelectorAll('.owner-menu-panel a'))link.addEventListener('click',closeOwnerMenus);
}
document.addEventListener('click',event=>{if(!event.target.closest('.owner-menu'))closeOwnerMenus();});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeOwnerMenus();});
window.addEventListener('pageshow',closeOwnerMenus);
if(location.hash==='#coin-management'){
 let attempts=0;
 const jump=()=>{
  const target=document.getElementById('coin-management');
  if(target && !target.closest('[hidden]')){target.scrollIntoView({block:'start'});return;}
  if(++attempts<25)setTimeout(jump,150);
 };
 jump();
}
