import {createClient} from "https://esm.sh/@supabase/supabase-js@2.58.0";
const db=createClient("https://hsxdyxdazsdmpucyhqly.supabase.co","sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS");
const $=id=>document.getElementById(id);
const PAGE_SIZE=48;
const state={page:0,total:0,search:"",set:"all",category:"all",rarity:"all",sort:"az"};
let querySequence=0,detailAbort=null,searchTimer=null;
const el=(tag,className,text)=>{
 const node=document.createElement(tag);
 if(className)node.className=className;
 if(text!==undefined)node.textContent=String(text);
 return node;
};
const numeral=v=>Number(v||0).toLocaleString();
function art(card,cls){
 const frame=el("div",cls);
 const fallback=el("span","pcd-fallback","◉");
 frame.append(fallback);
 if(typeof card?.image_url==="string"&&card.image_url.startsWith("https://assets.tcgdex.net/")){
   const image=document.createElement("img");
   image.alt="";
   image.loading="lazy";
   image.decoding="async";
   image.addEventListener("error",()=>image.remove(),{once:true});
   image.src=card.image_url+"/low.webp";
   frame.append(image);
 }
 return frame;
}
function resultCard(card){
 const btn=el("button","pcd-card");
 btn.type="button";
 btn.dataset.tier=card.rarity_tier||"Common";
 btn.setAttribute("aria-label",card.name+" from "+(card.set_name||card.set_id)+", "+(card.source_rarity||"unrated")+". View details.");
 btn.append(art(card,"pcd-card-art"),el("strong","pcd-card-title",card.name));
 const small=el("div","pcd-card-caption");
 small.append(el("span","",card.set_name||card.set_id),el("span","",card.local_id||""));
 btn.append(small,el("span","pcd-card-rarity",card.source_rarity||"Not rated"));
 btn.addEventListener("click",()=>showDetail(card));
 return btn;
}
function updateStatus(message,error=false){
 $("pcd-status").textContent=message;
 $("pcd-status").dataset.error=String(error);
}
async function searchCards(){
 const current=++querySequence;
 updateStatus("Searching English Pokémon cards…");
 const offset=state.page*PAGE_SIZE;
 let query=db.from("pokemon_tcg_card_index")
 .select("tcgdex_id,name,local_id,set_id,set_name,image_url,rarity_tier,source_rarity,category,archive_pack_id",{count:"exact"});
 if(state.search)query=query.ilike("name","%"+state.search.replace(/[%_]/g,"")+"%");
 if(state.set!=="all")query=query.eq("set_id",state.set);
 if(state.category!=="all")query=query.eq("category",state.category);
 if(state.rarity!=="all")query=query.eq("rarity_tier",state.rarity);
 if(state.sort==="set")query=query.order("set_id",{ascending:true}).order("local_id",{ascending:true});
 else query=query.order("name",{ascending:state.sort!=="za"}).order("tcgdex_id",{ascending:true});
 try{
  const {data,error,count}=await query.range(offset,offset+PAGE_SIZE-1);
  if(current!==querySequence)return;
  if(error)throw error;
  state.total=count||0;
  const grid=$("pcd-grid");grid.replaceChildren();
  for(const card of data||[])grid.append(resultCard(card));
  if(!data?.length)grid.append(el("p","pcd-empty","No cards match these filters. Try another name or expansion."));
  $("pcd-page-number").textContent="Page "+(state.page+1)+" of "+Math.max(1,Math.ceil(state.total/PAGE_SIZE));
  $("pcd-page-label").textContent=state.total?numeral(offset+1)+"–"+numeral(offset+data.length)+" / "+numeral(state.total):"0 cards";
  $("pcd-prev").disabled=state.page<=0;
  $("pcd-next").disabled=offset+data.length>=state.total;
  updateStatus(numeral(state.total)+" card printings match your search.");
 }catch(error){
  if(current!==querySequence)return;
  updateStatus("Couldn't load the Pokémon card index: "+(error.message||"Please retry."),true);
 }
}
function resetSearch(){
 state.page=0;
 state.search="";
 state.set="all";
 state.category="all";
 state.rarity="all";
 state.sort="az";
 $("pcd-search").value="";
 $("pcd-set").value="all";
 $("pcd-category").value="all";
 $("pcd-rarity").value="all";
 $("pcd-sort").value="az";
 searchCards();
}
function addMeta(label,value){
 const root=el("div","pcd-detail-meta");
 root.append(el("strong","",label),el("span","",value==null||value===""?"—":value));
 $("pcd-detail-metadata").append(root);
}
function writeFallbackMeta(card){
 const root=$("pcd-detail-metadata");root.replaceChildren();
 addMeta("Expansion",card.set_name||card.set_id);
 addMeta("Card number",card.local_id||"Unknown");
 addMeta("Category",card.category||"Pokémon Card");
 addMeta("Rarity",card.source_rarity||"Unrated");
 addMeta("Pull tier",card.rarity_tier||"Unrated");
 $("pcd-detail-attacks").replaceChildren();
}
function detailLinks(card){
 $("pcd-find-pack").href="pokemon-card-shop.html?pack="+encodeURIComponent(card.archive_pack_id||"pokemon-archive-1");
 $("pcd-tcgdex-link").href="https://api.tcgdex.net/v2/en/cards/"+encodeURIComponent(card.tcgdex_id);
 $("pcd-tcgdex-link").textContent="TCGdex Source";
}
async function showDetail(card){
 if(detailAbort)detailAbort.abort();
 detailAbort=new AbortController();
 const controller=detailAbort;
 const dialog=$("pcd-dialog");
 $("pcd-dialog-title").textContent=card.name;
 $("pcd-detail-image").replaceChildren(art(card,"pcd-detail-image-inner"));
 writeFallbackMeta(card);
 detailLinks(card);
 $("pcd-detail-status").textContent="Loading detailed card information…";
 if(!dialog.open){try{dialog.showModal();}catch(_){dialog.setAttribute("open","");}}
 try{
  const response=await fetch("https://api.tcgdex.net/v2/en/cards/"+encodeURIComponent(card.tcgdex_id),
   {signal:controller.signal,headers:{"Accept":"application/json"}});
  if(!response.ok)throw Error("Detailed card information unavailable.");
  const info=await response.json();
  if(controller.signal.aborted)return;
  $("pcd-detail-metadata").replaceChildren();
  addMeta("Expansion",info?.set?.name||card.set_name||card.set_id);
  addMeta("Card number",info?.localId||card.local_id);
  addMeta("Category",info?.category||card.category);
  addMeta("Rarity",info?.rarity||card.source_rarity);
  addMeta("Type",Array.isArray(info?.types)?info.types.join(", "):info?.energyType||info?.trainerType||"—");
  if(info?.hp!=null)addMeta("HP",String(info.hp));
  if(info?.stage)addMeta("Stage",String(info.stage));
  if(info?.evolveFrom)addMeta("Evolves from",String(info.evolveFrom));
  if(info?.illustrator)addMeta("Illustrator",String(info.illustrator));
  const attacks=$("pcd-detail-attacks");attacks.replaceChildren();
  if(Array.isArray(info?.attacks)&&info.attacks.length){
    attacks.append(el("h3","","Attacks"));
    for(const move of info.attacks){
      const name=el("strong","",String(move.name||"Attack")+(move.damage!=null?" · "+move.damage+" damage":""));
      const cost=Array.isArray(move.cost)?move.cost.join(" / "):"";
      const body=el("p","",cost+(cost&&move.effect?" · ":"")+(move.effect||""));
      attacks.append(name,body);
    }
  }else if(info?.effect)attacks.append(el("p","",String(info.effect)));
  $("pcd-detail-status").textContent="Card data from TCGdex. Card effects are reference information, not implemented in the simplified Arena.";
 }catch(error){
  if(controller.signal.aborted)return;
  $("pcd-detail-status").textContent="Basic catalog information is available. TCGdex couldn't load the detailed card text.";
 }
}
$("pcd-close").addEventListener("click",()=>$("pcd-dialog").close());
$("pcd-dialog").addEventListener("close",()=>{if(detailAbort){detailAbort.abort();detailAbort=null;}});
$("pcd-search-form").addEventListener("submit",event=>{
 event.preventDefault();
 state.search=$("pcd-search").value.trim().slice(0,80);
 state.page=0;searchCards();
});
$("pcd-search").addEventListener("input",()=>{
 clearTimeout(searchTimer);
 searchTimer=setTimeout(()=>{
  state.search=$("pcd-search").value.trim().slice(0,80);
  state.page=0;searchCards();
 },320);
});
for(const [input,key] of [["pcd-set","set"],["pcd-category","category"],["pcd-rarity","rarity"],["pcd-sort","sort"]]){
 $(input).addEventListener("change",event=>{state[key]=event.target.value;state.page=0;searchCards();});
}
$("pcd-clear").addEventListener("click",resetSearch);
$("pcd-prev").addEventListener("click",()=>{
 if(state.page<=0)return;state.page--;searchCards();
 $("pcd-library-heading").scrollIntoView({behavior:"smooth",block:"start"});
});
$("pcd-next").addEventListener("click",()=>{
 if((state.page+1)*PAGE_SIZE>=state.total)return;
 state.page++;searchCards();
 $("pcd-library-heading").scrollIntoView({behavior:"smooth",block:"start"});
});
async function init(){
 try{
  const [sets,total]=await Promise.all([
   db.from("pokemon_tcg_sets").select("set_id,name").order("name").limit(500),
   db.from("pokemon_tcg_card_index").select("tcgdex_id",{head:true,count:"exact"})
  ]);
  if(sets.error)throw sets.error;
  if(total.error)throw total.error;
  $("pcd-total-cards").textContent=numeral(total.count);
  $("pcd-total-sets").textContent=numeral(sets.data?.length);
  const select=$("pcd-set");
  for(const set of sets.data||[]){
   const opt=el("option","",set.name+" ("+set.set_id+")");
   opt.value=set.set_id;select.append(opt);
  }
  await searchCards();
  const params=new URLSearchParams(location.search);
  const linked=params.get("card");
  if(linked&&linked.length<90){
   const {data,error}=await db.from("pokemon_tcg_card_index")
    .select("tcgdex_id,name,local_id,set_id,set_name,image_url,rarity_tier,source_rarity,category,archive_pack_id")
    .eq("tcgdex_id",linked).maybeSingle();
   if(!error&&data)showDetail(data);
  }
 }catch(error){updateStatus("The card index isn't available: "+(error.message||"Try again."),true);}
}
init();
