"use strict";
(() => {
  const results=document.getElementById("ctoons-directory-results");
  const alphabet=document.getElementById("ctoons-alphabet");
  const search=document.getElementById("ctoons-search");
  const subseries=document.getElementById("ctoons-subseries");
  const clearFilters=document.getElementById("ctoons-clear-filters");
  const count=document.getElementById("ctoons-result-count");
  if(!results||!alphabet||!search||!subseries||!clearFilters||!count)return;
  const letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const collator=new Intl.Collator(undefined,{numeric:true,sensitivity:"base"});
  let all=[];
  let availableSubseries=[];
  const clear=node=>node.replaceChildren();
  const el=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!=null)node.textContent=String(text);
    return node;
  };
  const initial=name=>{
    const first=String(name||"").trim().charAt(0).toUpperCase();
    return /^[A-Z]$/.test(first)?first:"#";
  };
  function card(item) {
    const article=el("article","ctoons-directory-card");
    const art=el("div","ctoons-directory-art");
    if(item.image_path && /^(https:\/\/|\/|public\/|images\/|assets\/)/i.test(item.image_path)){
      const image=el("img");
      image.src=item.image_path;
      image.alt=item.name+" artwork";
      image.loading="lazy";
      image.addEventListener("error",()=>{art.replaceChildren(el("span","ctoons-placeholder","✦"));},{once:true});
      art.append(image);
    }else art.append(el("span","ctoons-placeholder","✦"));
    const body=el("div","ctoons-directory-card-body");
    body.append(el("h3","",item.name));
    if(item.series)body.append(el("small","",item.series));
    if(item.rarity)body.append(el("span","ctoons-rarity",item.rarity));
    article.append(art,body);return article;
  }
  function message(title,detail) {
    clear(results);
    const box=el("div","ctoons-empty");
    box.append(el("h2","",title),el("p","",detail));
    results.append(box);
    if(title==="The collection is empty" || title.endsWith(" — coming soon")){
      const showcase=el("div","ctoons-empty-showcase");
      showcase.append(el("h3","","New display windows — ready for future CToons"));
      const grid=el("div","ctoons-empty-showcase-grid");
      for(let i=0;i<4;i++){
        const window=el("div","ctoons-empty-window");
        const pane=el("div","");pane.setAttribute("aria-label","Empty CToon display");pane.append(el("span","","◇"));
        window.append(pane,el("small","","Empty Slot"));
        grid.append(window);
      }
      showcase.append(grid);results.append(showcase);
    }
  }
  function populateSubseries() {
    const selected=subseries.value;
    const groups=new Map([
      ["Cartoon & Anime",new Set()],
      ["Video Games",new Set()]
    ]);
    const assigned=new Set();
    for(const item of availableSubseries){
      if(!item || !item.name)continue;
      const category=groups.has(item.category)?item.category:"Other";
      if(!groups.has(category))groups.set(category,new Set());
      groups.get(category).add(item.name);
      assigned.add(item.name);
    }
    // Retain series referenced by CToons even if the parent entry was removed.
    const other=groups.get("Other")||new Set();
    for(const item of all)if(item.series && !assigned.has(item.series))other.add(item.series);
    if(other.size)groups.set("Other",other);
    subseries.replaceChildren(new Option("All Subseries",""));
    for(const [label,names] of groups){
      if(!names.size)continue;
      const group=document.createElement("optgroup");
      group.label=label;
      for(const name of [...names].sort(collator.compare))group.append(new Option(name,name));
      subseries.append(group);
    }
    subseries.value=[...subseries.options].some(option=>option.value===selected)?selected:"";
  }
  function render() {
    const q=search.value.trim().toLocaleLowerCase();
    const chosen=subseries.value;
    const filtered=all.filter(item=>(!chosen||item.series===chosen) && (item.name+" "+(item.series||"")).toLocaleLowerCase().includes(q));
    count.textContent=filtered.length+" CToon"+(filtered.length===1?"":"s")+(q||chosen?" found":"");
    clear(alphabet);clear(results);
    const groups=new Map();
    for(const item of filtered){
      const letter=initial(item.name);
      if(!groups.has(letter))groups.set(letter,[]);
      groups.get(letter).push(item);
    }
    for(const letter of ["#",...letters]){
      const list=groups.get(letter);
      if(!list || !list.length){
        if(letter!=="#")alphabet.append(el("span","",letter));
        continue;
      }
      const anchor=el("a","",letter);anchor.href="#ctoons-letter-"+(letter==="#"?"misc":letter.toLowerCase());
      alphabet.append(anchor);
      const section=el("section","ctoons-letter-section");section.id="ctoons-letter-"+(letter==="#"?"misc":letter.toLowerCase());
      const header=el("div","ctoons-letter-heading");
      header.append(el("h2","",letter),el("span","",list.length+" CToon"+(list.length===1?"":"s")));
      const grid=el("div","ctoons-letter-grid");
      for(const item of list)grid.append(card(item));
      section.append(header,grid);results.append(section);
    }
    if(!filtered.length){
      if(chosen && !q && availableSubseries.some(item=>item.name===chosen)){
        message(chosen+" — coming soon","This subseries is ready. Its CToon display windows will fill automatically as the first characters are added.");
      }else{
        message(q||chosen?"No matches":"The collection is empty",q||chosen?"Try another name or choose All Subseries.":"New CToons will appear here in alphabetical order when they are added. Nothing from the deleted collection has been restored.");
      }
    }
  }
  search.addEventListener("input",render);
  subseries.addEventListener("change",render);
  clearFilters.addEventListener("click",()=>{search.value="";subseries.value="";render();search.focus();});
  async function load() {
    const api="https://hsxdyxdazsdmpucyhqly.supabase.co/rest/v1/";
    const endpoint=api+"ctoon_catalog?select=id,name,series,parent_series,rarity,image_path&order=name.asc";
    const seriesEndpoint=api+"ctoon_series?select=name,category&order=name.asc";
    const key="sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS";
    try{
      const headers={apikey:key,Authorization:"Bearer "+key};
      const [response,seriesResponse]=await Promise.all([
        fetch(endpoint,{headers,cache:"no-store"}),
        fetch(seriesEndpoint,{headers,cache:"no-store"}).catch(()=>null)
      ]);
      if(!response.ok)throw new Error("Catalog HTTP "+response.status);
      const rows=await response.json();
      if(!Array.isArray(rows))throw new Error("Unexpected catalog response");
      if(seriesResponse && seriesResponse.ok){
        const seriesRows=await seriesResponse.json();
        if(Array.isArray(seriesRows)){
          availableSubseries=seriesRows.filter(item=>typeof item.name==="string" && item.name.trim())
            .map(item=>({name:item.name.trim(),category:item.category}));
        }
      }
      all=rows.filter(row=>row && typeof row.name==="string" && row.name.trim())
        .map(row=>({name:row.name.trim(),series:typeof row.series==="string"?row.series:"",rarity:typeof row.rarity==="string"?row.rarity:"",image_path:typeof row.image_path==="string"?row.image_path:""}))
        .sort((a,b)=>collator.compare(a.name,b.name)||collator.compare(a.series,b.series));
      populateSubseries();
      render();
    }catch(error){
      count.textContent="Catalog unavailable";
      clear(alphabet);message("Unable to load CToons","The collection could not be loaded right now. Please refresh this page.");
      console.warn("CToons A–Z:",error);
    }
  }
  load();
})();