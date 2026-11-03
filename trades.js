import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const $=id=>document.getElementById(id),notice=s=>$('trade-status').textContent=s;
let me=null,inventory=[],catalog=[];
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const label=id=>catalog.find(x=>x.id===id)?.name||id||'None';
function choices(select,allowAll=false){select.replaceChildren(new Option('No CToon',''));for(const x of catalog)select.add(new Option(x.name,x.id))}
function tradeLine(t,fromMe){
 const row=document.createElement('article');row.className='trade-offer';
 const side=fromMe?'Sent to':'Received from';
 const other=fromMe?t.recipient_id:t.sender_id;
 const p=document.createElement('p');p.textContent=side+' player '+other;
 const summary=document.createElement('p');summary.textContent='Offered: '+(t.offer_ctoon_qty? t.offer_ctoon_qty+' × '+label(t.offer_ctoon_id)+' + ':'')+t.offer_coins+' Coins | Requested: '+(t.request_ctoon_qty?t.request_ctoon_qty+' × '+label(t.request_ctoon_id)+' + ':'')+t.request_coins+' Coins';
 const state=document.createElement('strong');state.textContent='Status: '+t.status;
 row.append(p,summary,state);
 if(t.status==='pending'){const actions=document.createElement('div');actions.className='trade-actions';
 for(const action of (fromMe?['cancel']:['accept','decline'])){const b=document.createElement('button');b.type='button';b.className='button secondary';b.textContent=action[0].toUpperCase()+action.slice(1);b.addEventListener('click',async()=>{if(action==='accept'&&!confirm('Accept this trade? Your CToons and coins will be exchanged immediately.'))return;b.disabled=true;notice('Processing trade…');const {error}=await db.rpc('ctoon_trade_action',{p_action:action,p_trade_id:t.id});if(error){notice(error.message);b.disabled=false}else{notice('Trade '+action+' completed.');await loadTrades()}});actions.append(b)}
 row.append(actions)}
 return row;
}
async function loadTrades(){
 if(!me)return;
 const {data,error}=await db.from('ctoon_trade_offers').select('*').or('sender_id.eq.'+me.id+',recipient_id.eq.'+me.id).order('created_at',{ascending:false}).limit(100);
 if(error){notice(error.message);return}
 $('trade-incoming').replaceChildren();$('trade-outgoing').replaceChildren();
 for(const t of data||[]){(t.sender_id===me.id?$('trade-outgoing'):$('trade-incoming')).append(tradeLine(t,t.sender_id===me.id))}
 if(!$('trade-incoming').children.length)$('trade-incoming').textContent='No incoming offers.';
 if(!$('trade-outgoing').children.length)$('trade-outgoing').textContent='No sent offers.';
}
async function init(){
 const {data:{user},error}=await db.auth.getUser();
 if(error||!user){notice('Sign in to trade.');$('trade-login').hidden=false;return}
 me=user;$('trade-panel').hidden=false;$('trade-user-id').value=me.id;
 const [{data:owned,error:ownError},{data:all,error:catError},{data:wallet}]=await Promise.all([
 db.from('player_ctoons').select('ctoon_id,quantity').eq('user_id',me.id).gt('quantity',0),
 db.from('ctoon_catalog').select('id,name').order('name'),
 db.from('coin_wallets').select('balance').eq('user_id',me.id).maybeSingle()]);
 if(ownError||catError){notice((ownError||catError).message);return}
 inventory=owned||[];catalog=all||[];
 $('trade-balance').textContent='Your balance: '+Number(wallet?.balance||0).toLocaleString()+' Coins';
 const offer=$('trade-offer-ctoon');offer.replaceChildren(new Option('No CToon',''));
 for(const x of inventory){const c=catalog.find(y=>y.id===x.ctoon_id);if(c)offer.add(new Option(c.name+' (owned: '+x.quantity+')',c.id))}
 choices($('trade-request-ctoon'));await loadTrades();notice('Ready to trade.');
}
$('trade-copy-id').addEventListener('click',()=>navigator.clipboard.writeText($('trade-user-id').value).then(()=>notice('Player ID copied.')).catch(()=>notice('Copy your player ID from the field.')));
$('trade-form').addEventListener('submit',async e=>{
 e.preventDefault();if(!me)return;
 const btn=$('trade-submit');btn.disabled=true;notice('Creating trade offer…');
 const args={p_action:'create',p_recipient:$('trade-recipient').value.trim(),p_offer_ctoon:$('trade-offer-ctoon').value||null,p_offer_qty:Number($('trade-offer-qty').value),p_offer_coins:Number($('trade-offer-coins').value),p_request_ctoon:$('trade-request-ctoon').value||null,p_request_qty:Number($('trade-request-qty').value),p_request_coins:Number($('trade-request-coins').value)};
 const {error}=await db.rpc('ctoon_trade_action',args);btn.disabled=false;
 if(error)notice('Trade not created: '+error.message);else{notice('Offer sent! The other player can accept or decline.');$('trade-form').reset();await loadTrades()}
});
$('trade-refresh').addEventListener('click',loadTrades);
init();
