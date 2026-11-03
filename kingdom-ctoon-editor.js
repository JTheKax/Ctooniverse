import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const grid=document.querySelector('.kingdom-ctoon-grid');
if(grid){
 const {data:catalog,error}=await db.from('ctoon_catalog').select('id,name,rarity,price_coins,image_path,is_for_sale').eq('series','Kingdom Hearts').order('name');
 if(!error&&catalog){
  grid.replaceChildren();
  const {data:{user}}=await db.auth.getUser();
  const {data:owner}=user?await db.from('site_owners').select('user_id').eq('user_id',user.id).maybeSingle():{data:null};
  const dialog=document.createElement('dialog');dialog.className='ctoon-editor-dialog';
  dialog.innerHTML='<form method="dialog" id="ctoon-edit-form"><h2>Edit CToon</h2><label>Name <input name="name" required maxlength="80"></label><label>Image URL or site path <input name="image_path" required maxlength="1000"></label><label>Rarity <select name="rarity"><option>Common</option><option>Uncommon</option><option>Rare</option><option>Epic</option><option>Legendary</option></select></label><label>Price (coins) <input name="price_coins" type="number" min="0" max="1000000" required></label><p class="ctoon-edit-feedback" role="status"></p><div class="hero-actions"><button type="button" class="button secondary" id="ctoon-edit-cancel">Cancel</button><button type="submit" class="button primary">Save Changes</button></div></form>';
  document.body.append(dialog);
  dialog.querySelector('#ctoon-edit-cancel').onclick=()=>dialog.close();
  const form=dialog.querySelector('form'),feedback=dialog.querySelector('.ctoon-edit-feedback');
  let active=null;
  form.addEventListener('submit',async e=>{
   e.preventDefault();if(!active)return;
   const fd=new FormData(form),name=String(fd.get('name')).trim(),image_path=String(fd.get('image_path')).trim(),rarity=String(fd.get('rarity')),price_coins=Number(fd.get('price_coins'));
   if(!name||!image_path||!(/^(https:\/\/|public\/images\/)/.test(image_path))||!Number.isInteger(price_coins)||price_coins<0){feedback.textContent='Enter a name, an HTTPS image URL or public/images/ path, and a valid price.';return}
   const button=form.querySelector('[type=submit]');button.disabled=true;feedback.textContent='Saving…';
   const {data,error}=await db.from('ctoon_catalog').update({name,image_path,rarity,price_coins}).eq('id',active.id).select('id').single();
   button.disabled=false;
   if(error||!data){feedback.textContent='Save failed: '+(error?.message||'Permission denied');return}
   dialog.close();location.reload();
  });
  // Lightweight collectible detail view; does not alter ownership or checkout.
  const preview=document.createElement('dialog');preview.className='ctoon-editor-dialog ctoon-preview-dialog';
  const previewContent=document.createElement('div');previewContent.className='ctoon-preview-content';
  const closePreview=document.createElement('button');closePreview.type='button';closePreview.className='button secondary';closePreview.textContent='Close';closePreview.addEventListener('click',()=>preview.close());
  preview.append(previewContent,closePreview);document.body.append(preview);
  function openPreview(item){
   previewContent.replaceChildren();
   const heading=document.createElement('h2');heading.textContent=item.name;
   const picture=document.createElement('img');picture.src=item.image_path;picture.alt=item.name+' artwork';picture.className='ctoon-preview-image';
   const series=document.createElement('p');series.textContent='Set: Kingdom Hearts';
   const rarity=document.createElement('p');rarity.textContent='Rarity: '+(item.rarity||'Common');
   const price=document.createElement('p');price.textContent='Price: '+Number(item.price_coins).toLocaleString()+' Cartoon Coins';
   const availability=document.createElement('p');availability.textContent=item.is_for_sale?'Available in the Shop':'Coming Soon — not available to collect yet';
   previewContent.append(heading,picture,series,rarity,price,availability);
   preview.showModal();
  }
  for(const item of catalog){
   const card=document.createElement('article');card.className='ctoon-shop-card ctoon-inspectable';card.dataset.ctoonId=item.id;card.tabIndex=0;card.setAttribute('role','button');card.setAttribute('aria-label','View details for '+item.name);card.addEventListener('click',event=>{if(event.target.closest('a,button'))return;openPreview(item)});card.addEventListener('keydown',event=>{if((event.key==='Enter'||event.key===' ')&&event.target===card){event.preventDefault();openPreview(item)}});
   const art=document.createElement('div');art.className='ctoon-shop-art';
   const badge=document.createElement('span');badge.className='ctoon-shop-owned';badge.textContent=item.is_for_sale?'Available':'Coming Soon';
   const img=document.createElement('img');img.src=item.image_path;img.alt=item.name+' CToon artwork';img.loading='lazy';art.append(badge,img);
   const details=document.createElement('div');details.className='ctoon-shop-details';
   const name=document.createElement('div');name.className='ctoon-shop-name';name.textContent=item.name+' ';
   const rarity=document.createElement('span');rarity.className='ctoon-shop-rarity';rarity.title=item.rarity;rarity.textContent=(item.rarity||'C').charAt(0).toUpperCase();name.append(rarity);
   const purchase=document.createElement('div');purchase.className='ctoon-shop-purchase';
   const price=document.createElement('span');price.className='ctoon-shop-price';price.textContent=Number(item.price_coins).toLocaleString()+' pts';
   const action=document.createElement('a');action.className='ctoon-shop-buy ctoon-preview-buy';action.href=item.is_for_sale?'shop.html#ctoon-store':'#';action.textContent=item.is_for_sale?'Shop':'Soon';if(!item.is_for_sale)action.removeAttribute('href');
   purchase.append(price,action);
   const status=document.createElement('p');status.className='ctoon-shop-status';status.textContent=item.is_for_sale?'Kingdom Hearts CToon Set':'Not yet available to collect';
   details.append(name,purchase,status);
   if(owner){
    const edit=document.createElement('button');edit.type='button';edit.className='ctoon-edit-button';edit.textContent='Edit CToon';edit.addEventListener('click',()=>{active=item;form.elements.name.value=item.name;form.elements.image_path.value=item.image_path;form.elements.rarity.value=item.rarity;form.elements.price_coins.value=item.price_coins;feedback.textContent='';dialog.showModal()});details.append(edit);
   }
   card.append(art,details);grid.append(card);
  }
 }
}
