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
    if(item.image_path && (/^https?:\\/\\//i.test(item.image_path) || /^\\/(?!\\/)/.test(item.image_path) || /^(?!.*(?:^|\\/)\\.\\.(?:\\/|$))[\\w.-][\\w./%?=& +#-]*$/.test(item.image_path))){
      const image=el("img");
      image.src=item.image_path.trim();
      image.alt=item.name+" artwork";
      image.decoding="async";
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
  function populateSubseries(){
    const previous=subseries.value;
    const names=new Set(availableSubseries.map(item=>item.name));
    for(const item of all)if(item.series)names.add(item.series);
    subseries.replaceChildren(new Option("All Subseries",""));
    for(const name of [...names].sort(collator.compare))subseries.append(new Option(name,name));
    subseries.value=names.has(previous)?previous:"";
  }
  function render(){
    const q=search.value.trim().toLocaleLowerCase();
    const chosen=subseries.value;
    const filtered=all.filter(item=>
      (!chosen||item.series===chosen) &&
      (item.name+" "+(item.series||"")).toLocaleLowerCase().includes(q)
    );
    count.textContent=filtered.length+" CToon"+(filtered.length===1?"":"s")+(q||chosen?" found":"");
    clear(alphabet);clear(results);
    // One continuous A-Z grid, without separate letter sections.
    if(filtered.length){
      const grid=el("div","ctoons-letter-grid");
      for(const item of filtered)grid.append(card(item));
      results.append(grid);
    }
    if(!filtered.length){
      if(chosen&&!q&&availableSubseries.some(item=>item.name===chosen))
        message(chosen+" — coming soon","This subseries is ready for its first CToons.");
      else message(q||chosen?"No matches":"The collection is empty",
        q||chosen?"Try another name or subseries.":"CToons will appear here when new items are added.");
    }
  }
  search.addEventListener("input",render);
  subseries.addEventListener("change",render);
  clearFilters.addEventListener("click",()=>{search.value="";subseries.value="";render();search.focus();});
  async function load() {
    const api="https://hsxdyxdazsdmpucyhqly.supabase.co/rest/v1/";
    const seriesEndpoint=api+"ctoon_series?select=name&order=name.asc";
    const key="sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS";
    try{
      const headers={apikey:key,Authorization:"Bearer "+key};
      // PostgREST responses can be capped at 1,000 rows. Load every page in a
      // stable order so the A–Z display does not silently omit newer CToons.
      const fetchCatalog=async()=>{
        const collected=[];
        const pageSize=500;
        for(let offset=0;;offset+=pageSize){
          const endpoint=api+"ctoon_catalog?select=id,name,series,rarity,image_path&order=name.asc,id.asc&limit="+pageSize+"&offset="+offset;
          const response=await fetch(endpoint,{headers,cache:"no-store"});
          if(!response.ok)throw new Error("Catalog HTTP "+response.status);
          const page=await response.json();
          if(!Array.isArray(page))throw new Error("Unexpected catalog response");
          collected.push(...page);
          if(page.length<pageSize)return collected;
        }
      };
      const [rows,seriesResponse]=await Promise.all([
        fetchCatalog(),
        fetch(seriesEndpoint,{headers,cache:"no-store"}).catch(()=>null)
      ]);
      if(seriesResponse && seriesResponse.ok){
        const seriesRows=await seriesResponse.json();
        if(Array.isArray(seriesRows)){
          availableSubseries=seriesRows.filter(item=>typeof item.name==="string" && item.name.trim())
            .map(item=>({name:item.name.trim()}));
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