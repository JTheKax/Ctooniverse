"use strict";
/* Use the same Owner dropdown on every page, even where the header has
   the older direct Owner link. Visibility stays controlled by script.js. */
const ownerLinks=[
 ['Dashboard','owner.html'],
 ['Website Status','owner.html#site-operating-controls'],
 ['Coin Management','coin-management.html'],
 ['Redeem Codes','owner-redeem-codes.html'],
 ['Music Management','owner-music-management.html'],
 ['CToon Subseries Manager','owner-subseries.html'],
 ['Upload Game','emulator.html#emu-owner'],
 ['Clash Card Maker','owner-clash-card-maker.html'],
 ['Fighter Manager','owner-fighters.html'],
]; 
ownerLinks.sort((a,b)=>a[0].localeCompare(b[0]));
for(const link of document.querySelectorAll('.site-header nav a.owner-nav, .site-header nav .owner-menu.owner-nav')){
 const menu=document.createElement('div');
 menu.className='owner-menu owner-nav';
 menu.style.setProperty('display',link.classList.contains('owner-visible')?'inline-flex':'none','important');
 if(link.classList.contains('owner-visible'))menu.classList.add('owner-visible');
 const trigger=document.createElement('button');
 trigger.type='button';trigger.className='nav-link owner-menu-trigger';
 if(ownerLinks.some(([,url])=>location.pathname.endsWith('/'+url.split('#')[0])))trigger.classList.add('active');
 trigger.setAttribute('aria-haspopup','true');trigger.setAttribute('aria-expanded','false');
 trigger.innerHTML='<span class="nav-icon" aria-hidden="true">👑</span><span>Owner</span><span aria-hidden="true">▾</span>';
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
/* Preserve keyboard navigation and prevent other dropdowns from covering Owner. */
for(const menu of ownerMenus){
 const trigger=menu.querySelector('.owner-menu-trigger');
 trigger.addEventListener('click',()=>{
  if(trigger.getAttribute('aria-expanded')==='true'){
   for(const other of document.querySelectorAll('.community-dropdown-trigger,.account-dropdown-trigger')){
    other.setAttribute('aria-expanded','false');other.closest('.community-dropdown,.account-dropdown')?.classList.remove('is-open');
   }
  }
 });
}

