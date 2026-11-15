import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";
const URL_ROOT="https://hsxdyxdazsdmpucyhqly.supabase.co";
const KEY="sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS";
const db=createClient(URL_ROOT,KEY);
const $=id=>document.getElementById(id);
const ART=URL_ROOT+"/storage/v1/object/public/yugioh-artwork/small/";
const ART_ENDPOINT=URL_ROOT+"/functions/v1/yugioh-artwork?id=";
const PAGE_SIZE=36;
let user=null,packs=[],collection=[],collectionCount=0,collectionOffset=0,collectionSearch="",busy=false,loadId=0;
let packSearch="",packCategory="all";
const CATEGORY_ORDER=["Featured","Legendary Series","Monster Realms","Elemental Forces","Duel Mechanics","Card Archives"];
const pending=new Map();
function requestKey(packId){return "ycs-pending-"+user.id+"-"+packId;}
function rememberRequest(packId,id){
 pending.set(packId,id);
 try{sessionStorage.setItem(requestKey(packId),id);}catch(_){}
}
function pendingRequest(packId){
 let id=pending.get(packId);
 if(!id)try{
  const stored=sessionStorage.getItem(requestKey(packId));
  if(stored&&/^[a-f0-9-]{36}$/i.test(stored)){id=stored;pending.set(packId,id);}
 }catch(_){}
 return id||null;
}
function clearRequest(packId){
 pending.delete(packId);
 try{sessionStorage.removeItem(requestKey(packId));}catch(_){}
}
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e;}
function status(text,error=false){$("ycs-status").textContent=text;$("ycs-status").dataset.error=String(error);}
function money(n){return Number(n).toLocaleString()+" coins";}
function artwork(imageId){
 const frame=el("span","ycs-art","✦"),id=Number(imageId);
 if(!Number.isSafeInteger(id)||id<=0)return frame;
 const img=document.createElement("img");img.loading="lazy";img.decoding="async";img.alt="";
 let retry=false;
 img.addEventListener("error",()=>{if(!retry){retry=true;img.src=ART_ENDPOINT+id+"&size=small";}else img.remove();});
 frame.replaceChildren(img);img.src=ART+id+".jpg";
 return frame;
}
function cardView(card,quantity){
 const view=el("article","ycs-card");view.append(artwork(card.art_image_id),el("strong","",card.name),el("small","",card.card_type));
 if(quantity!=null)view.append(el("small","ycs-qty","Owned ×"+quantity));
 return view;
}
async function fetchCards(ids){
 const unique=[...new Set(ids.map(Number).filter(x=>Number.isSafeInteger(x)&&x>0))];
 const cards=new Map();
 for(let start=0;start<unique.length;start+=80){
  const {data,error}=await db.from("yugioh_cards")
   .select("card_id,name,card_type,art_image_id").in("card_id",unique.slice(start,start+80));
  if(error)throw error;
  for(const row of data||[])cards.set(Number(row.card_id),row);
 }
 return cards;
}
function packView(pack){
 // Reuse the same glass-window display structure as the 182 × 282 CToon Shop cards.
 const item=el("article","ctoon-shop-card ycs-pack");
 item.dataset.theme=pack.theme||"violet";
 item.title=pack.name+" — "+pack.description;
 const art=el("div","ctoon-shop-art ycs-pack-window");
 const badge=el("span","ctoon-shop-owned ycs-pack-badge",pack.card_count+" cards");
 const image=artwork(pack.hero_art_image_id||pack.hero_image_id);
 image.classList.add("ycs-pack-cover");
 art.append(badge,image);
 const details=el("div","ctoon-shop-details ycs-pack-details");
 const heading=el("div","ctoon-shop-name");
 const name=el("span","ctoon-shop-name-text",pack.name);
 name.title=pack.name;
 heading.append(name);
 const category=el("p","collection-series ycs-pack-series",pack.category||"Featured");
 category.title=pack.description;
 const purchase=el("div","ctoon-shop-purchase");
 const price=el("span","ctoon-shop-price",money(pack.price_coins));
 const button=el("button","ctoon-shop-buy ycs-pack-open",user?"Open":"Sign in");
 button.type="button";
 button.disabled=!user||busy;
 button.setAttribute("aria-label",user?"Open "+pack.name+" for "+money(pack.price_coins):"Sign in to open "+pack.name);
 button.addEventListener("click",()=>openPack(pack));
 purchase.append(price,button);
 const pool=el("p","ctoon-shop-status ycs-pack-pool",Number(pack.pool_size||0).toLocaleString()+" possible cards · "+pack.card_count+" per pack");
 details.append(heading,category,purchase,pool);
 item.append(art,details);
 return item;
}
function drawPacks(){
 const root=$("ycs-pack-grid");
 const query=packSearch.toLocaleLowerCase();
 const shown=packs.filter(pack=>
   (packCategory==="all"||pack.category===packCategory) &&
   (!query||[pack.name,pack.description,pack.category].some(value=>String(value||"").toLocaleLowerCase().includes(query)))
 );
 root.replaceChildren();
 for(const pack of shown)root.append(packView(pack));
 if(!shown.length)root.append(el("p","ycs-no-packs","No packs match your search. Try another name or category."));
 $("ycs-pack-count").textContent="Showing "+shown.length+" of "+packs.length+" packs";
}
async function loadPacks(){
 const {data,error}=await db.from("yugioh_shop_packs")
  .select("id,name,description,category,sort_order,pool_size,price_coins,card_count,hero_image_id,theme")
  .eq("is_active",true).order("sort_order",{ascending:true}).order("name",{ascending:true});
 if(error)throw error;
 packs=data||[];
 // Hero IDs are card catalog IDs; use the canonical artwork ID to prevent broken pack art.
 try{
  const heroes=await fetchCards(packs.map(pack=>pack.hero_image_id));
  for(const pack of packs)pack.hero_art_image_id=heroes.get(Number(pack.hero_image_id))?.art_image_id||pack.hero_image_id;
 }catch(e){console.warn("Pack hero artwork mapping unavailable",e);}
 const selector=$("ycs-pack-category");
 const previous=selector.value||"all";
 const categories=[...new Set(packs.map(pack=>pack.category||"Featured"))];
 categories.sort((a,b)=>
   CATEGORY_ORDER.indexOf(a)===-1?1:CATEGORY_ORDER.indexOf(b)===-1?-1:CATEGORY_ORDER.indexOf(a)-CATEGORY_ORDER.indexOf(b));
 selector.replaceChildren();
 const all=el("option","","All pack categories");all.value="all";selector.append(all);
 for(const category of categories){const option=el("option","",category+" ("+packs.filter(x=>x.category===category).length+")");option.value=category;selector.append(option);}
 packCategory=categories.includes(previous)?previous:"all";
 selector.value=packCategory;
 drawPacks();
}
async function loadWallet(){
 const balance=$("ycs-balance");
 $("ycs-signin").hidden=!!user;
 if(!user){balance.textContent="Sign in to open packs";return;}
 const {data,error}=await db.from("coin_wallets").select("balance").eq("user_id",user.id).maybeSingle();
 balance.textContent=error?"Balance unavailable":money(data?.balance??0);
}
async function loadCollection(reset=false){
 const generation=loadId;
 if(!user){collection=[];collectionOffset=0;collectionCount=0;$("ycs-collection-grid").replaceChildren();
  $("ycs-collection-total").textContent="0 owned cards";$("ycs-collection-status").textContent="Sign in to view your cards."; $("ycs-more").hidden=true;return;}
 if(reset){collection=[];collectionOffset=0;$("ycs-collection-grid").replaceChildren();}
 let query=db.from("yugioh_player_cards").select("card_id,quantity,acquired_at",{count:"exact"})
  .eq("user_id",user.id).order("acquired_at",{ascending:false})
  .range(collectionOffset,collectionOffset+PAGE_SIZE-1);
 if(collectionSearch) query=query.in("card_id",await findMatchingOwnedIds(collectionSearch));
 const {data,count,error}=await query;
 if(generation!==loadId)return;
 if(error)throw error;
 collectionCount=count||0;
 const mapped=await fetchCards((data||[]).map(row=>row.card_id));
 if(generation!==loadId)return;
 collection.push(...(data||[]).map(row=>({...row,card:mapped.get(Number(row.card_id))})));
 collectionOffset+=data?.length||0;
 const root=$("ycs-collection-grid");root.replaceChildren();
 for(const entry of collection){if(entry.card)root.append(cardView(entry.card,entry.quantity));}
 $("ycs-collection-total").textContent=collectionCount+" unique cards";
 $("ycs-collection-status").textContent=collectionCount?
  "Showing "+collection.length+" of "+collectionCount+" cards. Each quantity comes from opened packs.":
  collectionSearch?"No matching owned cards.":"No owned Yu-Gi-Oh! cards yet. Open a pack to begin collecting!";
 $("ycs-more").hidden=collectionOffset>=collectionCount;
}
async function findMatchingOwnedIds(term){
 // Filter against the player's collection IDs, never use an unrestricted catalog search for ownership.
 const {data,error}=await db.from("yugioh_player_cards").select("card_id")
  .eq("user_id",user.id).limit(2000);
 if(error)throw error;
 const owned=(data||[]).map(row=>Number(row.card_id));if(!owned.length)return [-1];
 const results=[];
 for(let start=0;start<owned.length;start+=80){
  const {data:cards,error:cardError}=await db.from("yugioh_cards")
   .select("card_id,name").in("card_id",owned.slice(start,start+80))
   .ilike("name","%"+term.replace(/[%_*,()]/g,"")+"%");
  if(cardError)throw cardError;
  for(const c of cards||[])results.push(Number(c.card_id));
 }
 return results.length?results:[-1];
}
async function loadHistory(){
 const root=$("ycs-history-list");
 if(!user){root.replaceChildren(el("p","","Sign in to view your pack openings."));return;}
 const {data,error}=await db.from("yugioh_pack_openings")
  .select("pack_name,price_coins,card_ids,created_at").eq("user_id",user.id)
  .order("created_at",{ascending:false}).limit(10);
 if(error)throw error;
 root.replaceChildren();
 if(!data?.length){root.append(el("p","","You have not opened a booster pack yet."));return;}
 for(const entry of data){
  const item=el("div","ycs-history-item");
  item.append(el("strong","",entry.pack_name),
   el("span","",new Date(entry.created_at).toLocaleString()),
   el("span","",(entry.card_ids?.length||0)+" cards · "+money(entry.price_coins)));
  root.append(item);
 }
}
async function refresh(){
 const generation=++loadId;
 try {
  const {data,error}=await db.auth.getUser();
  if(generation!==loadId)return;
  user=error?null:data.user;
  await loadPacks();if(generation!==loadId)return;
  await loadWallet();
  await loadCollection(true);
  await loadHistory();
  status(user?"Packs are ready. Choose a pack to collect cards.":"Browse packs below. Sign in to purchase and collect.");
 } catch(e){if(generation===loadId)status("Could not load the Card Shop: "+(e.message||"Please retry."),true);}
}
async function showOpening(opening){
 const ids=opening.card_ids||[];
 const cards=await fetchCards(ids);
 const root=$("ycs-reveal-grid");root.replaceChildren();
 for(const raw of ids){
  const card=cards.get(Number(raw));
  if(card)root.append(cardView(card,null));
  else root.append(el("article","ycs-card","Card #"+raw));
 }
 $("ycs-reveal-summary").textContent=opening.pack_name+
  " · "+ids.length+" cards added · Remaining balance: "+money(opening.balance)+
  (opening.replayed?" · Recovered previous purchase":"");
 $("ycs-reveal-section").hidden=false;
 $("ycs-reveal-section").scrollIntoView({behavior:"smooth",block:"start"});
}
async function openPack(pack){
 if(busy||!user)return;
 const {data,error:authError}=await db.auth.getUser();
 if(authError||!data.user||data.user.id!==user.id){status("Please sign in again before purchasing.",true);return;}
 if(!pendingRequest(pack.id)){
  if(!confirm("Spend "+money(pack.price_coins)+" on "+pack.name+"? You will receive "+
    pack.card_count+" random collectible cards."))return;
  rememberRequest(pack.id,crypto.randomUUID());
 }
 busy=true;drawPacks();status("Opening "+pack.name+"…");
 let purchased=false;
 try{
  const {data:opening,error}=await db.rpc("open_yugioh_pack",{p_pack_id:pack.id,p_request_id:pendingRequest(pack.id)});
  if(error)throw error;
  purchased=true;
  clearRequest(pack.id);
  window.dispatchEvent(new Event("ctoon-profile-updated"));
  status("Pack opened! Your purchased cards were added to your collection.");
  try { await showOpening(opening); } catch(e) {
   status("Purchase succeeded, but card images could not load. View your collection to see rewards.",true);
  }
  const updates=await Promise.allSettled([loadWallet(),loadCollection(true),loadHistory()]);
  if(updates.some(x=>x.status==="rejected"))
   status("Purchase succeeded! Refresh this page if the balance or collection has not updated.",true);
 }catch(e){
  status(purchased?"Purchase succeeded! Refresh to view your new cards.":"Pack could not be confirmed: "+
   (e.message||"Try again")+". Retry this pack without risk of a duplicate charge.",!purchased);
 }finally{busy=false;drawPacks();}
}
$("ycs-pack-search").addEventListener("input",event=>{
 packSearch=event.target.value.trim().slice(0,80);
 drawPacks();
});
$("ycs-pack-category").addEventListener("change",event=>{
 packCategory=event.target.value;
 drawPacks();
});
$("ycs-reveal-close").addEventListener("click",()=>{$("ycs-reveal-section").hidden=true;});
$("ycs-more").addEventListener("click",()=>loadCollection().catch(e=>status("Could not load more cards: "+e.message,true)));
let searchTimer;
$("ycs-collection-search").addEventListener("input",e=>{
 clearTimeout(searchTimer);collectionSearch=e.target.value.trim().slice(0,80);
 searchTimer=setTimeout(()=>loadCollection(true).catch(error=>status("Collection search unavailable: "+error.message,true)),300);
});
db.auth.onAuthStateChange((event)=>{if(["SIGNED_IN","SIGNED_OUT"].includes(event)){pending.clear();setTimeout(refresh,0);}});
window.addEventListener("pageshow",e=>{if(e.persisted)refresh();});
refresh();
