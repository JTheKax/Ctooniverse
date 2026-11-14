"use strict";
/* Shared navigation enhancements. Read-only UI; never modifies auth or game progress. */
(() => {
  if (window.__ctuUniverseUpgrade) return;
  window.__ctuUniverseUpgrade = true;
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const prefix = location.pathname.includes("/prototypes/") ? "../" : "";
  const destinations = [
    ["🏠","Home","Return to the main portal","index.html","start portal main"],
    ["🎴","CToons A–Z","Browse the alphabetical collection","ctoons.html","collect catalog gallery library"],
    ["🛍️","CToon Shop","Discover CToons and shop departments","shop.html","marketplace cards"],
    ["🎮","Games Arcade","Choose an available game","games.html","play game"],
    ["🥊","CToon Showdown","Enter the 1-on-1 fighting game","prototypes/ctoon-showdown-arcade.html","fighter roster arcade training story"],
    ["🧸","Claw Craze","Play the crane machine","claw-machine.html","prize claw toy"],
    ["🎡","Prize Wheel","Visit Boogie's Prize Wheel","prize-wheel.html","spin prizes"],
    ["🎬","Theater","Visit the movie theater","watch.html","movies watch screen"],
    ["💬","Community","Meet other CTooniverse players","community.html","friends chat"],
    ["🗣️","Forums","Explore community conversations","forums.html","forum topics"],
    ["🛡️","Guild","See the community guild","guild.html","guilds"],
    ["🛟","Support","Find help and support","support.html","questions help"],
    ["👤","Account","Profile and account controls","account.html","register profile"],
    ["🎵","CToon Jam","Visit the arcade hub for the latest lineup","games.html","music rhythm jukebox"]
  ];
  function el(name,className,text){
    const node=document.createElement(name);
    if(className)node.className=className;
    if(text!==undefined)node.textContent=text;
    return node;
  }
  function safeStore(action,key,value){
    try { if(action==="get") return localStorage.getItem(key); localStorage.setItem(key,value); } catch(_){}
    return null;
  }
  function mount(){
    const header=document.querySelector(".site-header");
    const standalone=document.querySelector(".ctoon-standalone-nav");
    if(!header&&!standalone) return;
    const motionKey="ctooniverse-motion-preference";
    const preferred=safeStore("get",motionKey);
    let reduced=preferred==="reduced" || (preferred!=="full"&&matchMedia("(prefers-reduced-motion: reduce)").matches);
    function applyMotion(){
      document.body.dataset.ctuMotion=reduced?"reduced":"full";
      if(motionButton) motionButton.textContent=reduced?"Enable animations":"Reduce animations";
    }
    let motionButton=null;
    if(standalone&&!standalone.querySelector(".ctoon-standalone-brand img")){
      const brand=standalone.querySelector(".ctoon-standalone-brand");
      if(brand){
        brand.textContent="";
        const img=el("img","ctu-standalone-logo");
        img.src=prefix+"ctooniverse-logo.png";img.alt="CTooniverse";img.width=140;img.height=48;
        brand.append(img);
      }
    }
    const dialog=el("dialog","ctu-search-dialog");
    dialog.setAttribute("aria-label","Explore CTooniverse");
    const head=el("div","ctu-search-head");
    const heading=el("div");
    heading.append(el("h2","","Explore CTooniverse"),el("p","","Find games, collections, and pages in one place"));
    const close=el("button","ctu-search-close","×");
    close.type="button";close.setAttribute("aria-label","Close search");
    head.append(heading,close);
    const wrap=el("div","ctu-search-input-wrap");
    const input=el("input","ctu-search-input");
    input.type="search";input.autocomplete="off";input.placeholder="Search destinations…";
    input.setAttribute("aria-label","Search website destinations");
    wrap.append(input);
    const results=el("div","ctu-search-results");
    const foot=el("div","ctu-search-foot");
    foot.append(el("span","","Type a destination name, then select a result."));
    motionButton=el("button","ctu-motion-toggle");
    motionButton.type="button";
    motionButton.addEventListener("click",()=>{reduced=!reduced;safeStore("set",motionKey,reduced?"reduced":"full");applyMotion();});
    foot.append(motionButton);
    dialog.append(head,wrap,results,foot);
    document.body.append(dialog);
    applyMotion();
    function fill(query){
      results.replaceChildren();
      const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const matches=destinations.filter(([icon,title,detail,url,terms])=>{
        const text=[title,detail,terms].join(" ").toLowerCase();
        return words.every(word=>text.includes(word));
      });
      results.append(el("p","ctu-search-section",words.length?"Search results":"Quick destinations"));
      if(!matches.length){results.append(el("p","ctu-search-empty","No matching destination. Try Games, CToons, Shop, or Theater."));return;}
      for(const [icon,title,detail,url] of matches.slice(0,14)){
        const a=el("a","ctu-search-item");a.href=prefix+url;
        a.append(el("span","ctu-search-icon",icon));
        const info=el("span","ctu-search-info");
        info.append(el("span","ctu-search-title",title),el("span","ctu-search-desc",detail));
        a.append(info,el("span","ctu-search-arrow","↗"));
        results.append(a);
      }
    }
    function showSearch(){
      if(!dialog.open){
        fill("");
        input.value="";
        if(typeof dialog.showModal==="function"){dialog.showModal();}
        else {dialog.setAttribute("open","");}
      }
      input.focus();
      if(header){closeMenu();}
    }
    function hideSearch(){if(dialog.open){if(typeof dialog.close==="function")dialog.close();else dialog.removeAttribute("open");}}
    close.addEventListener("click",hideSearch);
    dialog.addEventListener("click",event=>{if(event.target===dialog)hideSearch();});
    input.addEventListener("input",()=>fill(input.value));
    input.addEventListener("keydown",event=>{
      if(event.key!=="Enter") return;
      const first=results.querySelector("a.ctu-search-item");
      if(first){event.preventDefault();location.assign(first.href);}
    });
    let menuButton=null;
    function closeMenu(){
      if(!header||!menuButton)return;
      header.classList.remove("ctu-menu-open");
      menuButton.setAttribute("aria-expanded","false");
      const nav=header.querySelector("nav");
      if(nav){for(const m of nav.querySelectorAll(".games-dropdown,.community-dropdown,.account-dropdown,.owner-menu")){
        m.classList.remove("is-open");
        m.querySelector("button[aria-expanded]")?.setAttribute("aria-expanded","false");
      }}
    }
    if(header){
      const nav=header.querySelector("nav");
      if(nav){
        if(!nav.id)nav.id="ctu-site-menu";
        const tools=el("div","ctu-header-tools");
        const search=el("button","ctu-tool ctu-search-trigger");
        search.type="button";search.setAttribute("aria-label","Search and explore CTooniverse");
        search.append(el("span","ctu-tool-icon","⌕"),el("span","ctu-tool-label","Explore"),el("kbd","","Ctrl K"));
        search.addEventListener("click",showSearch);
        const toggle=el("button","ctu-tool ctu-menu-trigger");
        toggle.type="button";toggle.setAttribute("aria-label","Open navigation menu");
        toggle.setAttribute("aria-controls",nav.id);
        toggle.setAttribute("aria-expanded","false");
        toggle.append(el("span","ctu-menu-icon","☰"),el("span","ctu-tool-label","Menu"));
        toggle.addEventListener("click",()=>{
          const next=!header.classList.contains("ctu-menu-open");
          if(next)hideSearch();
          header.classList.toggle("ctu-menu-open",next);
          toggle.setAttribute("aria-expanded",String(next));
          toggle.setAttribute("aria-label",next?"Close navigation menu":"Open navigation menu");
          toggle.querySelector(".ctu-menu-icon").textContent=next?"×":"☰";
        });
        menuButton=toggle;
        tools.append(search,toggle);
        const player=header.querySelector("#header-player");
        if(player)header.insertBefore(tools,player);
        else header.append(tools);
        header.classList.add("ctu-layout-ready");
        document.body.classList.add("ctu-ui-ready");
        document.addEventListener("click",event=>{
          if(!header.contains(event.target))closeMenu();
        });
        nav.addEventListener("click",event=>{
          if(event.target.closest("a[href]") && window.matchMedia("(max-width: 800px)").matches)closeMenu();
        });
        window.addEventListener("resize",()=>{if(window.innerWidth>800)closeMenu();},{passive:true});
      }
    }
    if(standalone){
      const bar=standalone.querySelector(".ctoon-standalone-bar");
      if(bar&&!bar.querySelector(".ctu-standalone-search")){
        const button=el("button","ctu-tool ctu-standalone-search","⌕ Search");
        button.type="button";button.addEventListener("click",showSearch);
        bar.append(button);
      }
    }
    document.addEventListener("keydown",event=>{
      const tag=event.target?.tagName;
      const editing=["INPUT","TEXTAREA","SELECT"].includes(tag)||event.target?.isContentEditable;
      if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){
        event.preventDefault();showSearch();
      }else if(event.key==="/"&&!editing&&!event.altKey&&!event.ctrlKey&&!event.metaKey){
        event.preventDefault();showSearch();
      }else if(event.key==="Escape"){
        closeMenu();
      }
    });
    if(path==="index.html"){
      const main=document.querySelector("main.simple-home");
      if(main&&!main.querySelector(".ctu-feature-section")){
        const section=el("section","ctu-feature-section");
        section.setAttribute("aria-labelledby","ctu-feature-title");
        const head=el("div","ctu-feature-head");
        const titleBlock=el("div");
        titleBlock.append(el("span","ctu-feature-kicker","✦ FEATURED DESTINATIONS"));
        const title=el("h2","","Explore the new universe");title.id="ctu-feature-title";
        titleBlock.append(title,el("p","","Jump into the places players love to explore."));
        const all=el("a","ctu-feature-all","Explore all games ↗");all.href="games.html";
        head.append(titleBlock,all);
        const grid=el("div","ctu-feature-grid");
        const items=[
          ["🥊","FIGHTING ARCADE","CToon Showdown","Choose your fighter and enter a 1-vs-1 showdown.","prototypes/ctoon-showdown-arcade.html"],
          ["🧸","PRIZE ARCADE","Claw Craze","Try your luck at the prize crane.","claw-machine.html"],
          ["🎴","COLLECTORS HUB","The CToon Vault","Browse CToons alphabetically and discover characters.","ctoons.html"]
        ];
        for(const [icon,label,name,description,url] of items){
          const a=el("a","ctu-feature");a.href=url;
          a.append(el("span","ctu-feature-icon",icon),el("span","ctu-feature-kicker-text",label),el("strong","ctu-feature-title",name),el("span","ctu-feature-desc",description),el("span","ctu-feature-arrow","↗"));
          grid.append(a);
        }
        section.append(head,grid);
        const anchor=main.querySelector(".home-status-guide,.home-sections");
        if(anchor)main.insertBefore(section,anchor);else main.append(section);
      }
    }
    if(document.querySelector(".site-header")&&!document.querySelector(".ctu-to-top")){
      const top=el("button","ctu-to-top","↑");
      top.type="button";top.setAttribute("aria-label","Back to top");
      top.addEventListener("click",()=>window.scrollTo({top:0,behavior:reduced?"instant":"smooth"}));
      document.body.append(top);
      let ticking=false;
      const update=()=>{
        top.classList.toggle("ctu-visible",window.scrollY>650);
        ticking=false;
      };
      window.addEventListener("scroll",()=>{if(!ticking){ticking=true;requestAnimationFrame(update);}},{passive:true});
      update();
    }
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mount,{once:true});
  else mount();
})();
