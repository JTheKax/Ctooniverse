"use strict";
const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

/* Fail closed. Recheck the same site_owners membership used by owner-auth.js. */
(async () => {
  const links = [...document.querySelectorAll('.owner-nav')];
  if (!links.length) return;
  const setVisible = visible => {
    links.forEach(link => {
      link.classList.toggle('owner-visible', visible);
      link.style.setProperty('display', visible ? 'inline-flex' : 'none', 'important');
    });
  };
  setVisible(false);
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.58.0');
    const db = createClient('https://hsxdyxdazsdmpucyhqly.supabase.co', 'sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
    let checkId = 0;
    async function verify() {
      const id = ++checkId;
      try {
        const { data: { user }, error } = await db.auth.getUser();
        if (id !== checkId) return;
        if (error || !user) { setVisible(false); return; }
        const { data, error: membershipError } = await db.from('site_owners').select('user_id').eq('user_id', user.id).maybeSingle();
        if (id !== checkId) return;
        setVisible(!membershipError && !!data);
      } catch (_) {
        if (id === checkId) setVisible(false);
      }
    }
    db.auth.onAuthStateChange(() => { setTimeout(verify, 100); });
    window.addEventListener('pageshow', verify);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) verify(); });
    await verify();
  } catch (_) { setVisible(false); }
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
