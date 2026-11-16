import {createClient} from "https://esm.sh/@supabase/supabase-js@2.58.0";

const db=createClient("https://hsxdyxdazsdmpucyhqly.supabase.co","sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS");
const $=id=>document.getElementById(id);
const ART="https://assets.tcgdex.net/en/base/base1/";
const COLORS={fire:"🔥",water:"💧",lightning:"⚡",trainer:"🎴",classic:"⭐",evolution:"✨"};
let currentUser=null,allPacks=[],catalog=new Map(),collection=[],openings=[];
let busy=false,generation=0,searchText="",rarityFilter="all";
let collectionTotal=0,collectionOffset=0;
const COLLECTION_PAGE=120;
const requests=new Map();
function el(tag,cls,text){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(text!==undefined)node.textContent=String(text);
 return node;
}
function status(message,error=false){
 const root=$("pcs-status");root.textContent=message;root.dataset.error=String(error);
}
function money(value){return Number(value||0).toLocaleString()+" Coins";}
function key(packId){return "pcs-request-"+currentUser.id+"-"+packId;}
function pendingRequest(packId){
 let id=requests.get(packId);
 if(!id)try{
  const value=sessionStorage.getItem(key(packId));
  if(value&&/^[0-9a-f-]{36}$/i.test(value)){id=value;requests.set(packId,id);}
 }catch(_){}
 return id||null;
}
function saveRequest(packId,id){
 requests.set(packId,id);
 try{sessionStorage.setItem(key(packId),id);}catch(_){}
}
function clearRequest(packId){
 requests.delete(packId);
 try{sessionStorage.removeItem(key(packId));}catch(_){}
}
function artwork(row,cssClass){
 const frame=el("div",cssClass);
 const fallback=el("span","pcs-fallback",COLORS[row?.energy_type]||"⭐");
 frame.append(fallback);
 const classicId=Number(row?.base_number);
 let url="";
 if(typeof row?.image_url==="string"&&row.image_url.startsWith("https://assets.tcgdex.net/")){
  url=row.image_url+"/low.webp";
 }else if(Number.isInteger(classicId)&&classicId>0&&classicId<=102){
  url=ART+classicId+"/low.webp";
 }
 if(url){
  const img=document.createElement("img");
  img.alt="";
  img.loading="lazy";img.decoding="async";
  img.addEventListener("error",()=>img.remove(),{once:true});
  img.src=url;
  frame.append(img);
 }
 return frame;
}
function cardElement(row,quantity){
 if(!row)return el("div","pcs-card","Unknown card");
 const card=el("article","pcs-card");
 card.dataset.rarity=row.rarity;
 const info=el("div","pcs-card-info");
 card.append(artwork(row,"pcs-card-image"),el("strong","",row.name),
   el("span","pcs-rarity",row.source_rarity&&row.source_rarity!=="None"?row.source_rarity:row.rarity),
   el("small","",row.set_name?
      row.set_name+(row.local_id?" · #"+row.local_id:""):
      row.kind==="pokemon"?(row.stage?"Stage "+row.stage:"Basic")+" · "+row.hp+" HP":
      row.kind==="energy"?"Energy":"Trainer"));
 if(quantity!==undefined&&quantity!==null)card.append(el("span","pcs-qty","×"+quantity));
 return card;
}
function packElement(pack){
 const card=el("article","pcs-pack");
 card.dataset.theme=pack.theme;
 card.id="pcs-pack-"+pack.id;
 const art=el("div","pcs-window");
 const hero=catalog.get(pack.hero_card_id);
 art.append(artwork(hero||{energy_type:pack.theme,base_number:0},"pcs-pack-window-art"));
 art.append(el("span","pcs-foil",pack.card_count+" RANDOM CARDS"));
 const copy=el("div","pcs-pack-copy");
 copy.append(el("h3","",pack.name),el("p","",pack.description),
  el("span","pcs-price",money(pack.price_coins)));
 const open=el("button","pcs-open",currentUser?"Open Booster Pack":"Sign in to Open");
 open.type="button";open.disabled=!currentUser||busy;
 open.setAttribute("aria-label","Open "+pack.name+" pack for "+money(pack.price_coins));
 open.addEventListener("click",()=>purchasePack(pack));
 copy.append(open,el("small","pcs-pack-count",
  Number(pack.pool_size||0).toLocaleString()+" possible cards · "+pack.card_count+" per pack"));
 card.append(art,copy);
 return card;
}
function drawPacks(){
 const root=$("pcs-pack-grid");root.replaceChildren();
 for(const pack of allPacks)root.append(packElement(pack));
 if(!allPacks.length)root.append(el("p","","No active Pokémon packs are available."));
}
const CARD_SELECT="id,name,kind,energy_type,hp,stage,base_number,rarity,pull_weight,tcgdex_id,set_id,set_name,local_id,image_url,source_rarity";
async function fetchCards(ids){
 const wanted=[...new Set(ids.filter(x=>typeof x==="string"&&x.length))].filter(id=>!catalog.has(id));
 for(let i=0;i<wanted.length;i+=70){
  const {data,error}=await db.from("pokemon_card_catalog")
   .select(CARD_SELECT).in("id",wanted.slice(i,i+70));
  if(error)throw error;
  for(const card of data||[])catalog.set(card.id,card);
 }
}
async function fetchCatalogAndPacks(){
 const {data,error}=await db.from("pokemon_shop_packs")
  .select("id,name,description,theme,price_coins,card_count,hero_card_id,pool_size,sort_order")
  .eq("is_active",true).order("sort_order");
 if(error)throw error;
 allPacks=data||[];
 try{await fetchCards(allPacks.map(pack=>pack.hero_card_id));}
 catch(error){console.warn("Pack cover artwork metadata unavailable",error);}
 $("pcs-pack-total").textContent=allPacks.length+" PACKS";
 drawPacks();
 const target=new URLSearchParams(location.search).get("pack");
 if(target&&allPacks.some(pack=>pack.id===target)){
  const element=$("pcs-pack-"+target);
  if(element)setTimeout(()=>element.scrollIntoView({block:"center",behavior:"smooth"}),100);
 }
}
async function loadWallet(){
 const balance=$("pcs-balance");
 $("pcs-signin").hidden=!!currentUser;
 if(!currentUser){balance.textContent="Sign in to purchase packs";return;}
 const {data,error}=await db.from("coin_wallets").select("balance").eq("user_id",currentUser.id).maybeSingle();
 balance.textContent=error?"Balance unavailable":money(data?.balance??0);
}
function drawCollection(){
 const grid=$("pcs-collection-grid");grid.replaceChildren();
 const query=searchText.toLocaleLowerCase();
 const filtered=collection.filter(row=>{
  const card=catalog.get(row.card_id);
  return card&&(rarityFilter==="all"||card.rarity===rarityFilter)&&
   (!query||card.name.toLocaleLowerCase().includes(query));
 });
 for(const entry of filtered)grid.append(cardElement(catalog.get(entry.card_id),entry.quantity));
 $("pcs-collection-count").textContent=collectionTotal+" unique cards";
 $("pcs-collection-status").textContent=!currentUser?"Sign in to view your collection.":
  !collectionTotal?"No Pokémon cards owned yet. Open your first booster pack!":
  filtered.length?filtered.length+" matching cards in the "+collection.length+" currently loaded of "+collectionTotal+" owned.":
  "No matches among your loaded cards. Load more to search the rest.";
 $("pcs-more").hidden=!currentUser||collection.length>=collectionTotal;
}
async function loadCollection(reset=true){
 if(!currentUser){collection=[];collectionTotal=0;collectionOffset=0;drawCollection();return;}
 if(reset){collection=[];collectionOffset=0;}
 const {data,error,count}=await db.from("pokemon_player_cards")
   .select("card_id,quantity,acquired_at",{count:"exact"})
   .eq("user_id",currentUser.id).order("acquired_at",{ascending:false})
   .range(collectionOffset,collectionOffset+COLLECTION_PAGE-1);
 if(error)throw error;
 const entries=data||[];
 collectionTotal=count||0;
 collection.push(...entries);
 collectionOffset+=entries.length;
 try{await fetchCards(entries.map(row=>row.card_id));}
 catch(error){console.warn("Some collected card metadata is unavailable",error);}
 drawCollection();
}
async function loadHistory(){
 const root=$("pcs-history-list");root.replaceChildren();
 if(!currentUser){
  root.append(el("p","","Sign in to view your Pokémon pack openings."));return;
 }
 const {data,error}=await db.from("pokemon_pack_openings")
   .select("pack_name,price_coins,card_ids,created_at")
   .eq("user_id",currentUser.id).order("created_at",{ascending:false}).limit(12);
 if(error)throw error;
 openings=data||[];
 if(!openings.length){root.append(el("p","","No Pokémon booster packs opened yet."));return;}
 for(const entry of openings){
  const item=el("div","pcs-history-entry");
  item.append(el("strong","",entry.pack_name),
   el("span","",new Date(entry.created_at).toLocaleString()),
   el("span","",(entry.card_ids?.length||0)+" cards · "+money(entry.price_coins)));
  root.append(item);
 }
}
async function refresh(){
 const id=++generation;
 try{
  status("Loading Pokémon cards and packs…");
  const {data,error}=await db.auth.getUser();
  if(id!==generation)return;
  currentUser=error?null:data.user;
  await fetchCatalogAndPacks();
  if(id!==generation)return;
  await Promise.all([loadWallet(),loadCollection(),loadHistory()]);
  if(id!==generation)return;
  status(currentUser?"Ready to open Pokémon boosters. Every pull is saved to your account.":
    "Browse the booster packs. Sign in to buy cards and start a collection.");
 }catch(error){
  if(id===generation)status("Unable to load the Pokémon Shop: "+(error.message||"Please refresh."),true);
 }
}
function showSavedResult(opening){
 const ids=Array.isArray(opening.card_ids)?opening.card_ids:[];
 const grid=$("pcs-reveal-cards");grid.replaceChildren();
 for(const id of ids)grid.append(cardElement(catalog.get(id)));
 $("pcs-reveal-description").textContent=opening.pack_name+" · "+ids.length+
  " cards saved · Remaining wallet: "+money(opening.balance)+
  (opening.replayed?" · Existing purchase recovered":"");
 $("pcs-reveal").hidden=false;
}
function revealModal(pack,opening){
 return new Promise(resolve=>{
  const ids=Array.isArray(opening.card_ids)?opening.card_ids:[];
  if(!ids.length){resolve();return;}
  const modal=el("dialog","pcs-dialog");
  modal.setAttribute("aria-label",pack.name+" booster opening");
  const shell=el("div","pcs-dialog-shell");
  const header=el("header","pcs-dialog-head");
  const title=el("div");
  title.append(el("span","pcs-eyebrow","✦ BOOSTER OPENING ✦"),el("h2","",pack.name));
  const close=el("button","","×");
  close.type="button";close.setAttribute("aria-label","Close booster opening");
  header.append(title,close);
  const message=el("p","pcs-dialog-status","Rewards are already saved. Tap the pack to open!");
  message.setAttribute("role","status");
  const stage=el("div","pcs-dialog-stage");
  const buttons=el("div","pcs-dialog-actions");
  const next=el("button","","Open Pack");
  next.type="button";
  const all=el("button","secondary","Reveal All");
  all.type="button";
  buttons.append(next,all);
  shell.append(header,message,stage,buttons);
  modal.append(shell);document.body.append(modal);
  let index=-1,done=false;
  function cleanup(){
    if(done)return;
    done=true;modal.remove();resolve();
  }
  function dismiss(){
    if(modal.open&&typeof modal.close==="function")modal.close();
    else cleanup();
  }
  modal.addEventListener("close",cleanup,{once:true});
  modal.addEventListener("cancel",()=>{ /* Escape closes safely; rewards remain saved. */ });
  close.addEventListener("click",dismiss);
  function draw(){
    stage.replaceChildren();
    if(index===-1){
      const foil=el("button","pcs-foil-pack");
      foil.type="button";
      foil.append(el("span","pcs-foil-star",COLORS[pack.theme]||"⭐"),
       el("strong","",pack.name),el("small","",ids.length+" SAVED REWARDS"),
       el("small","","TAP TO OPEN"));
      foil.addEventListener("click",advance);
      stage.append(foil);
      return;
    }
    if(index>=ids.length){
      message.textContent="All "+ids.length+" cards are now in your Pokémon collection.";
      const summary=el("div","pcs-card-grid");
      for(const id of ids)summary.append(cardElement(catalog.get(id)));
      stage.append(summary);next.textContent="Close Opening";all.hidden=true;return;
    }
    const found=catalog.get(ids[index]);
    const wrapper=el("div","pcs-dialog-card");
    wrapper.append(el("p","pcs-eyebrow","CARD "+(index+1)+" OF "+ids.length),
     cardElement(found),el("span","",found?.rarity||"Pokémon Card"));
    stage.append(wrapper);
    message.textContent="You pulled "+(found?.name||"a Pokémon card")+"!";
    next.textContent=index===ids.length-1?"See All Pulls":"Reveal Next";
  }
  function advance(){
    if(index>=ids.length){dismiss();return;}
    index++;draw();
  }
  next.addEventListener("click",advance);
  all.addEventListener("click",()=>{index=ids.length;draw();});
  try{modal.showModal();}catch(_){modal.setAttribute("open","");}
  draw();
  close.focus({preventScroll:true});
 });
}
async function purchasePack(pack){
 if(busy||!currentUser)return;
 const {data:auth,error:authError}=await db.auth.getUser();
 if(authError||!auth.user||auth.user.id!==currentUser.id){
  status("Sign in again to purchase booster packs.",true);return;
 }
 if(!pendingRequest(pack.id)){
  if(!confirm("Spend "+money(pack.price_coins)+" for "+pack.name+"? You'll receive 5 distinct random Pokémon cards."))return;
  saveRequest(pack.id,crypto.randomUUID());
 }
 busy=true;drawPacks();status("Purchasing "+pack.name+"…");
 let saved=false;
 try{
  const {data:opening,error}=await db.rpc("open_pokemon_pack",{
   p_pack_id:pack.id,p_request_id:pendingRequest(pack.id)
  });
  if(error)throw error;
  saved=true;clearRequest(pack.id);
  window.dispatchEvent(new Event("ctoon-profile-updated"));
  try{await fetchCards(Array.isArray(opening.card_ids)?opening.card_ids:[]);}
  catch(error){console.warn("Awarded card metadata not yet available",error);}
  showSavedResult(opening);
  status("Pack purchased! All five cards are safely stored in your collection.");
  // The visual reveal can be skipped without losing rewards.
  const updates=Promise.allSettled([loadWallet(),loadCollection(),loadHistory()]);
  try{await revealModal(pack,opening);}catch(e){console.warn("Pack opening animation unavailable",e);}
  const outcomes=await updates;
  status(outcomes.some(x=>x.status==="rejected")?
   "Your pack is saved. Refresh to update the wallet and collection totals.":
   "Pack opened! Your Pokémon collection has been updated.",
   outcomes.some(x=>x.status==="rejected"));
  $("pcs-reveal").scrollIntoView({behavior:"smooth",block:"start"});
 }catch(error){
  status(saved?"Pack rewards saved. Refresh to see your new cards.":
   "Could not confirm this purchase: "+(error.message||"Please retry.")+
    ". Retrying the same pack request will not charge twice.",true);
 }finally{
  busy=false;drawPacks();
 }
}
$("pcs-collection-search").addEventListener("input",event=>{
 searchText=event.target.value.trim().slice(0,60);
 drawCollection();
});
$("pcs-rarity").addEventListener("change",event=>{
 rarityFilter=event.target.value;
 drawCollection();
});
$("pcs-hide-results").addEventListener("click",()=>{
 $("pcs-reveal").hidden=true;
});
$("pcs-more").addEventListener("click",()=>{
 loadCollection(false).catch(error=>status("Couldn't load more owned cards: "+error.message,true));
});
db.auth.onAuthStateChange((event)=>{
 if(event==="SIGNED_IN"||event==="SIGNED_OUT"){
  requests.clear();
  setTimeout(refresh,0);
 }
});
window.addEventListener("pageshow",event=>{if(event.persisted)refresh();});
refresh();