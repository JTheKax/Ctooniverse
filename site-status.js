"use strict";
(() => {
  const header=document.querySelector(".site-header, .jam-topbar");
  if(!header||document.getElementById("site-status-strip"))return;

  const api="https://hsxdyxdazsdmpucyhqly.supabase.co/rest/v1/site_operational_status?select=mode,updated_at&id=eq.1";
  const key="sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS";
  const strip=document.createElement("section");
  strip.id="site-status-strip";
  strip.className="site-status-strip";
  strip.setAttribute("aria-label","CTooniverse owner-declared website status");
  strip.dataset.mode="unknown";

  const title=document.createElement("strong");
  title.className="site-status-title";
  title.textContent="SITE STATUS";
  const online=document.createElement("button");
  online.type="button";online.className="site-status-button is-online";
  online.textContent="● Online";
  online.setAttribute("aria-pressed","false");
  online.title="Check current site status";
  const maintenance=document.createElement("button");
  maintenance.type="button";maintenance.className="site-status-button is-maintenance";
  maintenance.textContent="● Maintenance";
  maintenance.setAttribute("aria-pressed","false");
  maintenance.title="Check current site status";
  const summary=document.createElement("span");
  summary.className="site-status-summary";
  summary.textContent="Checking status…";
  const detail=document.createElement("p");
  detail.className="site-status-detail";
  detail.setAttribute("role","status");
  detail.setAttribute("aria-live","polite");
  detail.hidden=true;
  strip.append(title,online,maintenance,summary,detail);
  header.insertAdjacentElement("afterend",strip);

  let current="unknown",requestId=0;
  function render(mode,updatedAt){
    current=mode;
    strip.dataset.mode=mode;
    online.setAttribute("aria-pressed",String(mode==="online"));
    maintenance.setAttribute("aria-pressed",String(mode==="maintenance"));
    summary.textContent=mode==="online"?"Website is online":
      mode==="maintenance"?"Maintenance mode active":"Status could not be verified";
    if(mode==="maintenance"){
      document.body.classList.add("site-under-maintenance");
    }else{
      document.body.classList.remove("site-under-maintenance");
    }
    if(!detail.hidden){
      const time=updatedAt && Number.isFinite(Date.parse(updatedAt))?
        " Updated "+new Date(updatedAt).toLocaleString()+".":"";
      detail.textContent=mode==="unknown"?"Unable to reach the status service. Please retry.":
        mode==="maintenance"?"The site owner marked CTooniverse as under maintenance."+time:
        "The site owner marked CTooniverse as online."+time;
    }
  }
  async function refresh(){
    const id=++requestId;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),6000);
    try{
      const response=await fetch(api,{headers:{apikey:key,Authorization:"Bearer "+key},
        cache:"no-store",signal:controller.signal});
      if(!response.ok)throw new Error("Status service unavailable");
      const rows=await response.json();
      if(id!==requestId)return;
      const row=Array.isArray(rows)?rows[0]:null;
      if(!row||!["online","maintenance"].includes(row.mode))throw new Error("Invalid status");
      render(row.mode,row.updated_at);
    }catch(error){
      if(id!==requestId)return;
      // Never claim the site is online when the live setting cannot be checked.
      render("unknown");
    }finally{
      clearTimeout(timeout);
    }
  }
  function explain(){
    detail.hidden=false;
    detail.textContent="Checking the current website status…";
    refresh();
  }
  online.addEventListener("click",explain);
  maintenance.addEventListener("click",explain);
  document.addEventListener("visibilitychange",()=>{
    if(!document.hidden)refresh();
  });
  window.addEventListener("focus",refresh);
  window.addEventListener("site-operational-status-updated",refresh);
  window.addEventListener("storage",event=>{
    if(event.key==="ctoon-site-operational-status-updated")refresh();
  });
  // Poll for an owner status change without reloading the page.
  setInterval(()=>{if(!document.hidden)refresh();},45000);
  refresh();
})();
