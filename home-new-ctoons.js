import {createClient} from 'https://esm.sh/@supabase/supabase-js@2.58.0';
const db=createClient('https://hsxdyxdazsdmpucyhqly.supabase.co','sb_publishable_yQ3hOiJcjOu7vDC7vhpEig_osFljQTS');
const grid=document.getElementById('home-new-ctoons');
const status=document.getElementById('home-new-ctoons-status');
async function loadNewCtoons(){
 if(!grid)return;
 let result=await db.from('ctoon_catalog').select('id,name,rarity,image_path,series,is_for_sale,created_at').order('created_at',{ascending:false}).limit(8);
 if(result.error){result=await db.from('ctoon_catalog').select('id,name,rarity,image_path,series,is_for_sale').order('name').limit(8);if(!result.error)status.textContent='Featured CToons from the collection';}
 if(result.error){status.textContent='CToons could not be loaded right now.';return;}
 if(!result.data?.length){status.textContent='New CToons will appear here when they are added.';return;}
 const frag=document.createDocumentFragment();
 for(const item of result.data){
  const card=document.createElement('a');card.className='home-new-ctoon';card.href='ctoons.html';card.setAttribute('aria-label','Explore '+item.name+' in CToons');
  const img=document.createElement('img');img.src=item.image_path||'ctooniverse-logo.png';img.alt=item.name+' CToon';img.loading='lazy';img.addEventListener('error',()=>{img.src='ctooniverse-logo.png'},{once:true});
  const info=document.createElement('span');info.className='home-new-ctoon-info';
  const name=document.createElement('strong');name.textContent=item.name;
  const meta=document.createElement('small');meta.textContent=[item.series,item.rarity].filter(Boolean).join(' · ');
  info.append(name,meta);card.append(img,info);frag.append(card);
 }
 grid.replaceChildren(frag);if(!status.textContent||status.textContent==='Loading the latest CToons…')status.textContent='Recently added to the CTooniverse collection';
}
loadNewCtoons();
window.addEventListener('pageshow',e=>{if(e.persisted)loadNewCtoons()});
