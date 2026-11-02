"use strict";
const year = document.getElementById("year");
if (year) year.textContent = String(new Date().getFullYear());

/* Owner navigation is hidden by default and revealed only after verified membership. */
(async () => {
  const links = document.querySelectorAll('.owner-nav');
  if (!links.length) return;
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.58.0');
    const supabase = createClient('https://hsxdyxdazsdmpucyhqly.supabase.co', 'sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
    let generation = 0;
    async function updateOwnerNavigation() {
      const current = ++generation;
      links.forEach(link => link.classList.remove('owner-visible'));
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return;
      const { data, error: membershipError } = await supabase.from('site_owners').select('user_id').eq('user_id', user.id).maybeSingle();
      if (current !== generation || membershipError || !data) return;
      links.forEach(link => link.classList.add('owner-visible'));
    }
    supabase.auth.onAuthStateChange(() => { setTimeout(updateOwnerNavigation, 0); });
    await updateOwnerNavigation();
  } catch (_) {
    links.forEach(link => link.classList.remove('owner-visible'));
  }
})();
