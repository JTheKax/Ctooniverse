"use strict";
const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

/* Keep the Owner navigation stable across refreshes while verifying membership.
   A cached hint never grants access: the signed-in user must match and the
   Owner dashboard independently verifies permissions on every visit. */
(async () => {
  const links=[...document.querySelectorAll('.owner-nav')];
  if(!links.length)return;
  const cacheKey='ctooniverse-verified-owner-id';
  const setVisible=visible=>document.querySelectorAll('.owner-nav').forEach(link=>{
    link.classList.toggle('owner-visible',visible);
    link.style.setProperty('display',visible?'inline-flex':'none','important');
  });
  try{
    const {createClient}=await import('https://esm.sh/@supabase/supabase-js@2.58.0');
    const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
    let checkId=0,confirmedUserId=null;
    async function verify(){
      const id=++checkId;
      try{
        const {data:{user},error}=await db.auth.getUser();
        if(id!==checkId)return;
        if(error||!user){
          confirmedUserId=null;sessionStorage.removeItem(cacheKey);setVisible(false);return;
        }
        const sameUser=confirmedUserId===user.id||sessionStorage.getItem(cacheKey)===user.id;
        setVisible(sameUser);
        const {data,error:membershipError}=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();
        if(id!==checkId)return;
        if(!membershipError){
          if(data){
            confirmedUserId=user.id;sessionStorage.setItem(cacheKey,user.id);setVisible(true);
          }else{
            confirmedUserId=null;sessionStorage.removeItem(cacheKey);setVisible(false);
          }
        }else if(!sameUser)setVisible(false);
      }catch(_){
        if(id===checkId&&confirmedUserId===null)setVisible(false);
      }
    }
    let lastAuthUserId;
    db.auth.onAuthStateChange((event,session)=>{
      if(event!=='SIGNED_IN'&&event!=='SIGNED_OUT')return;
      const next=session?.user?.id||null;
      if(lastAuthUserId===next)return;
      lastAuthUserId=next;
      setTimeout(verify,100);
    });
    await verify();
  }catch(_){setVisible(false);}
})();

/* Decorative Saturn layers; no impact on authentication or page controls. */
(() => {
  if (!document.querySelector('.saturn-scene')) {
    const scene = document.createElement('div');
    scene.className = 'saturn-scene';
    scene.setAttribute('aria-hidden', 'true');
    scene.innerHTML = '<div class="saturn-rings"></div><div class="saturn-planet"></div><div class="saturn-rings saturn-rings-front"></div>';
    document.body.prepend(scene);
  }
})();

/* Sparse, decorative shooting stars (no network or user data). */
(() => {
 if (document.querySelector('.shooting-star')) return;
 for(let i=0;i<2;i++){const star=document.createElement('span');star.className='shooting-star';star.setAttribute('aria-hidden','true');document.body.prepend(star);}
})();


/* Site-wide CToons navigation dropdown, accessible on desktop and mobile. */
(() => {
 const nav=document.querySelector('.site-header nav');
 if(!nav||nav.querySelector('.ctoons-dropdown'))return;
 const original=[...nav.querySelectorAll('a.nav-link')].find(a=>{try{return new URL(a.href,location.href).pathname.endsWith('/ctoons.html')}catch{return false}});
 if(!original)return;
 const wrapper=document.createElement('div');wrapper.className='ctoons-dropdown';
 const button=document.createElement('button');button.type='button';button.className='nav-link ctoons-dropdown-trigger';
 if(original.classList.contains('active')||location.pathname.endsWith('/my-collection.html')||location.pathname.endsWith('/czone.html'))button.classList.add('active');
 button.setAttribute('aria-haspopup','true');button.setAttribute('aria-expanded','false');
 button.innerHTML='<span class="nav-icon" aria-hidden="true">▣</span><span>CToons</span><span aria-hidden="true">▾</span>';
 const panel=document.createElement('div');panel.className='ctoons-dropdown-panel';
 for(const [label,url] of [['CToons','ctoons.html'],['My Collection','my-collection.html'],['CZone','czone.html'],['Trades','trades.html']]){
  const a=document.createElement('a');a.href=url;a.textContent=label;
  if(location.pathname.endsWith('/'+url))a.setAttribute('aria-current','page');
  panel.append(a);
 }
 const close=()=>{wrapper.classList.remove('is-open');button.setAttribute('aria-expanded','false')};
 button.addEventListener('click',()=>{const open=!wrapper.classList.contains('is-open');wrapper.classList.toggle('is-open',open);button.setAttribute('aria-expanded',String(open))});
 wrapper.addEventListener('keydown',e=>{if(e.key==='Escape'){close();button.focus()}});
 document.addEventListener('click',e=>{if(!wrapper.contains(e.target))close()});
 wrapper.append(button,panel);original.replaceWith(wrapper);
})();


