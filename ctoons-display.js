import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const grid=document.querySelector('.ctoons-featured-display .ctoons-featured-grid');
let seq=0;
let catalogRows=[],ownership=new Map(),ownerMode=false,wishlist=new Set();
const filterIds=['search','category','series','rarity','owned'];
const filter=id=>document.getElementById('ctoon-catalog-'+id);
function applyFilters(){
 const query=(filter('search')?.value||'').trim().toLowerCase(),category=filter('category')?.value||'',series=filter('series')?.value||'',rarity=filter('rarity')?.value||'',owned=filter('owned')?.value||'';
 let visible=0;
 for(const card of grid?.querySelectorAll('[data-ctoon-id]')||[]){
  const item=catalogRows.find(x=>x.id===card.dataset.ctoonId);if(!item)continue;
  const quantity=ownership.get(item.id)||0;
  const match=(!query||(item.name+' '+(item.series||'')).toLowerCase().includes(query))&&(!category||item.parent_series===category)&&(!series||item.series===series)&&(!rarity||item.rarity===rarity)&&(!owned||(owned==='wishlist'?wishlist.has(item.id):owned==='owned'?quantity>0:quantity===0));
  card.hidden=!match;if(match)visible++;
 }
 const count=document.getElementById('ctoon-catalog-result-count');if(count)count.textContent='Showing '+visible+' of '+catalogRows.length+' CToons';
}
function setOptions(id,values,label){const select=filter(id);if(!select)return;const current=select.value;select.replaceChildren(new Option(label,''));for(const value of [...new Set(values.filter(Boolean))].sort())select.add(new Option(value,value));select.value=[...select.options].some(o=>o.value===current)?current:'';}
for(const id of filterIds)filter(id)?.addEventListener('input',applyFilters);
function renderCounts(catalog){
 const list=document.getElementById('ctoon-counts-list'),status=document.getElementById('ctoon-counts-status');if(!list)return;
 const groups=new Map();let saleTotal=0;
 for(const item of catalog){
  const parent=(item.parent_series||'Other').trim()||'Other',series=(item.series||'Uncategorized').trim()||'Uncategorized';
  if(!groups.has(parent))groups.set(parent,new Map());
  const subs=groups.get(parent),count=subs.get(series)||{total:0,sale:0};count.total++;if(item.is_for_sale){count.sale++;saleTotal++}subs.set(series,count);
 }
 list.replaceChildren();
 for(const [parent,subs] of [...groups].sort((a,b)=>a[0].localeCompare(b[0]))){
  const box=document.createElement('div');box.className='ctoon-count-group';
  const total=[...subs.values()].reduce((n,x)=>n+x.total,0),sale=[...subs.values()].reduce((n,x)=>n+x.sale,0);
  const heading=document.createElement('h3');heading.textContent=parent+' — '+total+' created ('+sale+' for sale)';box.append(heading);
  for(const [name,count] of [...subs].sort((a,b)=>a[0].localeCompare(b[0]))){
   const line=document.createElement('p');line.textContent=name+': '+count.total+' created · '+count.sale+' for sale';box.append(line);
  }list.append(box);
 }
 status.textContent=catalog.length+' CToons created across '+groups.size+' main series · '+saleTotal+' for sale.';
}
async function refresh(){
 const n=++seq;if(!grid)return;
 try{
  const {data:catalog,error}=await db.from('ctoon_catalog').select('id,name,rarity,price_coins,image_path,series,parent_series,is_for_sale').order('name');
  if(error)throw error;
  if(n!==seq)return;
  if(!catalog?.length){renderCounts([]);grid.replaceChildren();const empty=document.createElement('p');empty.textContent='No CToons are currently listed.';grid.append(empty);return;}
  renderCounts(catalog);
  let user=null,isOwner=false;
  try{
   const auth=await db.auth.getUser();user=auth.data?.user||null;
   if(user){const owner=await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle();isOwner=!!owner.data&&!owner.error;}
  }catch(authError){console.warn('CToon account status unavailable; displaying public catalog',authError)}
  let owned=new Map();
  if(user){
   try{
    const {data,error:ownedError}=await db.from('player_ctoons').select('ctoon_id,quantity').eq('user_id',user.id).in('ctoon_id',catalog.map(item=>item.id));
    if(!ownedError)owned=new Map((data||[]).map(row=>[row.ctoon_id,Number(row.quantity)||0]));
   }catch(ownedError){console.warn('Ownership unavailable; displaying public catalog',ownedError)}
  }
  if(n!==seq)return;
  wishlist=new Set();if(user){const w=await db.from('ctoon_wishlist').select('ctoon_id').eq('user_id',user.id);if(!w.error)wishlist=new Set((w.data||[]).map(x=>x.ctoon_id));}if(n!==seq)return;
  catalogRows=catalog;ownership=owned;ownerMode=isOwner;
  setOptions('category',catalog.map(x=>x.parent_series),'All categories');setOptions('series',catalog.map(x=>x.series),'All sets');setOptions('rarity',catalog.map(x=>x.rarity),'All rarities');
  const params=new URLSearchParams(location.search);if(params.has('category'))filter('category').value=params.get('category');if(params.has('series'))filter('series').value=params.get('series');
  const fragment=document.createDocumentFragment();
  for(const item of catalog){
   const card=document.createElement('article');card.className='ctoon-shop-card ctoon-inspectable';card.dataset.ctoonId=item.id;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','View '+item.name+' CToon details');
   const art=document.createElement('div');art.className='ctoon-shop-art';
   const badge=document.createElement('span');badge.className='ctoon-shop-owned';
   const qty=owned.get(item.id)||0;badge.textContent=qty?'Owned ×'+qty:!item.is_for_sale?'Coming Soon':user?'Unowned':'Sign in';badge.classList.toggle('is-owned',qty>0);
   const img=document.createElement('img');img.src=item.image_path||'ctooniverse-logo.png';img.alt=item.name+' CToon artwork';img.loading='lazy';img.addEventListener('error',()=>{img.src='ctooniverse-logo.png'},{once:true});
   art.append(badge,img);
   const details=document.createElement('div');details.className='ctoon-shop-details';
   const name=document.createElement('div');name.className='ctoon-shop-name';name.textContent=item.name+' ';
   const rarity=document.createElement('span');rarity.className='ctoon-shop-rarity';rarity.textContent=(item.rarity||'Common').charAt(0).toUpperCase();rarity.title=item.rarity||'Common';name.append(rarity);
   const purchase=document.createElement('div');purchase.className='ctoon-shop-purchase';
   const price=document.createElement('span');price.className='ctoon-shop-price';price.textContent=Number(item.price_coins||0).toLocaleString()+' pts';
   const action=document.createElement(item.is_for_sale?'a':'span');action.className='ctoon-shop-buy ctoon-preview-buy';action.textContent=item.is_for_sale?'Shop':'Soon';if(item.is_for_sale)action.href='shop.html#ctoon-store';purchase.append(price,action);
   const status=document.createElement('p');status.className='ctoon-shop-status';status.textContent=(item.series||'CTooniverse')+' CToon Set';
   details.append(name,purchase,status);
   if(user){
    const wish=document.createElement('button');wish.type='button';wish.className='button secondary';
    const updateLabel=()=>{wish.textContent=wishlist.has(item.id)?'♥ On Wishlist':'♡ Add to Wishlist';wish.setAttribute('aria-pressed',String(wishlist.has(item.id)));};
    updateLabel();
    wish.addEventListener('click',async()=>{
     wish.disabled=true;const active=wishlist.has(item.id);
     const result=active?await db.from('ctoon_wishlist').delete().eq('user_id',user.id).eq('ctoon_id',item.id):await db.from('ctoon_wishlist').insert({user_id:user.id,ctoon_id:item.id});
     if(result.error){alert('Wishlist update failed: '+result.error.message);}
     else{if(active)wishlist.delete(item.id);else wishlist.add(item.id);updateLabel();applyFilters();}
     wish.disabled=false;
    });details.append(wish);
   }
   card.append(art,details);
   const edit=()=>{
    if(!isOwner)return;
    const dialog=document.createElement('dialog');dialog.className='ctoon-editor-dialog';
    const form=document.createElement('form');form.innerHTML='<h2>Edit CToon</h2><label>Name<input name="name" required maxlength="80"></label><label>Image path or HTTPS URL<input name="image_path" required maxlength="1000"></label><label>Rarity<select name="rarity"><option>Common</option><option>Uncommon</option><option>Rare</option><option>Epic</option><option>Legendary</option></select></label><label>Price (Cartoon Coins)<input name="price_coins" type="number" min="0" max="1000000" step="1" required></label><label>Main series<input name="parent_series" required maxlength="80"></label><label>Subseries<input name="series" required maxlength="80"></label><label class="ctoon-sale-toggle"><input name="is_for_sale" type="checkbox"> List for sale in Shop</label><p role="status" class="ctoon-edit-feedback"></p><div class="hero-actions"><button type="button" class="button secondary" data-cancel>Cancel</button><button type="submit" class="button primary">Save Changes</button></div>';
    form.elements.name.value=item.name;form.elements.image_path.value=item.image_path||'';form.elements.rarity.value=item.rarity||'Common';form.elements.price_coins.value=item.price_coins??0;form.elements.parent_series.value=item.parent_series||'Other';form.elements.series.value=item.series||'';form.elements.is_for_sale.checked=!!item.is_for_sale;
    const feedback=form.querySelector('.ctoon-edit-feedback');form.querySelector('[data-cancel]').onclick=()=>dialog.close();
    form.addEventListener('submit',async event=>{
     event.preventDefault();const name=form.elements.name.value.trim(),image_path=form.elements.image_path.value.trim(),rarity=form.elements.rarity.value,price_coins=Number(form.elements.price_coins.value);
     if(!name||!(/^(https:\/\/|public\/images\/)/.test(image_path))||!Number.isInteger(price_coins)||price_coins<0){feedback.textContent='Enter a valid name, HTTPS image URL or public/images/ path, and whole-number price.';return}
     const save=form.querySelector('[type=submit]');save.disabled=true;feedback.textContent='Saving…';
     const parent_series=form.elements.parent_series.value.trim(),series=form.elements.series.value.trim();if(!parent_series||!series){feedback.textContent='Main series and subseries are required.';return}const is_for_sale=form.elements.is_for_sale.checked;const {data,error}=await db.from('ctoon_catalog').update({name,image_path,rarity,price_coins,is_for_sale,parent_series,series}).eq('id',item.id).select('id').single();
     save.disabled=false;if(error||!data){feedback.textContent='Could not save: '+(error?.message||'No permission');return}
     dialog.close();refresh();
    });
    dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.append(form);document.body.append(dialog);dialog.showModal();
   };
   if(isOwner){const button=document.createElement('button');button.type='button';button.className='ctoon-edit-button';button.textContent='Edit CToon';button.addEventListener('click',edit);details.append(button);}
   const open=()=>{const dialog=document.createElement('dialog');dialog.className='ctoon-editor-dialog ctoon-preview-dialog';const title=document.createElement('h2');title.textContent=item.name;const picture=document.createElement('img');picture.src=img.src;picture.alt=img.alt;picture.className='ctoon-preview-image';const info=document.createElement('p');info.textContent=(item.series||'CTooniverse')+' · '+(item.rarity||'Common')+' · '+(item.is_for_sale?price.textContent:'Coming Soon')+(qty?' · Owned ×'+qty:'');const close=document.createElement('button');close.className='button secondary';close.textContent='Close';close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.append(title,picture,info,close);document.body.append(dialog);dialog.showModal()};
   card.addEventListener('click',event=>{if(!event.target.closest('a,button'))(isOwner?edit:open)()});card.addEventListener('keydown',event=>{if(event.target===card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();(isOwner?edit:open)()}});
   fragment.append(card);
  }
  grid.replaceChildren(fragment);applyFilters();
 }catch(e){console.warn('Featured CToons could not refresh; preserving current cards.',e);const status=document.getElementById('ctoon-counts-status');if(status)status.textContent='Unable to refresh CToons right now. Please try again.';}
}
db.auth.onAuthStateChange(()=>setTimeout(refresh,0));
window.addEventListener('pageshow',refresh);
refresh();
