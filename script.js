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
 for(const [label,url] of [['CToons','ctoons.html'],['My Collection','my-collection.html'],['CZone','czone.html']]){
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
