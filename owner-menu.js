"use strict";
/* Use the same Owner dropdown on every page, even where the header has
   the older direct Owner link. Visibility stays controlled by script.js. */
const ownerLinks=[
 ['Dashboard','owner.html'],
 ['Coin Management','owner.html#coin-management'],
 ['Redeem Codes','owner.html#owner-redeem-codes'],
 ['Music Management','owner.html#music-management'],
 ['Upload Game','emulator.html#emu-owner'],
 ['CToon Maker & Editor','owner.html#ctoon-maker']
]; 
ownerLinks.sort((a,b)=>a[0].localeCompare(b[0]));
for(const link of document.querySelectorAll('.site-header nav a.owner-nav')){
 const menu=document.createElement('div');
 menu.className='owner-menu owner-nav';
 menu.style.setProperty('display',link.classList.contains('owner-visible')?'inline-flex':'none','important');
 if(link.classList.contains('owner-visible'))menu.classList.add('owner-visible');
 const trigger=document.createElement('button');
 trigger.type='button';trigger.className='nav-link owner-menu-trigger';
 if(location.pathname.endsWith('/owner.html'))trigger.classList.add('active');
 trigger.setAttribute('aria-haspopup','true');trigger.setAttribute('aria-expanded','false');
 trigger.innerHTML='<span class="nav-icon" aria-hidden="true">♛</span><span>Owner</span><span aria-hidden="true">▾</span>';
 const panel=document.createElement('div');panel.className='owner-menu-panel';
 for(const [label,url] of ownerLinks){const a=document.createElement('a');a.href=url;a.textContent=label;panel.append(a)}
 menu.append(trigger,panel);link.replaceWith(menu);
}
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