/* Shop dropdown shared across desktop and mobile navigation. */
(() => {
 const nav=document.querySelector('.site-header nav');
 if(!nav||nav.querySelector('.shop-dropdown'))return;
 const original=[...nav.querySelectorAll('a.nav-link')].find(a=>{try{return new URL(a.href,location.href).pathname.endsWith('/shop.html')}catch{return false}});
 if(!original)return;
 const wrap=document.createElement('div');wrap.className='ctoons-dropdown shop-dropdown';
 const btn=document.createElement('button');btn.type='button';btn.className='nav-link ctoons-dropdown-trigger';
 if(['shop.html','auction.html'].some(p=>location.pathname.endsWith('/'+p)))btn.classList.add('active');
 btn.setAttribute('aria-haspopup','true');btn.setAttribute('aria-expanded','false');
 btn.innerHTML='<span class="nav-icon" aria-hidden="true">🛒</span><span>Shop</span><span aria-hidden="true">▾</span>';
 const panel=document.createElement('div');panel.className='ctoons-dropdown-panel';
 for(const [label,url] of [['Shop','shop.html'],['Auction House','auction.html']]){
  const link=document.createElement('a');link.href=url;link.textContent=label;
  if(location.pathname.endsWith('/'+url))link.setAttribute('aria-current','page');
  panel.append(link);
 }
 const close=()=>{wrap.classList.remove('is-open');btn.setAttribute('aria-expanded','false')};
 btn.addEventListener('click',()=>{const open=!wrap.classList.contains('is-open');wrap.classList.toggle('is-open',open);btn.setAttribute('aria-expanded',String(open))});
 wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){close();btn.focus()}});
 document.addEventListener('click',e=>{if(!wrap.contains(e.target))close()});
 wrap.append(btn,panel);original.replaceWith(wrap);
})();

/* Games dropdown: separate emulator page. */
(() => {
 const nav=document.querySelector('.site-header nav');
 if(!nav||nav.querySelector('.games-dropdown'))return;
 const original=[...nav.querySelectorAll('a.nav-link')].find(a=>{try{return new URL(a.href,location.href).pathname.endsWith('/games.html')}catch{return false}});
 if(!original)return;
 const wrap=document.createElement('div');wrap.className='ctoons-dropdown games-dropdown';
 const btn=document.createElement('button');btn.type='button';btn.className='nav-link ctoons-dropdown-trigger';
 if(location.pathname.endsWith('/games.html')||location.pathname.endsWith('/emulator.html')||location.pathname.endsWith('/prize-wheel.html')||location.pathname.endsWith('/pinball.html')||location.pathname.endsWith('/prize-games.html'))btn.classList.add('active');
 btn.setAttribute('aria-haspopup','true');btn.setAttribute('aria-expanded','false');
 btn.innerHTML='<span class="nav-icon" aria-hidden="true">🎮</span><span>Games</span><span aria-hidden="true">▾</span>';
 const panel=document.createElement('div');panel.className='ctoons-dropdown-panel';
 for(const [label,url] of [['Games','games.html'],['Video Game Emulator','emulator.html'],['Prize Games','prize-games.html']]){
  const a=document.createElement('a');a.href=url;a.textContent=label;if(location.pathname.endsWith('/'+url))a.setAttribute('aria-current','page');panel.append(a);
 }
 const close=()=>{wrap.classList.remove('is-open');btn.setAttribute('aria-expanded','false')};
 btn.addEventListener('click',()=>{const open=!wrap.classList.contains('is-open');wrap.classList.toggle('is-open',open);btn.setAttribute('aria-expanded',String(open))});
 wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){close();btn.focus()}});
 document.addEventListener('click',e=>{if(!wrap.contains(e.target))close()});
 wrap.append(btn,panel);original.replaceWith(wrap);
})();

/* Dedicated top-level CToon Clash tab on every standard site page. */
(() => {
 const nav=document.querySelector('.site-header nav');
 if(!nav||nav.querySelector('.clash-nav-link'))return;
 const link=document.createElement('a');link.href='clash.html';link.className='nav-link clash-nav-link';
 if(location.pathname.endsWith('/clash.html')){link.classList.add('active');link.setAttribute('aria-current','page')}
 const icon=document.createElement('span');icon.className='nav-icon';icon.setAttribute('aria-hidden','true');icon.textContent='⚔';
 const label=document.createElement('span');label.textContent='CToon Clash';link.append(icon,label);
 const games=[...nav.querySelectorAll('a.nav-link')].find(a=>a.getAttribute('href')==='games.html');
 const dropdown=nav.querySelector('.games-dropdown');
 const anchor=dropdown||games;
 if(anchor)anchor.after(link);else nav.append(link);
})();

/* Load the shared mobile stylesheet on every page that uses site navigation. */
(function(){
  if(document.querySelector('link[data-mobile-layout]'))return;
  const sheet=document.createElement('link');
  sheet.rel='stylesheet';sheet.href='mobile-responsive.css?v=20261105-1';
  sheet.setAttribute('data-mobile-layout','');
  document.head.appendChild(sheet);
})();

/* Sitewide Cash App support link, appended once to each page footer. */
(function(){
 const footer=document.querySelector('footer');
 if(!footer||footer.querySelector('[data-ctoon-donate]'))return;
 const link=document.createElement('a');link.href='https://cash.app/$jomanmax28';link.target='_blank';link.rel='noopener noreferrer';
 link.textContent='♥ Support CTooniverse';link.setAttribute('aria-label','Support CTooniverse through Cash App (opens in a new tab)');link.setAttribute('data-ctoon-donate','');
 link.style.cssText='display:inline-flex;align-items:center;justify-content:center;padding:.7rem 1.15rem;border:2px solid #8cecff;border-radius:999px;background:linear-gradient(120deg,#233caa,#702cb6);color:#fff;font-weight:800;text-decoration:none;box-shadow:0 0 15px #7c55ff88;margin:.5rem;white-space:nowrap';
 footer.append(link);
})();
