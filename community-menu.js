"use strict";
(() => {
 const menus=[...document.querySelectorAll('.community-dropdown')];
 const closeAll=()=>menus.forEach(menu=>{menu.classList.remove('is-open');menu.querySelector('.community-dropdown-trigger')?.setAttribute('aria-expanded','false');});
 for(const menu of menus){
  const button=menu.querySelector('.community-dropdown-trigger');
  const panel=menu.querySelector('.community-dropdown-panel');
  if(!button||!panel)continue;
  button.addEventListener('click',event=>{
   event.preventDefault();event.stopPropagation();
   const shouldOpen=!menu.classList.contains('is-open');
   closeAll();
   if(shouldOpen){menu.classList.add('is-open');button.setAttribute('aria-expanded','true');}
  });
  menu.addEventListener('keydown',event=>{
   if(event.key==='Escape'){closeAll();button.focus();}
  });
  panel.addEventListener('click',event=>event.stopPropagation());
 }
 document.addEventListener('click',event=>{if(!event.target.closest('.community-dropdown'))closeAll();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape')closeAll();});
})();
