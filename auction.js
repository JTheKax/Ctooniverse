import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const search=document.getElementById('auction-search'),rarity=document.getElementById('auction-rarity'),sort=document.getElementById('auction-sort'),host=document.getElementById('auction-results');
let items=[];
function render(){
 const q=search.value.trim().toLowerCase();
 let shown=items.filter(x=>(x.ctoon_catalog?.name||'').toLowerCase().includes(q) && (rarity.value==='all'||(x.ctoon_catalog?.rarity||'').toLowerCase()===rarity.value));
 shown.sort((a,b)=>sort.value==='low'?Number(a.current_bid??a.starting_bid)-Number(b.current_bid??b.starting_bid):sort.value==='high'?Number(b.current_bid??b.starting_bid)-Number(a.current_bid??a.starting_bid):sort.value==='newest'?new Date(b.created_at)-new Date(a.created_at):new Date(a.ends_at)-new Date(b.ends_at));
 host.replaceChildren();
 if(!shown.length){const p=document.createElement('p');p.className='auction-empty';p.textContent=items.length?'No auctions match your filters.':'No live auctions yet. Secure bidding is not enabled.';host.append(p);return;}
 for(const a of shown){const card=document.createElement('article');card.className='auction-listing';const h=document.createElement('h3');h.textContent=a.ctoon_catalog?.name||'Ctoon';const p=document.createElement('p');p.textContent='Current bid: '+Number(a.current_bid??a.starting_bid).toLocaleString()+' Cartoon Coins';const end=document.createElement('p');end.textContent='Ends: '+new Date(a.ends_at).toLocaleString();const status=document.createElement('span');status.className='coming-tag';status.textContent='Bidding unavailable';card.append(h,p,end,status);host.append(card);}
}
async function load(){host.textContent='Loading auction listings…';const {data,error}=await db.from('ctoon_auctions').select('id,starting_bid,current_bid,ends_at,created_at,ctoon_catalog(name,rarity)').eq('status','active').gt('ends_at',new Date().toISOString()).order('ends_at',{ascending:true}).limit(100);if(error){host.textContent='Auction listings could not be loaded. Please try again later.';return;}items=data||[];render();}
for(const el of [search,rarity,sort])el.addEventListener(el===search?'input':'change',render);
load();
