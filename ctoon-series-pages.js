import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const grid=document.querySelector('.ctoon-subseries-grid');
const category=document.body.dataset.ctoonCategory;
if(grid&&category){
 const {data,error}=await db.from('ctoon_series').select('name,slug').eq('category',category).order('name');
 if(error){const msg=document.createElement('p');msg.textContent='Unable to refresh sets. Showing saved page links.';grid.before(msg)}
 else{
  const fragment=document.createDocumentFragment();
  for(const set of data||[]){
   const card=document.createElement('a');card.href='ctoon-set.html?category='+encodeURIComponent(category==='Cartoon & Anime'?'Cartoons':'Video Games')+'&series='+encodeURIComponent(set.name);
   card.className='ctoon-series-card';card.style.cssText='display:block;max-width:220px;width:100%;box-sizing:border-box;padding:.6rem;border:2px solid #8a65e8;border-radius:18px;background:rgba(17,12,48,.88);text-align:center;color:inherit;text-decoration:none';
   const title=document.createElement('h3');title.textContent=set.name+' CToon Set';
   const tag=document.createElement('span');tag.className='coming-tag';tag.textContent='VIEW SET';
   card.append(title,tag);fragment.append(card);
  }
  grid.replaceChildren(fragment);
 }
}
