"use strict";
(() => {
  const results=document.getElementById("ctoons-directory-results");
  const alphabet=document.getElementById("ctoons-alphabet");
  const search=document.getElementById("ctoons-search");
  const count=document.getElementById("ctoons-result-count");
  if(!results||!alphabet||!search||!count)return;
  const letters="ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const collator=new Intl.Collator(undefined,{numeric:true,sensitivity:"base"});
  let all=[];
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
  }
  function render() {
    const q=search.value.trim().toLocaleLowerCase();
    const filtered=all.filter(item=>(item.name+" "+(item.series||"")).toLocaleLowerCase().includes(q));
    count.textContent=filtered.length+" CToon"+(filtered.length===1?"":"s")+(q?" found":"");
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
    if(!filtered.length)message(q?"No matches":"The collection is empty",q?"Try another name or series.":"New CToons will appear here in alphabetical order when they are added. Nothing from the deleted collection has been restored.");
  }
  search.addEventListener("input",render);
  async function load() {
    const endpoint="https://hsxdyxdazsdmpucyhqly.supabase.co/rest/v1/ctoon_catalog?select=id,name,series,rarity,image_path&order=name.asc";
    const key="sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS";
    try{
      const response=await fetch(endpoint,{headers:{apikey:key,Authorization:"Bearer "+key},cache:"no-store"});
      if(!response.ok)throw new Error("Catalog HTTP "+response.status);
      const rows=await response.json();
      if(!Array.isArray(rows))throw new Error("Unexpected catalog response");
      all=rows.filter(row=>row && typeof row.name==="string" && row.name.trim())
        .map(row=>({name:row.name.trim(),series:typeof row.series==="string"?row.series:"",rarity:typeof row.rarity==="string"?row.rarity:"",image_path:typeof row.image_path==="string"?row.image_path:""}))
        .sort((a,b)=>collator.compare(a.name,b.name)||collator.compare(a.series,b.series));
      render();
    }catch(error){
      count.textContent="Catalog unavailable";
      clear(alphabet);message("Unable to load CToons","The collection could not be loaded right now. Please refresh this page.");
      console.warn("CToons A–Z:",error);
    }
  }
  load();
})();