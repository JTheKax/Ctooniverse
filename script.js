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
 if(['games.html','emulator.html','prize-wheel.html','pinball.html','prize-games.html','speedway.html','hero-battle.html'].some(p=>location.pathname.endsWith('/'+p)))btn.classList.add('active');
 btn.setAttribute('aria-haspopup','true');btn.setAttribute('aria-expanded','false');
 btn.innerHTML='<span class="nav-icon" aria-hidden="true">🎮</span><span>Games</span><span aria-hidden="true">▾</span>';
 const panel=document.createElement('div');panel.className='ctoons-dropdown-panel';
 for(const [label,url] of [['Games','games.html'],['Video Game Emulator','emulator.html'],['Prize Games','prize-games.html'],['CToon Speedway','speedway.html'],['CToon Heroes: Battle Quest','hero-battle.html']]){
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
 const label=document.createElement('span');label.textContent='Cards';link.append(icon,label);
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
 link.style.cssText='display:inline-flex;align-items:center;justify-content:center;padding:.7rem 1.15rem;border:2px solid #8cecff;border-radius:999px;background:linear-gradient(120deg,#233caa,#702cb6);color:#fff;font-weight:800;text-decoration:none;box-shadow:0 0 15px #7c55ff88;margin:.25rem .15rem;white-space:nowrap';
 footer.append(link);
})();

/* Shared Discord footer link beside the Cash App support button. */
(function(){
 const footer=document.querySelector('footer');
 if(!footer||footer.querySelector('[data-ctoon-discord]'))return;
 const link=document.createElement('a');
 link.href='https://discord.gg/kKfPxFYm9';
 link.target='_blank';
 link.rel='noopener noreferrer';
 link.textContent='Join Our Discord';
 link.setAttribute('aria-label','Join the CTooniverse Discord server (opens in a new tab)');
 link.setAttribute('data-ctoon-discord','');
 link.style.cssText='display:inline-flex;align-items:center;justify-content:center;padding:.7rem 1.15rem;border:2px solid #8cecff;border-radius:999px;background:linear-gradient(120deg,#3546ba,#6941c6);color:#fff;font-weight:800;text-decoration:none;box-shadow:0 0 15px #7c55ff88;margin:.25rem .15rem;white-space:nowrap';
 footer.append(link);
})();

/* Keep footer support links grouped closely together across layouts. */
(function(){
 const footer=document.querySelector('footer');if(!footer)return;
 const donation=footer.querySelector('[data-ctoon-donate]'),discord=footer.querySelector('[data-ctoon-discord]');
 if(!donation||!discord)return;
 const group=document.createElement('span');group.className='ctoon-footer-actions';
 group.style.cssText='display:inline-flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:.35rem;vertical-align:middle';
 footer.insertBefore(group,donation);group.append(donation,discord);
})();


/* Automatically cross-link matching Cartoon & Anime / Video Games CToon sets.
   Read the two category pages at runtime so newly added cards are discovered
   without maintaining a second list or duplicating collectibles. */
(() => {
  const current = location.pathname.split('/').pop().toLowerCase();
  const categories = {'cartoons.html':'video-games.html','video-games.html':'cartoons.html'};
  const counterpart = categories[current];
  if (!counterpart) return;
  const normalize = value => String(value || '')
    .replace(/\b(?:ctoons?|sets?|collection|series)\b/gi, '')
    .replace(/[^a-z0-9]+/gi, '')
    .toLowerCase();
  const cards = grid => [...grid.children].filter(card => card.matches('a,article'));
  const label = card => card.querySelector('h3,h2')?.textContent?.trim() || '';
  const href = card => card.matches('a[href]') ? card.getAttribute('href') : null;
  const localCards = document.querySelector('.ctoon-subseries-grid');
  if (!localCards) return;
  fetch(counterpart, {cache:'no-cache'})
    .then(response => {if (!response.ok) throw new Error('Unable to load related sets');return response.text()})
    .then(html => {
      const remote = new DOMParser().parseFromString(html, 'text/html');
      const remoteGrid = remote.querySelector('.ctoon-subseries-grid');
      if (!remoteGrid) return;
      const lookup = new Map();
      for (const card of cards(remoteGrid)) {
        const key = normalize(label(card));
        if (key && !lookup.has(key)) lookup.set(key, card);
      }
      for (const card of cards(localCards)) {
        const key = normalize(label(card));
        const match = lookup.get(key);
        if (!match || card.querySelector('[data-linked-series]')) continue;
        const target = href(match) || counterpart + '#' + encodeURIComponent(match.id);
        const link = document.createElement('a');
        link.href = new URL(target, new URL(counterpart, location.href)).href;
        link.dataset.linkedSeries = 'true';
        link.textContent = current === 'cartoons.html' ? '🎮 View Video Game CToons ↗' : '📺 View Cartoon & Anime CToons ↗';
        link.setAttribute('aria-label', link.textContent + ' for ' + label(card));
        link.style.cssText = 'display:block;margin:.6rem .2rem .2rem;padding:.55rem .35rem;border:1px solid #81dfff;border-radius:10px;background:rgba(27,42,112,.85);color:#d7f7ff;font-size:.78rem;font-weight:800;text-align:center;text-decoration:none';
        // A card may already be a link: never nest anchors inside anchors.
        if (card.matches('a')) card.insertAdjacentElement('afterend', link);
        else card.appendChild(link);
      }
    })
    .catch(error => console.warn('CToon linked-series discovery:', error.message));
})();
