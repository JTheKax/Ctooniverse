import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const grid=document.querySelector('.ctoons-featured-display .ctoons-featured-grid');
let seq=0;
async function refresh(){
 const n=++seq;if(!grid)return;
 try{
  const {data:catalog,error}=await db.from('ctoon_catalog').select('id,name,rarity,price_coins,image_path,series,is_for_sale').order('name');
  if(error)throw error;
  if(n!==seq)return;
  if(!catalog?.length)return; // Retain the original featured card if catalog is empty.
  const {data:{user}}=await db.auth.getUser();
  let owned=new Map();
  if(user){
   const {data,error:ownedError}=await db.from('player_ctoons').select('ctoon_id,quantity').eq('user_id',user.id).in('ctoon_id',catalog.map(item=>item.id));
   if(!ownedError)owned=new Map((data||[]).map(row=>[row.ctoon_id,Number(row.quantity)||0]));
  }
  if(n!==seq)return;
  const fragment=document.createDocumentFragment();
  for(const item of catalog){
   const card=document.createElement('article');card.className='ctoon-shop-card ctoon-inspectable';card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','View '+item.name+' CToon details');
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
   details.append(name,purchase,status);card.append(art,details);
   const open=()=>{const dialog=document.createElement('dialog');dialog.className='ctoon-editor-dialog ctoon-preview-dialog';const title=document.createElement('h2');title.textContent=item.name;const picture=document.createElement('img');picture.src=img.src;picture.alt=img.alt;picture.className='ctoon-preview-image';const info=document.createElement('p');info.textContent=(item.series||'CTooniverse')+' · '+(item.rarity||'Common')+' · '+(item.is_for_sale?price.textContent:'Coming Soon')+(qty?' · Owned ×'+qty:'');const close=document.createElement('button');close.className='button secondary';close.textContent='Close';close.onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.append(title,picture,info,close);document.body.append(dialog);dialog.showModal()};
   card.addEventListener('click',event=>{if(!event.target.closest('a,button'))open()});card.addEventListener('keydown',event=>{if(event.target===card&&(event.key==='Enter'||event.key===' ')){event.preventDefault();open()}});
   fragment.append(card);
  }
  grid.replaceChildren(fragment);
 }catch(e){console.warn('Featured CToons could not load; showing original preview.',e)}
}
db.auth.onAuthStateChange(()=>setTimeout(refresh,0));
window.addEventListener('pageshow',refresh);
refresh();
