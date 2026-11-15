import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
import {ctoonImageUrl} from './ctoon-image-url.js';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
// Freeze animated PNG/GIF/WebP artwork into a single still frame for the Shop.
function freezeShopArtwork(img){
 img.crossOrigin='anonymous';
 img.addEventListener('load',()=>{
  if(img.dataset.frozen==='yes'||!img.naturalWidth||!img.naturalHeight)return;
  try{
   const canvas=document.createElement('canvas');
   canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
   canvas.getContext('2d').drawImage(img,0,0);
   const still=canvas.toDataURL('image/png');
   img.dataset.frozen='yes';img.src=still;
  }catch(error){console.warn('Could not freeze CToon artwork',error)}
 });
}
const grid=document.getElementById('ctoon-shop-grid');
let generation=0;
async function refresh(){
 const n=++generation;if(!grid)return;
 const {data:catalog,error}=await db.from('ctoon_catalog').select('id,name,rarity,price_coins,image_path,series,is_for_sale').order('name');
 if(n!==generation)return;
 if(error){grid.textContent='Unable to load CToons: '+error.message;return}
 if(!catalog?.length){grid.textContent='No CToons have been created yet.';return}
 const {data:{user}}=await db.auth.getUser();
 let owned=new Map(),balance=null;
 if(user){
  const [collection,wallet]=await Promise.all([db.from('player_ctoons').select('ctoon_id,quantity').eq('user_id',user.id).in('ctoon_id',catalog.map(x=>x.id)),db.from('coin_wallets').select('balance').eq('user_id',user.id).maybeSingle()]);
  if(!collection.error)owned=new Map((collection.data||[]).map(x=>[x.ctoon_id,Number(x.quantity)||0]));
  if(!wallet.error)balance=Number(wallet.data?.balance??0);
 }
 if(n!==generation)return;
 const fragment=document.createDocumentFragment();
 for(const item of catalog){
  const card=document.createElement('article');card.className='ctoon-shop-card';
  const art=document.createElement('div');art.className='ctoon-shop-art';
  const badge=document.createElement('span');badge.className='ctoon-shop-owned';const qty=owned.get(item.id)||0;
  badge.textContent=qty?'Owned ×'+qty:!item.is_for_sale?'Sold Out':user?'Need':'Sign in';badge.classList.toggle('is-owned',qty>0);badge.classList.toggle('is-sold-out',!qty&&!item.is_for_sale);
  const image=document.createElement('img');freezeShopArtwork(image);image.src=ctoonImageUrl(item.image_path)||'ctooniverse-logo.png';image.alt=item.name+' CToon artwork';image.loading='lazy';image.addEventListener('error',()=>{image.src='ctooniverse-logo.png'},{once:true});art.append(badge,image);
  const details=document.createElement('div');details.className='ctoon-shop-details';
  const title=document.createElement('div');title.className='ctoon-shop-name';
  const nameText=document.createElement('span');nameText.className='ctoon-shop-name-text';nameText.textContent=item.name;nameText.title=item.name;title.append(nameText);
  const rarity=document.createElement('span');rarity.className='ctoon-shop-rarity';rarity.title=item.rarity||'Common';rarity.textContent=(item.rarity||'Common').charAt(0).toUpperCase();title.append(rarity);
  const series=document.createElement('p');series.className='collection-series';series.textContent=item.series||'CTooniverse';series.title=series.textContent;
  const purchase=document.createElement('div');purchase.className='ctoon-shop-purchase';
  const price=document.createElement('span');price.className='ctoon-shop-price';price.textContent=Number(item.price_coins||0).toLocaleString()+' coins';
  const button=document.createElement('button');button.type='button';button.className='ctoon-shop-buy';button.textContent=!item.is_for_sale?'Sold Out':user?'Buy':'Sign in';button.disabled=!item.is_for_sale;button.classList.toggle('is-sold-out',!item.is_for_sale);button.setAttribute('aria-label',!item.is_for_sale?item.name+' sold out':user?'Buy '+item.name:'Sign in to buy '+item.name);
  const status=document.createElement('p');status.className='ctoon-shop-status';status.setAttribute('role','status');
  status.textContent=!item.is_for_sale?'Currently unavailable for purchase':!user?'Sign in to purchase':balance===null?'Sign in to check balance':'Balance: '+balance.toLocaleString()+' coins';
  if(item.is_for_sale)button.addEventListener('click',async()=>{
   if(button.disabled)return;
   button.disabled=true;button.textContent='Processing…';status.textContent='Checking availability and processing purchase…';
   try{
    const {data:{user:buyer},error:authError}=await db.auth.getUser();
    if(authError||!buyer){status.textContent='Please sign in to purchase.';return}
    // The checkout RPC must validate current price and sale status server-side.
    const {data,error}=await db.rpc('purchase_ctoon',{p_ctoon_id:item.id});
    if(error)throw error;
    status.textContent='Purchase successful! Remaining balance: '+Number(data.balance).toLocaleString()+' coins.';
    window.dispatchEvent(new Event('ctoon-profile-updated'));
    setTimeout(refresh,900);
   }catch(e){status.textContent='Purchase unsuccessful: '+(e?.message||'Unknown error')}
   finally{button.disabled=false;button.textContent='Buy'}
  });
  purchase.append(price,button);details.append(title,series,purchase,status);card.append(art,details);fragment.append(card);
 }
 grid.replaceChildren(fragment);
}
db.auth.onAuthStateChange(()=>setTimeout(refresh,0));
window.addEventListener('pageshow',refresh);
refresh();
