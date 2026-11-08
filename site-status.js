"use strict";
(() => {
  // The owner-defined operational mode now colors the navigation itself.
  // No separate Online / Maintenance widget or extra header row is created.
  if(!document.querySelector(".site-header nav, .jam-topbar"))return;
  document.getElementById("site-status-strip")?.remove();

  const api="https://hsxdyxdazsdmpucyhqly.supabase.co/rest/v1/site_operational_status?select=mode,updated_at&id=eq.1";
  const key="sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS";
  let requestId=0;
  const root=document.body;

  function render(mode){
    // Unverified/unavailable status keeps the original neutral theme.
    // Never display green Online when the status service cannot be verified.
    root.dataset.siteMode=mode;
    root.classList.toggle("site-under-maintenance",mode==="maintenance");
    root.classList.toggle("site-is-online",mode==="online");
    document.dispatchEvent(new CustomEvent("ctoon-site-mode-changed",{detail:{mode}}));
  }

  async function refresh(){
    const id=++requestId;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),6500);
    try{
      const response=await fetch(api,{
        headers:{apikey:key,Authorization:"Bearer "+key},
        cache:"no-store",
        signal:controller.signal
      });
      if(!response.ok)throw new Error("Status unavailable");
      const rows=await response.json();
      if(id!==requestId)return;
      const mode=Array.isArray(rows)?rows[0]?.mode:null;
      if(mode!=="online"&&mode!=="maintenance")throw new Error("Invalid status value");
      render(mode);
    }catch(error){
      if(id===requestId)render("unknown");
      console.warn("CTooniverse status unavailable:",error?.message||error);
    }finally{
      clearTimeout(timeout);
    }
  }

  render("unknown");
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});
  window.addEventListener("focus",refresh);
  window.addEventListener("site-operational-status-updated",refresh);
  window.addEventListener("storage",event=>{
    if(event.key==="ctoon-site-operational-status-updated")refresh();
  });
  setInterval(()=>{if(!document.hidden)refresh();},45000);
  refresh();
})();
