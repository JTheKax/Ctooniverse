import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import { ctoonImageUrl } from './ctoon-image-url.js';
const BASE='https://hsxdyxdazsdmpucyhqly.supabase.co';
const db=createClient(BASE,'sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id);
const node=(tag,cls,text)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=String(text);return e};
const coins=n=>Number(n||0).toLocaleString()+' coins';
let user=null,auctions=[],owned={ctoon:[],yugioh:[]},busy=false,version=0;
let activeKind=location.hash==='#cards'?'yugioh':'ctoon';
let tabChosen=location.hash==='#cards'||location.hash==='#ctoons';
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
function switchAuctionTab(kind,explicit=false){
 if(!['ctoon','yugioh'].includes(kind))return;
 activeKind=kind;if(explicit)tabChosen=true;
 for(const type of ['ctoon','yugioh']){
  const tab=$('auction-tab-'+type),panel=$('auction-panel-'+type),selected=kind===type;
  tab.setAttribute('aria-selected',String(selected));
  tab.tabIndex=selected?0:-1;
  panel.hidden=!selected;
 }
 // Listing a collectible should start in the category currently being browsed.
 $('auction-kind').value=kind;
 inventoryPicker();
}
function updateAuctionCounts(){
 const available=auctions.filter(a=>a.status==='active'&&Date.parse(a.ends_at)>Date.now());
 for(const kind of ['ctoon','yugioh']){
  $('auction-count-'+kind).textContent=String(available.filter(a=>a.item_kind===kind).length);
 }
 $('auction-count').textContent=available.length+' active auctions';
 // Avoid an apparently blank marketplace when the only real auctions are cards.
 if(!tabChosen&&activeKind==='ctoon'&&available.every(a=>a.item_kind==='yugioh')&&available.length){
  switchAuctionTab('yugioh');
 }else switchAuctionTab(activeKind);
}
function emptyAuctionWindow(kind,filter){
 const label=kind==='ctoon'?'CToon':'Yu-Gi-Oh! card';
 const card=node('article','ctoon-shop-card auction-item-card auction-empty-window');
 const art=node('div','ctoon-shop-art auction-art');
 art.append(node('span','ctoon-shop-owned auction-type',label),node('img'));
 const img=art.querySelector('img');img.src='ctooniverse-logo.png';img.alt='';
 const details=node('div','ctoon-shop-details auction-item-info');
 const heading=node('div','ctoon-shop-name');
 const name=node('span','ctoon-shop-name-text','No '+label+' auctions');
 heading.append(name);
 const series=node('p','collection-series',filter==='mine'?'Your listings':filter==='winning'?'Your winning bids':'Auction House');
 const purchase=node('div','ctoon-shop-purchase');
 const info=node('span','ctoon-shop-price','No bids yet');
 const shop=node('a','ctoon-shop-buy',kind==='ctoon'?'CToon Shop':'Card Shop');
 shop.href=kind==='ctoon'?'shop.html':'yugioh-card-shop.html';
 purchase.append(info,shop);
 const status=node('p','ctoon-shop-status auction-time',filter==='active'?'Awaiting new listings':'Nothing to display');
 details.append(heading,series,purchase,status);
 card.append(art,details);
 return card;
}
function drawAuctions(){
 const filter=$('auction-filter').value,query=$('auction-search').value.trim().toLowerCase();
 for(const kind of ['ctoon','yugioh']){
  const root=$('auction-grid-'+kind);root.replaceChildren();
  const showing=auctions.filter(a=>{
   const isActive=a.status==='active'&&Date.parse(a.ends_at)>Date.now();
   return a.item_kind===kind&&(!query||title(a).toLowerCase().includes(query))&&
     (filter==='all'||filter==='active'&&isActive||
       filter==='mine'&&user&&a.seller_id===user.id||
       filter==='winning'&&user&&a.highest_bidder_id===user.id);
  }).sort((a,b)=>Date.parse(a.ends_at)-Date.parse(b.ends_at));
  if(!showing.length){
   root.append(emptyAuctionWindow(kind,filter));
   const caption=filter==='mine'?'You have no '+(kind==='ctoon'?'CToon':'Yu-Gi-Oh! card')+' listings yet.':
     filter==='winning'?'You have no winning bids in this category.':
     query?'No auctions match your search.':
     'No current '+(kind==='ctoon'?'CToon':'Yu-Gi-Oh! card')+' listings. New items will appear here.';
   root.append(node('p','auction-empty-state',caption));
   continue;
  }
  for(const a of showing)root.append(auctionCard(a));
 }
}
function auctionCard(a){
 const card=node('article','ctoon-shop-card auction-item-card');
 const visual=node('div','ctoon-shop-art auction-art');
 visual.append(node('span','ctoon-shop-owned auction-type',a.item_kind==='ctoon'?'CToon':'Card'),artwork(a));
 const details=node('div','ctoon-shop-details auction-item-info');
 const heading=node('div','ctoon-shop-name');
 const name=node('span','ctoon-shop-name-text',title(a));name.title=title(a);
 const rarity=node('span','ctoon-shop-rarity',a.item_kind==='ctoon'?
   String(a.ctoon_catalog?.rarity||'Common').charAt(0).toUpperCase():'Y');
 rarity.title=a.item_kind==='ctoon'?(a.ctoon_catalog?.rarity||'Common'):'Yu-Gi-Oh! Card';
 heading.append(name,rarity);
 const series=node('p','collection-series',
   a.item_kind==='ctoon'?(a.ctoon_catalog?.series||'CTooniverse'):'Yu-Gi-Oh! Card');
 series.title=series.textContent;
 const purchase=node('div','ctoon-shop-purchase');
 const amount=node('span','ctoon-shop-price',coins(a.current_bid??a.starting_bid));
 amount.title=a.current_bid===null?'Starting bid':'Current winning bid';
 const mine=!!user&&a.seller_id===user.id;
 const winning=!!user&&a.highest_bidder_id===user.id;
 const active=a.status==='active'&&Date.parse(a.ends_at)>Date.now();
 const open=node('button','ctoon-shop-buy auction-view',
  !active?'View':mine?'Manage':winning?'Winning':'Bid');
 open.type='button';open.setAttribute('aria-label','View auction for '+title(a));
 open.addEventListener('click',()=>openAuction(a.id));
 purchase.append(amount,open);
 const ends=node('p','ctoon-shop-status auction-time');
 ends.dataset.until=a.ends_at;ends.dataset.status=a.status;
 ends.textContent=a.status==='cancelled'?'Cancelled · Item returned':
   a.status==='settled'?(a.current_bid===null?'Unsold · Item returned':'Sold · Paid out'):
   timeLeft(a.ends_at);
 details.append(heading,series,purchase,ends);
 card.append(visual,details);
 return card;
}
function openAuction(id){
 const a=auctions.find(item=>item.id===id);if(!a)return;
 const dialog=$('auction-dialog'),content=$('auction-dialog-body');
 content.replaceChildren();
 $('auction-dialog-title').textContent=title(a);
 const visual=node('div','auction-dialog-art');visual.append(artwork(a));
 const details=node('div','auction-dialog-info');
 details.append(node('p','auction-dialog-type',a.item_kind==='ctoon'?
   (a.ctoon_catalog?.rarity||'CToon')+' · '+(a.ctoon_catalog?.series||'CTooniverse'):
   'Yu-Gi-Oh! collectible card'));
 details.append(node('p','auction-dialog-amount',coins(a.current_bid??a.starting_bid)));
 details.append(node('p','auction-dialog-label',a.current_bid===null?'Starting bid':'Current winning bid'));
 const time=node('p','auction-time');
 time.dataset.until=a.ends_at;time.dataset.status=a.status;
 time.textContent=a.status==='cancelled'?'Cancelled · Item returned':
   a.status==='settled'?(a.current_bid===null?'Unsold · Item returned':'Sold · Paid out'):
   timeLeft(a.ends_at);
 details.append(time);
 const active=a.status==='active'&&Date.parse(a.ends_at)>Date.now();
 const mine=!!user&&a.seller_id===user.id;
 const winning=!!user&&a.highest_bidder_id===user.id;
 if(active){
  if(mine&&a.current_bid===null){
   details.append(node('p','auction-dialog-label','Your listing — no bids yet'));
   const button=node('button','auction-action auction-secondary','Cancel listing');
   button.type='button';button.disabled=busy;
   button.addEventListener('click',()=>cancelAuction(a));
   details.append(button);
  }else if(mine){
   details.append(node('p','auction-dialog-label','Your listing has bids and cannot be cancelled.'));
  }else if(winning){
   details.append(node('p','auction-leading','★ You currently hold the highest bid.'));
  }else if(!user){
   const login=node('a','auction-action auction-login-link','Sign in to place a bid');
   login.href='login.html';details.append(login);
  }else{
   const form=node('form','auction-bid-form auction-dialog-bid');
   const label=node('label','', 'Your bid (Cartoon Coins)');
   const input=node('input');
   input.type='number';input.required=true;input.min=String(minBid(a));input.max='1000000000';input.step='1';
   input.value=String(minBid(a));input.setAttribute('aria-label','Bid amount for '+title(a));
   label.append(input);
   const button=node('button','auction-action','Place bid');button.type='submit';button.disabled=busy;
   form.append(label,button);
   form.addEventListener('submit',event=>{event.preventDefault();placeBid(a,input.value)});
   details.append(form);
  }
 }else{
  details.append(node('p','auction-dialog-label',a.status==='settled'?'This auction has finished.':'This listing is no longer accepting bids.'));
 }
 content.append(visual,details);
 if(!dialog.open)dialog.showModal();
}
async function loadAuctions(){
 const {data,error}=await db.from('marketplace_auctions')
  .select('id,seller_id,item_kind,ctoon_id,card_id,starting_bid,current_bid,highest_bidder_id,status,created_at,ends_at,ctoon_catalog(name,rarity,series,image_path),yugioh_cards(name,art_image_id)')
  .order('created_at',{ascending:false}).limit(250);
 if(error)throw error;
 auctions=data||[];
 updateAuctionCounts();
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
  if($('auction-dialog').open)$('auction-dialog').close();
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
for(const kind of ['ctoon','yugioh']){
 const tab=$('auction-tab-'+kind);
 tab.addEventListener('click',()=>switchAuctionTab(kind,true));
 tab.addEventListener('keydown',event=>{
  if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
  event.preventDefault();
  const next=event.key==='Home'?'ctoon':event.key==='End'?'yugioh':
   kind==='ctoon'?'yugioh':'ctoon';
  switchAuctionTab(next,true);
  $('auction-tab-'+next).focus();
 });
}
$('auction-kind').addEventListener('change',()=>{
 const kind=$('auction-kind').value;
 switchAuctionTab(kind,true);
});
$('auction-filter').addEventListener('change',drawAuctions);
$('auction-search').addEventListener('input',drawAuctions);
$('auction-form').addEventListener('submit',submitListing);
$('auction-refresh').addEventListener('click',refresh);
$('auction-dialog-close').addEventListener('click',()=>$('auction-dialog').close());
db.auth.onAuthStateChange(()=>setTimeout(refresh,0));
window.addEventListener('pageshow',refresh);
setInterval(()=>{
 for(const e of document.querySelectorAll('.auction-time[data-status="active"]'))e.textContent=timeLeft(e.dataset.until);
},30000);
setInterval(()=>{if(!document.hidden&&!busy)refresh()},60000);
switchAuctionTab(activeKind);
refresh();
