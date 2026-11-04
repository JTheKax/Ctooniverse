import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const el=id=>document.getElementById(id),params=new URLSearchParams(location.search),category=params.get('category')||'',series=params.get('series')||'';
let items=[],owned=new Map(),user=null,wishlist=new Set();
el('set-title').textContent=series||'CToon Set';el('set-category').textContent=category||'CTooniverse';document.title=(series||'CToon Set')+' | CTooniverse';
function draw(){
 const filter=el('set-filter').value,q=el('set-search').value.trim().toLowerCase(),grid=el('set-grid');grid.replaceChildren();
 const visible=items.filter(x=>(!q||x.name.toLowerCase().includes(q))&&(filter==='all'||(filter==='owned'?(owned.get(x.id)||0)>0:(owned.get(x.id)||0)===0)));
 for(const item of visible){
  const qty=owned.get(item.id)||0,card=document.createElement('article');card.className='ctoon-shop-card';
  const art=document.createElement('div');art.className='ctoon-shop-art';
  const badge=document.createElement('span');badge.className='ctoon-shop-owned';badge.textContent=qty?'Owned ×'+qty:'Need';badge.classList.toggle('is-owned',qty>0);
  const image=document.createElement('img');image.src=item.image_path||'ctooniverse-logo.png';image.alt=item.name+' CToon artwork';image.loading='lazy';image.addEventListener('error',()=>{image.src='ctooniverse-logo.png'},{once:true});art.append(badge,image);
  const details=document.createElement('div');details.className='ctoon-shop-details';
  const title=document.createElement('h3');title.className='ctoon-shop-name';title.textContent=item.name;
  const rarity=document.createElement('p');rarity.textContent=(item.rarity||'Common')+' · '+(item.is_for_sale?'Available in Shop':'Coming Soon');
  details.append(title,rarity);
  if(user){
   const wish=document.createElement('button');wish.type='button';wish.className='button secondary';
   const label=()=>{wish.textContent=wishlist.has(item.id)?'♥ On Wishlist':'♡ Add to Wishlist';wish.setAttribute('aria-pressed',String(wishlist.has(item.id)))};
   label();wish.onclick=async()=>{wish.disabled=true;const active=wishlist.has(item.id),r=active?await db.from('ctoon_wishlist').delete().eq('user_id',user.id).eq('ctoon_id',item.id):await db.from('ctoon_wishlist').insert({user_id:user.id,ctoon_id:item.id});if(r.error)el('set-status').textContent='Wishlist update failed: '+r.error.message;else{if(active)wishlist.delete(item.id);else wishlist.add(item.id);label()}wish.disabled=false};details.append(wish);
  }
  card.append(art,details);grid.append(card);
 }
 el('set-status').textContent='Showing '+visible.length+' of '+items.length+' CToons'+(!user?' · Sign in to track owned CToons':'');
}
async function load(){
 if(!category||!series){el('set-status').textContent='Select a set from Sets Overview.';return}
 try{
  const r=await db.from('ctoon_catalog').select('id,name,rarity,image_path,is_for_sale').eq('parent_series',category).eq('series',series).order('name');
  if(r.error)throw r.error;items=r.data||[];
  const auth=await db.auth.getUser();user=auth.data?.user||null;
  if(user&&items.length){
   const [o,w]=await Promise.all([db.from('player_ctoons').select('ctoon_id,quantity').eq('user_id',user.id).in('ctoon_id',items.map(x=>x.id)),db.from('ctoon_wishlist').select('ctoon_id').eq('user_id',user.id)]);
   if(o.error)throw o.error;owned=new Map((o.data||[]).map(x=>[x.ctoon_id,Number(x.quantity)||0]));if(!w.error)wishlist=new Set((w.data||[]).map(x=>x.ctoon_id));
  }
  const count=items.filter(x=>(owned.get(x.id)||0)>0).length,percent=items.length?Math.round(count/items.length*100):0;
  el('set-owned').textContent=user?count:'—';el('set-total').textContent=items.length;el('set-percent').textContent=user?percent+'%':'—';el('set-progress').value=user?percent:0;
  draw();
 }catch(e){el('set-status').textContent='Unable to load set: '+e.message}
}
for(const id of ['set-filter','set-search'])el(id).addEventListener('input',draw);
db.auth.onAuthStateChange(()=>setTimeout(load,0));load();
