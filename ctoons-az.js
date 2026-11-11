"use strict";
(() => {
  const results=document.getElementById("ctoons-directory-results");
  const alphabet=document.getElementById("ctoons-alphabet");
  const search=document.getElementById("ctoons-search");
  const subseries=document.getElementById("ctoons-subseries");
  const category=document.getElementById("ctoons-category");
  const clearFilters=document.getElementById("ctoons-clear-filters");
  const count=document.getElementById("ctoons-result-count");
  if(!results||!alphabet||!search||!subseries||!category||!clearFilters||!count)return;
  const letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const collator=new Intl.Collator(undefined,{numeric:true,sensitivity:"base"});
  let all=[];
  let availableSubseries=[];
  const CATEGORIES=["Cartoon & Anime","Video Games"];
  const categoryFor=new Map();
  const cleanCategory=value=>value==="Video Games"?"Video Games":value==="Cartoon & Anime"?"Cartoon & Anime":"Uncategorized";
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
  function populateSubseries(){
    const previous=subseries.value;
    subseries.replaceChildren(new Option("All Subseries",""));
    for(const groupName of CATEGORIES){
      const names=new Set(availableSubseries.filter(item=>cleanCategory(item.category)===groupName).map(item=>item.name));
      for(const item of all)if(item.series&&categoryFor.get(item.series)===groupName)names.add(item.series);
      const group=document.createElement("optgroup");group.label=groupName;
      for(const name of [...names].sort(collator.compare))group.append(new Option(name,name));
      if(group.children.length)subseries.append(group);
    }
    const remaining=new Set(all.map(item=>item.series).filter(name=>name&&!categoryFor.has(name)));
    if(remaining.size){
      const group=document.createElement("optgroup");group.label="Uncategorized";
      for(const name of [...remaining].sort(collator.compare))group.append(new Option(name,name));
      subseries.append(group);
    }
    subseries.value=[...subseries.options].some(option=>option.value===previous)?previous:"";
  }
  function render(){
    const q=search.value.trim().toLocaleLowerCase();
    const chosen=subseries.value;
    const chosenCategory=category.value;
    const filtered=all.filter(item=>
      (!chosen||item.series===chosen) &&
      (!chosenCategory||cleanCategory(categoryFor.get(item.series))===chosenCategory) &&
      (item.name+" "+(item.series||"")).toLocaleLowerCase().includes(q)
    );
    count.textContent=filtered.length+" CToon"+(filtered.length===1?"":"s")+(q||chosen||chosenCategory?" found":"");
    clear(alphabet);clear(results);
    const byCategory=new Map();
    for(const item of filtered){
      const groupName=cleanCategory(categoryFor.get(item.series));
      if(!byCategory.has(groupName))byCategory.set(groupName,[]);
      byCategory.get(groupName).push(item);
    }
    const firstAnchor=new Map();
    for(const groupName of [...CATEGORIES,"Uncategorized"]){
      const items=byCategory.get(groupName);
      if(!items?.length)continue;
      const wrapper=el("section","ctoons-category-section");
      wrapper.setAttribute("aria-label",groupName+" CToons");
      const banner=el("div","ctoons-category-header");
      banner.append(el("h2","",groupName),el("span","",items.length+" CToon"+(items.length===1?"":"s")));
      wrapper.append(banner);
      const groups=new Map();
      for(const item of items){
        const letter=initial(item.name);
        if(!groups.has(letter))groups.set(letter,[]);
        groups.get(letter).push(item);
      }
      for(const letter of ["#",...letters]){
        const list=groups.get(letter);
        if(!list?.length)continue;
        const id="ctoons-letter-"+(groupName==="Cartoon & Anime"?"cartoon":groupName==="Video Games"?"game":"misc")+"-"+(letter==="#"?"other":letter.toLowerCase());
        if(!firstAnchor.has(letter))firstAnchor.set(letter,id);
        const section=el("section","ctoons-letter-section");section.id=id;
        const header=el("div","ctoons-letter-heading");
        header.append(el("h3","",letter),el("span","",list.length+" CToon"+(list.length===1?"":"s")));
        const grid=el("div","ctoons-letter-grid");
        for(const item of list)grid.append(card(item));
        section.append(header,grid);wrapper.append(section);
      }
      results.append(wrapper);
    }
    for(const letter of letters){
      if(firstAnchor.has(letter)){
        const anchor=el("a","",letter);anchor.href="#"+firstAnchor.get(letter);alphabet.append(anchor);
      }else alphabet.append(el("span","",letter));
    }
    if(!filtered.length){
      if(chosen&&!q&&availableSubseries.some(item=>item.name===chosen))
        message(chosen+" — coming soon","This subseries is ready for its first CToons.");
      else
        message(q||chosen||chosenCategory?"No matches":"The collection is empty",
          q||chosen||chosenCategory?"Try another name, category, or subseries.":"CToons will appear here when new items are added.");
    }
  }
  search.addEventListener("input",render);
  category.addEventListener("change",()=>{subseries.value="";populateSubseries();render();});
  subseries.addEventListener("change",()=>{
    const selected=availableSubseries.find(item=>item.name===subseries.value);
    if(selected&&category.value&&cleanCategory(selected.category)!==category.value)category.value="";
    render();
  });
  clearFilters.addEventListener("click",()=>{search.value="";category.value="";subseries.value="";render();search.focus();});
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
      categoryFor.clear();
      for(const item of availableSubseries)categoryFor.set(item.name,item.category);
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