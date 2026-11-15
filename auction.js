import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { ctoonImageUrl } from './ctoon-image-url.js';
const BASE='https://hsxdyxdazsdmpucyhqly.supabase.co';
const db=createClient(BASE,'sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id);
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e};
const coins=n=>Number(n||0).toLocaleString()+' coins';
let user=null,auctions=[],owned={ctoon:[],yugioh:[]},busy=false,version=0;
function notice(message,error=false){const output=$('auction-feedback');output.textContent=message;output.dataset.error=String(error)}
function title(a){return a.item_kind==='ctoon'?(a.ctoon_catalog?.name||'CToon'):(a.yugioh_cards?.name||'Yu-Gi-Oh! card')}
function minBid(a){return a.current_bid===null?Number(a.starting_bid):Number(a.current_bid)+1}
function timeLeft(ends){const t=new Date(ends).getTime()-Date.now();if(t<=0)return 'Ended — settlement pending';const m=Math.ceil(t/60000);if(m<60)return m+'m remaining';if(m<1440)return Math.floor(m/60)+'h '+(m%60)+'m remaining';return Math.floor(m/1440)+'d '+Math.floor(m%1440/60)+'h remaining'}
function artwork(a){
 const img=node('img');img.alt=title(a)+' artwork';img.loading='lazy';img.decoding='async';
 const backup=()=>{img.onerror=null;img.src='ctooniverse-logo.png'};
 if(a.item_kind==='ctoon'){img.src=ctoonImageUrl(a.ctoon_catalog?.image_path)||'ctooniverse-logo.png';img.onerror=backup;}
 else{
  const id=Number(a.yugioh_cards?.art_image_id||a.card_id);
  let attempted=false;img.onerror=()=>{
   if(!attempted&&Number.isSafeInteger(id)&&id>0){attempted=true;img.src=BASE+'/functions/v1/yugioh-artwork?id='+id+'&size=small';}
   else backup();
  };
  img.src=Number.isSafeInteger(id)&&id>0?BASE+'/storage/v1/object/public/yugioh-artwork/small/'+id+'.jpg':'ctooniverse-logo.png';
 }
 return img;
}
function inventoryPicker(){
 const kind=$('auction-kind').value,sel=$('auction-select'),value=sel.value;
 const items=owned[kind]||[];
 sel.replaceChildren();const initial=node('option','',user?'Choose an owned collectible…':'Sign in to list an item');initial.value='';sel.append(initial);
 for(const item of items){
   const id=String(kind==='ctoon'?item.ctoon_id:item.card_id);
   const name=kind==='ctoon'?item.ctoon_catalog?.name:item.yugioh_cards?.name;
   if(!name||item.quantity<1)continue;
   const option=node('option','',name+' · Owned ×'+item.quantity);option.value=id;sel.append(option);
 }
 if([...sel.options].some(x=>x.value===value))sel.value=value;
 $('auction-inventory-note').textContent=!user?'You must sign in to sell a collectible.':items.length?'One owned copy is reserved while a listing is active. Starter-deck loan cards are not eligible.':'No available '+(kind==='ctoon'?'CToons':'Yu-Gi-Oh! cards')+' to list.';
 $('auction-sell').disabled=busy||!user||items.length===0;
}
async function loadOwned(){
 if(!user){owned={ctoon:[],yugioh:[]};inventoryPicker();return;}
 const [ct,yg]=await Promise.all([
  db.from('player_ctoons').select('ctoon_id,quantity,ctoon_catalog(name,image_path)').eq('user_id',user.id).gt('quantity',0),
  db.from('yugioh_player_cards').select('card_id,quantity,yugioh_cards(name,art_image_id)').eq('user_id',user.id).gt('quantity',0)
 ]);
 if(ct.error)throw ct.error;if(yg.error)throw yg.error;
 owned={ctoon:(ct.data||[]).filter(x=>x.ctoon_catalog).sort((a,b)=>a.ctoon_catalog.name.localeCompare(b.ctoon_catalog.name)),
 yugioh:(yg.data||[]).filter(x=>x.yugioh_cards).sort((a,b)=>a.yugioh_cards.name.localeCompare(b.yugioh_cards.name))};
 inventoryPicker();
}
async function loadWallet(){
 if(!user)return;
 const {data,error}=await db.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle();
 if(error)throw error;
 $('auction-wallet').textContent=coins(data?.balance||0)+' available';
}
function drawAuctions(){
 const root=$('auction-grid');root.replaceChildren();
 const filter=$('auction-filter').value,query=$('auction-search').value.trim().toLowerCase();
 const showing=auctions.filter(a=>{
  const isActive=a.status==='active'&&Date.parse(a.ends_at)>Date.now();
  return (!query||title(a).toLowerCase().includes(query)) &&
    (filter==='all'||filter==='active'&&isActive||filter==='mine'&&user&&a.seller_id===user.id||
      filter==='winning'&&user&&a.highest_bidder_id===user.id);
 }).sort((a,b)=>Date.parse(a.ends_at)-Date.parse(b.ends_at));
 if(!showing.length){root.append(node('p','auction-empty-state','No auctions match this view. Select another filter or create a listing.'));return}
 for(const a of showing)root.append(auctionCard(a));
}
function auctionCard(a){
 const card=node('article','auction-item-card');
 const visual=node('div','auction-art');visual.append(artwork(a),node('span','auction-type',a.item_kind==='ctoon'?'CTOON':'YU-GI-OH!'));
 card.append(visual);
 const body=node('div','auction-item-info');
 body.append(node('h3','',title(a)));
 body.append(node('p','auction-amount',coins(a.current_bid??a.starting_bid)));
 body.append(node('p','auction-muted',a.current_bid===null?'Starting bid':'Current winning bid'));
 const ends=node('p','auction-time');
 ends.dataset.until=a.ends_at;ends.dataset.status=a.status;
 ends.textContent=a.status==='cancelled'?'Cancelled — item returned':a.status==='settled'?
  (a.current_bid===null?'Ended — item returned':'Sold — payout complete'):timeLeft(a.ends_at);
 body.append(ends);
 const mine=!!user&&a.seller_id===user.id;
 const leading=!!user&&a.highest_bidder_id===user.id;
 if(mine)body.append(node('p','auction-own','Your listing'));
 if(leading)body.append(node('p','auction-leading','★ Your winning bid'));
 const actions=node('div','auction-card-actions');
 if(a.status==='active'&&Date.parse(a.ends_at)>Date.now()){
  if(mine&&a.current_bid===null){
   const b=node('button','auction-action auction-secondary','Cancel listing');b.type='button';b.disabled=busy;
   b.addEventListener('click',()=>cancelAuction(a));actions.append(b);
  }else if(!mine&&!leading){
   const form=node('form','auction-bid-form');
   const input=node('input');input.type='number';input.required=true;input.min=String(minBid(a));input.max='1000000000';input.step='1';input.value=String(minBid(a));input.setAttribute('aria-label','Your bid for '+title(a));
   const b=node('button','auction-action',user?'Bid':'Sign in');b.type='submit';b.disabled=busy;
   form.append(input,b);form.addEventListener('submit',event=>{event.preventDefault();if(user)placeBid(a,input.value);else location.href='login.html';});
   actions.append(form);
  }else if(mine)actions.append(node('small','auction-muted','Cannot cancel after the first bid.'));
 }
 body.append(actions);card.append(body);return card;
}
async function loadAuctions(){
 const {data,error}=await db.from('marketplace_auctions')
  .select('id,seller_id,item_kind,ctoon_id,card_id,starting_bid,current_bid,highest_bidder_id,status,created_at,ends_at,ctoon_catalog(name,rarity,series,image_path),yugioh_cards(name,art_image_id)')
  .order('created_at',{ascending:false}).limit(250);
 if(error)throw error;
 auctions=data||[];
 $('auction-count').textContent=auctions.filter(a=>a.status==='active'&&Date.parse(a.ends_at)>Date.now()).length+' active listings';
 drawAuctions();
}
async function refresh(){
 const generation=++version;
 try{
  const {data,error}=await db.auth.getUser();if(error)console.warn('Auction session:',error.message);
  if(generation!==version)return;
  user=data?.user||null;
  $('auction-login').hidden=!!user;$('auction-sell-panel').hidden=!user;
  $('auction-wallet').textContent=user?'Loading wallet…':'Sign in to bid';
  if(user){const settled=await db.rpc('marketplace_settle_expired',{p_limit:50});if(settled.error)console.warn('Settlement:',settled.error.message)}
  await Promise.all([loadAuctions(),loadOwned(),...(user?[loadWallet()]:[])]);
 }catch(e){notice('Could not load auctions: '+(e?.message||'Unknown error'),true);}
}
async function mutate(fn,args,success){
 if(busy)return;
 busy=true;inventoryPicker();notice('Processing…');
 try{
  const {data,error}=await db.rpc(fn,args);if(error)throw error;
  notice(success);window.dispatchEvent(new Event('ctoon-profile-updated'));
  await refresh();return data;
 }catch(e){notice('Auction not changed: '+(e?.message||'Unknown error'),true);return null}
 finally{busy=false;inventoryPicker();drawAuctions();}
}
function placeBid(a,raw){
 const amount=Number(raw);
 if(!Number.isSafeInteger(amount)||amount<minBid(a)||amount>1000000000){notice('Minimum bid: '+coins(minBid(a)),true);return}
 if(!confirm('Bid '+coins(amount)+' on '+title(a)+'? Coins will be held until you are outbid or win.'))return;
 mutate('marketplace_place_bid',{p_auction_id:a.id,p_amount:amount},'Bid placed! Your bid is held safely in escrow.');
}
function cancelAuction(a){
 if(!confirm('Cancel '+title(a)+' and return your collectible?'))return;
 mutate('marketplace_cancel_listing',{p_auction_id:a.id},'Auction cancelled; collectible returned.');
}
async function submitListing(event){
 event.preventDefault();if(!user||busy)return;
 const kind=$('auction-kind').value,choice=$('auction-select').value,amount=Number($('auction-start-bid').value),hours=Number($('auction-duration').value);
 if(!choice||!Number.isSafeInteger(amount)||amount<1||amount>1000000000){notice('Choose a collectible and enter a valid starting bid.',true);return}
 if(!confirm('List this collectible for '+coins(amount)+'? One owned copy is held until the auction closes.'))return;
 await mutate('marketplace_create_listing',{p_item_kind:kind,p_ctoon_id:kind==='ctoon'?choice:null,p_card_id:kind==='yugioh'?Number(choice):null,p_starting_bid:amount,p_duration_hours:hours},'Auction created! Your collectible is now listed.');
}
$('auction-kind').addEventListener('change',inventoryPicker);
$('auction-filter').addEventListener('change',drawAuctions);
$('auction-search').addEventListener('input',drawAuctions);
$('auction-form').addEventListener('submit',submitListing);
$('auction-refresh').addEventListener('click',refresh);
db.auth.onAuthStateChange(()=>setTimeout(refresh,0));
window.addEventListener('pageshow',refresh);
setInterval(()=>{
 for(const e of document.querySelectorAll('.auction-time[data-status="active"]'))e.textContent=timeLeft(e.dataset.until);
},30000);
setInterval(()=>{if(!document.hidden&&!busy)refresh()},60000);
refresh();
