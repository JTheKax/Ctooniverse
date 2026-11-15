import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import {ctoonImageUrl} from './ctoon-image-url.js';

const BASE='https://hsxdyxdazsdmpucyhqly.supabase.co';
const db=createClient(BASE,'sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id);
const element=(tag,cls,value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=String(value);return e};
let me=null,allCtoons=[],owned={ctoon:[],yugioh:[]},balance=0,offers=[],names=new Map(),cardCache=new Map(),busy=false,requestSeq=0;
let activeKind=location.hash==='#cards'?'yugioh':'ctoon';
const kinds=['ctoon','yugioh'];
const coins=value=>Number(value||0).toLocaleString()+' coins';
const notice=(s,error=false)=>{const node=$('trade-feedback');node.textContent=s;node.dataset.error=String(error)};
const panel=kind=>$('trade-panel-'+kind);
const field=(kind,key)=>panel(kind).querySelector('[data-field="'+key+'"]');
const isCard=kind=>kind==='yugioh';
function lookup(kind,id){
 if(!id)return null;
 if(isCard(kind))return cardCache.get(Number(id))||{name:'Card #'+id,card_id:Number(id),art_image_id:Number(id)};
 return allCtoons.find(x=>x.id===id)||null;
}
function artUrl(kind,item){
 if(!item)return 'ctooniverse-logo.png';
 if(!isCard(kind))return ctoonImageUrl(item.image_path)||'ctooniverse-logo.png';
 const id=Number(item.art_image_id||item.card_id);
 return Number.isSafeInteger(id)&&id>0?BASE+'/storage/v1/object/public/yugioh-artwork/small/'+id+'.jpg':'ctooniverse-logo.png';
}
function artwork(kind,item){
 const img=element('img');img.src=artUrl(kind,item);img.alt=(item?.name||'Collectible')+' artwork';img.loading='lazy';
 let tried=false;
 img.addEventListener('error',()=>{
  if(!tried&&isCard(kind)){
   const id=Number(item?.art_image_id||item?.card_id);
   if(Number.isSafeInteger(id)&&id>0){tried=true;img.src=BASE+'/functions/v1/yugioh-artwork?id='+id+'&size=small';return;}
  }
  img.onerror=null;img.src='ctooniverse-logo.png';
 },{once:false});
 return img;
}
function switchTab(kind){
 if(!kinds.includes(kind))return;
 activeKind=kind;
 for(const k of kinds){
  const selected=k===kind;
  const tab=$('trade-tab-'+k);
  tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;
  panel(k).hidden=!selected;
 }
}
function populateOfferPicker(kind){
 const select=field(kind,'offer-item'),old=select.value;
 select.replaceChildren(new Option('No '+(isCard(kind)?'card':'CToon')+' (coins only)',''));
 for(const item of owned[kind]){
  const id=isCard(kind)?item.card_id:item.ctoon_id;
  const title=isCard(kind)?item.yugioh_cards?.name:item.ctoon_catalog?.name;
  if(!title||item.quantity<1)continue;
  select.add(new Option(title+' · Owned ×'+item.quantity,String(id)));
 }
 if([...select.options].some(x=>x.value===old))select.value=old;
}
function populateRequestCtoons(){
 const select=field('ctoon','request-item'),old=select.value;
 const search=field('ctoon','request-search').value.trim().toLowerCase();
 select.replaceChildren(new Option('No CToon (coins only)',''));
 for(const item of allCtoons){
  if(!item.name.toLowerCase().includes(search))continue;
  select.add(new Option(item.name+' · '+(item.series||'CTooniverse'),item.id));
 }
 if([...select.options].some(x=>x.value===old))select.value=old;
}
async function populateRequestCards(){
 const search=field('yugioh','request-search').value.trim();
 const sequence=++requestSeq;
 const select=field('yugioh','request-item'),old=select.value;
 select.replaceChildren(new Option(search.length<2?'Enter at least 2 characters to find a card':'Searching cards…',''));
 if(search.length<2)return;
 const safe=search.replace(/[%_,]/g,' ').trim().slice(0,70);
 const {data,error}=await db.from('yugioh_cards')
  .select('card_id,name,art_image_id,card_type').eq('language_code','en')
  .ilike('name','%'+safe+'%').order('name').limit(60);
 if(sequence!==requestSeq)return;
 if(error){notice('Card search failed: '+error.message,true);return}
 select.replaceChildren(new Option('No card (coins only)',''));
 for(const item of data||[]){
  cardCache.set(Number(item.card_id),item);
  select.add(new Option(item.name,item.card_id));
 }
 if([...select.options].some(x=>x.value===old))select.value=old;
}
async function loadOwned(){
 if(!me)return;
 const [ct,yg,wallet,ctCatalog]=await Promise.all([
  db.from('player_ctoons').select('ctoon_id,quantity,ctoon_catalog(name,image_path)').eq('user_id',me.id).gt('quantity',0),
  db.from('yugioh_player_cards').select('card_id,quantity,yugioh_cards(name,art_image_id,card_type)').eq('user_id',me.id).gt('quantity',0),
  db.from('coin_wallets').select('balance').eq('user_id',me.id).maybeSingle(),
  db.from('ctoon_catalog').select('id,name,series,image_path').order('name')
 ]);
 for(const r of [ct,yg,wallet,ctCatalog])if(r.error)throw r.error;
 owned.ctoon=ct.data||[];owned.yugioh=yg.data||[];
 allCtoons=ctCatalog.data||[];
 balance=Number(wallet.data?.balance||0);
 $('trade-wallet').textContent=coins(balance)+' available';
 for(const x of owned.yugioh)if(x.yugioh_cards)cardCache.set(Number(x.card_id),{...x.yugioh_cards,card_id:Number(x.card_id)});
 for(const kind of kinds)populateOfferPicker(kind);
 populateRequestCtoons();
}
async function cacheTradeCards(rows){
 const ids=[...new Set(rows.flatMap(t=>[t.offer_card_id,t.request_card_id]).filter(Boolean).map(Number))].filter(x=>!cardCache.has(x));
 for(let offset=0;offset<ids.length;offset+=80){
  const {data,error}=await db.from('yugioh_cards').select('card_id,name,art_image_id,card_type').in('card_id',ids.slice(offset,offset+80));
  if(error)throw error;
  for(const item of data||[])cardCache.set(Number(item.card_id),item);
 }
}
function tradeItem(t,side){
 const id=t.item_kind==='ctoon'?t[side+'_ctoon_id']:t[side+'_card_id'];
 const qty=Number(t[side+'_qty']||0),coin=Number(t[side+'_coins']||0);
 return {id,qty,coin,item:lookup(t.item_kind,id)};
}
function describeItem(t,side){
 const d=tradeItem(t,side);
 const collectible=d.qty?d.qty+' × '+(d.item?.name||'Unknown item'):'No item';
 return collectible+(d.coin?' + '+coins(d.coin):'');
}
function tradeWindow(t,sent){
 const main=tradeItem(t,sent?'request':'offer');
 const other=names.get(sent?t.recipient_id:t.sender_id)||'Player';
 const card=element('article','ctoon-shop-card trade-offer-window');
 const art=element('div','ctoon-shop-art');
 art.append(artwork(t.item_kind,main.item));
 const badge=element('span','ctoon-shop-owned',isCard(t.item_kind)?'Card Trade':'CToon Trade');
 art.append(badge);
 const details=element('div','ctoon-shop-details');
 const header=element('div','ctoon-shop-name');
 header.append(element('span','ctoon-shop-name-text',main.item?.name||'Coins / Trade Offer'));
 const meta=element('div','trade-window-meta',(sent?'To ':'From ')+other);meta.title=meta.textContent;
 const date=element('div','trade-window-meta',new Date(t.created_at).toLocaleDateString());
 const purchase=element('div','ctoon-shop-purchase');
 const button=element('button','ctoon-shop-buy','Review Trade');
 button.type='button';button.addEventListener('click',()=>showTrade(t.id));
 purchase.append(button);
 const state=element('p','ctoon-shop-status','Status: '+t.status);
 details.append(header,meta,date,purchase,state);
 card.append(art,details);
 return card;
}
function drawTrades(){
 for(const kind of kinds){
  const relevant=offers.filter(t=>t.item_kind===kind);
  $('trade-tab-'+kind).querySelector('[data-tab-count]').textContent=String(relevant.filter(t=>t.status==='pending').length);
  for(const direction of ['incoming','sent']){
   const container=panel(kind).querySelector('[data-list="'+direction+'"]');
   const rows=relevant.filter(t=>direction==='sent'?t.sender_id===me.id:t.recipient_id===me.id);
   panel(kind).querySelector('[data-count="'+direction+'"]').textContent=String(rows.length);
   container.replaceChildren();
   if(!rows.length){container.append(element('p','',direction==='sent'?'No sent offers yet.':'No incoming offers yet.'));continue}
   for(const trade of rows)container.append(tradeWindow(trade,direction==='sent'));
  }
 }
}
async function loadTrades(){
 if(!me)return;
 const [trades,players]=await Promise.all([
  db.from('marketplace_trades').select('*')
   .or('sender_id.eq.'+me.id+',recipient_id.eq.'+me.id)
   .order('created_at',{ascending:false}).limit(100),
  db.rpc('marketplace_trade_participant_names')
 ]);
 if(trades.error)throw trades.error;
 if(players.error)throw players.error;
 names=new Map((players.data||[]).map(p=>[p.player_id,p.player_name]));
 offers=trades.data||[];
 await cacheTradeCards(offers);
 drawTrades();
}
function showTrade(id){
 const t=offers.find(x=>x.id===id);if(!t)return;
 const sent=t.sender_id===me.id,other=names.get(sent?t.recipient_id:t.sender_id)||'Player';
 const dialog=$('trade-dialog'),body=$('trade-dialog-body');
 $('trade-dialog-title').textContent=(sent?'Sent to ':'Received from ')+other;
 body.replaceChildren();
 body.append(element('p','',isCard(t.item_kind)?'Yu-Gi-Oh! card trade':'CToon trade'));
 const grid=element('div','trade-dialog-items');
 for(const side of ['offer','request']){
  const info=tradeItem(t,side);
  const box=element('section','trade-dialog-side');
  box.append(element('h3','',side==='offer'?'Sender gives':'Recipient gives'));
  if(info.qty&&info.item)box.append(artwork(t.item_kind,info.item));
  box.append(element('p','',describeItem(t,side)));
  grid.append(box);
 }
 body.append(grid,element('p','','Status: '+t.status+' · Created '+new Date(t.created_at).toLocaleString()));
 if(t.status==='pending'){
  const actions=element('div','trade-dialog-actions');
  for(const action of (sent?['cancel']:['accept','decline'])){
   const button=element('button','trade-button',action[0].toUpperCase()+action.slice(1));
   button.type='button';button.addEventListener('click',()=>changeTrade(t,action,button));
   actions.append(button);
  }
  body.append(actions);
 }
 dialog.showModal();
}
async function changeTrade(t,action,button){
 if(busy)return;
 if(action==='accept'&&!confirm('Accept this trade? Your collectibles and coins will transfer immediately. Completed trades cannot be automatically undone.'))return;
 busy=true;button.disabled=true;notice('Processing trade '+action+'…');
 try{
  const {error}=await db.rpc('marketplace_trade_action',{p_trade_id:t.id,p_action:action});
  if(error)throw error;
  $('trade-dialog').close();
  await Promise.all([loadOwned(),loadTrades()]);
  window.dispatchEvent(new Event('ctoon-profile-updated'));
  notice('Trade '+(action==='accept'?'accepted':action==='decline'?'declined':'cancelled')+' successfully.');
 }catch(error){notice('Trade action failed: '+(error.message||error),true)}
 finally{busy=false;button.disabled=false}
}
async function createTrade(kind,event){
 event.preventDefault();if(!me||busy)return;
 const receive=field(kind,'request-item').value||null,offer=field(kind,'offer-item').value||null;
 const offerQty=Number(field(kind,'offer-qty').value),requestQty=Number(field(kind,'request-qty').value);
 const offerCoins=Number(field(kind,'offer-coins').value),requestCoins=Number(field(kind,'request-coins').value);
 const recipient=field(kind,'recipient').value.trim();
 const nums=[offerQty,requestQty,offerCoins,requestCoins];
 if(nums.some((n,i)=>!Number.isSafeInteger(n)||n<0||n>(i<2?1000:1000000000))){
  notice('Quantities must be whole numbers within the allowed limits.',true);return;
 }
 if((!offer&&offerQty)||(offer&&offerQty===0)||(!receive&&requestQty)||(receive&&requestQty===0)||
    (!offerQty&&!offerCoins)||(!requestQty&&!requestCoins)){
  notice('Both players must contribute items or coins, and selected items need a quantity.',true);return;
 }
 if(offerCoins>balance){notice('You do not have enough Cartoon Coins.',true);return}
 const mine=owned[kind].find(x=>String(isCard(kind)?x.card_id:x.ctoon_id)===offer);
 if(offerQty&&(Number(mine?.quantity)||0)<offerQty){notice('You do not own enough copies of the offered item.',true);return}
 if(!confirm('Send this '+(isCard(kind)?'card':'CToon')+' trade offer to '+recipient+'?'))return;
 const button=field(kind,'submit');busy=true;button.disabled=true;notice('Looking up the recipient…');
 try{
  const found=await db.rpc('ctoon_trade_find_player',{p_name:recipient});
  if(found.error||!found.data)throw found.error||new Error('Player not found');
  const args={p_recipient:found.data,p_kind:kind,p_offer_qty:offerQty,p_offer_coins:offerCoins,p_request_qty:requestQty,p_request_coins:requestCoins,
   p_offer_ctoon:isCard(kind)?null:offer,p_offer_card:isCard(kind)?offer?Number(offer):null:null,
   p_request_ctoon:isCard(kind)?null:receive,p_request_card:isCard(kind)?receive?Number(receive):null:null};
  notice('Sending trade offer…');
  const {error}=await db.rpc('marketplace_trade_create',args);
  if(error)throw error;
  panel(kind).querySelector('form').reset();
  await loadTrades();notice('Trade offer sent! The other player can accept or decline.');
 }catch(error){notice('Could not send offer: '+(error.message||error),true)}
 finally{busy=false;button.disabled=false}
}
for(const kind of kinds){
 $('trade-tab-'+kind).addEventListener('click',()=>switchTab(kind));
 const form=$('trade-form-'+kind);
 form.addEventListener('submit',event=>createTrade(kind,event));
 form.querySelector('[data-refresh]').addEventListener('click',async()=>{
  try{await Promise.all([loadOwned(),loadTrades()]);notice('Trades refreshed.')}catch(e){notice(e.message,true)}
 });
 for(const side of ['offer','request']){
  field(kind,side+'-item').addEventListener('change',()=>{
   field(kind,side+'-qty').value=field(kind,side+'-item').value?'1':'0';
  });
 }
}
field('ctoon','request-search').addEventListener('input',populateRequestCtoons);
let searchTimer;
field('yugioh','request-search').addEventListener('input',()=>{
 clearTimeout(searchTimer);searchTimer=setTimeout(populateRequestCards,250);
});
$('trade-close').addEventListener('click',()=>$('trade-dialog').close());
$('trade-dialog').addEventListener('click',event=>{if(event.target===$('trade-dialog'))$('trade-dialog').close()});
async function init(){
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user){me=null;$('trade-login').hidden=false;$('trade-member').hidden=true;$('trade-wallet').textContent='Sign in to trade';notice('Sign in to start trading.');return}
 me=user;$('trade-login').hidden=true;$('trade-member').hidden=false;
 switchTab(activeKind);
 try{await Promise.all([loadOwned(),loadTrades()]);notice('Ready to trade.')}
 catch(error){notice('Could not load trades: '+(error?.message||error),true)}
}
db.auth.onAuthStateChange(()=>setTimeout(init,0));
init();
