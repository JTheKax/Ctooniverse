"use strict";
const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

/* Apply shared green/yellow operational colors to every site header and dropdown. */
(() => {
  const mount=()=>{
    if(!document.querySelector(".site-header, .jam-topbar"))return;
    if(!document.querySelector('link[data-site-status-style]')){
      const style=document.createElement("link");style.rel="stylesheet";
      style.href="site-status.css?v=nav-colors-20261108";style.dataset.siteStatusStyle="true";
      document.head.append(style);
    }
    if(!document.querySelector('script[data-site-status-widget]')){
      const script=document.createElement("script");script.src="site-status.js?v=nav-colors-20261108";
      script.defer=true;script.dataset.siteStatusWidget="true";
      document.head.append(script);
    }
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();

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


/* Consistent CTooniverse navigation on every main site page.
   Keep the existing account, community and owner controls so their auth
   handlers and permission checks continue to work. */
(() => {
  const nav=document.querySelector('.site-header nav');
  if(!nav)return;
  const page=location.pathname.split('/').pop().toLowerCase()||'index.html';
  const link=(label,url,icon)=>{
    const a=document.createElement('a');
    a.href=url;a.className='nav-link';
    a.innerHTML='<span class="nav-icon" aria-hidden="true">'+icon+'</span><span>'+label+'</span>';
    if(page===url){a.classList.add('active');a.setAttribute('aria-current','page');}
    return a;
  };
  const home=link('Home','index.html','⌂');
  const ctoons=link('CToons','ctoons.html','▣');
  const watch=link('Watch','watch.html','▶');
  const shop=link('Shop','shop.html','🛒');

  const games=document.createElement('div');
  games.className='ctoons-dropdown games-dropdown';
  const gamesButton=document.createElement('button');
  gamesButton.type='button';
  gamesButton.className='nav-link ctoons-dropdown-trigger';
  gamesButton.setAttribute('aria-haspopup','true');
  gamesButton.setAttribute('aria-expanded','false');
  gamesButton.setAttribute('aria-controls','games-navigation-panel');
  gamesButton.innerHTML='<span class="nav-icon" aria-hidden="true">🎮</span><span>Games</span><span aria-hidden="true">▾</span>';
  const gamesPanel=document.createElement('div');
  gamesPanel.className='ctoons-dropdown-panel games-dropdown-panel';
  gamesPanel.id='games-navigation-panel';
  const entries=[
    ['Games Hub','games.html'],
    ['CToon Clash','clash.html'],
    ['CToon Heroes: Battle Quest','hero-battle.html'],
    ['CToon Jam','ctoon-jam.html'],
    ['CToon Showdown','fighters.html'],
    ['CToon Speedway','speedway.html'],
    ['Video Game Emulator','emulator.html'],
    ['Prize Games','prize-games.html']
  ];
  const gamesPages=new Set(entries.map(([,url])=>url).concat(['pinball.html','prize-wheel.html']));
  if(gamesPages.has(page))gamesButton.classList.add('active');
  for(const [label,url] of entries){
    const a=document.createElement('a');a.href=url;a.textContent=label;
    if(page===url){a.setAttribute('aria-current','page');}
    if(url==='prize-games.html'&&['pinball.html','prize-wheel.html'].includes(page))a.classList.add('nav-parent-active');
    gamesPanel.append(a);
  }
  games.append(gamesButton,gamesPanel);

  const community=nav.querySelector('.community-dropdown')||(()=>{
    const root=document.createElement('div');root.className='community-dropdown';
    root.innerHTML='<button type="button" class="nav-link community-dropdown-trigger" aria-haspopup="true" aria-expanded="false"><span class="nav-icon" aria-hidden="true">♧</span><span>Community</span><span aria-hidden="true">▾</span></button><div class="community-dropdown-panel"><a href="forums.html">Forums</a><a href="guild.html">Guild</a><a href="support.html">Support</a></div>';
    return root;
  })();
  const account=nav.querySelector('.account-dropdown')||(()=>{
    const root=document.createElement('div');root.className='account-dropdown';
    root.innerHTML='<button type="button" class="nav-link account-dropdown-trigger" aria-haspopup="true" aria-expanded="false"><span class="nav-icon" aria-hidden="true">●</span><span>Account</span><span aria-hidden="true">▾</span></button><div class="account-dropdown-panel"><a href="login.html" data-account-guest hidden>Login</a><a href="account.html" data-account-guest hidden>Register</a><a href="account.html" data-account-signed hidden>My Profile</a><a href="account.html#redeem-codes" data-account-signed hidden>Redeem Code</a><button type="button" data-account-signed data-account-logout hidden>Log Out</button></div>';
    return root;
  })();
  const owner=nav.querySelector('.owner-menu.owner-nav, a.owner-nav')||(()=>{
    const root=document.createElement('div');root.className='owner-menu owner-nav';
    root.style.setProperty('display','none','important');
    root.innerHTML='<button type="button" class="nav-link owner-menu-trigger" aria-haspopup="true" aria-expanded="false"><span class="nav-icon" aria-hidden="true">♛</span><span>Owner</span><span aria-hidden="true">▾</span></button><div class="owner-menu-panel"></div>';
    return root;
  })();
  const activeGroups={
    community:['forums.html','guild.html','support.html','community.html'],
    account:['account.html','login.html']
  };
  for(const [root,pages] of [[community,activeGroups.community],[account,activeGroups.account]]){
    if(pages.includes(page))root.querySelector('.nav-link')?.classList.add('active');
    for(const a of root.querySelectorAll('a[href]')){
      if(a.getAttribute('href')?.split('#')[0]===page)a.setAttribute('aria-current','page');
    }
  }
  nav.replaceChildren(home,ctoons,games,watch,shop,community,account,owner);
  nav.dataset.navigationVersion='2026-11-12';

  function closeMenus(except){
    for(const root of nav.querySelectorAll('.games-dropdown,.community-dropdown,.account-dropdown,.owner-menu')){
      if(root===except)continue;
      root.classList.remove('is-open');
      root.querySelector('button[aria-expanded]')?.setAttribute('aria-expanded','false');
    }
  }
  gamesButton.addEventListener('click',event=>{
    event.preventDefault();
    const open=gamesButton.getAttribute('aria-expanded')!=='true';
    closeMenus(games);
    games.classList.toggle('is-open',open);
    gamesButton.setAttribute('aria-expanded',String(open));
  });
  // Capture the click before legacy Community handlers stop propagation.
  // This guarantees at most one open dropdown on phones and desktops.
  nav.addEventListener('click',event=>{
    const root=event.target.closest('.games-dropdown,.community-dropdown,.account-dropdown,.owner-menu');
    closeMenus(root);
  },true);
  document.addEventListener('click',event=>{
    if(!nav.contains(event.target))closeMenus();
  });
  nav.addEventListener('keydown',event=>{
    if(event.key==='Escape'){
      const trigger=event.target.closest('.games-dropdown,.community-dropdown,.account-dropdown,.owner-menu')?.querySelector('button[aria-expanded]');
      closeMenus();
      trigger?.focus();
      return;
    }
    if(event.key!=='ArrowDown')return;
    const trigger=event.target.closest('button[aria-haspopup="true"]');
    if(!trigger||!nav.contains(trigger))return;
    event.preventDefault();
    if(trigger.getAttribute('aria-expanded')!=='true')trigger.click();
    const root=trigger.parentElement;
    const first=[...root.querySelectorAll('a,button')].find(el=>el!==trigger&&!el.hidden&&!el.disabled&&el.getClientRects().length);
    first?.focus();
  });
  window.addEventListener('pageshow',()=>closeMenus());
})();

/* Load the shared mobile stylesheet on every page that uses site navigation. */
(function(){
  if(document.querySelector('link[data-mobile-layout]'))return;
  const sheet=document.createElement('link');
  sheet.rel='stylesheet';sheet.href='mobile-responsive.css?v=mobile-layout-20261109-v2';
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



/* Remove obsolete collection links from legacy pages while preserving other games. */
(() => {
 const obsolete=new Set(['sets-overview.html','my-collection.html','my-scene.html','czone.html','trades.html','auction.html','owner-ctoon-maker.html','owner-ctoon-packs.html']);
 for(const a of document.querySelectorAll('a[href]')) {
  const filename=a.getAttribute('href').split(/[?#]/)[0].split('/').pop();
  if(obsolete.has(filename)) a.remove();
 }
})();
