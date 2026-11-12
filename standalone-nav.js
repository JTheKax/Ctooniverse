"use strict";
/* Shared visual layer: loaded after legacy styles, with operational colors intact. */
(() => {
  if (document.querySelector('link[href^="display-refresh.css"]')) return;
  const sheet = document.createElement('link');
  sheet.rel = 'stylesheet';
  sheet.href = 'display-refresh.css?v=arcade-ui-20261112';
  sheet.dataset.ctoonDisplayRefresh = 'true';
  document.head.append(sheet);
})();

/* Compact navigation shared by full-screen games and the fighter editor. */
(() => {
 function init(){
  if(document.querySelector(".site-header nav, .ctoon-standalone-nav"))return;
  const root=document.createElement("div");
  root.className="ctoon-standalone-nav";
  const navIcons={
    Home:"🏠",CToons:"🎴",Watch:"🎬",Shop:"🛍️",
    "Games Hub":"🕹️","CToon Clash":"⚔️","CToon Heroes: Battle Quest":"🦸",
    "CToon Jam":"🎸","CToon Showdown":"🥊","CToon Speedway":"🏎️",
    "Video Game Emulator":"💾","Prize Games":"🎁",
    "Community Home":"🏘️",Forums:"💬",Guild:"🛡️",Support:"🛟",
    Login:"🔑",Register:"✨","My Profile":"👤","Redeem Code":"🎟️",
    Dashboard:"📊","Website Status":"🚦","Coin Management":"🪙",
    "Redeem Codes":"🎟️","Music Management":"🎵","CToon Subseries Manager":"🗂️",
    "Upload Game":"📤","Clash Card Maker":"🃏","Fighter Manager":"🥊"
  };
  const link=(label,url,attrs)=>'<a href="'+url+'" '+(attrs||"")+'><span class="ctoon-nav-symbol" aria-hidden="true">'+(navIcons[label]||"✦")+'</span><span>'+label+'</span></a>';
  const group=(label,items,attrs)=>'<details class="ctoon-nav-group" '+(attrs||"")+'><summary>'+label+'</summary>'+items.map(item=>link(item[0],item[1],item[2])).join("")+'</details>';
  const games=[["Games Hub","games.html"],["CToon Clash","clash.html"],["CToon Heroes: Battle Quest","hero-battle.html"],["CToon Jam","ctoon-jam.html"],["CToon Showdown","fighters.html"],["CToon Speedway","speedway.html"],["Video Game Emulator","emulator.html"],["Prize Games","prize-games.html"]];
  const community=[["Community Home","community.html"],["Forums","forums.html"],["Guild","guild.html"],["Support","support.html"]];
  const account=[["Login","login.html","data-nav-guest"],["Register","account.html","data-nav-guest"],["My Profile","account.html","data-nav-signed hidden"],["Redeem Code","account.html#redeem-codes","data-nav-signed hidden"]];
  const owner=[["Dashboard","owner.html"],["Website Status","owner.html#site-operating-controls"],["Coin Management","coin-management.html"],["Redeem Codes","owner-redeem-codes.html"],["Music Management","owner-music-management.html"],["CToon Subseries Manager","owner-subseries.html"],["Upload Game","emulator.html#emu-owner"],["Clash Card Maker","owner-clash-card-maker.html"],["Fighter Manager","owner-fighters.html"]];
  root.innerHTML='<div class="ctoon-standalone-bar"><a class="ctoon-standalone-brand" href="index.html">✦ CTooniverse</a><button type="button" class="ctoon-standalone-toggle" aria-expanded="false" aria-controls="ctoon-standalone-panel">☰ Site Menu</button></div>'
   +'<nav id="ctoon-standalone-panel" class="ctoon-standalone-panel" aria-label="CTooniverse navigation" hidden>'
   +link("Home","index.html")+link("CToons","ctoons.html")+group("🎮 Games",games)
   +link("Watch","watch.html")+link("Shop","shop.html")+group("👥 Community",community)
   +group("👤 Account",account).replace("</details>",'<button type="button" data-nav-signed data-nav-logout hidden><span class="ctoon-nav-symbol" aria-hidden="true">🚪</span><span>Log Out</span></button></details>')
   +group("👑 Owner",owner,'id="ctoon-standalone-owner" hidden')+'</nav>';
  document.body.insertBefore(root,document.body.firstChild);
  const toggle=root.querySelector(".ctoon-standalone-toggle");
  const panel=root.querySelector(".ctoon-standalone-panel");
  const ownerPanel=root.querySelector("#ctoon-standalone-owner");
  const details=[...panel.querySelectorAll("details")];
  function close(){
   panel.hidden=true;toggle.setAttribute("aria-expanded","false");
   details.forEach(item=>item.open=false);
  }
  toggle.addEventListener("click",()=>{
   const opening=panel.hidden;panel.hidden=!opening;
   toggle.setAttribute("aria-expanded",String(opening));
   if(!opening)details.forEach(item=>item.open=false);
  });
  panel.addEventListener("toggle",event=>{
   if(event.target.tagName!=="DETAILS"||!event.target.open)return;
   details.forEach(item=>{if(item!==event.target)item.open=false;});
  },true);
  document.addEventListener("click",event=>{if(!root.contains(event.target))close()});
  document.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&!panel.hidden){close();toggle.focus();}
  });
  root.addEventListener("keydown",event=>{
   if(event.key==="Escape"&&!panel.hidden){close();toggle.focus();}
   event.stopPropagation();
  });
  window.addEventListener("pageshow",close);
  const file=location.pathname.split("/").pop()||"index.html";
  for(const a of panel.querySelectorAll("a[href]")){
   if(a.getAttribute("href").split("#")[0]===file){
    a.setAttribute("aria-current","page");
    a.closest("details")?.setAttribute("data-current","true");
   }
  }
  const guests=[...panel.querySelectorAll("[data-nav-guest]")];
  const signed=[...panel.querySelectorAll("[data-nav-signed]")];
  const setUser=user=>{
   guests.forEach(el=>el.hidden=!!user);
   signed.forEach(el=>el.hidden=!user);
   ownerPanel.hidden=true; // Verify each signed-in account before showing Owner.
  };
  setUser(null);
  (async()=>{
   try{
    const {createClient}=await import("https://esm.sh/@supabase/supabase-js@2.58.0");
    const db=createClient("https://hsxdyxdazsdmpucyhqly.supabase.co","sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS");
    let requestId=0;
    async function refresh(){
     const id=++requestId;
     try{
      const {data:{user},error}=await db.auth.getUser();
      if(id!==requestId)return;
      if(error||!user){setUser(null);return;}
      setUser(user);
      const {data:member,error:memberError}=await db.from("site_owners").select("user_id").eq("user_id",user.id).maybeSingle();
      if(id!==requestId)return;
      ownerPanel.hidden=!!memberError||!member;
     }catch(_){if(id===requestId){setUser(null);ownerPanel.hidden=true;}}
    }
    const logout=panel.querySelector("[data-nav-logout]");
    logout.addEventListener("click",async()=>{
     if(logout.disabled)return;
     logout.disabled=true;
     try{
      const {error}=await db.auth.signOut();
      if(error)throw error;
      location.href="login.html";
     }catch(_){logout.textContent="Sign out failed — retry";logout.disabled=false;}
    });
    db.auth.onAuthStateChange(()=>setTimeout(refresh,0));
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)refresh();});
    refresh();
   }catch(_){setUser(null);ownerPanel.hidden=true;}
  })();
  if(![...document.querySelectorAll("script[src]")].some(script=>script.getAttribute("src").split("?")[0].endsWith("site-status.js"))){
   const status=document.createElement("script");
   status.src="site-status.js?v=nav-allpages-20261112";
   document.head.append(status);
  }
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});
 else init();
})();
